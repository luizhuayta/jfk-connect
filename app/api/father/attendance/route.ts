/**
 * GET /api/father/attendance?studentId=<uuid>&year=2026
 *     &from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Registro de asistencia de un hijo, acotado al año lectivo (o a from/to).
 * Respuesta: { ok, records, counts }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";
import { fatherAttendanceQuerySchema } from "@/lib/schemas";
import { getAttendance, resolveAttendanceRange } from "@/lib/father/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const parsed = fatherAttendanceQuerySchema.safeParse({
    year: searchParams.get("year") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Parámetros no válidos.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  try {
    const range = resolveAttendanceRange(parsed.data);
    const { records, counts } = await getAttendance(studentId, range);
    return NextResponse.json({ ok: true, records, counts });
  } catch (err) {
    logger.error({ err, route: "father/attendance" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
