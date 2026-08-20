/**
 * Barrel de los generadores de PDF institucionales. lib/report-pdf.ts (328
 * líneas, mezclaba constancia + boletín viejo n1/n2/n3) quedó retirado — se
 * troceó en constancia.ts (sin cambios de lógica) y libreta.ts +
 * libreta-parts.ts (nuevo, calca la libreta SIAGIE real). El boletín viejo
 * no se migró: pertenecía al modelo de notas por curso ya retirado.
 */
export * from "./theme";
export * from "./constancia";
export * from "./libreta";
