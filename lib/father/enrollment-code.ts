/**
 * Formato del código de matrícula — IJFK.
 *
 * `{año}-{gradoNum}{sección}-{seq4}` p. ej. `2026-2A-0042`.
 * Módulo puro (sin BD) para poder usarlo también en el cliente del asistente.
 */

/** Extrae un código embebido en texto libre (asistente). */
export const ENROLLMENT_CODE_RE = /\b(\d{4}-\d{1,2}[A-Za-z]-\d{4})\b/i;

/** El string entero es un código (validación de body REST). */
export const ENROLLMENT_CODE_EXACT_RE = /^\d{4}-\d{1,2}[A-Za-z]-\d{4}$/i;

export function extractEnrollmentCode(text: string): string | null {
  const match = text.match(ENROLLMENT_CODE_RE);
  return match?.[1] ? match[1].toUpperCase() : null;
}

export function redactEnrollmentCodes(text: string): string {
  return text.replace(/\b\d{4}-\d{1,2}[A-Za-z]-\d{4}\b/gi, "[codigo_matricula]");
}
