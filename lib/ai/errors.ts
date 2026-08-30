/**
 * Errores tipados de la capa de IA — IJFK.
 *
 * Ninguna ruta de IA filtra el mensaje crudo del proveedor al cliente: eso
 * podría exponer detalles internos (URLs, headers, nombres de modelo) o
 * simplemente confundir en español a alguien leyendo un error en inglés.
 * `aiErrorResponse` centraliza el mapeo a la respuesta { ok:false, error }
 * del resto de la app.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export type AiErrorKind =
  | "disabled"
  | "config"
  | "timeout"
  | "rate_limited"
  | "budget_exceeded"
  | "upstream"
  | "invalid_response"
  | "content_filter";

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(kind: AiErrorKind, message: string, opts: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
  }
}

const KIND_TO_HTTP: Record<AiErrorKind, { status: number; message: string }> = {
  disabled: { status: 503, message: "El servicio de IA no está disponible en este momento." },
  config: { status: 503, message: "El servicio de IA no está disponible en este momento." },
  timeout: { status: 503, message: "El servicio de IA no está disponible en este momento." },
  rate_limited: { status: 429, message: "Has hecho demasiadas solicitudes de IA. Intenta en unos minutos." },
  budget_exceeded: { status: 429, message: "Se alcanzó el límite diario de uso de IA. Intenta más tarde." },
  upstream: { status: 503, message: "El servicio de IA no está disponible en este momento." },
  invalid_response: { status: 502, message: "La IA devolvió una respuesta no válida. Intenta de nuevo." },
  content_filter: { status: 502, message: "La IA devolvió una respuesta no válida. Intenta de nuevo." },
};

/** Registra el error real (con detalle) y devuelve la respuesta genérica en español que sí puede ver el cliente. */
export function aiErrorResponse(err: unknown, route: string): NextResponse {
  if (err instanceof AiError) {
    logger.error({ err, route, kind: err.kind }, "error de IA");
    const mapped = KIND_TO_HTTP[err.kind];
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
  logger.error({ err, route }, "error inesperado en ruta de IA");
  return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
}
