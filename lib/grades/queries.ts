import { query, withTransaction } from "@/lib/db";
import { SCHOOL_YEAR } from "@/lib/school-year";
import type { GradeScope } from "./scope";

export interface GridStudent {
  id: string;
  name: string;
  initials: string;
  order: number;
}

export interface GridEntry {
  studentId: string;
  competencyId: number;
  score: number | null;
  level: string | null;
  conclusion: string | null;
}

interface EntryRow {
  student_id: string;
  competency_id: number;
  score: number | null;
  level: string | null;
  conclusion: string | null;
}

export async function fetchGradeGrid(
  scope: GradeScope,
): Promise<{ students: GridStudent[]; entries: GridEntry[] }> {
  const [studentsR, entriesR] = await Promise.all([
    query<GridStudent>(
      `SELECT s.id, s.full_name AS name,
              COALESCE(s.initials, UPPER(LEFT(s.full_name, 1))) AS initials,
              ROW_NUMBER() OVER (ORDER BY s.full_name)::int AS "order"
       FROM students s
       WHERE s.grade = $1 AND s.section = $2 AND s.status = 'activo'
       ORDER BY s.full_name`,
      [scope.grade, scope.section],
    ),
    query<EntryRow>(
      `SELECT cg.student_id, cg.competency_id, cg.score::float AS score,
              cg.level::text AS level, cg.conclusion
       FROM competency_grades cg
       JOIN students s ON s.id = cg.student_id
       WHERE cg.competency_id = ANY($1::smallint[]) AND cg.bimester = $2 AND cg.year = $3
         AND s.grade = $4 AND s.section = $5`,
      [scope.competencyIds, scope.bimester, SCHOOL_YEAR, scope.grade, scope.section],
    ),
  ]);

  return {
    students: studentsR.rows,
    entries: entriesR.rows.map((r) => ({
      studentId: r.student_id,
      competencyId: r.competency_id,
      score: r.score,
      level: r.level,
      conclusion: r.conclusion,
    })),
  };
}

export interface SaveEntryInput {
  studentId: string;
  competencyId: number;
  score: number | null;
  conclusion?: string;
}

/**
 * Guarda las entradas de la grilla en 3 queries dentro de una transacción
 * (antes, en el endpoint viejo de notas por curso: un SELECT de validación
 * por alumno dentro de un bucle — ~30 round-trips para guardar una
 * sección). Filtra defensivamente por `scope` (competencias del área +
 * alumnos de la sección) aunque la ruta ya debería haber validado, para
 * que esta función sea segura de reusar sin repetir esa lógica.
 */
export async function saveGradeEntries(
  scope: GradeScope,
  entries: SaveEntryInput[],
  registeredBy: string,
): Promise<void> {
  const competencySet = new Set(scope.competencyIds);
  const valid = entries.filter((e) => competencySet.has(e.competencyId));
  if (valid.length === 0) return;

  await withTransaction(async (client) => {
    // Alumnos válidos de esta sección — una sola query, no una por fila.
    const studentsR = await client.query<{ id: string }>(
      `SELECT id FROM students WHERE grade = $1 AND section = $2 AND status = 'activo'`,
      [scope.grade, scope.section],
    );
    const validStudents = new Set(studentsR.rows.map((r) => r.id));

    const toUpsert = valid.filter((e) => e.score !== null && validStudents.has(e.studentId));
    const toDelete = valid.filter((e) => e.score === null && validStudents.has(e.studentId));

    if (toUpsert.length > 0) {
      const studentIds = toUpsert.map((e) => e.studentId);
      const competencyIds = toUpsert.map((e) => e.competencyId);
      const courseIds = toUpsert.map(() => scope.courseId);
      const bimesters = toUpsert.map(() => scope.bimester);
      const years = toUpsert.map(() => SCHOOL_YEAR);
      const scores = toUpsert.map((e) => e.score);
      const conclusions = toUpsert.map((e) => e.conclusion ?? null);
      const registeredBys = toUpsert.map(() => registeredBy);

      await client.query(
        `INSERT INTO competency_grades
           (student_id, competency_id, course_id, bimester, year, score, conclusion, registered_by)
         SELECT * FROM UNNEST(
           $1::uuid[], $2::smallint[], $3::uuid[], $4::smallint[],
           $5::smallint[], $6::numeric[], $7::text[], $8::uuid[]
         )
         ON CONFLICT (student_id, competency_id, bimester, year)
         DO UPDATE SET score = EXCLUDED.score, conclusion = EXCLUDED.conclusion,
                       course_id = EXCLUDED.course_id, registered_by = EXCLUDED.registered_by,
                       updated_at = now()`,
        [studentIds, competencyIds, courseIds, bimesters, years, scores, conclusions, registeredBys],
      );
    }

    if (toDelete.length > 0) {
      const studentIds = toDelete.map((e) => e.studentId);
      const competencyIds = toDelete.map((e) => e.competencyId);
      await client.query(
        `DELETE FROM competency_grades
         WHERE bimester = $1 AND year = $2
           AND (student_id, competency_id) IN (
             SELECT * FROM UNNEST($3::uuid[], $4::smallint[])
           )`,
        [scope.bimester, SCHOOL_YEAR, studentIds, competencyIds],
      );
    }
  });
}
