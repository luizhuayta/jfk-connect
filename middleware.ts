/**
 * Middleware de autenticación por rol — IJFK
 * =============================================================================
 * Protege las rutas `/admin/*`, `/father/*` y `/teacher/*`:
 *
 *  - Si no hay cookie de sesión (o el JWT es inválido/expirado) → redirige a
 *    `/login` conservando la ruta destino como `?redirect=...`.
 *  - Si hay sesión válida pero el rol no corresponde a la sección → redirige
 *    al dashboard correspondiente al rol real del usuario (p. ej. un padre
 *    que intente entrar a `/admin` va a `/father`).
 *
 * Ejecuta la verificación del JWT con la Web Crypto API (Edge Runtime), usando
 * el mismo secreto HS256 que `lib/session.ts` (Node), compartido vía
 * `lib/session-secret.ts`.
 *
 * Nota: este middleware es una primera línea de defensa UX; la autorización
 * real de cada recurso se sigue haciendo en las API routes vía `lib/auth.ts`
 * (que consulta la BD para confirmar rol y estado del usuario).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getJwtSecret, SESSION_COOKIE } from "@/lib/session-secret";

// Mapa: prefijo de ruta → rol requerido (u: el rol del usuario mapeado a su home)
const ROUTE_ROLES: Record<string, "admin" | "padre" | "docente"> = {
  admin: "admin",
  father: "padre",
  teacher: "docente",
};

const ROLE_HOME: Record<"admin" | "padre" | "docente", string> = {
  admin: "/admin",
  padre: "/father",
  docente: "/teacher",
};

// Decodificación base64url (sin relleno) usando atob/btoa disponibles en Edge
function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Verifica un JWT HS256 con Web Crypto. Devuelve el payload decodificado o null. */
async function verifySessionEdge(
  token: string,
): Promise<{ sub: string; role: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;

  // Importar la clave secreta como CryptoKey para HMAC SHA-256
  const enc = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(getJwtSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expectedSig = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(data)),
    );
    const providedSig = base64urlToBytes(s);
    if (expectedSig.length !== providedSig.length) return null;
    // Comparación en tiempo constante
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      diff |= expectedSig[i] ^ providedSig[i];
    }
    if (diff !== 0) return null;
  } catch {
    return null;
  }

  // Decodificar payload y comprobar expiración
  try {
    const payloadJson = new TextDecoder().decode(base64urlToBytes(p));
    const payload = JSON.parse(payloadJson) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
    if (!payload.sub || !payload.role) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1]; // "admin" | "father" | "teacher"
  const requiredRole = ROUTE_ROLES[segment];
  if (!requiredRole) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Sin cookie → a login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const session = await verifySessionEdge(token);

  // Token inválido/expirado → a login
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    // Invalidar la cookie corrupta
    const res = NextResponse.redirect(url);
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Rol válido pero no corresponde a esta sección → redirigir a su home
  if (session.role !== requiredRole) {
    const home = ROLE_HOME[session.role as keyof typeof ROLE_HOME];
    const url = request.nextUrl.clone();
    url.pathname = home ?? "/role-selector";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Solo se ejecuta el middleware en las rutas protegidas.
  // Excluye APIs, _next internals, archivos estáticos, y la ruta tunnel
  // "/monitoring" usada por Sentry para evitar ad-blockers.
  matcher: [
    "/((?!monitoring|api|_next/static|_next/image|favicon.ico).*)",
  ],
};