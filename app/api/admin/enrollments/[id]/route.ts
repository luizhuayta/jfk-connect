/**
 * PATCH /api/admin/enrollments/[id]
 *
 * Actualiza pagos (APAFA / actividades), documentos entregados y estado
 * de una matrícula. Si se marca algún pago como realizado, se registra
 * la fecha del día en last_payment_date.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { updateEnrollmentSchema } from "@/lib/schemas";
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
    updateEnrollmentSchema,
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
    if (parsed.docsSubmitted !== undefined) {
      sqlParams.push(parsed.docsSubmitted);
      updates.push(`docs_submitted = $${sqlParams.length}`);
    }
    if (parsed.apafaPaid !== undefined) {
      sqlParams.push(parsed.apafaPaid);
      updates.push(`apafa_paid = $${sqlParams.length}`);
    }
    if (parsed.actividadesPaid !== undefined) {
      sqlParams.push(parsed.actividadesPaid);
      updates.push(`actividades_paid = $${sqlParams.length}`);
    }
    // Registrar la fecha solo cuando se marca un pago nuevo
    if (parsed.apafaPaid === true || parsed.actividadesPaid === true) {
      updates.push(`last_payment_date = CURRENT_DATE`);
    }

    sqlParams.push(id);
    const r = await query<{
      id: string;
      status: string;
      docs_submitted: number;
      apafa_paid: boolean;
      actividades_paid: boolean;
      last_payment_date: string | null;
    }>(
      `UPDATE enrollments
       SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${sqlParams.length}
       RETURNING id,
                 status::text AS status,
                 docs_submitted,
                 apafa_paid,
                 actividades_paid,
                 to_char(last_payment_date, 'YYYY-MM-DD') AS last_payment_date`,
      sqlParams,
    );

    if (r.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Matrícula no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, enrollment: r.rows[0] });
  } catch (err) {
    logger.error({ err, route: "admin/enrollments/[id] PATCH" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
