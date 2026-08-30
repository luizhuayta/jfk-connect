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
import { parseBody, parseUuidParam } from "@/lib/validate";
import { updateStudentSchema } from "@/lib/schemas";
import { recordAdminAction } from "@/lib/admin/audit";
import { guardAdminMutation, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const [admin, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    updateStudentSchema,
  );
  if (validationError) return validationError;

  try {
    const { id: rawId } = await params;
    const [id, invalid] = parseUuidParam(rawId);
    if (invalid) return invalid;

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

    if (parsed.unlinkParent === true) {
      await recordAdminAction({
        actorId: admin.id,
        action: "student.unlink_parent",
        entityType: "student",
        entityId: id,
        summary: `Desvinculó al apoderado del alumno ${id}.`,
        meta: { studentId: id },
      });
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
    return internalError(err, "admin/students/[id] PATCH");
  }
}
