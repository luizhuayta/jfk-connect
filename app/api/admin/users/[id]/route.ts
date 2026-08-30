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
import { parseBody, parseUuidParam } from "@/lib/validate";
import { updateUserSchema } from "@/lib/schemas";
import { recordAdminAction } from "@/lib/admin/audit";
import { guardAdminMutation, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const [admin, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const [id, invalid] = parseUuidParam(rawId);
    if (invalid) return invalid;

    const [parsed, validationError] = await parseBody(request, updateUserSchema);
    if (validationError) return validationError;
    const body = parsed;

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
      updates.push(`must_change_password = true`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay campos para actualizar." },
        { status: 400 },
      );
    }

    sqlParams.push(id);
    const r = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      phone: string | null;
      is_active: boolean;
      created_at: string;
      last_login_at: string | null;
      avatar_url: string | null;
    }>(
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

    const updated = r.rows[0];
    const audits: Promise<void>[] = [];
    if (body.role) {
      audits.push(
        recordAdminAction({
          actorId: admin.id,
          action: "user.role_change",
          entityType: "user",
          entityId: id,
          summary: `Cambió el rol de ${updated.email} a ${body.role}.`,
          meta: { email: updated.email, role: body.role },
        }),
      );
    }
    if (typeof body.isActive === "boolean") {
      audits.push(
        recordAdminAction({
          actorId: admin.id,
          action: body.isActive ? "user.activate" : "user.deactivate",
          entityType: "user",
          entityId: id,
          summary: `${body.isActive ? "Activó" : "Desactivó"} a ${updated.email}.`,
          meta: { email: updated.email, isActive: body.isActive },
        }),
      );
    }
    if (typeof body.password === "string") {
      audits.push(
        recordAdminAction({
          actorId: admin.id,
          action: "user.password_reset",
          entityType: "user",
          entityId: id,
          summary: `Reseteó la contraseña de ${updated.email}.`,
          meta: { email: updated.email },
        }),
      );
    }
    await Promise.all(audits);

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    return internalError(err, "admin/users/[id] PATCH");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const [admin, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const [id, invalid] = parseUuidParam(rawId);
    if (invalid) return invalid;

    if (id === admin.id) {
      return NextResponse.json(
        { ok: false, error: "No puedes eliminar tu propia cuenta." },
        { status: 400 },
      );
    }

    const r = await query<{ id: string; email: string; role: string }>(
      "DELETE FROM users WHERE id = $1 RETURNING id, email, role",
      [id],
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    const deleted = r.rows[0];
    await recordAdminAction({
      actorId: admin.id,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      summary: `Eliminó a ${deleted.email}.`,
      meta: { email: deleted.email, role: deleted.role },
    });

    return NextResponse.json({
      ok: true,
      message: `Usuario ${deleted.email} eliminado.`,
    });
  } catch (err) {
    return internalError(err, "admin/users/[id] DELETE");
  }
}
