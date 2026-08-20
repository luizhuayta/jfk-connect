/**
 * Fuente única de la lista de bimestres y de la regla "¿está abierto para
 * captura?". Antes `BIMESTERS = ["1","2","3","4"]` estaba copiado en 3
 * archivos y `isLocked` (B3/B4 bloqueados) se repetía a mano en el cliente
 * y en el servidor por separado, pudiendo desincronizarse.
 */

export const BIMESTERS = ["1", "2", "3", "4"] as const;
export type BimesterLabel = (typeof BIMESTERS)[number];

/** Bimestre por defecto al abrir la grilla de captura. */
export const CURRENT_BIMESTER = 2;

/**
 * Bimestres 1 y 2 abiertos a captura; 3 y 4 bloqueados (aún no llega el
 * calendario lectivo a esa altura). Única fuente — la usan tanto el cliente
 * (deshabilitar inputs) como el servidor (rechazar el PUT con 403).
 */
export function isBimesterOpen(bimester: number): boolean {
  return bimester === 1 || bimester === 2;
}
