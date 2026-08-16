/**
 * POST /api/auth/forgot-password
 *
 * Genera un código de 6 dígitos y lo envía al email del usuario.
 * Por seguridad, NO revela si el email existe o no.
 *
 * Body esperado:
 *   { email }
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { rateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseBody } from "@/lib/validate";
import { forgotPasswordSchema } from "@/lib/schemas";
import { assertSameOrigin } from "@/lib/csrf";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// Límites anti abuso del envío del email de recuperación.
const IP_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };       // 5 / 15 min por IP
const EMAIL_LIMIT = { maxAttempts: 3, windowMs: 60 * 60 * 1000 };    // 3 / 1 hora por email

function generateCode(): string {
  // crypto.randomInt es criptográficamente seguro (a diferencia de Math.random)
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(request: NextRequest) {
  try {
    const csrfBlocked = assertSameOrigin(request);
    if (csrfBlocked) return csrfBlocked;

    const [parsed, validationError] = await parseBody(request, forgotPasswordSchema);
    if (validationError) return validationError;
    const { email } = parsed;

    // Rate limiting por IP + por email destino (anti bombardeo de email).
    const ip = getClientIp(request);
    const ipResult = rateLimit(`forgot:ip:${ip}`, IP_LIMIT);
    const emailResult = rateLimit(`forgot:email:${email}`, EMAIL_LIMIT);
    if (!ipResult.ok || !emailResult.ok) {
      const result = !ipResult.ok ? ipResult : emailResult;
      const cfg = !ipResult.ok ? IP_LIMIT : EMAIL_LIMIT;
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demasiadas solicitudes. Intenta de nuevo en " +
            `${result.retryAfterSec >= 3600
              ? `${Math.ceil(result.retryAfterSec / 3600)} h.`
              : `${Math.ceil(result.retryAfterSec / 60)} min.`}`,
        },
        { status: 429, headers: rateLimitHeaders(result, cfg) },
      );
    }

    // Por seguridad, siempre devolvemos OK (no revelar si el email existe)
    const user = await queryOne<{ id: string; full_name: string }>(
      "SELECT id, full_name FROM users WHERE email = $1",
      [email],
    );

    if (user) {
      // Generar código y expiración (30 minutos)
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      // Guardar código
      await query(
        `INSERT INTO password_reset_codes (email, code, expires_at)
         VALUES ($1, $2, $3)`,
        [email, code, expiresAt],
      );

      // Enviar email
      await sendEmail({
        to: email,
        subject: "IJFK - Código de recuperación de contraseña",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1E2A5E 0%, #2C3A7A 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #F4C15C; margin: 0;">IJFK</h1>
              <p style="color: #fff; margin: 8px 0 0;">Recuperación de contraseña</p>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1E2A5E; margin-top: 0;">Hola, ${user.full_name}</h2>
              <p>Recibimos una solicitud para recuperar tu contraseña.</p>
              <p>Tu código de verificación es:</p>
              <div style="background: #fff; border: 2px dashed #F4C15C; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1E2A5E;">${code}</span>
              </div>
              <p>Este código expira en <strong>30 minutos</strong>.</p>
              <p>Si no solicitaste esto, puedes ignorar este mensaje.</p>
              <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
                Sistema Institucional IJFK © 2026
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Si el correo está registrado, te enviamos un código de recuperación.",
    });
  } catch (err) {
    logger.error({ err, route: "forgot-password" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
