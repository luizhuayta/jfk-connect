/**
 * Contabilidad de uso de IA — IJFK.
 *
 * `recordAiUsage` es fire-and-forget: un fallo al escribir el log de
 * auditoría nunca debe tumbar la función que sí le respondió al usuario.
 * `getDailyTokenUsage` alimenta el freno de gasto (AI_DAILY_TOKEN_BUDGET),
 * con una caché corta en memoria para no pegarle a la BD en cada llamada de
 * IA.
 */

import { query, queryOne } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { TokenUsage } from "@/lib/ai/types";

/** Debe calzar exactamente con el CHECK de ai_usage_log.feature en la migración 010. */
export type AiUsageFeature = "conclusions" | "import_vision" | "import_match" | "assistant" | "assignment";

export interface RecordAiUsageInput {
  feature: AiUsageFeature;
  userId: string | null;
  model: string;
  usage?: TokenUsage;
  latencyMs: number;
  ok: boolean;
  errorKind?: string;
  refType?: string;
  refId?: string;
  meta?: Record<string, unknown>;
}

/** Inserta una fila en ai_usage_log. Nunca lanza — un fallo de auditoría no debe romper la función que sí respondió. */
export function recordAiUsage(input: RecordAiUsageInput): void {
  void query(
    `INSERT INTO ai_usage_log
       (feature, user_id, model, prompt_tokens, completion_tokens, total_tokens,
        latency_ms, ok, error_kind, ref_type, ref_id, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      input.feature,
      input.userId,
      input.model,
      input.usage?.prompt_tokens ?? null,
      input.usage?.completion_tokens ?? null,
      input.usage?.total_tokens ?? null,
      input.latencyMs,
      input.ok,
      input.errorKind ?? null,
      input.refType ?? null,
      input.refId ?? null,
      JSON.stringify(input.meta ?? {}),
    ],
  ).catch((err: unknown) => {
    logger.error({ err, feature: input.feature }, "no se pudo registrar ai_usage_log");
  });
}

let dailyUsageCache: { total: number; expiresAt: number } | null = null;
const DAILY_USAGE_CACHE_MS = 60_000;

/** Total de tokens consumidos hoy (UTC), con caché de 60s para no consultar la BD en cada llamada de IA. */
export async function getDailyTokenUsage(): Promise<number> {
  const now = Date.now();
  if (dailyUsageCache && dailyUsageCache.expiresAt > now) {
    return dailyUsageCache.total;
  }
  const row = await queryOne<{ total: string | null }>(
    `SELECT sum(total_tokens) AS total FROM ai_usage_log WHERE created_at >= date_trunc('day', now())`,
  );
  const total = row?.total ? Number(row.total) : 0;
  dailyUsageCache = { total, expiresAt: now + DAILY_USAGE_CACHE_MS };
  return total;
}
