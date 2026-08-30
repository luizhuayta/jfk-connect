/**
 * Orquesta detect.ts + match.ts + score.ts sobre un ParsedSheet (venga de
 * xlsx, csv, o foto vía OCR) y produce las filas listas para
 * `replaceStagedRows` — IJFK. Es el único lugar donde se combinan las tres
 * piezas, así que el path de Excel/CSV y el de foto pasan por exactamente
 * el mismo código a partir de aquí.
 */

import type { Competency } from "@/lib/curriculum/types";
import type { ParsedSheet, ColumnMap, RowStatus } from "@/lib/imports/types";
import type { StagedRowInput, StagedCellInput } from "@/lib/imports/jobs";
import type { RosterStudent } from "@/lib/imports/types";
import { detectColumns } from "@/lib/imports/detect";
import { matchStudents, type MatchInputRow } from "@/lib/imports/match";
import { parseScore } from "@/lib/imports/score";

export interface ProcessResult {
  columnMap: ColumnMap;
  rows: StagedRowInput[];
}

function parseIntOrNull(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function processSheet(
  sheet: ParsedSheet,
  competenciesInScope: Competency[],
  roster: RosterStudent[],
): ProcessResult {
  const columnMap = detectColumns(sheet, competenciesInScope);
  const headerRow = sheet.rows[columnMap.headerRowIndex] ?? [];
  const dataRows = sheet.rows.slice(columnMap.headerRowIndex + 1).filter((r) => r.some((cell) => (cell ?? "").trim() !== ""));

  const matchInputs: MatchInputRow[] = dataRows.map((cells, i) => ({
    rowIndex: i,
    rawOrder: columnMap.orderCol !== null ? parseIntOrNull(cells[columnMap.orderCol]) : null,
    rawDni: columnMap.dniCol !== null ? (cells[columnMap.dniCol] ?? null) : null,
    rawName: columnMap.nameCol !== null ? (cells[columnMap.nameCol] ?? null) || null : null,
  }));

  const matches = matchStudents(matchInputs, roster);
  const matchByRow = new Map(matches.map((m) => [m.rowIndex, m]));

  const rows: StagedRowInput[] = dataRows.map((cells, i) => {
    const match = matchByRow.get(i);
    const raw: Record<string, string> = {};
    headerRow.forEach((label, idx) => {
      if (label) raw[label] = cells[idx] ?? "";
    });

    const stagedCells: StagedCellInput[] = [];
    for (const [competencyId, colIndex] of columnMap.competencyCols) {
      const rawValue = cells[colIndex] ?? "";
      const parsed = parseScore(rawValue);
      stagedCells.push({
        competencyId,
        columnLabel: headerRow[colIndex] ?? null,
        rawValue,
        score: parsed.score,
        status: parsed.issue ? "invalido" : rawValue.trim() === "" ? "vacio" : "ok",
        issue: parsed.issue,
      });
    }

    const rowIssues: string[] = [];
    if (match && match.status === "ambiguo") {
      rowIssues.push(
        `Coincidencia ambigua: ${match.candidates.map((c) => `${c.name} (${Math.round(c.score * 100)}%)`).join(", ")}`,
      );
    }
    if (match && match.status === "sin_match") {
      rowIssues.push("No se encontró ningún alumno del roster que coincida con esta fila.");
    }

    const status: RowStatus = match?.status ?? "sin_match";

    return {
      rowIndex: i,
      raw,
      rawOrder: matchInputs[i].rawOrder,
      rawDni: matchInputs[i].rawDni,
      rawName: matchInputs[i].rawName,
      matchedStudentId: match?.matchedStudentId ?? null,
      matchMethod: match?.method ?? null,
      matchScore: match?.score ?? null,
      status,
      issues: rowIssues,
      cells: stagedCells,
    };
  });

  return { columnMap, rows };
}
