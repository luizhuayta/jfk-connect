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
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const totals = await query<{
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
    );

    // Asistencia por día (últimas 6 fechas con registros)
    const byDay = await query<{ date: string; pct: number }>(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date,
              ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('A','T','J')) / NULLIF(COUNT(*), 0))::int AS pct
       FROM attendance
       WHERE date IN (SELECT DISTINCT date FROM attendance ORDER BY date DESC LIMIT 6)
       GROUP BY date
       ORDER BY date`,
    );

    const attendanceByDay = byDay.rows.map((r) => ({
      name: DAY_ABBR[new Date(r.date + "T12:00:00").getDay()],
      value: r.pct,
    }));

    // Distribución de calificaciones (porcentaje por rango)
    const dist = await query<{ range: string; pct: number }>(
      `SELECT range, ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0))::int AS pct
       FROM (
         SELECT CASE
                  WHEN average >= 18 THEN 'A (18-20)'
                  WHEN average >= 15 THEN 'B (15-17)'
                  WHEN average >= 12 THEN 'C (12-14)'
                  ELSE 'D (0-11)'
                END AS range
         FROM grades
         WHERE n3 IS NOT NULL
       ) t
       GROUP BY range`,
    );
    const RANGES = ["A (18-20)", "B (15-17)", "C (12-14)", "D (0-11)"];
    const gradeDistribution = RANGES.map((name) => ({
      name,
      value: dist.rows.find((r) => r.range === name)?.pct ?? 0,
    }));

    // Últimas notas registradas
    const notes = await query<{
      student: string;
      subject: string;
      grade: number;
      date: string;
    }>(
      `SELECT s.full_name AS student,
              c.name AS subject,
              ROUND(g.average::numeric, 1)::float AS grade,
              to_char(g.registered_at, 'YYYY-MM-DD') AS date
       FROM grades g
       JOIN students s ON s.id = g.student_id
       JOIN courses c ON c.id = g.course_id
       ORDER BY g.registered_at DESC
       LIMIT 4`,
    );

    // Avisos recientes (prioridad derivada de la categoría)
    const announcements = await query<{
      title: string;
      date: string;
      category: string;
    }>(
      `SELECT title, to_char(published_at, 'YYYY-MM-DD') AS date, category::text AS category
       FROM announcements
       ORDER BY published_at DESC
       LIMIT 3`,
    );

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
    console.error("[admin/stats GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
