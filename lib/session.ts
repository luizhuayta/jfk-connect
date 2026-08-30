/**
 * Sesión con cookies httpOnly + JWT (HS256) para IJFK
 *
 * Antes el userId se guardaba en `sessionStorage` y se enviaba en el header
 * `X-User-Id`, lo que era spoofeable: cualquier usuario podía cambiar su id
 * en el navegador y hacerse pasar por otro (incluido admin).
 *
 * Ahora el servidor firma un JWT con el userId y rol, y lo setea en una cookie
 * httpOnly que el JavaScript del navegador no puede leer. Las API routes
 * leen el JWT de la cookie y lo verifican.
 *
 * El frontend ya no necesita guardar el userId en sessionStorage; en su lugar
 * consulta `/api/auth/me` (que lee la cookie) para obtener los datos del
 * usuario.
 */

import crypto from "node:crypto";
import { getJwtSecret, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session-secret";

const SECRET = getJwtSecret();

const MAX_AGE_SEC = SESSION_MAX_AGE;

export { SESSION_COOKIE, SESSION_MAX_AGE };

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export interface SessionPayload {
  sub: string; // userId
  role: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Crea un JWT firmado (HS256) con el payload dado.
 */
export function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
  expiresInSec: number = MAX_AGE_SEC,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

/**
 * Verifica un JWT y devuelve el payload si es válido (no expirado, firma correcta).
 * Devuelve null si el token es inválido o expiró.
 */
export function verifySession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(data).digest();
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(s, "base64url");
  } catch {
    return null;
  }
  if (expectedSig.length !== providedSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;
  try {
    const body = JSON.parse(
      Buffer.from(p, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Opciones para setear la cookie de sesión en la respuesta.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // SameSite=Strict para mitigar CSRF: la cookie NO se envía en peticiones
    // cross-site (ni GET top-level tras un link externo, ni POST de otro site).
    // Las peticiones legítimas de la app son todas same-site (mismo origen).
    sameSite: "strict" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}