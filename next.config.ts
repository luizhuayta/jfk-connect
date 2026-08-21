import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Configuración de Next.js 16 para IJFK
 *
 * Notas importantes (Next.js 16):
 *  - Turbopack es el bundler por defecto para dev y build (ya no requiere --turbopack)
 *  - output: "standalone" genera un build mínimo ideal para Docker
 *  - Los params/cookies/headers ahora son promesas (Async Request APIs)
 *
 * Sentry SDK:
 *  - withSentryConfig() inyecta automáticamente el plugin de webpack/turbopack
 *    que sube sourcemaps al hacer build y configura el SDK.
 *  - Los archivos sentry.server.config.ts, sentry.edge.config.ts e
 *    instrumentation-client.ts son cargados automáticamente por @sentry/nextjs.
 */
const nextConfig: NextConfig = {
  // Build standalone optimizado para contenedor (genera un .next/standalone)
  output: "standalone",

  // El type-check y lint de "next build" duplican `npm run typecheck` /
  // `npm run lint` (que ya se corren aparte) y son el paso más pesado en
  // memoria del build. Se desactivan aquí para evitar OOM en hosts con
  // poca RAM (p. ej. el plan gratuito de Seenode, 512MB).
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Turbopack config (en v16 está al top-level, no en experimental)
  turbopack: {
    root: process.cwd(),
  },

  // Configuración de imágenes (en v16 images.domains está deprecado,
  // usar images.remotePatterns con un mejor control de seguridad)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
    // TTL por defecto: 4 horas (cambio en v16)
    minimumCacheTTL: 14400,
  },

  // ID de deployment para coordinar multi-instancia.
  // En Vercel se usa el SHA del commit truncado a 32 chars (único por deploy);
  // en local, NEXT_BUILD_ID. Vercel exige máximo 32 caracteres.
  deploymentId:
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 32) ??
    process.env.NEXT_BUILD_ID ??
    "local",

  // Permitir transpilar los paquetes que lo necesiten
  transpilePackages: [],

  // Headers para streaming y cache
  async headers() {
    return [
      {
        source: "/:path*{/}?",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Wrapper de Sentry
// ---------------------------------------------------------------------------
// Sigue la guía oficial: https://skills.sentry.dev/instrument
// ---------------------------------------------------------------------------
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Token para subir sourcemaps (build-time secret; distinto del DSN)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sube más archivos del cliente para mejor resolución de stack traces
  widenClientFileUpload: true,

  // Crea una ruta proxy en Next.js para evitar que ad-blockers bloqueen
  // los requests a Sentry. La ruta "/monitoring" se sirve automáticamente.
  tunnelRoute: "/monitoring",

  // Silencia la salida del plugin en builds locales; mantén en CI para debug
  silent: !process.env.CI,
});