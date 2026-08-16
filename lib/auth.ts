/**
 * Utilidades de autenticación para API routes (server-side).
 *
 * Ahora lee la sesión de una cookie httpOnly con JWT firmado (lib/session.ts),
 * en lugar del header `X-User-Id` que era spoofeable.
 *
 * El header legacy `X-User-Id` solo se acepta con `ALLOW_LEGACY_AUTH=1`
 * (tests/desarrollo); por defecto la única fuente de identidad es la cookie.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "docente" | "padre";
  is_active: boolean;
};

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "docente" | "padre";
  is_active: boolean;
}

/**
 * Extrae y valida el usuario autenticado de una request.
 * Prioriza la cookie JWT; como fallback (solo dev) acepta el header legacy.
 * Devuelve el usuario si la sesión es válida, o null si no lo está.
 */
export async function getAuthUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  // 1. Intentar leer la cookie JWT
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let userId: string | null = null;

  if (token) {
    const payload = verifySession(token);
    if (payload) userId = payload.sub;
  }

  // 2. Fallback legacy (SOLO con ALLOW_LEGACY_AUTH=1): header X-User-Id o
  //    query userId. Antes bastaba con NODE_ENV !== "production", lo que dejaba
  //    el backdoor abierto en cualquier deploy mal configurado. Ahora requiere
  //    un opt-in explícito pensado para tests/desarrollo.
  if (!userId && process.env.ALLOW_LEGACY_AUTH === "1") {
    const { searchParams } = new URL(request.url);
    userId =
      request.headers.get("x-user-id") ?? searchParams.get("userId") ?? null;
  }

  if (!userId) return null;

  const user = await queryOne<UserRow>(
    `SELECT id, email, full_name, role, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );

  if (!user || !user.is_active) return null;

  return user;
}

/**
 * Requiere que haya un usuario autenticado. Si no lo hay, devuelve 401.
 * Devuelve [user, null] si OK, o [null, NextResponse] si no autorizado.
 */
export async function requireUser(
  request: NextRequest,
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const user = await getAuthUser(request);
  if (!user) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "No autenticado." },
        { status: 401 },
      ),
    ];
  }
  return [user, null];
}

/**
 * Requiere que el usuario autenticado tenga uno de los roles indicados.
 * Si no, devuelve 403.
 */
export async function requireRole(
  request: NextRequest,
  roles: AuthUser["role"][],
): Promise<[AuthUser, null] | [null, NextResponse]> {
  const [user, denied] = await requireUser(request);
  if (denied) return [null, denied];
  if (!roles.includes(user.role)) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "No tienes permisos para esta acción." },
        { status: 403 },
      ),
    ];
  }
  return [user, null];
}