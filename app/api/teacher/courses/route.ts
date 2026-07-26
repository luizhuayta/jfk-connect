/**
 * GET /api/teacher/courses
 *
 * Cursos asignados al docente autenticado, con:
 *  - totales (alumnos, promedio, asistencia) calculados en vivo
 *  - estadísticas por bimestre (avg, aprobados, desaprobados, en curso)
 *
 * Seguridad: solo rol 'docente'; cada docente ve únicamente sus cursos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  subject: string;
  grade: string;
  section: string;
  shift: string;
  room: string;
  hours_per_week: number;
  bimester: number;
  students_total: number;
  avg_grade: number;
  attendance_rate: number;
}

interface BimesterRow {
  course_id: string;
  bimester: number;
  entries: number;
  complete: number;
  avg: number | null;
  approved: number;
  failed: number;
}

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  try {
    const courses = await query<CourseRow>(
      `SELECT
         c.id,
         c.name AS subject,
         c.grade,
         c.section,
         c.shift::text AS shift,
         c.classroom AS room,
         c.hours_per_week,
         c.bimester,
         COALESCE((
           SELECT COUNT(*) FROM students s
           WHERE s.grade = c.grade AND s.section = c.section AND s.status = 'activo'
         ), 0)::int AS students_total,
         COALESCE((
           SELECT ROUND(AVG(g.average)::numeric, 2)
           FROM grades g
           JOIN students s2 ON s2.id = g.student_id
           WHERE g.course_id = c.id AND g.n3 IS NOT NULL
         ), 0)::float AS avg_grade,
         COALESCE((
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a
           JOIN students s3 ON s3.id = a.student_id
           WHERE s3.grade = c.grade AND s3.section = c.section
         ), 100)::int AS attendance_rate
       FROM courses c
       WHERE c.teacher_id = $1
       ORDER BY c.name, c.grade, c.section`,
      [user.id],
    );

    const stats = await query<BimesterRow>(
      `SELECT g.course_id,
              g.bimester,
              COUNT(*)::int AS entries,
              COUNT(g.n3)::int AS complete,
              ROUND(AVG(g.average) FILTER (WHERE g.n3 IS NOT NULL)::numeric, 2)::float AS avg,
              COUNT(*) FILTER (WHERE g.n3 IS NOT NULL AND g.average >= 11)::int AS approved,
              COUNT(*) FILTER (WHERE g.n3 IS NOT NULL AND g.average < 11)::int AS failed
       FROM grades g
       JOIN courses c ON c.id = g.course_id
       WHERE c.teacher_id = $1
       GROUP BY g.course_id, g.bimester`,
      [user.id],
    );

    const statsByCourse: Record<string, Record<string, unknown>> = {};
    for (const s of stats.rows) {
      statsByCourse[s.course_id] ??= {};
      statsByCourse[s.course_id][s.bimester] = {
        avg: s.avg ?? 0,
        approved: s.approved,
        failed: s.failed,
        total: s.complete,
        hasData: s.complete > 0,
        inProgress: s.entries > 0 && s.complete === 0,
      };
    }

    return NextResponse.json({
      ok: true,
      courses: courses.rows.map((c) => ({
        id: c.id,
        subject: c.subject,
        grade: c.grade,
        section: c.section,
        shift: c.shift,
        room: c.room,
        studentsTotal: c.students_total,
        hoursPerWeek: c.hours_per_week,
        currentBimester: c.bimester,
        avgGrade: c.avg_grade,
        attendanceRate: c.attendance_rate,
        bimesters: statsByCourse[c.id] ?? {},
      })),
    });
  } catch (err) {
    console.error("[teacher/courses GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
