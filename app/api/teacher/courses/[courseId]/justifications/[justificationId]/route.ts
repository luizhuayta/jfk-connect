/**
 * PATCH /api/teacher/courses/[courseId]/justifications/[justificationId]
 *
 * El docente aprueba o rechaza la justificación de una falta enviada por un
 * padre. Al aprobar, la asistencia del alumno pasa a estado 'J' (Justificado).
 * Al rechazar, la falta se mantiene 'F' y queda la respuesta del docente.
 *
 * Body: { decision: "aprobar" | "rechazar", response?: string }
 *
 * Seguridad: solo rol 'docente' (o admin) y solo si el curso es del docente;
 * además el alumno de la justificación debe pertenecer al curso.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { requireOwnedCourse } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody, parseUuidParam } from "@/lib/validate";
import { reviewJustificationSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; justificationId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const { courseId, justificationId } = await params;
  const [justificationIdOk, justificationIdErr] = parseUuidParam(justificationId);
  if (justificationIdErr) return justificationIdErr;

  const [ctx, denied] = await requireOwnedCourse(request, courseId);
  if (denied) return denied;
  const { user } = ctx;

  try {
    const [parsed, validationError] = await parseBody(request, reviewJustificationSchema);
    if (validationError) return validationError;

    // La justificación debe existir, estar pendiente y pertenecer a un alumno
    // de este curso (misma grade/section).
    const j = await queryOne<{
      id: string;
      attendance_id: string;
      student_id: string;
      status: string;
      s_grade: string;
      s_section: string;
      c_grade: string;
      c_section: string;
    }>(
      `SELECT aj.id,
              aj.attendance_id,
              aj.student_id,
              aj.status::text AS status,
              s.grade AS s_grade,
              s.section AS s_section,
              c.grade AS c_grade,
              c.section AS c_section
       FROM attendance_justifications aj
       JOIN attendance a ON a.id = aj.attendance_id
       JOIN students s ON s.id = a.student_id
       JOIN courses c ON c.id = $1
       WHERE aj.id = $2`,
      [courseId, justificationIdOk],
    );

    if (!j) {
      return NextResponse.json(
        { ok: false, error: "Justificación no encontrada." },
        { status: 404 },
      );
    }

    if (j.s_grade !== j.c_grade || j.s_section !== j.c_section) {
      return NextResponse.json(
        { ok: false, error: "El alumno no pertenece a este curso." },
        { status: 403 },
      );
    }

    if (j.status !== "pendiente") {
      return NextResponse.json(
        { ok: false, error: "Esta justificación ya fue revisada." },
        { status: 400 },
      );
    }

    const response = parsed.response || null;

    await withTransaction(async (client) => {
      if (parsed.decision === "aprobar") {
        // La asistencia pasa a 'J' y la justificación queda aprobada.
        await client.query("UPDATE attendance SET status = 'J' WHERE id = $1", [
          j.attendance_id,
        ]);
      }
      await client.query(
        `UPDATE attendance_justifications
         SET status = $1, admin_response = $2, reviewed_by = $3, reviewed_at = now()
         WHERE id = $4`,
        [parsed.decision === "aprobar" ? "aprobada" : "rechazada", response, user.id, justificationIdOk],
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error(
      { err, route: "teacher/justifications/[id] PATCH", userId: user.id },
      "error inesperado",
    );
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
