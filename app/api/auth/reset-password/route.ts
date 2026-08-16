/**
 * POST /api/auth/reset-password
 *
 * Valida el código de recuperación y actualiza la contraseña.
 *
 * Body esperado:
 *   { email, code, newPassword }
 *
 * Seguridad:
 *   - La nueva contraseña se hashea con scrypt (lib/password.ts), no con
 *     SHA-256 + salt estático.
 *   - Se incrementa `attempts` por cada código erróneo y se rechaza a partir
 *     de 5 intentos (migración 00000000000002_password_recovery.sql).
 *   - Rate limiting por IP y por email para frenar fuerza bruta del código.
 *   - Mensajes de error genéricos: no se filtra `err.message` interno.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { resetPasswordSchema } from "@/lib/schemas";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

// Límites anti fuerza bruta del código de 6 dígitos.
const IP_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };      // 10 / 15 min por IP
const EMAIL_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };    // 5 / 15 min por email

/** Comparación en tiempo constante (ambos lados son dígitos de longitud fija). */
function codesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  try {
    const [parsed, validationError] = await parseBody(request, resetPasswordSchema);
    if (validationError) return validationError;
    const { email, code, newPassword } = parsed;

    // Rate limiting por IP + por email antes de tocar la BD.
    const ip = getClientIp(request);
    const ipResult = rateLimit(`resetpw:ip:${ip}`, IP_LIMIT);
    const emailResult = rateLimit(`resetpw:email:${email}`, EMAIL_LIMIT);
    if (!ipResult.ok || !emailResult.ok) {
      const result = !ipResult.ok ? ipResult : emailResult;
      const cfg = !ipResult.ok ? IP_LIMIT : EMAIL_LIMIT;
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demasiados intentos. Intenta de nuevo en " +
            `${result.retryAfterSec >= 3600
              ? `${Math.ceil(result.retryAfterSec / 3600)} h.`
              : `${Math.ceil(result.retryAfterSec / 60)} min.`}`,
        },
        { status: 429, headers: rateLimitHeaders(result, cfg) },
      );
    }

    // Buscar el código más reciente no usado
    const resetCode = await queryOne<{ id: string; code: string; expires_at: string; used_at: string | null; attempts: number }>(
      `SELECT id, code, expires_at, used_at, attempts
       FROM password_reset_codes
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email],
    );

    if (!resetCode || !codesMatch(resetCode.code, code)) {
      // Consumir un intento del código vigente (si existe) para frenar
      // fuerza bruta. No revelamos si el email tiene códigos activos.
      if (resetCode) {
        await query(
          "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1",
          [resetCode.id],
        ).catch(() => {});
      }
      return NextResponse.json(
        { ok: false, error: "Código no válido." },
        { status: 400 },
      );
    }

    if (resetCode.used_at) {
      return NextResponse.json(
        { ok: false, error: "Este código ya fue utilizado." },
        { status: 400 },
      );
    }

    if (new Date() > new Date(resetCode.expires_at)) {
      return NextResponse.json(
        { ok: false, error: "El código ha expirado. Solicita uno nuevo." },
        { status: 410 },
      );
    }

    if (resetCode.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Solicita un código nuevo." },
        { status: 429 },
      );
    }

    // Verificar que el usuario existe
    const user = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    // Actualizar contraseña (scrypt) y marcar el código como usado
    const newHash = await hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1, must_change_password = false, updated_at = now() WHERE id = $2`,
      [newHash, user.id],
    );

    await query(
      `UPDATE password_reset_codes SET used_at = now() WHERE id = $1`,
      [resetCode.id],
    );

    return NextResponse.json({
      ok: true,
      message: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.",
    });
  } catch (err) {
    logger.error({ err, route: "reset-password" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
