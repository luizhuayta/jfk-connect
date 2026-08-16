/**
 * GET /api/admin/courses
 *
 * Todos los cursos del año en curso con docente asignado, totales y
 * estadísticas por bimestre (para el panel de notas del admin).
 *
 * Seguridad: solo rol 'admin'.
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
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");

    const where: string[] = [];
    const params: unknown[] = [];
    if (grade) { params.push(grade); where.push(`c.grade = $${params.length}`); }
    if (section) { params.push(section); where.push(`c.section = $${params.length}`); }
    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const courses = await query<CourseRow>(
      `SELECT
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
         COALESCE((
           SELECT COUNT(*) FROM students s
           WHERE s.grade = c.grade AND s.section = c.section AND s.status = 'activo'
         ), 0)::int AS students_total,
         (
           SELECT ROUND(AVG(g.average)::numeric, 2)
           FROM grades g
           WHERE g.course_id = c.id AND g.n3 IS NOT NULL
         )::float AS avg_grade,
         (
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a
           JOIN students s3 ON s3.id = a.student_id
           WHERE s3.grade = c.grade AND s3.section = c.section
         )::int AS attendance_rate
       FROM courses c
       LEFT JOIN users u ON u.id = c.teacher_id
       ${whereClause}
       ORDER BY c.grade, c.section, c.name`,
      params,
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
       GROUP BY g.course_id, g.bimester`,
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
    });
  } catch (err) {
    console.error("[admin/courses GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
