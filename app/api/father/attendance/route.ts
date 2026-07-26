/**
 * GET /api/father/attendance?studentId=<uuid>
 *
 * Registro de asistencia de un hijo del padre autenticado.
 * Respuesta: { ok, records: [{date: "YYYY-MM-DD", status: "A"|"F"|"T"|"J"}] }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { studentBelongsToParent } from "@/lib/guards";

export const dynamic = "force-dynamic";

interface AttendanceRow {
  date: string;
  status: "A" | "F" | "T" | "J";
}

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { ok: false, error: "Falta el parámetro studentId." },
      { status: 400 },
    );
  }

  if (!(await studentBelongsToParent(studentId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este estudiante no está vinculado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const r = await query<AttendanceRow>(
      `SELECT to_char(a.date, 'YYYY-MM-DD') AS date,
              a.status::text AS status
       FROM attendance a
       WHERE a.student_id = $1
       ORDER BY a.date`,
      [studentId],
    );

    return NextResponse.json({ ok: true, records: r.rows });
  } catch (err) {
    console.error("[father/attendance GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
