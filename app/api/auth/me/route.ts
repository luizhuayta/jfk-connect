/**
 * GET /api/auth/me
 *
 * Devuelve los datos del usuario autenticado.
 * Ahora lee la sesión de la cookie httpOnly (JWT) en lugar del header X-User-Id.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
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