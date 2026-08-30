/**
 * Punto de entrada único a la capa de IA — IJFK.
 *
 * Toda llamada a un proveedor de IA en la app pasa por `runAi()`:
 * habilitado → límite de tasa → presupuesto diario → ejecuta → registra en
 * ai_usage_log (éxito o fallo). Las funciones de cada feature (conclusiones,
 * importador, asistente, asignación) NO llaman a `chatCompletion`/
 * `requestJson` directamente — pasan su lógica como `fn` aquí, para que el
 * rate limit, el presupuesto y la auditoría sean uniformes en todas partes.
 */

import { isAiEnabled, getAiConfig } from "@/lib/ai/config";
import { rateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { AiError } from "@/lib/ai/errors";
import { recordAiUsage, getDailyTokenUsage, type AiUsageFeature } from "@/lib/ai/usage";
import type { TokenUsage } from "@/lib/ai/types";

export interface RunAiArgs<T> {
  usageFeature: AiUsageFeature;
  userId: string | null;
  rateLimitKey: string;
  rateLimitConfig: RateLimitConfig;
  refType?: string;
  refId?: string;
  meta?: Record<string, unknown>;
  fn: () => Promise<{ data: T; usage: TokenUsage; model: string }>;
}

/** Ejecuta una llamada de IA con límite de tasa, presupuesto diario y auditoría uniformes. */
export async function runAi<T>(args: RunAiArgs<T>): Promise<T> {
  if (!isAiEnabled()) {
    throw new AiError("disabled", "La IA está deshabilitada (AI_ENABLED=0 o falta AI_API_KEY).");
  }

  const limitResult = rateLimit(args.rateLimitKey, args.rateLimitConfig);
  if (!limitResult.ok) {
    throw new AiError("rate_limited", "Límite de solicitudes de IA excedido.", { retryable: true });
  }

  const cfg = getAiConfig();
  if (cfg.dailyTokenBudget > 0) {
    const used = await getDailyTokenUsage();
    if (used >= cfg.dailyTokenBudget) {
      throw new AiError("budget_exceeded", "Se alcanzó el presupuesto diario de tokens de IA.");
    }
  }

  const startedAt = Date.now();
  try {
    const result = await args.fn();
    recordAiUsage({
      feature: args.usageFeature,
      userId: args.userId,
      model: result.model,
      usage: result.usage,
      latencyMs: Date.now() - startedAt,
      ok: true,
      refType: args.refType,
      refId: args.refId,
      meta: args.meta,
    });
    return result.data;
  } catch (err) {
    recordAiUsage({
      feature: args.usageFeature,
      userId: args.userId,
      model: cfg.modelText,
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorKind: err instanceof AiError ? err.kind : "unknown",
      refType: args.refType,
      refId: args.refId,
      meta: args.meta,
    });
    throw err;
  }
}
