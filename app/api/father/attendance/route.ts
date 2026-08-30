/**
 * GET /api/father/attendance?studentId=<uuid>
 *
 * Registro de asistencia de un hijo del padre autenticado.
 * Respuesta:
 *   { ok, records: [{
 *     id, date: "YYYY-MM-DD", status: "A"|"F"|"T"|"J",
 *     justification: { status: "pendiente"|"aprobada"|"rechazada", reason, adminResponse } | null
 *   }] }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface AttendanceRow {
  id: string;
  date: string;
  status: "A" | "F" | "T" | "J";
  j_status: "pendiente" | "aprobada" | "rechazada" | null;
  j_reason: string | null;
  j_response: string | null;
}

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    const r = await query<AttendanceRow>(
      `SELECT a.id,
              to_char(a.date, 'YYYY-MM-DD') AS date,
              a.status::text AS status,
              aj.status::text AS j_status,
              aj.reason AS j_reason,
              aj.admin_response AS j_response
       FROM attendance a
       LEFT JOIN attendance_justifications aj ON aj.attendance_id = a.id
       WHERE a.student_id = $1
       ORDER BY a.date`,
      [studentId],
    );

    const records = r.rows.map((row) => ({
      id: row.id,
      date: row.date,
      status: row.status,
      justification: row.j_status
        ? {
            status: row.j_status,
            reason: row.j_reason,
            adminResponse: row.j_response,
          }
        : null,
    }));

    return NextResponse.json({ ok: true, records });
  } catch (err) {
    logger.error({ err, route: "father/attendance" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
