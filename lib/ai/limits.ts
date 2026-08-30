/**
 * Configuración de rate limit por feature de IA — IJFK.
 *
 * Usa `lib/rate-limit.ts` (ya existente, in-memory sliding window) con la
 * misma convención de claves del resto de la app: "feature:dimension:valor".
 */

export const AI_LIMITS = {
  conclusions: { maxAttempts: 30, windowMs: 60 * 60 * 1000 },
  import_vision: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  import_upload: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  assistant: { maxAttempts: 30, windowMs: 15 * 60 * 1000 },
  assign_explain: { maxAttempts: 20, windowMs: 60 * 60 * 1000 },
} as const;

export type AiFeature = keyof typeof AI_LIMITS;
