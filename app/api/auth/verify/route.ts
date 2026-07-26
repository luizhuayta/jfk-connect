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
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import { parseBody } from "@/lib/validate";
import { verifySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

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

export async function POST(request: NextRequest) {
  try {
    const [parsed, validationError] = await parseBody(request, verifySchema);
    if (validationError) return validationError;
    const { email, code } = parsed;

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

    // 2. Verificar expiración
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

    // 3. Verificar código
    if (pending.verification_code !== code) {
      // Incrementar intentos
      await queryOne(
        "UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = $1",
        [pending.id],
      );

      const remaining = 5 - (pending.attempts ?? 0) - 1;
      return NextResponse.json(
        {
          ok: false,
          error: `Código incorrecto. Te quedan ${Math.max(0, remaining)} intento(s).`,
        },
        { status: 400 },
      );
    }

    // 4. Crear el usuario en la tabla users (transacción atómica)
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
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
