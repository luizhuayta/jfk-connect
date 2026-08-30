/**
 * Parseo de una celda de nota (importador) — IJFK.
 *
 * `competency_grades.level` es una columna GENERADA a partir de `score`
 * (ver nivel_logro() en supabase/migrations/00000000000008_competencias.sql)
 * — convertir una letra (AD/A/B/C) a un número inventaría precisión que no
 * existe (¿"B" es 11 o 15?), así que se rechaza explícitamente en vez de
 * adivinar. Queda anotado como trabajo futuro con un flag explícito, no
 * como comportamiento por defecto.
 */

export interface ParsedScore {
  score: number | null;
  issue: string | null;
}

const LETTER_LEVELS = new Set(["AD", "A", "B", "C"]);

export function parseScore(raw: string | null | undefined): ParsedScore {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "—") {
    return { score: null, issue: null }; // celda vacía, no es un error
  }

  const upper = trimmed.toUpperCase();
  if (LETTER_LEVELS.has(upper)) {
    return {
      score: null,
      issue: 'La libreta guarda notas de 0 a 20; sube el archivo con la nota numérica, no la letra de nivel.',
    };
  }

  // Acepta "18", "18,5", "18.5", "18.50" — coma o punto decimal.
  const normalized = trimmed.replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) {
    return { score: null, issue: `Valor no reconocido como nota: "${trimmed}".` };
  }

  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0 || value > 20) {
    return { score: null, issue: `La nota debe estar entre 0 y 20 (se leyó "${trimmed}").` };
  }

  return { score: Math.round(value * 100) / 100, issue: null };
}
