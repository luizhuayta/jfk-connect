// =============================================================================
// instrumentation-client.ts
// Inicializa el SDK de Sentry en el navegador.
// Se ejecuta una sola vez al cargar la página (antes de hidratar React).
//
// El DSN del cliente (NEXT_PUBLIC_SENTRY_DSN) se inyecta en build-time
// (ver Dockerfile / docker-compose) y se envía vía tunnelRoute /monitoring
// para evitar ad-blockers.
// =============================================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  dataCollection: {
    // Para desactivar user data y HTTP bodies, descomenta las líneas:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },

  // 100% en dev, 10% en producción
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: 10% de todas las sesiones, 100% de las sesiones con error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration(),
    // Opcional: widget de feedback
    // Sentry.feedbackIntegration({ colorScheme: "system" }),
  ],

  // No inicializar si no hay DSN configurado
  enabled:
    Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    (process.env.NEXT_PUBLIC_SENTRY_ENABLED ?? "true") !== "false",
});

// Hook en transiciones del App Router (solo App Router)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;