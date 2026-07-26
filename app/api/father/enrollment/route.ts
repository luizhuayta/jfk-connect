/**
 * GET /api/father/enrollment?studentId=<uuid>
 *
 * Datos de matrícula del año en curso de un hijo del padre autenticado.
 * Respuesta: { ok, enrollment: {...} | null }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { studentBelongsToParent } from "@/lib/guards";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  student_id: string;
  code: string;
  year: number;
  status: "regular" | "condicional" | "pendiente";
  docs: { label: string; submitted: boolean }[];
  tutor: string | null;
  classroom: string | null;
  enrolled_at: string;
  grade: string;
  section: string;
  shift: string;
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
    const row = await queryOne<EnrollmentRow>(
      `SELECT e.student_id,
              e.code,
              e.year,
              e.status::text AS status,
              e.docs,
              e.tutor,
              e.classroom,
              to_char(e.created_at, 'YYYY-MM-DD') AS enrolled_at,
              s.grade,
              s.section,
              s.shift::text AS shift
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.student_id = $1
       ORDER BY e.year DESC
       LIMIT 1`,
      [studentId],
    );

    if (!row) {
      return NextResponse.json({ ok: true, enrollment: null });
    }

    const enrollment = {
      studentId: row.student_id,
      code: row.code,
      year: row.year,
      grade: row.grade,
      section: row.section,
      shift:
        row.shift === "Mañana"
          ? "Mañana (7:45 – 13:20)"
          : "Tarde (13:45 – 18:20)",
      classroom: row.classroom ? `Aula ${row.classroom.replace(/^Aula\s+/i, "")}` : "—",
      enrolledAt: row.enrolled_at,
      status: row.status,
      docs: row.docs ?? [],
      tutor: row.tutor ?? "Por asignar",
    };

    return NextResponse.json({ ok: true, enrollment });
  } catch (err) {
    console.error("[father/enrollment GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
