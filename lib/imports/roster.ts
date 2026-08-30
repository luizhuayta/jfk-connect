/**
 * Roster de alumnos para el matching del importador — IJFK.
 *
 * Local a lib/imports/ (no en lib/grades/queries.ts) porque expone el DNI,
 * que fetchGradeGrid() deliberadamente no devuelve. El N° de orden usa el
 * MISMO `ROW_NUMBER() OVER (ORDER BY full_name)` que
 * lib/grades/queries.ts::fetchGradeGrid — así el N° que trae la hoja del
 * docente cuadra con el que ve en pantalla en /teacher/grades.
 */

import { query } from "@/lib/db";
import type { RosterStudent } from "@/lib/imports/types";

interface RosterRow {
  id: string;
  dni: string;
  full_name: string;
  order: number;
}

export async function fetchRoster(grade: string, section: string): Promise<RosterStudent[]> {
  const r = await query<RosterRow>(
    `SELECT id, dni, full_name,
            ROW_NUMBER() OVER (ORDER BY full_name)::int AS "order"
     FROM students
     WHERE grade = $1 AND section = $2 AND status = 'activo'
     ORDER BY full_name`,
    [grade, section],
  );
  return r.rows.map((row) => ({ id: row.id, dni: row.dni, fullName: row.full_name, order: row.order }));
}
