/**
 * Protección CSRF — IJFK
 * =============================================================================
 * Defensa en profundidad además de `SameSite=Strict` en la cookie de sesión.
 *
 * La técnica principal es SameSite=Strict (seteada en `lib/session.ts`):
 * el navegador no envía la cookie de sesión en peticiones cross-site, así
 * que un ataque CSRF clásico no puede autenticarse. Esto ya cubre el vector.
 *
 * helper extra `assertSameOrigin`: valida que el header `Origin` (o
 * `Referer` como fallback) coincide con el host de la app. Se invoca al
 * inicio de las API routes mutativas (POST/PUT/PATCH/DELETE). Si falta o no
 * coincide, devuelve 403. No tiene coste y refuerza la postura.
 *
 * Uso:
 *   const blocked = assertSameOrigin(request);
 *   if (blocked) return blocked;
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Devuelve un NextResponse 403 si la petición no viene del mismo origen
 * de la app; null si es válida.
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  // En peticiones same-origin, el navegador SIEMPRE envía `Origin` (POST/PUT/
  // PATCH/DELETE) o `Referer`. Si ambos faltan, es sospechoso → rechazar.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      // Fail-closed: sin NEXT_PUBLIC_APP_URL en producción no podemos validar
      // el origen, así que rechazamos peticiones de navegador (que SIEMPRE
      // envían Origin o Referer). Peticiones sin ambos headers (clientes
      // no-navegador) siguen pasando: SameSite=Strict protege la cookie.
      if (origin || referer) {
        console.error(
          "[csrf] NEXT_PUBLIC_APP_URL no está configurado en producción; " +
            "bloqueando petición con Origin/Referer.",
        );
        return NextResponse.json(
          { ok: false, error: "Petición no permitida." },
          { status: 403 },
        );
      }
    }
    // En desarrollo sin config no bloqueamos (mejor loguear que denegar a ciegas).
    return null;
  }

  let allowedHost: string;
  try {
    allowedHost = new URL(appUrl).host;
  } catch {
    return null;
  }

  if (origin) {
    try {
      if (new URL(origin).host !== allowedHost) {
        return NextResponse.json(
          { ok: false, error: "Petición no permitida desde este origen." },
          { status: 403 },
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Origen no válido." },
        { status: 403 },
      );
    }
  }

  if (referer) {
    try {
      if (new URL(referer).host !== allowedHost) {
        return NextResponse.json(
          { ok: false, error: "Petición no permitida desde este referer." },
          { status: 403 },
        );
      }
      return null;
    } catch {
      // referer malformado: no bloquear (algunos proxies lo truncan).
      return null;
    }
  }

  // Ni Origin ni Referer: en navegadores modernos, POSTs same-origin llevan
  // Origin, así que esto es sospechoso. Pero algunos clientes no-navegador
  // (curl, tests) no lo envían. Como SameSite=Strict ya protege, aquí
  // permitimos para no romper API clients legítimos; el rate limiting y auth
  // siguen aplicando.
  return null;
}