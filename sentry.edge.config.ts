// =============================================================================
// sentry.edge.config.ts
// Inicializa el SDK de Sentry para el runtime Edge (middleware, edge functions).
// Cargado por instrumentation.ts cuando NEXT_RUNTIME === "edge".
// =============================================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // Para desactivar user data y HTTP bodies, descomenta:
    // userInfo: false,
    // httpBodies: [],
  },

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "local",
  release: process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  debug: process.env.SENTRY_DEBUG === "true",

  enabled:
    Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    (process.env.NEXT_PUBLIC_SENTRY_ENABLED ?? "true") !== "false",
});