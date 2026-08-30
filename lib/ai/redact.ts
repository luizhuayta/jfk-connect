/**
 * Política de anonimización (PII de menores) — IJFK.
 *
 * Regla dura, aplicada en `runAi()` antes de serializar cualquier body hacia
 * el proveedor de IA:
 *   - NUNCA sale: DNI, email, teléfono, enrollment_code, UUIDs, apellidos
 *     completos.
 *   - SÍ sale: primer nombre, alias (A01, A02...), grado/sección, nombre de
 *     área/competencia, nota 0-20, nivel AD/A/B/C, fechas agregadas.
 *
 * `scrubOutbound` es una red de seguridad final por regex, NO la defensa
 * principal — la defensa principal es que las funciones que arman el prompt
 * (conclusiones, importador, asistente) solo leen y envían los campos que
 * esta política permite, nunca la fila completa de `students`/`users`.
 */

export interface AliasedItem {
  id: string;
}

export type AliasMap = Map<string, string>; // id real -> alias (A01, A02, ...)

/** Primer nombre de un nombre completo ("Juan Carlos Pérez López" -> "Juan"). */
export function firstNameOnly(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

/** Asigna un alias corto y estable (A01, A02, ...) a cada item, en el orden dado. */
export function buildAliases<T extends AliasedItem>(items: T[]): AliasMap {
  const map: AliasMap = new Map();
  items.forEach((item, index) => {
    map.set(item.id, `A${String(index + 1).padStart(2, "0")}`);
  });
  return map;
}

/** Revierte alias -> id real. Útil al leer de vuelta la respuesta del modelo (que solo conoce alias). */
export function rehydrate(alias: string, map: AliasMap): string | null {
  for (const [id, a] of map) {
    if (a === alias) return id;
  }
  return null;
}

const DNI_RE = /\b\d{8}\b/g;
const CELULAR_PE_RE = /\b9\d{8}\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * Red de seguridad final: aplica sobre cualquier string que vaya a salir
 * hacia el proveedor de IA. No reemplaza construir el prompt correctamente
 * (solo alias + primer nombre + datos académicos) — es la última barrera
 * por si algo se coló.
 */
export function scrubOutbound(text: string): string {
  return text
    .replace(EMAIL_RE, "[correo]")
    .replace(UUID_RE, "[id]")
    .replace(CELULAR_PE_RE, "[celular]")
    .replace(DNI_RE, "[dni]");
}

/** Solo para desarrollo: lanza si detecta un patrón de PII obvio. No usar en producción — scrubOutbound ya cubre ese caso silenciosamente. */
export function assertNoPii(text: string): void {
  // Instancias nuevas en vez de las constantes del módulo: con flag "g",
  // .test() reusado entre llamadas arrastra lastIndex y da falsos negativos.
  const hasMatch = [/\b\d{8}\b/, /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i].some(
    (re) => re.test(text),
  );
  if (hasMatch) {
    throw new Error("Se detectó un patrón de PII en un texto destinado al proveedor de IA.");
  }
}
