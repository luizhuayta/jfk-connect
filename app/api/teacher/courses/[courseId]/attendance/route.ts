/**
 * GET /api/teacher/courses/[courseId]/attendance
 *   - Con ?date=YYYY-MM-DD: registros de esa sesión (por alumno de la sección).
 *   - Sin date: resumen por fecha (para historial y marcadores de sesión).
 *
 * POST /api/teacher/courses/[courseId]/attendance
 *   Guarda la asistencia de una sesión (upsert por alumno+fecha).
 *   Body: { date: "YYYY-MM-DD", records: [{studentId, status: "A"|"F"|"T"|"J"}] }
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { saveAttendanceSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["A", "F", "T", "J"]);

async function getCourse(courseId: string) {
  return queryOne<{ grade: string; section: string }>(
    "SELECT grade, section FROM courses WHERE id = $1",
    [courseId],
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (user.role !== "admin" && !(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (date) {
      if (!DATE_RE.test(date)) {
        return NextResponse.json(
          { ok: false, error: "Fecha no válida." },
          { status: 400 },
        );
      }
      const r = await query<{ student_id: string; status: string }>(
        `SELECT s.id AS student_id, a.status::text AS status
         FROM students s
         JOIN attendance a ON a.student_id = s.id AND a.date = $1
         WHERE s.grade = $2 AND s.section = $3 AND s.status = 'activo'
         ORDER BY s.full_name`,
        [date, course.grade, course.section],
      );
      return NextResponse.json({
        ok: true,
        records: r.rows.map((row) => ({ studentId: row.student_id, status: row.status })),
      });
    }

    // Resumen por fecha (historial)
    const r = await query<{
      date: string;
      a: number;
      f: number;
      t: number;
      j: number;
      total: number;
    }>(
      `SELECT to_char(a.date, 'YYYY-MM-DD') AS date,
              COUNT(*) FILTER (WHERE a.status = 'A')::int AS a,
              COUNT(*) FILTER (WHERE a.status = 'F')::int AS f,
              COUNT(*) FILTER (WHERE a.status = 'T')::int AS t,
              COUNT(*) FILTER (WHERE a.status = 'J')::int AS j,
              COUNT(*)::int AS total
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE s.grade = $1 AND s.section = $2
       GROUP BY a.date
       ORDER BY a.date DESC
       LIMIT 60`,
      [course.grade, course.section],
    );

    return NextResponse.json({ ok: true, sessions: r.rows });
  } catch (err) {
    console.error("[teacher/courses/[id]/attendance GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (!(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const [parsed, validationError] = await parseBody(request, saveAttendanceSchema);
    if (validationError) return validationError;
    const date = parsed.date;
    const records: unknown[] = parsed.records;
    if (!records.length) {
      return NextResponse.json(
        { ok: false, error: "No hay registros para guardar." },
        { status: 400 },
      );
    }

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    await withTransaction(async (client) => {
      for (const r of records) {
        const rec = r as { studentId?: string; status?: string };
        if (!rec.studentId || !STATUSES.has(rec.status ?? "")) continue;
        const owns = await client.query(
          `SELECT 1 FROM students WHERE id = $1 AND grade = $2 AND section = $3`,
          [rec.studentId, course.grade, course.section],
        );
        if (!owns.rowCount) continue;

        await client.query(
          `INSERT INTO attendance (student_id, date, status, registered_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id, date)
           DO UPDATE SET status = EXCLUDED.status, registered_by = EXCLUDED.registered_by`,
          [rec.studentId, date, rec.status, user.id],
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[teacher/courses/[id]/attendance POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
