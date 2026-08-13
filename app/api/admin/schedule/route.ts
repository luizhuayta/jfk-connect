/**
 * GET /api/admin/schedule
 *
 * Todas las mallas de horario (por grado/sección) para el panel del admin.
 * Respuesta: { ok, days, periods, entries: [{grade, section, day, period, ...}] }
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
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
  id: string;
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
      `SELECT id, grade, section, day, period, time, subject, teacher, room
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

export async function PATCH(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { updates?: EntryRow[] };
    const updates = body.updates ?? [];
    if (updates.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Validar campos requeridos
    for (const u of updates) {
      if (!u.id || !u.day || !u.time || !u.period) {
        return NextResponse.json(
          { ok: false, error: "Faltan datos en una de las actualizaciones." },
          { status: 400 },
        );
      }
    }

    // Actualizar en una transacción. Primero movemos cada fila a un slot
    // temporal único para evitar violaciones transitorias del
    // UNIQUE(grade, section, day, period) al intercambiar períodos.
    await withTransaction(async (client) => {
      for (let i = 0; i < updates.length; i++) {
        await client.query(
          `UPDATE schedule_entries
           SET day = $2, period = 1, time = ''
           WHERE id = $1`,
          [updates[i].id, `__SWAP_${i}__`],
        );
      }
      for (const u of updates) {
        await client.query(
          `UPDATE schedule_entries
           SET day = $2, period = $3, time = $4
           WHERE id = $1`,
          [u.id, u.day, u.period, u.time],
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/schedule PATCH] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
