/**
 * POST /api/auth/change-password
 *
 * Cambia la contraseña del usuario (requiere estar autenticado).
 * Si la contraseña actual coincide, marca must_change_password = false.
 *
 * Body esperado:
 *   { userId, currentPassword, newPassword }
 *
 * Seguridad:
 *  - Usa scrypt (lib/password.ts).
 *  - Eliminado el backdoor "admin" para usuarios seed sin hash.
 *  - Valida la sesión contra la BD (el userId debe existir y estar activo).
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  password_hash: string | null;
  must_change_password: boolean;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId: string = body.userId ?? "";
    const currentPassword: string = body.currentPassword ?? "";
    const newPassword: string = body.newPassword ?? "";

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Todos los campos son obligatorios." },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { ok: false, error: "La nueva contraseña debe ser diferente a la actual." },
        { status: 400 },
      );
    }

    // Validar contraseña actual
    const user = await queryOne<UserRow>(
      "SELECT id, password_hash, must_change_password, is_active FROM users WHERE id = $1",
      [userId],
    );

    if (!user || !user.is_active) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    if (!user.password_hash) {
      // Sin hash → no se permite (antes había un backdoor "admin")
      return NextResponse.json(
        { ok: false, error: "La contraseña actual es incorrecta." },
        { status: 401 },
      );
    }

    const currentValid = await verifyPassword(currentPassword, user.password_hash);
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
      [newHash, userId],
    );

    return NextResponse.json({
      ok: true,
      message: "¡Contraseña actualizada con éxito!",
    });
  } catch (err) {
    console.error("[change-password] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}