/**
 * GET /api/curriculum
 *
 * Catálogo de áreas curriculares y competencias (fuente de verdad: BD, ver
 * supabase/migrations/00000000000008_competencias.sql). Lo consumen los 3
 * paneles vía <CurriculumProvider>/useCurriculum() — reemplaza la lista de
 * 12 asignaturas que antes estaba triplicada en código.
 *
 * Seguridad: cualquier usuario autenticado (admin, docente o padre).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchCatalog } from "@/lib/curriculum/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [, denied] = await requireUser(request);
  if (denied) return denied;

  try {
    const { areas, competencies } = await fetchCatalog();
    return NextResponse.json({ ok: true, areas, competencies });
  } catch (err) {
    console.error("[curriculum GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
