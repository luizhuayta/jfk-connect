/**
 * Preámbulo compartido de las API routes del panel de administración:
 * CSRF + rol admin, y respuesta 500 uniforme con logger estructurado.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole, type AuthUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { isUniqueViolation } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function guardAdmin(
  request: NextRequest,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  return requireRole(request, ["admin"]);
}

export async function guardAdminMutation(
  request: NextRequest,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const blocked = assertSameOrigin(request);
  if (blocked) return [null, blocked];
  return requireRole(request, ["admin"]);
}

export function internalError(err: unknown, route: string): NextResponse {
  logger.error({ err, route }, "error inesperado");
  return NextResponse.json(
    { ok: false, error: "Error interno del servidor." },
    { status: 500 },
  );
}

/** 409 si el error es UNIQUE; null si hay que seguir el catch genérico. */
export function uniqueConflict(err: unknown, message: string): NextResponse | null {
  if (!isUniqueViolation(err)) return null;
  return NextResponse.json({ ok: false, error: message }, { status: 409 });
}
