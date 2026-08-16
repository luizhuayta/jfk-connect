/**
 * PATCH  /api/admin/users/[id] -> Actualizar usuario (rol, estado, datos)
 * DELETE /api/admin/users/[id] -> Eliminar usuario
 *
 * Seguridad:
 *  - Ambos endpoints requieren sesión de admin (requireRole).
 *  - Usa scrypt (lib/password.ts) para hashear contraseñas.
 *  - Un admin no puede eliminarse ni desactivarse a sí mismo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { updateUserSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  // Proteger: solo admin
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [admin, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { id } = await params;
    const [parsed, validationError] = await parseBody(request, updateUserSchema);
    if (validationError) return validationError;
    const body = parsed;

    // Evitar que un admin se desactive a sí mismo
    if (
      typeof body.isActive === "boolean" &&
      body.isActive === false &&
      id === admin.id
    ) {
      return NextResponse.json(
        { ok: false, error: "No puedes desactivar tu propia cuenta." },
        { status: 400 },
      );
    }

    const updates: string[] = [];
    const sqlParams: unknown[] = [];

    if (body.fullName) {
      sqlParams.push(body.fullName.trim());
      updates.push(`full_name = $${sqlParams.length}`);
    }
    if (body.role) {
      sqlParams.push(body.role);
      updates.push(`role = $${sqlParams.length}`);
    }
    if (typeof body.phone === "string") {
      sqlParams.push(body.phone || null);
      updates.push(`phone = $${sqlParams.length}`);
    }
    if (typeof body.isActive === "boolean") {
      sqlParams.push(body.isActive);
      updates.push(`is_active = $${sqlParams.length}`);
    }
    if (body.subject !== undefined) {
      sqlParams.push(body.subject);
      updates.push(`subject = $${sqlParams.length}`);
    }
    if (body.shiftPreference) {
      sqlParams.push(body.shiftPreference);
      updates.push(`shift_preference = $${sqlParams.length}`);
    }
    if (typeof body.password === "string" && body.password.length >= 8) {
      sqlParams.push(await hashPassword(body.password));
      updates.push(`password_hash = $${sqlParams.length}`);
      // Si el admin resetea la contraseña, forzar cambio en el próximo login
      updates.push(`must_change_password = true`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay campos para actualizar." },
        { status: 400 },
      );
    }

    sqlParams.push(id);
    const r = await query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${sqlParams.length}
       RETURNING id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url`,
      sqlParams,
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, user: r.rows[0] });
  } catch (err) {
    logger.error({ err, route: "admin/users/[id] PATCH" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  // Proteger: solo admin
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [admin, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { id } = await params;

    // Evitar auto-eliminación
    if (id === admin.id) {
      return NextResponse.json(
        { ok: false, error: "No puedes eliminar tu propia cuenta." },
        { status: 400 },
      );
    }

    const r = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id, email",
      [id],
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Usuario ${r.rows[0].email} eliminado.`,
    });
  } catch (err) {
    logger.error({ err, route: "admin/users/[id] DELETE" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}