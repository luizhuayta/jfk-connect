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
export const BIMESTER_RANGES: Record<1 | 2 | 3 | 4, { start: string; end: string }> = {
  1: { start: `${SCHOOL_YEAR}-03-01`, end: `${SCHOOL_YEAR}-04-30` },
  2: { start: `${SCHOOL_YEAR}-05-01`, end: `${SCHOOL_YEAR}-06-30` },
  3: { start: `${SCHOOL_YEAR}-07-01`, end: `${SCHOOL_YEAR}-09-15` },
  4: { start: `${SCHOOL_YEAR}-09-16`, end: `${SCHOOL_YEAR}-12-15` },
};
