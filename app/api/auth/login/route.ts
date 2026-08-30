/**
 * POST /api/auth/login
 *
 * Inicia sesión con email + contraseña.
 *
 * Body esperado:
 *   { email, password }
 *
 * Respuesta:
 *   { ok: true, user: {...} } o { ok: false, error }
 *
 * Seguridad:
 *   - Usa scrypt (lib/password.ts) en lugar de SHA-256 con salt estático.
 *   - Eliminado el backdoor "admin" para usuarios seed sin hash: ahora los
 *     usuarios pre-creados deben tener un password_hash válido. El script de
 *     seed debe hashear la contraseña al crearlos.
 *   - Si el hash almacenado es legacy (SHA-256), se re-hashea con scrypt tras
 *     verificarlo, de modo que la migración es transparente en el primer login.
 *   - Mensajes de error genéricos para no revelar si el email existe.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword, verifyPassword, isLegacyHash } from "@/lib/password";
import { signSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { rateLimit, resetRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseBody } from "@/lib/validate";
import { loginSchema } from "@/lib/schemas";
import { assertSameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

// Límites anti fuerza bruta
const IP_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };      // 10 / 15 min por IP
const EMAIL_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };    // 5 / 15 min por email

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  password_hash: string | null;
  must_change_password: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // CSRF check (defensa en profundidad; SameSite=Strict ya protege la cookie).
    const csrfBlocked = assertSameOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    // Leer email/password antes de aplicar límites por email (necesitamos email)
    const [parsed, validationError] = await parseBody(request, loginSchema);
    if (validationError) {
      // El rate limiting por IP también aplica a requests mal formados para
      // reducir el ruido (no revela que la validación falló).
      const ip = getClientIp(request);
      if (ip) rateLimit(`login:ip:${ip}`, IP_LIMIT);
      return validationError;
    }
    const { email, password } = parsed;

    // Rate limiting por IP: cuenta cada intento (correcto o no) para frenar
    // volumetría. El límite por email se consume SOLO en intentos fallidos
    // (más abajo), de modo que un intento correcto tras varios fallidos pueda
    // entrar sin bloquearse.
    const ip = getClientIp(request);
    const ipResult = ip
      ? rateLimit(`login:ip:${ip}`, IP_LIMIT)
      : { ok: true as const, remaining: IP_LIMIT.maxAttempts, retryAfterSec: 0, limit: IP_LIMIT.maxAttempts };
    if (!ipResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demasiados intentos. Intenta de nuevo en " +
            `${Math.ceil(ipResult.retryAfterSec / 60)} min.`,
        },
        { status: 429, headers: rateLimitHeaders(ipResult, IP_LIMIT) },
      );
    }

    // Función reutilizable para devolver 401/403 y consumir un intento de
    // email (anti fuerza bruta por cuenta). El 429 por email sólo aplica si
    // supera el límite de fallidos.
    const consumeEmail = () => rateLimit(`login:email:${email}`, EMAIL_LIMIT);
    const failResponse = (status: number, error: string) => {
      const r = consumeEmail();
      if (!r.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Demasiados intentos. Intenta de nuevo en " +
              `${Math.ceil(r.retryAfterSec / 60)} min.`,
          },
          { status: 429, headers: rateLimitHeaders(r, EMAIL_LIMIT) },
        );
      }
      return NextResponse.json({ ok: false, error }, { status });
    };

    // Buscar usuario
    const user = await queryOne<UserRow>(
      `SELECT id, email, full_name, role, is_active, password_hash, must_change_password
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    // Mensaje genérico para no revelar si el email existe
    const GENERIC = "Correo o contraseña incorrectos.";

    if (!user) {
      return failResponse(401, GENERIC);
    }

    if (!user.is_active) {
      return failResponse(403, "Tu cuenta está inactiva. Contacta al administrador.");
    }

    // Verificar contraseña con el módulo seguro
    if (!user.password_hash) {
      // Sin hash → no se permite login (antes había un backdoor "admin")
      return failResponse(401, GENERIC);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return failResponse(401, GENERIC);
    }

    // Migración transparente: si el hash era legacy, re-hashear con scrypt
    if (isLegacyHash(user.password_hash)) {
      try {
        const newHash = await hashPassword(password);
        await query(
          "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
          [newHash, user.id],
        );
      } catch (err) {
        // No bloquear el login si falla el re-hash
        logger.error({ err, route: "login", userId: user.id }, "error re-hasheando contraseña legacy");
      }
    }

    // Actualizar last_login_at (no bloqueante)
    queryOne("UPDATE users SET last_login_at = now() WHERE id = $1", [
      user.id,
    ]).catch((err) =>
      logger.error({ err, route: "login", userId: user.id }, "error actualizando last_login_at"),
    );

    // Crear JWT y setear cookie httpOnly
    const token = signSession({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.full_name,
    });

    const res = NextResponse.json({
      ok: true,
      message: "Inicio de sesión exitoso",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        mustChangePassword: user.must_change_password ?? false,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    // Resetear los contadores tras un login exitoso (no penalizamos al usuario legítimo).
    resetRateLimit(`login:ip:${ip}`);
    resetRateLimit(`login:email:${email}`);
    return res;
  } catch (err) {
    logger.error({ err, route: "login" }, "error inesperado");
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno del servidor.",
      },
      { status: 500 },
    );
  }
}