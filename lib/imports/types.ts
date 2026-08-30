/**
 * Tipos compartidos del importador de notas — IJFK.
 *
 * Un `ParsedSheet` es la representación común a la que convergen los tres
 * orígenes posibles (xlsx, csv, foto vía IA de visión) ANTES de tocar
 * ningún dato del alumno — el resto del pipeline (detección de columnas,
 * matching, staging) es el mismo código sin importar de dónde vino.
 */

export interface ParsedSheet {
  sheetName: string;
  /** Filas crudas, tal cual aparecen en el archivo — sin encabezado separado todavía. */
  rows: string[][];
}

export interface ColumnMap {
  headerRowIndex: number;
  orderCol: number | null;
  dniCol: number | null;
  nameCol: number | null;
  /** competencyId -> índice de columna. Solo competencias mapeadas con confianza. */
  competencyCols: Map<number, number>;
  /** Columnas que parecían de competencia pero no se pudieron mapear con confianza. */
  unmapped: { columnIndex: number; label: string }[];
}

export type MatchMethod = "dni" | "orden" | "nombre_exacto" | "nombre_normalizado" | "fuzzy" | "ia" | "manual";
export type RowStatus = "ok" | "ambiguo" | "sin_match" | "omitido";

export interface StagedRow {
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
  /** competencyId -> {score, raw, status}. */
  cells: Map<number, StagedCell>;
}

export type CellStatus = "ok" | "invalido" | "vacio" | "sin_mapear";

export interface StagedCell {
  competencyId: number;
  columnLabel: string | null;
  rawValue: string | null;
  score: number | null;
  status: CellStatus;
  issue: string | null;
}

export interface RosterStudent {
  id: string;
  dni: string;
  fullName: string;
  order: number;
}
