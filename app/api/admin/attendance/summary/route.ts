/**
 * GET /api/admin/attendance/summary
 *
 * Devuelve un resumen de asistencia por curso en una sola petición.
 * Esto evita disparar cientos de requests paralelos desde el panel de admin.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface SummaryRow {
  course_id: string;
  sesiones: number;
  faltas: number;
  asistencias: number;
  total: number;
}

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { rows } = await query<SummaryRow>(
      `SELECT
         c.id AS course_id,
         COUNT(DISTINCT a.date)::int AS sesiones,
         COUNT(*) FILTER (WHERE a.status = 'F')::int AS faltas,
         COUNT(*) FILTER (WHERE a.status IN ('A','T','J'))::int AS asistencias,
         COUNT(*)::int AS total
       FROM courses c
       LEFT JOIN students s
         ON s.grade = c.grade
        AND s.section = c.section
        AND s.status = 'activo'
       LEFT JOIN attendance a
         ON a.student_id = s.id
       GROUP BY c.id`,
    );

    const stats: Record<string, { pct: number; faltas: number; sesiones: number }> = {};
    for (const r of rows) {
      stats[r.course_id] = {
        pct: r.total ? Math.round((r.asistencias / r.total) * 100) : 100,
        faltas: r.faltas,
        sesiones: r.sesiones,
      };
    }

    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[admin/attendance/summary GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
