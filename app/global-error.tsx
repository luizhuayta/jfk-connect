"use client";

/**
 * Global error boundary para App Router (Next.js 13+).
 *
 * Captura errores en el root layout y errores de render de React.
 * "use client" debe ser la PRIMERA línea del archivo.
 *
 * Este componente se renderiza cuando un error no es capturado por
 * el error boundary más cercano. Sentry lo recibe via onRequestError
 * (instrumentation.ts) y via este useEffect para los client errors.
 *
 * Sigue la guía oficial: https://skills.sentry.dev/instrument
 */

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* NextError renderiza la página de error estándar de Next */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}