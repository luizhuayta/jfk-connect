/**
 * GET /api/father/grades?studentId=<uuid>
 *
 * Notas de un hijo del padre autenticado, agrupadas por bimestre.
 * Respuesta: { ok, grades: { "1": [{course, note, level, observation}], ... } }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { studentBelongsToParent } from "@/lib/guards";

export const dynamic = "force-dynamic";

interface GradeRow {
  bimester: number;
  course: string;
  note: number;
  level: "AD" | "A" | "B" | "C" | null;
  letter_grade: string | null;
  observation: string | null;
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
    const r = await query<GradeRow>(
      `SELECT g.bimester,
              c.name AS course,
              g.average::float AS note,
              g.level::text AS level,
              g.letter_grade,
              g.observation
       FROM grades g
       JOIN courses c ON c.id = g.course_id
       WHERE g.student_id = $1
       ORDER BY g.bimester, c.name`,
      [studentId],
    );

    const grades: Record<string, GradeRow[]> = {};
    for (const row of r.rows) {
      (grades[row.bimester] ??= []).push({
        bimester: row.bimester,
        course: row.course,
        note: row.note,
        level: row.level,
        letter_grade: row.letter_grade,
        observation: row.observation ?? "",
      });
    }

    return NextResponse.json({ ok: true, grades });
  } catch (err) {
    console.error("[father/grades GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
