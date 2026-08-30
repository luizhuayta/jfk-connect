/**
 * PATCH  /api/announcements/[id]  -> Editar aviso (solo admin)
 * DELETE /api/announcements/[id]  -> Eliminar aviso (solo admin)
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { updateAnnouncementSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const CATEGORIES = ["urgente", "importante", "general", "informativo"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const { id } = await params;

  try {
    const [parsed, validationError] = await parseBody(request, updateAnnouncementSchema);
    if (validationError) return validationError;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (parsed.title) { values.push(parsed.title); fields.push(`title = $${values.length}`); }
    if (parsed.body) { values.push(parsed.body); fields.push(`body = $${values.length}`); }
    if (parsed.category) { values.push(parsed.category); fields.push(`category = $${values.length}`); }
    if (parsed.audience) { values.push(parsed.audience); fields.push(`audience = $${values.length}`); }

    if (!fields.length) {
      return NextResponse.json(
        { ok: false, error: "No hay campos para actualizar." },
        { status: 400 },
      );
    }

    values.push(id);
    const updated = await queryOne<{ id: string }>(
      `UPDATE announcements SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id`,
      values,
    );

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Aviso no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[announcements/[id] PATCH] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const { id } = await params;

  try {
    const deleted = await queryOne<{ id: string }>(
      "DELETE FROM announcements WHERE id = $1 RETURNING id",
      [id],
    );
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Aviso no encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[announcements/[id] DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
