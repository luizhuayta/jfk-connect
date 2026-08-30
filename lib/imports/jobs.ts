/**
 * Acceso a BD del staging del importador (import_jobs/import_rows/
 * import_cells, migración 010) — IJFK.
 *
 * Las rutas resuelven auth/scope (resolveGradeScope) y llaman aquí solo
 * para leer/escribir el staging. `commitStagedRows` es la única función
 * que termina en `saveGradeEntries` — el resto de este archivo nunca toca
 * `competency_grades`.
 */

import { query, queryOne, withTransaction, type PoolClient } from "@/lib/db";
import { saveGradeEntries, type SaveEntryInput } from "@/lib/grades/queries";
import type { GradeScope } from "@/lib/grades/scope";
import { SCHOOL_YEAR } from "@/lib/school-year";
import type { MatchMethod, RowStatus, CellStatus } from "@/lib/imports/types";

export type ImportJobStatus = "subido" | "analizando" | "revision" | "aplicado" | "descartado" | "error";
export type ImportKind = "excel" | "csv" | "foto";

export interface ImportJobRow {
  id: string;
  created_by: string;
  file_id: string | null;
  kind: ImportKind;
  course_id: string | null;
  grade: string;
  section: string;
  transversal: boolean;
  bimester: number;
  year: number;
  status: ImportJobStatus;
  source_meta: Record<string, unknown>;
  summary: Record<string, unknown>;
  error: string | null;
}

export async function createImportJob(args: {
  createdBy: string;
  fileId: string | null;
  kind: ImportKind;
  courseId: string | null;
  grade: string;
  section: string;
  transversal: boolean;
  bimester: number;
  year: number;
}): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO import_jobs (created_by, file_id, kind, course_id, grade, section, transversal, bimester, year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [args.createdBy, args.fileId, args.kind, args.courseId, args.grade, args.section, args.transversal, args.bimester, args.year],
  );
  if (!row) throw new Error("No se pudo crear el trabajo de importación.");
  return row.id;
}

export async function getImportJob(jobId: string): Promise<ImportJobRow | null> {
  return queryOne<ImportJobRow>(
    `SELECT id, created_by, file_id, kind, course_id, grade, section, transversal, bimester, year, status, source_meta, summary, error
     FROM import_jobs WHERE id = $1`,
    [jobId],
  );
}

export async function listImportJobs(createdBy: string): Promise<ImportJobRow[]> {
  const r = await query<ImportJobRow>(
    `SELECT id, created_by, file_id, kind, course_id, grade, section, transversal, bimester, year, status, source_meta, summary, error
     FROM import_jobs WHERE created_by = $1 ORDER BY created_at DESC LIMIT 50`,
    [createdBy],
  );
  return r.rows;
}

export async function setJobStatus(
  jobId: string,
  status: ImportJobStatus,
  patch: { sourceMeta?: Record<string, unknown>; summary?: Record<string, unknown>; error?: string | null } = {},
): Promise<void> {
  await query(
    `UPDATE import_jobs SET status = $1,
       source_meta = COALESCE($2::jsonb, source_meta),
       summary = COALESCE($3::jsonb, summary),
       error = $4
     WHERE id = $5`,
    [status, patch.sourceMeta ? JSON.stringify(patch.sourceMeta) : null, patch.summary ? JSON.stringify(patch.summary) : null, patch.error ?? null, jobId],
  );
}

export async function deleteImportJob(jobId: string): Promise<void> {
  await query(`DELETE FROM import_jobs WHERE id = $1`, [jobId]);
}

export interface StagedCellInput {
  competencyId: number;
  columnLabel: string | null;
  rawValue: string | null;
  score: number | null;
  status: CellStatus;
  issue: string | null;
}

export interface StagedRowInput {
  rowIndex: number;
  raw: Record<string, string>;
  rawOrder: number | null;
  rawDni: string | null;
  rawName: string | null;
  matchedStudentId: string | null;
  matchMethod: MatchMethod | null;
  matchScore: number | null;
  status: RowStatus;
  issues: string[];
  cells: StagedCellInput[];
}

/** Reemplaza TODO el staging del job (usado por /parse — si el docente vuelve a analizar, se descarta lo anterior). */
export async function replaceStagedRows(jobId: string, rows: StagedRowInput[]): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM import_rows WHERE job_id = $1`, [jobId]); // cascada borra import_cells

    for (const row of rows) {
      const rowResult = await client.query<{ id: string }>(
        `INSERT INTO import_rows
           (job_id, row_index, raw, raw_order, raw_dni, raw_name, matched_student_id, match_method, match_score, status, issues)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          jobId,
          row.rowIndex,
          JSON.stringify(row.raw),
          row.rawOrder,
          row.rawDni,
          row.rawName,
          row.matchedStudentId,
          row.matchMethod,
          row.matchScore,
          row.status,
          JSON.stringify(row.issues),
        ],
      );
      const rowId = rowResult.rows[0].id;

      for (const cell of row.cells) {
        await client.query(
          `INSERT INTO import_cells (job_id, row_id, competency_id, column_label, raw_value, score, status, issue)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [jobId, rowId, cell.competencyId, cell.columnLabel, cell.rawValue, cell.score, cell.status, cell.issue],
        );
      }
    }
  });
}

export interface StagedRowOut {
  id: string;
  rowIndex: number;
  rawOrder: number | null;
  rawDni: string | null;
  rawName: string | null;
  matchedStudentId: string | null;
  matchMethod: MatchMethod | null;
  matchScore: number | null;
  status: RowStatus;
  issues: string[];
  cells: { id: string; competencyId: number; columnLabel: string | null; rawValue: string | null; score: number | null; status: CellStatus; issue: string | null }[];
}

export async function fetchStagedRows(jobId: string): Promise<StagedRowOut[]> {
  const [rowsR, cellsR] = await Promise.all([
    query<{
      id: string;
      row_index: number;
      raw_order: number | null;
      raw_dni: string | null;
      raw_name: string | null;
      matched_student_id: string | null;
      match_method: MatchMethod | null;
      match_score: string | null;
      status: RowStatus;
      issues: string[];
    }>(
      `SELECT id, row_index, raw_order, raw_dni, raw_name, matched_student_id, match_method, match_score::float AS match_score, status, issues
       FROM import_rows WHERE job_id = $1 ORDER BY row_index`,
      [jobId],
    ),
    query<{
      id: string;
      row_id: string;
      competency_id: number;
      column_label: string | null;
      raw_value: string | null;
      score: string | null;
      status: CellStatus;
      issue: string | null;
    }>(
      `SELECT id, row_id, competency_id, column_label, raw_value, score::float AS score, status, issue
       FROM import_cells WHERE job_id = $1`,
      [jobId],
    ),
  ]);

  const cellsByRow = new Map<string, StagedRowOut["cells"]>();
  for (const c of cellsR.rows) {
    if (!cellsByRow.has(c.row_id)) cellsByRow.set(c.row_id, []);
    cellsByRow.get(c.row_id)!.push({
      id: c.id,
      competencyId: c.competency_id,
      columnLabel: c.column_label,
      rawValue: c.raw_value,
      score: c.score === null ? null : Number(c.score),
      status: c.status,
      issue: c.issue,
    });
  }

  return rowsR.rows.map((r) => ({
    id: r.id,
    rowIndex: r.row_index,
    rawOrder: r.raw_order,
    rawDni: r.raw_dni,
    rawName: r.raw_name,
    matchedStudentId: r.matched_student_id,
    matchMethod: r.match_method,
    matchScore: r.match_score === null ? null : Number(r.match_score),
    status: r.status,
    issues: r.issues,
    cells: cellsByRow.get(r.id) ?? [],
  }));
}

export async function updateStagedRow(
  jobId: string,
  rowId: string,
  patch: { matchedStudentId?: string | null; status?: RowStatus; cells?: { competencyId: number; score: number | null }[] },
): Promise<void> {
  await withTransaction(async (client: PoolClient) => {
    if (patch.matchedStudentId !== undefined || patch.status !== undefined) {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (patch.matchedStudentId !== undefined) {
        params.push(patch.matchedStudentId);
        sets.push(`matched_student_id = $${params.length}`);
        params.push(patch.matchedStudentId ? "manual" : null);
        sets.push(`match_method = $${params.length}`);
      }
      if (patch.status !== undefined) {
        params.push(patch.status);
        sets.push(`status = $${params.length}`);
      }
      params.push(jobId, rowId);
      await client.query(
        `UPDATE import_rows SET ${sets.join(", ")} WHERE job_id = $${params.length - 1} AND id = $${params.length}`,
        params,
      );
    }
    if (patch.cells) {
      for (const cell of patch.cells) {
        const status: CellStatus = cell.score === null ? "vacio" : "ok";
        await client.query(
          `UPDATE import_cells SET score = $1, status = $2, issue = NULL
           WHERE job_id = $3 AND row_id = $4 AND competency_id = $5`,
          [cell.score, status, jobId, rowId, cell.competencyId],
        );
      }
    }
  });
}

export interface CommitResult {
  applied: number;
  skippedUnmatched: number;
  skippedExisting: number;
}

/**
 * Aplica el staging a la libreta real. Filtra `status==='ok' AND score IS
 * NOT NULL` antes de construir `SaveEntryInput[]` — `saveGradeEntries`
 * interpreta `score: null` como DELETE (lib/grades/queries.ts), así que una
 * celda vacía mal filtrada aquí borraría una nota existente en vez de
 * simplemente no tocarla. `overwriteExisting=false` omite (no pisa)
 * cualquier celda donde ya exista una nota registrada.
 */
export async function commitStagedRows(args: {
  jobId: string;
  scope: GradeScope;
  registeredBy: string;
  overwriteExisting: boolean;
  ignoreUnmatched: boolean;
}): Promise<CommitResult> {
  const rows = await fetchStagedRows(args.jobId);

  let existingScores = new Map<string, number | null>();
  if (!args.overwriteExisting) {
    const existing = await query<{ student_id: string; competency_id: number; score: number | null }>(
      `SELECT student_id, competency_id, score::float AS score
       FROM competency_grades
       WHERE bimester = $1 AND year = $2
         AND student_id = ANY($3::uuid[])`,
      [args.scope.bimester, SCHOOL_YEAR, rows.map((r) => r.matchedStudentId).filter(Boolean)],
    );
    existingScores = new Map(existing.rows.map((r) => [`${r.student_id}:${r.competency_id}`, r.score]));
  }

  const entries: SaveEntryInput[] = [];
  let skippedUnmatched = 0;
  let skippedExisting = 0;

  for (const row of rows) {
    if (row.status !== "ok" || !row.matchedStudentId) {
      if (!args.ignoreUnmatched && row.status !== "omitido") skippedUnmatched++;
      continue;
    }
    for (const cell of row.cells) {
      if (cell.status !== "ok" || cell.score === null) continue; // celda vacía/inválida: nunca entra al commit
      const key = `${row.matchedStudentId}:${cell.competencyId}`;
      if (!args.overwriteExisting && existingScores.has(key)) {
        skippedExisting++;
        continue;
      }
      entries.push({ studentId: row.matchedStudentId, competencyId: cell.competencyId, score: cell.score });
    }
  }

  // Aserción defensiva: ninguna entrada de commit debe tener score null —
  // saveGradeEntries lo interpretaría como DELETE.
  if (entries.some((e) => e.score === null)) {
    throw new Error("Se intentó aplicar una celda vacía como nota — commit abortado por seguridad.");
  }

  if (entries.length > 0) {
    await saveGradeEntries(args.scope, entries, args.registeredBy);
  }

  return { applied: entries.length, skippedUnmatched, skippedExisting };
}
