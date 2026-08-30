/**
 * GET /api/father/enrollment?studentId=<uuid>
 *
 * Datos de matrícula del año más reciente de un hijo del padre autenticado.
 * Respuesta: { ok, enrollment: {...} | null }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { getEnrollment } from "@/lib/father/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    const enrollment = await getEnrollment(studentId);
    return NextResponse.json({ ok: true, enrollment });
  } catch (err) {
    logger.error({ err, route: "father/enrollment" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
