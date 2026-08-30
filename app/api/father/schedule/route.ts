/**
 * GET /api/father/schedule?studentId=<uuid>
 *
 * Horario semanal de un hijo del padre autenticado (según su grado/sección).
 * Respuesta: { ok, days, periods, schedule }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { getSchedule } from "@/lib/father/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    const data = await getSchedule(studentId);
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Estudiante no encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    logger.error({ err, route: "father/schedule" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
