/**
 * GET /api/father/students
 *
 * Hijos del padre autenticado (sin agregados de notas/asistencia: el panel
 * no los usa; van en la libreta y en la página de asistencia).
 *
 * Seguridad: solo rol 'padre'; cada padre ve únicamente sus propios hijos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { listChildren } from "@/lib/father/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  try {
    const students = await listChildren(user.id);
    return NextResponse.json({ ok: true, students });
  } catch (err) {
    logger.error({ err, route: "father/students" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
