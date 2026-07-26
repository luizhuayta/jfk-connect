/**
 * GET /api/admin/schedule
 *
 * Todas las mallas de horario (por grado/sección) para el panel del admin.
 * Respuesta: { ok, days, periods, entries: [{grade, section, day, period, ...}] }
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05",
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
];

interface EntryRow {
  grade: string;
  section: string;
  day: string;
  period: number;
  time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
}

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const r = await query<EntryRow>(
      `SELECT grade, section, day, period, time, subject, teacher, room
       FROM schedule_entries
       ORDER BY grade, section, day, period`,
    );

    return NextResponse.json({
      ok: true,
      days: DAYS,
      periods: PERIODS,
      entries: r.rows,
    });
  } catch (err) {
    console.error("[admin/schedule GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
