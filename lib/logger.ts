/**
 * Logger estructurado para IJFK — usa Pino.
 * =============================================================================
 * Reemplaza los `console.error`/`console.log` dispersos con un logger que:
 *   - Emite JSON en producción (parseable por herramientas de observabilidad).
 *   - Emite texto legible en desarrollo (`pino-pretty` si está disponible,
 *     si no, JSON con un `msg` claro).
 *   - Centraliza el nivel y formato por env vars: `LOG_LEVEL` (default `info`).
 *
 * Uso desde una API route:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ userId }, "login exitoso");
 *   logger.error({ err, route: "login" }, "error inesperado");
 *
 * Notas:
 *   - Pino es seguro en Edge Runtime solo con serializadores básicos; este
 *     logger se usa en API routes (Node Runtime). El middleware (Edge) sigue
 *     usando `console.error`.
 *   - En producción escribe a `stdout` por defecto.
 */

import pino from "pino";

function buildLogger() {
  const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
  const isDev = process.env.NODE_ENV !== "production";

  const opts: pino.LoggerOptions = {
    level,
    base: {
      app: "ijfk",
      // build_id si está disponible para correlación con la versión desplegada
      build_id: process.env.NEXT_BUILD_ID ?? undefined,
    },
    redact: {
      // No registrar nunca secretos/PII sensible
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.passwordHash",
        "*.password_hash",
        "*.tempPassword",
        "*.token",
        "*.code",
        "verification_code",
        "*.oldPassword",
        "*.newPassword",
      ],
      censor: "[REDACTED]",
    },
    serializers: {
      err: pino.stdSerializers.err,
    },
  };

  if (isDev) {
    // Intentar formato legible; si no está pino-pretty, cae al JSON de pino.
    opts.transport = {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
    } as unknown as pino.LoggerOptions["transport"];
  }

  try {
    return pino(opts);
  } catch {
    // Si pino-pretty falla al cargar, volver a un logger básico.
    return pino({ level });
  }
}

export const logger = buildLogger();