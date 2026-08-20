/**
 * GET /api/teacher/courses
 *
 * Cursos asignados al docente autenticado, con:
 *  - totales (alumnos, promedio, asistencia) calculados en vivo
 *  - estadísticas por bimestre (avg, aprobados, desaprobados, en curso)
 *  - secciones donde es tutor (para poder calificar las competencias
 *    transversales — no tienen curso propio)
 *
 * Las estadísticas ya no leen `grades` (modelo viejo n1/n2/n3): leen las
 * vistas `v_area_grades`/`v_course_bimester_stats` (migración 008), que
 * agregan `competency_grades` por área. `graded = expected` reemplaza el
 * viejo `n3 IS NOT NULL` como criterio de "bimestre cerrado".
 *
 * Seguridad: solo rol 'docente'; cada docente ve únicamente sus cursos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { SCHOOL_YEAR } from "@/lib/school-year";

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
  area_id: number | null;
  students_total: number;
  avg_grade: number | null;
  attendance_rate: number | null;
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

interface TutoredSectionRow {
  grade: string;
  section: string;
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
         c.area_id,
         COALESCE((
           SELECT COUNT(*) FROM students s
           WHERE s.grade = c.grade AND s.section = c.section AND s.status = 'activo'
         ), 0)::int AS students_total,
         (
           SELECT ROUND(AVG(v.score)::numeric, 2)
           FROM v_area_grades v
           WHERE v.course_id = c.id AND v.graded = v.expected AND v.year = $2
         )::float AS avg_grade,
         (
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a
           JOIN students s3 ON s3.id = a.student_id
           WHERE s3.grade = c.grade AND s3.section = c.section
         )::int AS attendance_rate
       FROM courses c
       WHERE c.teacher_id = $1
       ORDER BY c.name, c.grade, c.section`,
      [user.id, SCHOOL_YEAR],
    );

    const stats = await query<BimesterRow>(
      `SELECT v.course_id, v.bimester, v.entries, v.complete,
              v.avg, v.approved, v.failed
       FROM v_course_bimester_stats v
       JOIN courses c ON c.id = v.course_id
       WHERE c.teacher_id = $1 AND v.year = $2`,
      [user.id, SCHOOL_YEAR],
    );

    const tutored = await query<TutoredSectionRow>(
      `SELECT grade, section FROM section_tutors WHERE teacher_id = $1 AND year = $2`,
      [user.id, SCHOOL_YEAR],
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
        areaId: c.area_id,
        avgGrade: c.avg_grade,
        attendanceRate: c.attendance_rate,
        bimesters: statsByCourse[c.id] ?? {},
      })),
      tutoredSections: tutored.rows,
    });
  } catch (err) {
    console.error("[teacher/courses GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
