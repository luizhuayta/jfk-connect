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
import { query, withTransaction } from "@/lib/db";
import { requireOwnedCourse } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { saveAttendanceSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [ctx, denied] = await requireOwnedCourse(request, courseId);
  if (denied) return denied;
  const { course } = ctx;

  try {
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
    logger.error({ err, route: "teacher/courses/[id]/attendance GET" }, "error inesperado");
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

  const { courseId } = await params;

  const [ctx, denied] = await requireOwnedCourse(request, courseId, { allowAdmin: false });
  if (denied) return denied;
  const { user, course } = ctx;

  try {
    const [parsed, validationError] = await parseBody(request, saveAttendanceSchema);
    if (validationError) return validationError;
    const { date, records } = parsed;

    const studentIds = records.map((r) => r.studentId);
    const owned = await query<{ id: string }>(
      `SELECT id FROM students WHERE id = ANY($1::uuid[]) AND grade = $2 AND section = $3`,
      [studentIds, course.grade, course.section],
    );
    const ownedSet = new Set(owned.rows.map((row) => row.id));
    const rejected = [...new Set(studentIds.filter((id) => !ownedSet.has(id)))];
    if (rejected.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Algunos alumnos no pertenecen a este curso.",
          rejected,
        },
        { status: 400 },
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO attendance (student_id, date, status, registered_by)
         SELECT u.student_id, u.date, u.status::attendance_status, u.registered_by
         FROM UNNEST($1::uuid[], $2::date[], $3::text[], $4::uuid[])
           AS u(student_id, date, status, registered_by)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status, registered_by = EXCLUDED.registered_by`,
        [
          records.map((r) => r.studentId),
          records.map(() => date),
          records.map((r) => r.status),
          records.map(() => user.id),
        ],
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "teacher/courses/[id]/attendance POST" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
