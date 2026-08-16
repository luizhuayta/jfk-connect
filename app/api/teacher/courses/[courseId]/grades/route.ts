/**
 * GET /api/teacher/courses/[courseId]/grades?bimester=N
 *   Notas de los alumnos de la sección para el bimestre indicado.
 *   Devuelve una fila por alumno (n1/n2/n3 = null si aún no registrados).
 *
 * PUT /api/teacher/courses/[courseId]/grades
 *   Guarda las notas de un bimestre (upsert por alumno).
 *   Body: { bimester: 1..4, entries: [{studentId, n1, n2, n3, observation}] }
 *   Convención: 0 o null = nota no registrada.
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { saveGradesSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

interface GradeRow {
  student_id: string;
  n1: number | null;
  n2: number | null;
  n3: number | null;
  observation: string | null;
}

async function getCourse(courseId: string) {
  return queryOne<{ grade: string; section: string }>(
    "SELECT grade, section FROM courses WHERE id = $1",
    [courseId],
  );
}

/** Convierte 0/undefined/null a null (nota no registrada) y valida rango 0-20. */
function toNote(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 20) return null;
  return n === 0 ? null : n;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { courseId } = await params;
  const { searchParams } = new URL(request.url);
  const bimester = Number(searchParams.get("bimester") ?? "1");
  if (!Number.isInteger(bimester) || bimester < 1 || bimester > 4) {
    return NextResponse.json(
      { ok: false, error: "Bimestre no válido." },
      { status: 400 },
    );
  }

  if (user.role !== "admin" && !(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    const r = await query<GradeRow>(
      `SELECT s.id AS student_id,
              g.n1::float AS n1,
              g.n2::float AS n2,
              g.n3::float AS n3,
              g.observation
       FROM students s
       LEFT JOIN grades g
         ON g.student_id = s.id AND g.course_id = $1 AND g.bimester = $2
       WHERE s.grade = $3 AND s.section = $4 AND s.status = 'activo'
       ORDER BY s.full_name`,
      [courseId, bimester, course.grade, course.section],
    );

    return NextResponse.json({
      ok: true,
      entries: r.rows.map((row) => ({
        studentId: row.student_id,
        n1: row.n1 ?? 0,
        n2: row.n2 ?? 0,
        n3: row.n3 ?? 0,
        observation: row.observation ?? "",
      })),
    });
  } catch (err) {
    console.error("[teacher/courses/[id]/grades GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (!(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const [parsed, validationError] = await parseBody(request, saveGradesSchema);
    if (validationError) return validationError;
    const { bimester, entries } = parsed;
    // Igual que la UI (app/teacher/grades/page.tsx): bimestres 3 y 4 aún no
    // están habilitados para registro.
    if (bimester === 3 || bimester === 4) {
      return NextResponse.json(
        { ok: false, error: "Este bimestre aún no está disponible para registro." },
        { status: 403 },
      );
    }
    if (!entries.length) {
      return NextResponse.json(
        { ok: false, error: "No hay notas para guardar." },
        { status: 400 },
      );
    }

    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    await withTransaction(async (client) => {
      for (const entry of entries) {
        // Verificar que el alumno pertenece a la sección del curso
        const owns = await client.query(
          `SELECT 1 FROM students WHERE id = $1 AND grade = $2 AND section = $3`,
          [entry.studentId, course.grade, course.section],
        );
        if (!owns.rowCount) continue;

        const n1 = toNote(entry.n1);
        const n2 = toNote(entry.n2);
        const n3 = toNote(entry.n3);
        const observation =
          typeof entry.observation === "string" ? entry.observation.trim() : null;

        if (n1 === null && n2 === null && n3 === null) {
          // Sin notas: eliminar registro existente (limpieza)
          await client.query(
            `DELETE FROM grades WHERE student_id = $1 AND course_id = $2 AND bimester = $3`,
            [entry.studentId, courseId, bimester],
          );
        } else {
          await client.query(
            `INSERT INTO grades (student_id, course_id, bimester, n1, n2, n3, observation, registered_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (student_id, course_id, bimester)
             DO UPDATE SET n1 = EXCLUDED.n1, n2 = EXCLUDED.n2, n3 = EXCLUDED.n3,
                           observation = EXCLUDED.observation,
                           registered_by = EXCLUDED.registered_by`,
            [entry.studentId, courseId, bimester, n1, n2, n3, observation, user.id],
          );
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[teacher/courses/[id]/grades PUT] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
