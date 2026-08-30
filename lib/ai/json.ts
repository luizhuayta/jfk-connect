/**
 * Salida estructurada validada con Zod — IJFK.
 *
 * El output del modelo NUNCA se usa sin pasar por `schema.safeParse()`. zod
 * 4.4.3 trae `z.toJSONSchema()`, así que el mismo schema sirve para pedirle
 * al proveedor el formato (`json_schema`/`json_object`) y para validar lo
 * que responde — un solo lugar de verdad, no dos definiciones que se puedan
 * desincronizar.
 */

import { z, type ZodType, type infer as zInfer } from "zod";
import { getAiConfig } from "@/lib/ai/config";
import { chatCompletion } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import type { ChatMessage, TokenUsage } from "@/lib/ai/types";

export interface RequestJsonArgs<T extends ZodType> {
  schema: T;
  schemaName: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface RequestJsonResult<T> {
  data: T;
  usage: TokenUsage;
  model: string;
}

/** Extrae el primer bloque {...} o [...] de un texto — algunos modelos envuelven la respuesta en ```json ... ```. */
function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate;
  const openChar = candidate[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(closeChar);
  if (end === -1 || end < start) return candidate;
  return candidate.slice(start, end + 1);
}

/** Pide una respuesta JSON al modelo y la valida contra `schema`. Lanza AiError("invalid_response") si no calza. */
export async function requestJson<T extends ZodType>(
  args: RequestJsonArgs<T>,
): Promise<RequestJsonResult<zInfer<T>>> {
  const cfg = getAiConfig();
  const model = args.model ?? cfg.modelText;

  const response = await chatCompletion({
    model,
    messages: args.messages,
    max_tokens: args.maxTokens ?? cfg.maxOutputTokens,
    temperature: args.temperature ?? 0.3,
    response_format: cfg.supportsJsonSchema
      ? {
          type: "json_schema",
          json_schema: {
            name: args.schemaName,
            strict: true,
            schema: z.toJSONSchema(args.schema) as Record<string, unknown>,
          },
        }
      : { type: "json_object" },
  });

  const choice = response.choices[0];
  const rawContent = choice?.message.content;
  const text = typeof rawContent === "string" ? rawContent : "";
  if (!text) {
    throw new AiError("invalid_response", "El proveedor de IA devolvió una respuesta vacía.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonBlock(text));
  } catch {
    throw new AiError("invalid_response", "La IA no devolvió un JSON válido.");
  }

  const result = args.schema.safeParse(parsedJson);
  if (!result.success) {
    throw new AiError("invalid_response", "La respuesta de la IA no cumple el formato esperado.");
  }

  return {
    data: result.data as zInfer<T>,
    usage: response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: response.model,
  };
}
