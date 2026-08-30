/**
 * Normalización de texto compartida por detección de columnas y matching de
 * alumnos — IJFK. NFD → quitar diacríticos → mayúsculas → colapsar
 * espacios → quitar puntuación. Determinista, sin dependencias.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    // Tras NFD, cada letra acentuada queda como base + marca combinante
    // separada (categoría Unicode "Mark") — quitarlas deja solo la base.
    .replace(/\p{Mark}/gu, "")
    .toUpperCase()
    .replace(/[.,;:¡!¿?"'()[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens ordenados alfabéticamente — para comparar "PEREZ LOPEZ, JUAN" vs "JUAN PEREZ LOPEZ" sin que el orden importe. */
export function tokenSetKey(text: string): string {
  return normalizeText(text).split(" ").filter(Boolean).sort().join(" ");
}
