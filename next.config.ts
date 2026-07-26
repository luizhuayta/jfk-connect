import type { NextConfig } from "next";

/**
 * Configuración de Next.js 16 para IJFK
 *
 * Notas importantes (Next.js 16):
 *  - Turbopack es el bundler por defecto para dev y build (ya no requiere --turbopack)
 *  - output: "standalone" genera un build mínimo ideal para Docker
 *  - Los params/cookies/headers ahora son promesas (Async Request APIs)
 */
const nextConfig: NextConfig = {
  // Build standalone optimizado para contenedor (genera un .next/standalone)
  output: "standalone",

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

  // ID de deployment para coordinar multi-instancia
  deploymentId: process.env.NEXT_BUILD_ID ?? "local",

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

export default nextConfig;
