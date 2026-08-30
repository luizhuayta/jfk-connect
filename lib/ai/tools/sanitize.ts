/**
 * Saneamiento de resultados de herramientas antes de devolverlos al modelo
 * — IJFK.
 *
 * Dos motivos: (1) acotar el gasto de tokens — un resultado de BD sin
 * límite puede ser enorme; (2) reducir la superficie de inyección de
 * prompt — parte del contenido que viaja en resultados de herramientas lo
 * escriben usuarios (avisos, nombres), así que se trunca y se envuelve
 * antes de que el modelo lo vea. Ver lib/ai/redact.ts para la política de
 * PII (aplicada aparte, en la construcción del resultado de cada
 * herramienta, no aquí).
 */

const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_CHARS = 300;
const MAX_SERIALIZED_BYTES = 4096;

function truncateValue(value: unknown, depth: number): unknown {
  if (depth > 6) return "[demasiado profundo]";
  if (typeof value === "string") {
    return value.length > MAX_STRING_CHARS ? `${value.slice(0, MAX_STRING_CHARS)}…` : value;
  }
  if (Array.isArray(value)) {
    const truncated = value.slice(0, MAX_ARRAY_ITEMS).map((v) => truncateValue(v, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) truncated.push(`… (${value.length - MAX_ARRAY_ITEMS} más, omitidos)`);
    return truncated;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = truncateValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Trunca arrays a 20 ítems, strings a 300 caracteres, y el total serializado a 4 KB. Aplicar SIEMPRE antes de devolver un resultado de herramienta al modelo. */
export function sanitizeToolResult(result: unknown): unknown {
  const truncated = truncateValue(result, 0);
  const serialized = JSON.stringify(truncated);
  if (serialized.length <= MAX_SERIALIZED_BYTES) return truncated;
  return { error: "El resultado es demasiado grande para mostrarse. Refina tu consulta." };
}

/** Envuelve texto escrito por un usuario (avisos, nombres) entre delimitadores, para que el modelo no lo confunda con instrucciones. */
export function wrapUserText(text: string): string {
  return `<<<texto_de_usuario>>>${text}<<<fin>>>`;
}
