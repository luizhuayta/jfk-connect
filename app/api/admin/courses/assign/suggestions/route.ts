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
import { requireRole } from "@/lib/auth";
import { fetchCourseCandidates } from "@/lib/courses/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ ok: false, error: "Falta el parámetro courseId." }, { status: 400 });
  }

  try {
    const result = await fetchCourseCandidates(courseId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Curso no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/courses/assign/suggestions GET] Error:", err);
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
