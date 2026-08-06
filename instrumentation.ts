// =============================================================================
// instrumentation.ts
// Entry point de Next.js 16 para inicializar Sentry antes de que la app
// empiece a recibir requests. Se ejecuta UNA vez por instancia del servidor.
// =============================================================================
//
// Sigue la convención oficial de Next.js (15+):
//   - register() corre al arrancar el server
//   - onRequestError() corre cada vez que el server captura un error
//     (route handlers, server components, server actions, proxy/middleware)
// =============================================================================

import * as Sentry from "@sentry/nextjs";

export async function register() {
  // El runtime determina qué archivo de config de Sentry cargar
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captura automáticamente todos los errores no manejados del lado servidor.
// Requiere @sentry/nextjs >= 8.28.0 (tenemos 10.69.0).
export const onRequestError = Sentry.captureRequestError;