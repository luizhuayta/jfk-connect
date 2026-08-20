/**
 * Turno de una sección a partir de su letra: A-F es turno Mañana, G-M es
 * turno Tarde (mismo criterio que `shiftForSection` en
 * `scripts/seed-full.mjs` — se mantienen ambos en sync porque uno es JS de
 * seed y el otro TS de la app).
 */
export function sectionShift(section: string): "Mañana" | "Tarde" {
  return section <= "F" ? "Mañana" : "Tarde";
}
