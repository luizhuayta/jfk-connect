/**
 * GET /api/admin/courses
 *
 * Todos los cursos del año en curso con docente asignado, totales y
 * estadísticas por bimestre (para el panel de notas del admin), más la
 * lista de secciones.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { parseQuery, coursesListQuerySchema } from "@/lib/admin/params";
import { guardAdmin, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  subject: string;
  grade: string;
  section: string;
  shift: string;
  room: string | null;
  teacher_name: string | null;
  teacher_id: string | null;
  teacher_subject: string | null;
  hours_per_week: number;
  bimester: number;
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

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  const [filters, invalid] = parseQuery(request, coursesListQuerySchema);
  if (invalid) return invalid;

  try {
    const params: unknown[] = [SCHOOL_YEAR];
    const where: string[] = [`c.year = $1`];
    if (filters.grade) {
      params.push(filters.grade);
      where.push(`c.grade = $${params.length}`);
    }
    if (filters.section) {
      params.push(filters.section);
      where.push(`c.section = $${params.length}`);
    }
    const whereClause = "WHERE " + where.join(" AND ");

    const [courses, stats, sections] = await Promise.all([
      query<CourseRow>(
        `WITH section_totals AS (
           SELECT grade, section, COUNT(*)::int AS total
           FROM students WHERE status = 'activo'
           GROUP BY grade, section
         ),
         course_avg AS (
           SELECT course_id, ROUND(AVG(score)::numeric, 2) AS avg_grade
           FROM v_area_grades
           WHERE course_id IS NOT NULL AND graded = expected AND year = $1
           GROUP BY course_id
         ),
         section_attendance AS (
           SELECT s.grade, s.section,
             ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0)) AS attendance_rate
           FROM attendance a
           JOIN students s ON s.id = a.student_id
           GROUP BY s.grade, s.section
         )
         SELECT
           c.id,
           c.name AS subject,
           c.grade,
           c.section,
           c.shift::text AS shift,
           c.classroom AS room,
           u.full_name AS teacher_name,
           c.teacher_id,
           u.subject AS teacher_subject,
           c.hours_per_week,
           c.bimester,
           COALESCE(st.total, 0) AS students_total,
           ca.avg_grade::float AS avg_grade,
           sat.attendance_rate::int AS attendance_rate
         FROM courses c
         LEFT JOIN users u ON u.id = c.teacher_id
         LEFT JOIN section_totals st ON st.grade = c.grade AND st.section = c.section
         LEFT JOIN course_avg ca ON ca.course_id = c.id
         LEFT JOIN section_attendance sat ON sat.grade = c.grade AND sat.section = c.section
         ${whereClause}
         ORDER BY c.grade, c.section, c.name`,
        params,
      ),
      query<BimesterRow>(
        `SELECT course_id, bimester, entries, complete, avg, approved, failed
         FROM v_course_bimester_stats
         WHERE year = $1`,
        [SCHOOL_YEAR],
      ),
      query<{ grade: string; section: string }>(
        `SELECT DISTINCT grade, section FROM students WHERE status = 'activo' ORDER BY grade, section`,
      ),
    ]);

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
        room: c.room ?? "—",
        teacherName: c.teacher_name ?? null,
        teacherId: c.teacher_id ?? null,
        teacherSubject: c.teacher_subject ?? null,
        studentsTotal: c.students_total,
        hoursPerWeek: c.hours_per_week,
        currentBimester: c.bimester,
        avgGrade: c.avg_grade,
        attendanceRate: c.attendance_rate,
        bimesters: statsByCourse[c.id] ?? {},
      })),
      sections: sections.rows,
    });
  } catch (err) {
    return internalError(err, "admin/courses GET");
  }
}
