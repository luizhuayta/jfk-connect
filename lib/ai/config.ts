/**
 * Configuración de la capa de IA — IJFK.
 *
 * Un solo adaptador OpenAI-compatible (fetch plano contra /chat/completions)
 * cubre OpenRouter, DeepSeek, xAI (Grok), Google (endpoint compat) y Groq —
 * cambiar de proveedor es cambiar AI_BASE_URL + AI_API_KEY + los dos ids de
 * modelo, sin tocar código. Ver .env.example para el detalle de cada
 * variable y las URLs de cada proveedor.
 *
 * `getAiConfig()` valida en la PRIMERA llamada, no al importar el módulo:
 * si validara al importar, "next build" (que importa las rutas API al
 * recolectar datos de página) fallaría en cualquier entorno sin
 * AI_API_KEY configurada — el mismo problema que ya existe con JWT_SECRET
 * (ver Dockerfile).
 */

import { z } from "zod";

const envSchema = z.object({
  AI_ENABLED: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL_TEXT: z.string().optional(),
  AI_MODEL_VISION: z.string().optional(),
  AI_TIMEOUT_MS: z.string().optional(),
  AI_MAX_RETRIES: z.string().optional(),
  AI_MAX_OUTPUT_TOKENS: z.string().optional(),
  AI_SUPPORTS_JSON_SCHEMA: z.string().optional(),
  AI_SUPPORTS_TOOLS: z.string().optional(),
  AI_SUPPORTS_VISION: z.string().optional(),
  AI_EXTRA_HEADERS: z.string().optional(),
  AI_DAILY_TOKEN_BUDGET: z.string().optional(),
  AI_LOG_PROMPTS: z.string().optional(),
});

export interface AiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  modelText: string;
  modelVision: string;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens: number;
  supportsJsonSchema: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  extraHeaders: Record<string, string>;
  dailyTokenBudget: number;
  logPrompts: boolean;
}

function bool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

let cached: AiConfig | null = null;

/** Config leída y validada de `process.env`, cacheada en memoria del proceso (mismo patrón que fetchCatalog). */
export function getAiConfig(): AiConfig {
  if (cached) return cached;

  const env = envSchema.parse(process.env);

  let extraHeaders: Record<string, string> = {};
  if (env.AI_EXTRA_HEADERS) {
    try {
      const parsed: unknown = JSON.parse(env.AI_EXTRA_HEADERS);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extraHeaders = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        );
      }
    } catch {
      // AI_EXTRA_HEADERS mal formado: se ignora en vez de romper el arranque.
    }
  }

  cached = {
    enabled: bool(env.AI_ENABLED, false),
    baseUrl: env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey: env.AI_API_KEY ?? "",
    modelText: env.AI_MODEL_TEXT ?? "deepseek/deepseek-chat",
    modelVision: env.AI_MODEL_VISION ?? "google/gemini-2.5-flash",
    timeoutMs: num(env.AI_TIMEOUT_MS, 45_000),
    maxRetries: num(env.AI_MAX_RETRIES, 2),
    maxOutputTokens: num(env.AI_MAX_OUTPUT_TOKENS, 1200),
    supportsJsonSchema: bool(env.AI_SUPPORTS_JSON_SCHEMA, true),
    supportsTools: bool(env.AI_SUPPORTS_TOOLS, true),
    supportsVision: bool(env.AI_SUPPORTS_VISION, true),
    extraHeaders,
    dailyTokenBudget: num(env.AI_DAILY_TOKEN_BUDGET, 2_000_000),
    logPrompts: bool(env.AI_LOG_PROMPTS, false),
  };
  return cached;
}

/** ¿Hay IA disponible? (AI_ENABLED=1 Y hay una API key configurada). Toda la UI de IA se debe ocultar si esto es false. */
export function isAiEnabled(): boolean {
  const cfg = getAiConfig();
  return cfg.enabled && cfg.apiKey.length > 0;
}

/** Solo para tests/scripts que necesiten forzar una relectura de env. */
export function invalidateAiConfigCache(): void {
  cached = null;
}
