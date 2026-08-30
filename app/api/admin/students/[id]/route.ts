/**
 * PATCH /api/admin/students/[id]
 *
 * Acciones sobre un alumno existente:
 *   - Cambiar estado:  { status: "activo" | "retirado" | "trasladado" }
 *   - Desvincular apoderado: { unlinkParent: true }
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { updateStudentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    updateStudentSchema,
  );
  if (validationError) return validationError;

  try {
    const { id } = await params;

    const updates: string[] = [];
    const sqlParams: unknown[] = [];

    if (parsed.status) {
      sqlParams.push(parsed.status);
      updates.push(`status = $${sqlParams.length}`);
    }
    if (parsed.unlinkParent === true) {
      updates.push(`parent_id = NULL`, `parent_claimed_at = NULL`);
    }

    sqlParams.push(id);
    const r = await query<{
      id: string;
      status: string;
      parent_id: string | null;
    }>(
      `UPDATE students
       SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${sqlParams.length}
       RETURNING id, status, parent_id`,
      sqlParams,
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Alumno no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      student: {
        id: r.rows[0].id,
        status: r.rows[0].status,
        parentId: r.rows[0].parent_id,
      },
    });
  } catch (err) {
    logger.error({ err, route: "admin/students/[id] PATCH" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
