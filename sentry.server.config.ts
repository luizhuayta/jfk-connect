// =============================================================================
// sentry.server.config.ts
// Inicializa el SDK de Sentry para el runtime de Node.js (server-side).
// Cargado por instrumentation.ts cuando NEXT_RUNTIME === "nodejs".
// =============================================================================
//
// GlitchTip es 100% compatible con el SDK de Sentry: este código funciona
// idéntico apuntando a GlitchTip (self-hosted) o a Sentry SaaS.
// =============================================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // Para desactivar user data y HTTP bodies, descomenta:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Adjuntar valores de variables locales a los frames del stack
  includeLocalVariables: true,

  enableLogs: true,

  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "local",
  release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Debug solo si se pide explícitamente
  debug: process.env.SENTRY_DEBUG === "true",

  // No inicializar si no hay DSN
  enabled:
    Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    (process.env.NEXT_PUBLIC_SENTRY_ENABLED ?? "true") !== "false",

  ignoreErrors: ["AbortError", "NetworkError"],
});