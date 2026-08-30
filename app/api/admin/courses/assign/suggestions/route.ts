/**
 * GET /api/admin/courses/assign/suggestions?courseId=<uuid>
 *
 * Candidatos rankeados para asignar a un curso — motor 100% determinista
 * (lib/courses/assignment.ts vía lib/courses/queries.ts), SIN IA. Reemplaza
 * el `<select>` pelado que solo filtraba por `subject === name`: ahora se
 * ve el puntaje, las razones (turno, carga, continuidad, tutoría) y los
 * bloqueos (área distinta, inactivo, cruce de horario) de cada docente.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { parseUuidParam } from "@/lib/validate";
import { fetchCourseCandidates } from "@/lib/courses/queries";
import { guardAdmin, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const courseIdRaw = searchParams.get("courseId");
  if (!courseIdRaw) {
    return NextResponse.json({ ok: false, error: "Falta el parámetro courseId." }, { status: 400 });
  }
  const [courseId, invalid] = parseUuidParam(courseIdRaw);
  if (invalid) return invalid;

  try {
    const result = await fetchCourseCandidates(courseId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Curso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return internalError(err, "admin/courses/assign/suggestions GET");
  }
}
