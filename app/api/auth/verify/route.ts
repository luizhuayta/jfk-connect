/**
 * POST /api/auth/verify
 *
 * Verifica el código de un registro pendiente:
 *  1. Busca el pending_registration por email
 *  2. Valida que el código coincida y no haya expirado
 *  3. Crea el user real en `users` (en una transacción)
 *  4. Marca el pending como verificado
 *
 * Body esperado:
 *   { email, code }
 *
 * Seguridad:
 *   - Límite de 5 intentos por código (columna `attempts`), ahora SÍ aplicado:
 *     antes se incrementaba pero nunca se rechazaba.
 *   - Rate limiting por IP y por email para frenar fuerza bruta del código.
 *   - Comparación del código en tiempo constante.
 *   - Mensajes de error genéricos: no se filtra `err.message` interno.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { verifySchema } from "@/lib/schemas";
import { getClientIp, rateLimit, rateLimitHeaders, rateLimitByIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

const IP_LIMIT = { maxAttempts: 20, windowMs: 15 * 60 * 1000 };       // 20 / 15 min por IP
const EMAIL_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };    // 10 / 15 min por email

interface PendingRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  year: string;
  section: string;
  shift: string;
  verification_code: string;
  code_expires_at: string;
  attempts: number;
  is_verified: boolean;
}

/** Comparación en tiempo constante (ambos lados son 6 dígitos). */
function codesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  try {
    const [parsed, validationError] = await parseBody(request, verifySchema);
    if (validationError) return validationError;
    const { email, code } = parsed;

    // Rate limiting por IP + por email antes de tocar la BD.
    const ip = getClientIp(request);
    const ipResult = rateLimitByIp("verify:ip", ip, IP_LIMIT);
    const emailResult = rateLimit(`verify:email:${email}`, EMAIL_LIMIT);
    if (!ipResult.ok || !emailResult.ok) {
      const result = !ipResult.ok ? ipResult : emailResult;
      const cfg = !ipResult.ok ? IP_LIMIT : EMAIL_LIMIT;
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

    // 1. Buscar registro pendiente
    const pending = await queryOne<PendingRow>(
      `SELECT id, email, full_name, password_hash, year, section, shift,
              verification_code, code_expires_at, attempts, is_verified
       FROM pending_registrations
       WHERE email = $1 AND is_verified = false
       LIMIT 1`,
      [email],
    );

    if (!pending) {
      return NextResponse.json(
        { ok: false, error: "No hay un registro pendiente para este correo." },
        { status: 404 },
      );
    }

    // 2. Límite de intentos (AHORA aplicado: antes solo se incrementaba)
    if ((pending.attempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: "Demasiados intentos. Por favor, regístrate nuevamente.",
        },
        { status: 429 },
      );
    }

    // 3. Verificar expiración
    const now = new Date();
    const expiresAt = new Date(pending.code_expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "El código ha expirado. Por favor, regístrate nuevamente.",
          expired: true,
        },
        { status: 410 },
      );
    }

    // 4. Verificar código (comparación en tiempo constante)
    if (!codesMatch(pending.verification_code, code)) {
      // Incrementar intentos
      await queryOne(
        "UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = $1",
        [pending.id],
      );

      const remaining = MAX_ATTEMPTS - (pending.attempts ?? 0) - 1;
      if (remaining <= 0) {
        return NextResponse.json(
          { ok: false, error: "Demasiados intentos. Por favor, regístrate nuevamente." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: `Código incorrecto. Te quedan ${remaining} intento(s).`,
        },
        { status: 400 },
      );
    }

    // 5. Crear el usuario en la tabla users (transacción atómica)
    let newUser: { id: string; email: string; full_name: string; role: string } | null = null;
    try {
      newUser = await withTransaction(async (client) => {
        // Verificar que no exista otro user con el mismo email (race condition)
        const exists = await client.query(
          "SELECT id FROM users WHERE email = $1",
          [pending.email],
        );
        if (exists.rows.length > 0) {
          throw new Error("USER_EXISTS");
        }

        // Crear el user — copiar grade/section/shift del registro pendiente
        // a default_grade/section/shift del usuario (para el modal de reclamo)
        const inserted = await client.query(
          `INSERT INTO users (email, full_name, role, is_active, password_hash, email_verified_at,
                              default_grade, default_section, default_shift)
           VALUES ($1, $2, 'padre', true, $3, now(), $4, $5, $6)
           RETURNING id, email, full_name, role`,
          [pending.email, pending.full_name, pending.password_hash,
           pending.year, pending.section, pending.shift],
        );

        // Marcar como verificado
        await client.query(
          `UPDATE pending_registrations
           SET is_verified = true, verified_at = now()
           WHERE id = $1`,
          [pending.id],
        );

        return inserted.rows[0];
      });
    } catch (err) {
      if (err instanceof Error && err.message === "USER_EXISTS") {
        return NextResponse.json(
          { ok: false, error: "Este correo ya está registrado. Inicia sesión." },
          { status: 409 },
        );
      }
      logger.error({ err, route: "verify", email }, "error creando user");
      return NextResponse.json(
        { ok: false, error: "Error al crear la cuenta. Intenta de nuevo." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "¡Cuenta verificada y creada con éxito! Ya puedes iniciar sesión.",
      user: {
        id: newUser!.id,
        email: newUser!.email,
        fullName: newUser!.full_name,
        role: newUser!.role,
      },
    });
  } catch (err) {
    logger.error({ err, route: "verify" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
