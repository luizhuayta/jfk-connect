/**
 * Detección de columnas (fila de cabecera, identidad, competencias) —
 * IJFK.
 *
 * Regla de oro: lo que no se mapea con confianza va a `unmapped[]`, NUNCA
 * se adivina. La UI de revisión permite mapearlo a mano con un `<select>`.
 * Un mapeo incorrecto de columna de competencia es tan grave como un
 * matching de alumno incorrecto (nota en la competencia equivocada).
 */

import type { Competency } from "@/lib/curriculum/types";
import type { ColumnMap, ParsedSheet } from "@/lib/imports/types";
import { normalizeText } from "@/lib/imports/normalize";
import { similarity } from "@/lib/imports/levenshtein";

const HEADER_ROW_SEARCH_LIMIT = 15;
const HEADER_HINT_RE = /APELLIDOS?\s*Y\s*NOMBRES?|ALUMNO|ESTUDIANTE|NOMBRE/;
const ORDER_HEADER_RE = /^N[°º]?\.?$|^NRO\.?$|^ORDEN$|^#$/;
const DNI_HEADER_RE = /^DNI$|^D N I$/;
const COMP_INDEX_RE = /^C(?:OMP(?:ETENCIA)?)?\.?\s*(\d+)$/;

function findHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, HEADER_ROW_SEARCH_LIMIT);
  for (let i = 0; i < limit; i++) {
    const rowText = normalizeText(rows[i].join(" "));
    if (HEADER_HINT_RE.test(rowText)) return i;
  }
  return 0; // fallback: si nada calza, se asume la primera fila
}

/** ¿Este header de columna corresponde a esta competencia, con confianza razonable? */
function matchesCompetency(headerNorm: string, competency: Competency, orderInScope: number): boolean {
  const nameNorm = normalizeText(competency.name);
  const codeNorm = normalizeText(competency.code);

  if (headerNorm === nameNorm || headerNorm === codeNorm) return true;

  const indexMatch = COMP_INDEX_RE.exec(headerNorm);
  if (indexMatch && Number(indexMatch[1]) === orderInScope) return true;

  // Substring en cualquier dirección, solo si el texto es suficientemente
  // largo como para no ser un falso positivo (evita que "COM" matchee
  // "Comprende..." de cualquier competencia por casualidad).
  if (headerNorm.length >= 8 && (nameNorm.includes(headerNorm) || headerNorm.includes(nameNorm))) return true;

  return similarity(headerNorm, nameNorm) >= 0.75;
}

export function detectColumns(sheet: ParsedSheet, competenciesInScope: Competency[]): ColumnMap {
  const headerRowIndex = findHeaderRow(sheet.rows);
  const headerRow = sheet.rows[headerRowIndex] ?? [];

  let orderCol: number | null = null;
  let dniCol: number | null = null;
  let nameCol: number | null = null;
  const competencyCols = new Map<number, number>();
  const unmapped: { columnIndex: number; label: string }[] = [];

  const sortedCompetencies = [...competenciesInScope].sort((a, b) => a.order - b.order);

  headerRow.forEach((rawLabel, colIndex) => {
    const label = (rawLabel ?? "").trim();
    if (!label) return;
    const norm = normalizeText(label);

    if (ORDER_HEADER_RE.test(norm)) {
      if (orderCol === null) orderCol = colIndex;
      return;
    }
    if (DNI_HEADER_RE.test(norm)) {
      if (dniCol === null) dniCol = colIndex;
      return;
    }
    if (nameCol === null && HEADER_HINT_RE.test(norm)) {
      nameCol = colIndex;
      return;
    }

    const matched = sortedCompetencies.find((c, idx) => matchesCompetency(norm, c, idx + 1));
    if (matched) {
      if (!competencyCols.has(matched.id)) competencyCols.set(matched.id, colIndex);
    } else {
      unmapped.push({ columnIndex: colIndex, label });
    }
  });

  return { headerRowIndex, orderCol, dniCol, nameCol, competencyCols, unmapped };
}
