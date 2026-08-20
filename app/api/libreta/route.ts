/**
 * GET /api/libreta?studentId=<uuid>&year=2026
 *
 * Libreta SIAGIE completa de un alumno: áreas → competencias → nivel de
 * logro (AD/A/B/C) y conclusión descriptiva por bimestre, más asistencia
 * agregada y la leyenda de la escala. Reemplaza a
 * `GET /api/father/grades` (modelo plano n1/n2/n3).
 *
 * Es el payload ÚNICO que usan tanto la pantalla del padre
 * (app/father/grades/page.tsx) como el generador de PDF (lib/report/) — el
 * PDF ya no hace sus propios fetches (antes `loadAttendance` pegaba a
 * `/api/father/attendance`, que es `requireRole(["padre"])` y le daba 403 a
 * un admin descargando la misma libreta). Con un solo endpoint, padre,
 * tutor y admin ven y descargan exactamente los mismos datos.
 *
 * Nunca se envía el número (0-20) de las competencias, solo la letra — la
 * libreta imprime únicamente el nivel de logro.
 *
 * Seguridad: padre dueño del alumno, admin, o el docente tutor de su
 * sección (requireStudentAccess, allowTutor).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireStudentAccess } from "@/lib/guards";
import { buildLibreta } from "@/lib/grades/libreta";
import { SCHOOL_YEAR } from "@/lib/school-year";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "Falta el parámetro studentId." }, { status: 400 });
  }
  const yearRaw = searchParams.get("year");
  const year = yearRaw ? Number(yearRaw) : SCHOOL_YEAR;

  const [, denied] = await requireStudentAccess(request, studentId, { allowTutor: true });
  if (denied) return denied;

  try {
    const libreta = await buildLibreta(studentId, year);
    if (!libreta) {
      return NextResponse.json({ ok: false, error: "Estudiante no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, libreta });
  } catch (err) {
    console.error("[libreta GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
