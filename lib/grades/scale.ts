/**
 * Escala oficial de nivel de logro (libreta SIAGIE). Reemplaza a
 * lib/letter-grade.ts (escala vieja A/B/C/D, ya retirada).
 *
 * C: 0-10 (En inicio) · B: 11-15 (En proceso) · A: 16-17 (Logro esperado) ·
 * AD: 18-20 (Logro destacado).
 *
 * Fuente de verdad SQL en supabase/migrations/00000000000008_competencias.sql
 * (función nivel_logro) — mantener ambas en sync si la escala cambia.
 */

export type Level = "AD" | "A" | "B" | "C";

export const LEVELS: Level[] = ["AD", "A", "B", "C"];

export const LEVEL_LABEL: Record<Level, string> = {
  AD: "Logro destacado",
  A: "Logro esperado",
  B: "En proceso",
  C: "En inicio",
};

export const LEVEL_RANGE: Record<Level, string> = {
  AD: "18 - 20",
  A: "16 - 17",
  B: "11 - 15",
  C: "0 - 10",
};

/** Colores hex planos (sin clases Tailwind) para usarlos en jsPDF. */
export const LEVEL_RGB: Record<Level, [number, number, number]> = {
  AD: [16, 150, 105], // emerald-600
  A: [37, 99, 235], // blue-600
  B: [217, 119, 6], // amber-600
  C: [220, 38, 38], // red-600
};

export function levelFromScore(score: number | null | undefined): Level | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (score >= 18) return "AD";
  if (score >= 16) return "A";
  if (score >= 11) return "B";
  return "C";
}

/** Atajo: "13.5" → "En proceso" directamente, sin pasar por levelFromScore. */
export function levelLabelFromScore(score: number | null | undefined): string {
  const level = levelFromScore(score);
  return level ? LEVEL_LABEL[level] : "—";
}

export function levelBadgeClass(level: Level | null): string {
  switch (level) {
    case "AD":
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    case "A":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "B":
      return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    case "C":
      return "bg-red-100 text-red-600 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-500 hover:bg-gray-100";
  }
}

export function levelTextClass(level: Level | null): string {
  switch (level) {
    case "AD":
      return "text-emerald-600";
    case "A":
      return "text-blue-600";
    case "B":
      return "text-amber-600";
    case "C":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

/** Color del número (score) crudo, no de la letra — usado en la celda de captura. */
export function scoreTextClass(score: number | null | undefined): string {
  const level = levelFromScore(score);
  return levelTextClass(level);
}

/**
 * Nivel más frecuente de un conjunto de competencias calificadas — usado en
 * resúmenes del panel del padre (tarjetas de bimestre, dashboard) donde no
 * corresponde promediar números (SIAGIE no promedia competencias) ni
 * exponer la nota 0-20. Empate → se queda con el primero encontrado, que en
 * los usos actuales llega ya ordenado por área/competencia.
 */
export function dominantLevel(levels: (Level | null | undefined)[]): Level | null {
  const counts = new Map<Level, number>();
  for (const l of levels) {
    if (!l) continue;
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  let best: Level | null = null;
  let bestCount = 0;
  for (const level of LEVELS) {
    const count = counts.get(level) ?? 0;
    if (count > bestCount) {
      best = level;
      bestCount = count;
    }
  }
  return best;
}
