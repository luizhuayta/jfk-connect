/**
 * GET /api/father/materials?studentId=<uuid>
 *
 * Materiales de clase publicados por los docentes, agrupados por curso del hijo.
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { getMaterials } from "@/lib/father/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    const courses = await getMaterials(studentId);
    return NextResponse.json({ ok: true, courses });
  } catch (err) {
    logger.error({ err, route: "father/materials" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
