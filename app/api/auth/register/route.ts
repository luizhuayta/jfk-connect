/**
 * POST /api/auth/register
 *
 * Crea un registro pendiente de verificación:
 *  1. Valida los datos
 *  2. Hashea la contraseña (scrypt)
 *  3. Genera un código de 6 dígitos (criptográficamente seguro, expira en 15 min)
 *  4. Lo guarda en `pending_registrations`
 *  5. Envía un email con el código
 *
 * Body esperado:
 *   { fullName, email, password, year, section, shift }
 *
 * Seguridad:
 *  - Usa scrypt (lib/password.ts) en lugar de SHA-256 con salt estático.
 *  - El código se genera con crypto.randomInt (no Math.random).
 *  - No se devuelve el código en la respuesta (se enviaba como devCode, lo
 *    que permitía registrar cuentas sin acceso al email).
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { rateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseBody } from "@/lib/validate";
import { registerSchema } from "@/lib/schemas";
import { assertSameOrigin } from "@/lib/csrf";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// Límite anti abuso del envío de email de verificación (costoso en el server).
const IP_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }; // 5 / 15 min por IP

function generateCode(): string {
  // crypto.randomInt es criptográficamente seguro (a diferencia de Math.random)
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = assertSameOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const ip = getClientIp(request);

    // Rate limiting por IP antes de cualquier trabajo. Sin IP fiable se omite
    // (no se crea un cubo global "unknown").
    const res = ip
      ? rateLimit(`register:ip:${ip}`, IP_LIMIT)
      : { ok: true as const, remaining: IP_LIMIT.maxAttempts, retryAfterSec: 0, limit: IP_LIMIT.maxAttempts };
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demasiados registros. Intenta de nuevo en " +
            `${Math.ceil(res.retryAfterSec / 60)} min.`,
        },
        { status: 429, headers: rateLimitHeaders(res, IP_LIMIT) },
      );
    }

    const [parsed, validationError] = await parseBody(request, registerSchema);
    if (validationError) return validationError;
    const { fullName, email, password, year, section, shift } = parsed;

    // Verificar que el email no esté ya registrado en users
    const existingUser = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Este correo ya está registrado. Inicia sesión." },
        { status: 409 },
      );
    }

    // Generar código y expiración (15 minutos)
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const passwordHash = await hashPassword(password);

    // Guardar o actualizar registro pendiente (upsert por email)
    try {
      await query(
        `INSERT INTO pending_registrations
          (email, full_name, password_hash, year, section, shift, verification_code, code_expires_at, attempts, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, false)
         ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          year = EXCLUDED.year,
          section = EXCLUDED.section,
          shift = EXCLUDED.shift,
          verification_code = EXCLUDED.verification_code,
          code_expires_at = EXCLUDED.code_expires_at,
          attempts = 0,
          is_verified = false,
          verified_at = NULL,
          updated_at = now()`,
        [email, fullName, passwordHash, year, section, shift, code, expiresAt],
      );
    } catch (dbErr) {
      logger.error({ err: dbErr, route: "register", email }, "error guardando pending");
      return NextResponse.json(
        { ok: false, error: "Error al guardar el registro. Intenta de nuevo." },
        { status: 500 },
      );
    }

    // Enviar email con el código
    const emailResult = await sendEmail({
      to: email,
      subject: "IJFK - Tu código de verificación de registro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E2A5E 0%, #2C3A7A 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #F4C15C; margin: 0;">IJFK</h1>
            <p style="color: #fff; margin: 8px 0 0;">Colegio Industrial John F. Kennedy</p>
          </div>
          <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1E2A5E; margin-top: 0;">¡Hola, ${fullName}!</h2>
            <p>Gracias por registrarte en la Intranet Institucional IJFK.</p>
            <p>Tu código de verificación es:</p>
            <div style="background: #fff; border: 2px dashed #F4C15C; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1E2A5E;">${code}</span>
            </div>
            <p>Este código expira en <strong>15 minutos</strong>.</p>
            <p>Si no solicitaste este registro, puedes ignorar este mensaje.</p>
            <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
              Sistema Institucional IJFK © 2026
            </p>
          </div>
        </div>
      `,
    });

    if (!emailResult.success) {
      logger.error({ route: "register", email, mailError: emailResult.error }, "error enviando email");
    }

    return NextResponse.json({
      ok: true,
      message: "Registro iniciado. Revisa tu correo para obtener el código de verificación.",
      email,
    });
  } catch (err) {
    logger.error({ err, route: "register" }, "error inesperado");
    return NextResponse.json(
      {
        ok: false,
        error: "Error interno del servidor.",
      },
      { status: 500 },
    );
  }
}