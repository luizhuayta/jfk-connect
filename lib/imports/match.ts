/**
 * Matching de alumnos del archivo importado contra el roster real — IJFK.
 *
 * Escalera determinista, de más a menos confiable. El paso más delicado es
 * "N° de orden": una hoja ordenada distinto de como el sistema ordena
 * (alfabético por nombre, igual que /teacher/grades) asignaría notas al
 * alumno equivocado EN SILENCIO — el peor bug posible en un importador de
 * notas. Por eso solo se activa si hay también una columna de nombre Y al
 * menos 80% de los pares (orden→nombre) del archivo coinciden con el
 * roster; si no, ese método queda deshabilitado para todo el lote.
 */

import type { RosterStudent, MatchMethod, RowStatus } from "@/lib/imports/types";
import { normalizeText, tokenSetKey } from "@/lib/imports/normalize";
import { similarity } from "@/lib/imports/levenshtein";

const FUZZY_MATCH_THRESHOLD = 0.88;
const FUZZY_AMBIGUOUS_THRESHOLD = 0.75;
const ORDER_MATCH_MIN_CONCORDANCE = 0.8;

export interface MatchInputRow {
  rowIndex: number;
  rawOrder: number | null;
  rawDni: string | null;
  rawName: string | null;
}

export interface MatchCandidate {
  studentId: string;
  name: string;
  score: number;
}

export interface MatchResult {
  rowIndex: number;
  matchedStudentId: string | null;
  method: MatchMethod | null;
  score: number | null;
  status: RowStatus;
  candidates: MatchCandidate[];
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** ¿Al menos el 80% de los pares (orden, nombre) del archivo coinciden con el roster? Decisión de LOTE, no por fila. */
function isOrderMatchReliable(rows: MatchInputRow[], roster: RosterStudent[]): boolean {
  const byOrder = new Map(roster.map((s) => [s.order, s]));
  const candidates = rows.filter((r) => r.rawOrder !== null && r.rawName);
  if (candidates.length === 0) return false;

  let matches = 0;
  for (const row of candidates) {
    const student = byOrder.get(row.rawOrder as number);
    if (!student) continue;
    const sim = similarity(normalizeText(row.rawName as string), normalizeText(student.fullName));
    if (sim >= 0.7) matches++;
  }
  return matches / candidates.length >= ORDER_MATCH_MIN_CONCORDANCE;
}

export function matchStudents(rows: MatchInputRow[], roster: RosterStudent[]): MatchResult[] {
  const byDni = new Map(roster.map((s) => [s.dni, s]));
  const byOrder = new Map(roster.map((s) => [s.order, s]));
  const byNormalizedName = new Map<string, RosterStudent[]>();
  const byTokenSet = new Map<string, RosterStudent[]>();
  for (const s of roster) {
    const normKey = normalizeText(s.fullName);
    const tokenKey = tokenSetKey(s.fullName);
    if (!byNormalizedName.has(normKey)) byNormalizedName.set(normKey, []);
    byNormalizedName.get(normKey)!.push(s);
    if (!byTokenSet.has(tokenKey)) byTokenSet.set(tokenKey, []);
    byTokenSet.get(tokenKey)!.push(s);
  }

  const orderMatchEnabled = isOrderMatchReliable(rows, roster);

  return rows.map((row): MatchResult => {
    // 1. DNI exacto. Sin longitud fija: el DNI peruano real es de 8 dígitos,
    // pero esta BD sembrada tiene una mezcla de 8 y 9 (dato ficticio de
    // scripts/seed-full.mjs) — fijar "===8" descartaría en silencio los de
    // 9 y el matching caería al escalón de nombre sin necesidad. El límite
    // inferior es solo para no matchear accidentalmente con un número corto.
    if (row.rawDni) {
      const digits = onlyDigits(row.rawDni);
      if (digits.length >= 6) {
        const student = byDni.get(digits);
        if (student) {
          return { rowIndex: row.rowIndex, matchedStudentId: student.id, method: "dni", score: 1, status: "ok", candidates: [] };
        }
      }
    }

    // 2. N° de orden (solo si el lote entero pasó el umbral de concordancia).
    if (orderMatchEnabled && row.rawOrder !== null) {
      const student = byOrder.get(row.rawOrder);
      if (student) {
        return { rowIndex: row.rowIndex, matchedStudentId: student.id, method: "orden", score: 0.9, status: "ok", candidates: [] };
      }
    }

    if (!row.rawName) {
      return { rowIndex: row.rowIndex, matchedStudentId: null, method: null, score: null, status: "sin_match", candidates: [] };
    }

    // 3. Nombre normalizado exacto.
    const normKey = normalizeText(row.rawName);
    const exactMatches = byNormalizedName.get(normKey) ?? [];
    if (exactMatches.length === 1) {
      return { rowIndex: row.rowIndex, matchedStudentId: exactMatches[0].id, method: "nombre_exacto", score: 0.99, status: "ok", candidates: [] };
    }

    // 4. Token-set (mismos tokens, distinto orden — "Apellidos, Nombres" vs "Nombres Apellidos").
    const tokenKey = tokenSetKey(row.rawName);
    const tokenMatches = byTokenSet.get(tokenKey) ?? [];
    if (tokenMatches.length === 1) {
      return {
        rowIndex: row.rowIndex,
        matchedStudentId: tokenMatches[0].id,
        method: "nombre_normalizado",
        score: 0.95,
        status: "ok",
        candidates: [],
      };
    }

    // 5. Fuzzy (Levenshtein) contra todo el roster.
    const scored = roster
      .map((s) => ({ studentId: s.id, name: s.fullName, score: similarity(normKey, normalizeText(s.fullName)) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score >= FUZZY_MATCH_THRESHOLD) {
      const second = scored[1];
      const unique = !second || second.score < FUZZY_MATCH_THRESHOLD;
      if (unique) {
        return { rowIndex: row.rowIndex, matchedStudentId: best.studentId, method: "fuzzy", score: best.score, status: "ok", candidates: [] };
      }
    }

    const candidates = scored.filter((c) => c.score >= FUZZY_AMBIGUOUS_THRESHOLD).slice(0, 3);
    if (candidates.length > 0) {
      return { rowIndex: row.rowIndex, matchedStudentId: null, method: null, score: null, status: "ambiguo", candidates };
    }

    return { rowIndex: row.rowIndex, matchedStudentId: null, method: null, score: null, status: "sin_match", candidates: [] };
  });
}
