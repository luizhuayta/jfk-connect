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
import { parseBody } from "@/lib/validate";
import { updateScheduleSchema } from "@/lib/schemas";
import { findTeacherConflicts, type ScheduleSlotRef } from "@/lib/scheduleConflicts";
import { sectionShift } from "@/lib/section-shift";
import {
  guardAdmin,
  guardAdminMutation,
  internalError,
} from "@/lib/api/admin-route";

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
  teacher_id: string | null;
  room: string | null;
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  try {
    const r = await query<EntryRow>(
      `SELECT id, grade, section, day, period, time, subject, teacher, teacher_id, room
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
    return internalError(err, "admin/schedule GET");
  }
}

export async function PATCH(request: NextRequest) {
  const [, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  try {
    const [parsed, validationError] = await parseBody(request, updateScheduleSchema);
    if (validationError) return validationError;
    const updates = parsed.updates;
    if (updates.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const allEntries = await query<
      { id: string; grade: string; section: string; day: string; period: number; subject: string; teacher_id: string | null }
    >(`SELECT id, grade, section, day, period, subject, teacher_id FROM schedule_entries`);

    const existingIds = new Set(allEntries.rows.map((e) => e.id));
    const missing = updates.filter((u) => !existingIds.has(u.id));
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: "Una o más entradas de horario no existen." },
        { status: 404 },
      );
    }

    const updateById = new Map(updates.map((u) => [u.id, u]));
    const simulated: (ScheduleSlotRef & { teacherId: string | null })[] = allEntries.rows.map((e) => {
      const u = updateById.get(e.id);
      return {
        grade: e.grade,
        section: e.section,
        day: u ? u.day : e.day,
        period: u ? u.period : e.period,
        subject: e.subject,
        shift: sectionShift(e.section),
        teacherId: e.teacher_id,
      };
    });

    const conflicts = findTeacherConflicts(simulated, (e) => e.teacherId);
    if (conflicts.length > 0) {
      const teacherIds = [...new Set(conflicts.map((c) => c.teacherId))];
      const names = await query<{ id: string; full_name: string }>(
        `SELECT id, full_name FROM users WHERE id = ANY($1::uuid[])`,
        [teacherIds],
      );
      const nameById = new Map(names.rows.map((n) => [n.id, n.full_name]));
      const detail = conflicts
        .map((c) => {
          const sections = c.sections.map((s) => `${s.grade} "${s.section}"`).join(" y ");
          return `${nameById.get(c.teacherId) ?? "Un docente"} quedaría en ${sections} el ${c.day} a las ${c.period}ª hora`;
        })
        .join("; ");
      return NextResponse.json(
        { ok: false, error: `Ese cambio cruza el horario de un docente: ${detail}.` },
        { status: 409 },
      );
    }

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
    return internalError(err, "admin/schedule PATCH");
  }
}
