/**
 * GET /api/admin/stats
 *
 * Datos del dashboard administrativo:
 *  - totales (alumnos, docentes, padres, tasa de asistencia)
 *  - asistencia por día (últimas sesiones registradas)
 *  - distribución de calificaciones (por rangos)
 *  - últimas notas registradas
 *  - avisos recientes
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { LEVELS, LEVEL_RANGE, type Level } from "@/lib/grades/scale";
import { guardAdmin, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  try {
    const [totals, byDay, dist, notes, announcements] = await Promise.all([
      query<{
        students: number;
        teachers: number;
        parents: number;
        attendance_rate: number | null;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM students WHERE status = 'activo')::int AS students,
           (SELECT COUNT(*) FROM users WHERE role = 'docente' AND is_active)::int AS teachers,
           (SELECT COUNT(*) FROM users WHERE role = 'padre' AND is_active)::int AS parents,
           (
             SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
             FROM attendance
           )::int AS attendance_rate`,
      ),
      query<{ date: string; pct: number }>(
        `SELECT to_char(date, 'YYYY-MM-DD') AS date,
                ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('A','T','J')) / NULLIF(COUNT(*), 0))::int AS pct
         FROM attendance
         WHERE date IN (SELECT DISTINCT date FROM attendance ORDER BY date DESC LIMIT 6)
         GROUP BY date
         ORDER BY date`,
      ),
      query<{ level: Level; n: number }>(
        `SELECT level::text AS level, COUNT(*)::int AS n
         FROM competency_grades
         WHERE year = $1 AND score IS NOT NULL
         GROUP BY level`,
        [SCHOOL_YEAR],
      ),
      query<{
        student: string;
        subject: string;
        grade: number;
        date: string;
      }>(
        `SELECT s.full_name AS student,
                ca.name AS subject,
                cg.score::float AS grade,
                to_char(cg.registered_at, 'YYYY-MM-DD') AS date
         FROM competency_grades cg
         JOIN students s ON s.id = cg.student_id
         JOIN competencies comp ON comp.id = cg.competency_id
         JOIN curricular_areas ca ON ca.id = comp.area_id
         WHERE cg.score IS NOT NULL
         ORDER BY cg.registered_at DESC
         LIMIT 4`,
      ),
      query<{
        title: string;
        date: string;
        category: string;
      }>(
        `SELECT title, to_char(published_at, 'YYYY-MM-DD') AS date, category::text AS category
         FROM announcements
         ORDER BY published_at DESC
         LIMIT 3`,
      ),
    ]);

    const attendanceByDay = byDay.rows.map((r) => ({
      name: DAY_ABBR[new Date(r.date + "T12:00:00").getDay()],
      value: r.pct,
    }));

    const totalGraded = dist.rows.reduce((sum, r) => sum + r.n, 0);
    const gradeDistribution = LEVELS.map((level) => ({
      name: `${level} (${LEVEL_RANGE[level]})`,
      value: totalGraded > 0
        ? Math.round((100 * (dist.rows.find((r) => r.level === level)?.n ?? 0)) / totalGraded)
        : 0,
    }));

    const PRIORITY: Record<string, string> = {
      urgente: "Alta",
      importante: "Media",
      general: "Baja",
      informativo: "Baja",
    };

    return NextResponse.json({
      ok: true,
      stats: {
        totalStudents: totals.rows[0].students,
        totalTeachers: totals.rows[0].teachers,
        totalParents: totals.rows[0].parents,
        attendanceRate: totals.rows[0].attendance_rate,
      },
      attendanceByDay,
      gradeDistribution,
      latestNotes: notes.rows,
      pendingAnnouncements: announcements.rows.map((a) => ({
        title: a.title,
        date: a.date,
        priority: PRIORITY[a.category] ?? "Baja",
      })),
    });
  } catch (err) {
    return internalError(err, "admin/stats GET");
  }
}
