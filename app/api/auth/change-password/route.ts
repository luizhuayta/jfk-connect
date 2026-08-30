/**
 * POST /api/auth/change-password
 *
 * Cambia la contraseña del usuario AUTENTICADO (la sesión de la cookie es la
 * única fuente de identidad; el `userId` del body se ignora por completo).
 * Si la contraseña actual coincide, marca must_change_password = false.
 *
 * Body esperado:
 *   { currentPassword, newPassword }
 *
 * Seguridad:
 *  - Usa scrypt (lib/password.ts).
 *  - ANTES se confiaba en `userId` del body y no se verificaba sesión: cualquiera
 *    podía apuntar a otro usuario y usar el endpoint sin rate limit como oráculo
 *    de fuerza bruta. Ahora requireUser valida la sesión contra la BD.
 *  - Rate limiting por usuario y por IP.
 *  - Mensajes de error genéricos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireUser } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { changePasswordSchema } from "@/lib/schemas";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const USER_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };     // 10 / 15 min por usuario
const IP_LIMIT = { maxAttempts: 20, windowMs: 15 * 60 * 1000 };       // 20 / 15 min por IP

interface UserRow {
  id: string;
  password_hash: string | null;
  must_change_password: boolean;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  try {
    // La identidad viene de la sesión (cookie JWT), nunca del body.
    const [user, denied] = await requireUser(request);
    if (denied) return denied;

    const [parsed, validationError] = await parseBody(request, changePasswordSchema);
    if (validationError) return validationError;
    const { currentPassword, newPassword } = parsed;

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { ok: false, error: "La nueva contraseña debe ser diferente a la actual." },
        { status: 400 },
      );
    }

    // Rate limiting por usuario + por IP (frena fuerza bruta de la contraseña
    // actual, que antes no tenía ningún freno).
    const ip = getClientIp(request);
    const userResult = rateLimit(`changepw:user:${user.id}`, USER_LIMIT);
    const ipResult = ip
      ? rateLimit(`changepw:ip:${ip}`, IP_LIMIT)
      : { ok: true as const, remaining: IP_LIMIT.maxAttempts, retryAfterSec: 0, limit: IP_LIMIT.maxAttempts };
    if (!userResult.ok || !ipResult.ok) {
      const result = !userResult.ok ? userResult : ipResult;
      const cfg = !userResult.ok ? USER_LIMIT : IP_LIMIT;
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demasiados intentos. Intenta de nuevo en " +
            `${Math.ceil(result.retryAfterSec / 60)} min.`,
        },
        { status: 429, headers: rateLimitHeaders(result, cfg) },
      );
    }

    // Validar contraseña actual (siempre contra el usuario de la sesión)
    const row = await queryOne<UserRow>(
      "SELECT id, password_hash, must_change_password, is_active FROM users WHERE id = $1",
      [user.id],
    );

    if (!row || !row.is_active) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    if (!row.password_hash) {
      // Sin hash → no se permite (antes había un backdoor "admin")
      return NextResponse.json(
        { ok: false, error: "La contraseña actual es incorrecta." },
        { status: 401 },
      );
    }

    const currentValid = await verifyPassword(currentPassword, row.password_hash);
    if (!currentValid) {
      return NextResponse.json(
        { ok: false, error: "La contraseña actual es incorrecta." },
        { status: 401 },
      );
    }

    // Actualizar contraseña y limpiar flag
    const newHash = await hashPassword(newPassword);
    await query(
      `UPDATE users
       SET password_hash = $1, must_change_password = false, updated_at = now()
       WHERE id = $2`,
      [newHash, user.id],
    );

    return NextResponse.json({
      ok: true,
      message: "¡Contraseña actualizada con éxito!",
    });
  } catch (err) {
    logger.error({ err, route: "change-password" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
