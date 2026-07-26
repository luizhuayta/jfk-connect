/**
 * Helper de validación para API routes — IJFK.
 *
 * Uso:
 *   const [data, errorResponse] = await parseBody(request, loginSchema);
 *   if (errorResponse) return errorResponse;
 *   // `data` ahora está tipado según el schema dado.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { ZodType, infer as zInfer } from "zod";

/** Par [éxito] | [null, respuesta 400 lista para devolver]. */
export type ParseResult<T> = [T, null] | [null, NextResponse];

/**
 * Lee el body JSON de la request y lo valida contra el schema Zod.
 * En caso de fallo devuelve una NextResponse 400 con el primer mensaje
 * de error legible.
 */
export async function parseBody<T extends ZodType>(
  request: NextRequest,
  schema: T,
): Promise<ParseResult<zInfer<T>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "El cuerpo de la petición no es JSON válido." },
        { status: 400 },
      ),
    ];
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues?.[0]?.message ?? "Datos no válidos.";
    return [
      null,
      NextResponse.json({ ok: false, error: first }, { status: 400 }),
    ];
  }

  return [result.data, null];
}