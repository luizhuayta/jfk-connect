/**
 * GET /api/admin/subjects
 *
 * Lista las 12 asignaturas del colegio. Se usa para llenar el dropdown
 * al crear/editar docentes y validar asignaciones de cursos.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SUBJECTS = [
  "Matemáticas",
  "Comunicación",
  "Ciencia y Tecnología",
  "Cívica",
  "Religión",
  "Arte",
  "Educación Física",
  "EPT",
  "Tutoría",
  "Inglés",
  "HGE",
  "DPCC",
];

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  return NextResponse.json({ ok: true, subjects: SUBJECTS });
}