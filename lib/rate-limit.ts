/**
 * Rate limiting en memoria para API routes de autenticación — IJFK
 * =============================================================================
 * Previene fuerza bruta / credential stuffing / bombardeo de emails limitando
 * el número de intentos por ventana deslizante.
 *
 * Estrategia:
 *   - Límite por IP (atacante desde una sola máquina).
 *   - Límite por email destino (protege a una cuenta concreta aunque el
 *     atacante venga de varias IPs) — útil en login y forgot-password.
 *
 * Almacenamiento: un Map en memoria. Como la app corre en una sola instancia
 * (contenedor Docker), esto es suficiente sin añadir queries a la BD ni
 * dependencias de Redis. Notas:
 *   - El estado se pierde con un reinicio del proceso (no es crítico: solo
 *     reinicia los contadores).
 *   - En producción con varias réplicas o detrás de un proxy asegúrate de que
 *     se setee `X-Forwarded-For` (o usa un backend externo tipo Redis / Upstash).
 *
 * Uso desde una route:
 *   const ip = getClientIp(request);
 *   const ipRes = rateLimit(`login:ip:${ip}`, { maxAttempts: 10, windowMs: 15*60*1000 });
 *   if (!ipRes.ok) return tooManyRequests(ipRes);
 */

import type { NextRequest } from "next/server";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Intentos restantes en la ventana actual (mínimo 0). */
  remaining: number;
  /** Segundos hasta que se pueda reintentar (0 si ok). */
  retryAfterSec: number;
  /** Total de intentos permitidos en la ventana. */
  limit: number;
}

interface Entry {
  count: number;
  firstAttemptAt: number;
}

const store = new Map<string, Entry>();

// Limita la expansión del Map: cada call limpia entradas expiradas (con tope
// para no recorrer todo en cada request si el Map creciera mucho).
const MAX_PRUNED_KEYS = 5000;

/**
 * Comprueba/registra un intento y devuelve el resultado.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const limit = Math.max(1, config.maxAttempts);

  // Cleanup ligero: si el Map crece mucho, eliminamos entradas expiradas.
  if (store.size > MAX_PRUNED_KEYS) {
    for (const [k, entry] of store) {
      if (now - entry.firstAttemptAt > config.windowMs) store.delete(k);
    }
  }

  const entry = store.get(key);
  if (!entry || now - entry.firstAttemptAt > config.windowMs) {
    store.set(key, { count: 1, firstAttemptAt: now });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0, limit };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterMs = config.windowMs - (now - entry.firstAttemptAt);
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil(Math.max(0, retryAfterMs) / 1000),
      limit,
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSec: 0,
    limit,
  };
}

/**
 * Resetea el contador de una clave (p. ej. tras un login exitoso para no
 * penalizar tras intentos fallidos seguidos de éxito).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Obtiene la IP del cliente desde headers estándar de proxy.
 *
 * SOLO se confía en X-Forwarded-For / X-Real-IP cuando TRUST_PROXY=1 está
 * explícitamente configurado (p. ej. detrás de Nginx/Traefik/Vercel). Sin un
 * proxy de confianza, un atacante puede enviar ese header y rotar IPs para
 * evadir los rate limits, así que caemos a `request.ip`.
 */
export function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY === "1") {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
      const ip = xff.split(",")[0]?.trim();
      if (ip) return ip;
    }
    const xri = request.headers.get("x-real-ip");
    if (xri) return xri.trim();
  }

  // request.ip está disponible en Node Runtime (no en Edge). Lo accedemos de
  // forma segura para el type system.
  const ip = (request as unknown as { ip?: string }).ip;
  return ip ?? "unknown";
}

/** Headers estándar de rate limiting para adjuntar a la respuesta 429. */
export function rateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig,
): Record<string, string> {
  return {
    "Retry-After": String(Math.max(1, result.retryAfterSec)),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(
      Math.floor((Date.now() + config.windowMs) / 1000),
    ),
  };
}