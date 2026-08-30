/**
 * Año lectivo activo. Antes estaba escrito a mano ("2026") en los subtítulos de
 * 5 páginas del panel padre y en las llamadas a los PDFs (boletín/constancia),
 * así que cambiar de año obligaba a tocar 8 archivos.
 */
export const SCHOOL_YEAR = 2026;

/** Texto listo para subtítulos: "Año Lectivo 2026". */
export const SCHOOL_YEAR_LABEL = `Año Lectivo ${SCHOOL_YEAR}`;

/**
 * Rangos de fecha aproximados de cada bimestre — se usan para agregar la
 * asistencia por bimestre en la libreta (/api/libreta). APROXIMADOS: no
 * hay todavía un calendario lectivo oficial cargado en el sistema; ajustar
 * cuando exista. El seed de datos demo solo genera asistencia de marzo a
 * mayo, así que B3/B4 saldrán en cero en el entorno demo — es correcto,
 * no un bug.
 */
export function bimesterRangesForYear(
  year: number,
): Record<1 | 2 | 3 | 4, { start: string; end: string }> {
  return {
    1: { start: `${year}-03-01`, end: `${year}-04-30` },
    2: { start: `${year}-05-01`, end: `${year}-06-30` },
    3: { start: `${year}-07-01`, end: `${year}-09-15` },
    4: { start: `${year}-09-16`, end: `${year}-12-15` },
  };
}

export const BIMESTER_RANGES = bimesterRangesForYear(SCHOOL_YEAR);

/** Rango calendario del año lectivo (1 ene – 31 dic del año). */
export function calendarYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
