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
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";

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
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

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
    logger.error({ err, route: "father/grades" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
