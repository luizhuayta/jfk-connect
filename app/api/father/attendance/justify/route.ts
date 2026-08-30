/**
 * POST /api/father/attendance/justify
 *
 * El padre envía una justificación para una falta (estado 'F') de un hijo.
 * Body: { attendanceId: string, reason: string }
 *
 * Reglas:
 *   - Solo rol 'padre' y solo si la asistencia pertenece a un hijo suyo.
 *   - Solo se justifican faltas (status 'F'); una asistencia con otro estado
 *     se rechaza con 400.
 *   - Máximo una justificación por registro de asistencia (UNIQUE).
 *   - Rate limiting por IP y por estudiante.
 *
 * El docente la revisa después desde el panel teacher
 * (PATCH /api/teacher/courses/[courseId]/justifications/[id]).
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne, query, isUniqueViolation } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { justifyAttendanceSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, justifyAttendanceSchema);
  if (validationError) return validationError;

  // Rate limiting por IP (si hay) o por usuario autenticado.
  const JUSTIFY_LIMIT = { maxAttempts: 30, windowMs: 15 * 60 * 1000 };
  const ip = getClientIp(request);
  const ipLimit = ip
    ? rateLimit(`justify:ip:${ip}`, JUSTIFY_LIMIT)
    : rateLimit(`justify:user:${user.id}`, JUSTIFY_LIMIT);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." },
      { status: 429, headers: rateLimitHeaders(ipLimit, JUSTIFY_LIMIT) },
    );
  }

  try {
    // La asistencia debe pertenecer a un hijo del padre (JOIN por parent_id).
    const row = await queryOne<{
      id: string;
      student_id: string;
      status: string;
      j_status: string | null;
    }>(
      `SELECT a.id,
              a.student_id,
              a.status::text AS status,
              aj.status::text AS j_status
       FROM attendance a
       JOIN students s ON s.id = a.student_id AND s.parent_id = $1
       LEFT JOIN attendance_justifications aj ON aj.attendance_id = a.id
       WHERE a.id = $2`,
      [user.id, parsed.attendanceId],
    );

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Registro de asistencia no encontrado." },
        { status: 404 },
      );
    }

    if (row.status !== "F") {
      return NextResponse.json(
        { ok: false, error: "Solo se puede justificar una falta registrada (estado F)." },
        { status: 400 },
      );
    }

    if (row.j_status) {
      return NextResponse.json(
        { ok: false, error: "Ya enviaste una justificación para esta falta." },
        { status: 409 },
      );
    }

    // Rate limiting por estudiante (evita saturar las justificaciones de un hijo).
    const studentLimit = rateLimit(`justify:student:${row.student_id}`, {
      maxAttempts: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!studentLimit.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiadas justificaciones. Vuelve a intentar en una hora." },
        { status: 429, headers: rateLimitHeaders(studentLimit, { maxAttempts: 10, windowMs: 60 * 60 * 1000 }) },
      );
    }

    try {
      await query(
        `INSERT INTO attendance_justifications (attendance_id, student_id, parent_id, reason)
         VALUES ($1, $2, $3, $4)`,
        [row.id, row.student_id, user.id, parsed.reason],
      );
    } catch (err) {
      // Race: otra petición insertó primero para la misma falta → 409, no 500.
      if (isUniqueViolation(err)) {
        return NextResponse.json(
          { ok: false, error: "Ya enviaste una justificación para esta falta." },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "father/attendance/justify", userId: user.id }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
