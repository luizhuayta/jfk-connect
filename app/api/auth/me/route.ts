/**
 * GET   /api/auth/me -> Datos del usuario autenticado.
 * PATCH /api/auth/me -> El usuario edita su propio nombre y/o teléfono.
 *
 * Ahora lee la sesión de la cookie httpOnly (JWT) en lugar del header X-User-Id.
 * PATCH no permite cambiar email, rol ni contraseña (eso usa endpoints propios:
 * /api/auth/change-password, y email/rol solo los edita un admin).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { updateOwnProfileSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No autenticado." },
        { status: 401 },
      );
    }

    // Devolver datos completos del usuario desde la BD
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        phone: user.phone,
      },
    });
  } catch (err) {
    logger.error({ err, route: "auth/me" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, updateOwnProfileSchema);
  if (validationError) return validationError;

  try {
    const r = await query<{ full_name: string; phone: string | null }>(
      `UPDATE users SET full_name = $2, phone = $3 WHERE id = $1
       RETURNING full_name, phone`,
      [user.id, parsed.fullName, parsed.phone ?? null],
    );

    return NextResponse.json({ ok: true, user: r.rows[0] });
  } catch (err) {
    logger.error({ err, route: "auth/me PATCH" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}