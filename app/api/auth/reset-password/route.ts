/**
 * POST /api/auth/reset-password
 *
 * Valida el código de recuperación y actualiza la contraseña.
 *
 * Body esperado:
 *   { email, code, newPassword }
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`ijfk-salt-${password}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? "").trim().toLowerCase();
    const code: string = (body.code ?? "").trim();
    const newPassword: string = body.newPassword ?? "";

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Email, código y nueva contraseña son obligatorios." },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }

    // Buscar el código más reciente no usado
    const resetCode = await queryOne<{ id: string; expires_at: string; used_at: string | null; attempts: number }>(
      `SELECT id, expires_at, used_at, attempts
       FROM password_reset_codes
       WHERE email = $1 AND code = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code],
    );

    if (!resetCode) {
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

    if (resetCode.attempts >= 5) {
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

    // Actualizar contraseña y marcar el código como usado
    await query(
      `UPDATE users SET password_hash = $1, must_change_password = false, updated_at = now() WHERE id = $2`,
      [hashPassword(newPassword), user.id],
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
    console.error("[reset-password] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 },
    );
  }
}
