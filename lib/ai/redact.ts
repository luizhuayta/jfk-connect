/**
 * Política de anonimización (PII de menores) — IJFK.
 *
 * Regla dura, aplicada en `chatCompletion()` (lib/ai/client.ts) sobre todo
 * string de mensajes / tool_calls que va al proveedor, y al persistir
 * historial en `appendTurn`:
 *   - NUNCA sale: DNI, email, teléfono, enrollment_code, UUIDs, apellidos
 *     completos.
 *   - SÍ sale: primer nombre, alias (A01, A02...), grado/sección, nombre de
 *     área/competencia, nota 0-20 (solo docente/conclusiones), nivel AD/A/B/C,
 *     fechas agregadas.
 *
 * `scrubOutbound` es una red de seguridad final por regex, NO la defensa
 * principal — la defensa principal es que las funciones que arman el prompt
 * (conclusiones, importador, asistente) solo leen y envían los campos que
 * esta política permite, nunca la fila completa de `students`/`users`.
 *
 * Las URLs de imagen (OCR del importador) no se scrubbean: un regex sobre
 * base64 corrompería la foto. Ese camino es un riesgo aceptado y documentado.
 */

import type { ChatCompletionRequest, ChatMessage, ContentPart, ToolCall } from "@/lib/ai/types";

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

/**
 * Primer nombre + inicial del último apellido ("Juan Carlos Pérez López" -> "Juan L.").
 * Para admin: distingue homónimos sin mandar apellidos completos al proveedor.
 */
export function firstNameAndLastInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const initial = parts[parts.length - 1].charAt(0);
  return `${parts[0]} ${initial.toUpperCase()}.`;
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

/**
 * Red de seguridad final: aplica sobre cualquier string que vaya a salir
 * hacia el proveedor de IA. Regex inline (no constantes /g del módulo) para
 * no arrastrar lastIndex entre llamadas.
 */
export function scrubOutbound(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[correo]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\b\d{4}-\d{1,2}[A-Za-z]-\d{4}\b/gi, "[codigo_matricula]")
    .replace(/\b9\d{8}\b/g, "[celular]")
    .replace(/\b\d{8}\b/g, "[dni]");
}

function scrubContent(content: ChatMessage["content"]): ChatMessage["content"] {
  if (typeof content === "string") return scrubOutbound(content);
  if (Array.isArray(content)) {
    return content.map((part: ContentPart) => {
      if (part.type === "text") return { ...part, text: scrubOutbound(part.text) };
      return part;
    });
  }
  return content;
}

function scrubToolCalls(calls: ToolCall[] | undefined): ToolCall[] | undefined {
  if (!calls) return calls;
  return calls.map((tc) => ({
    ...tc,
    function: {
      ...tc.function,
      arguments: scrubOutbound(tc.function.arguments),
    },
  }));
}

/** Copia el request hacia el proveedor con PII obvia tapada. No toca tool defs ni data-URLs. */
export function scrubChatRequest(body: ChatCompletionRequest): ChatCompletionRequest {
  return {
    ...body,
    messages: body.messages.map((m) => ({
      ...m,
      content: scrubContent(m.content),
      tool_calls: scrubToolCalls(m.tool_calls),
    })),
  };
}
