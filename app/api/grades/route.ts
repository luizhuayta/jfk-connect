/**
 * GET  /api/grades?courseId=<uuid>&bimester=N
 * GET  /api/grades?grade=1ro&section=A&transversal=1&bimester=N
 * PUT  /api/grades
 *
 * Notas por competencia (libreta SIAGIE). Reemplaza el modelo plano de
 * `PUT /api/teacher/courses/[courseId]/grades` (n1/n2/n3 por curso) — ese
 * endpoint solo aceptaba escritura del docente; este acepta docente Y
 * admin (Dirección necesita poder registrar notas cuando el docente no
 * está). Cubre además las competencias transversales, que no tienen
 * `courseId` propio (grade+section+transversal=1, calificadas por el
 * tutor de la sección).
 *
 * Toda la resolución de permisos + qué competencias caen en este scope
 * vive en lib/grades/scope.ts::resolveGradeScope — un solo sitio en vez de
 * repetir el guard en cada ruta. El PUT solo acepta notas cuya
 * `competencyId` esté dentro de `scope.competencyIds` (evita que un
 * docente de un área escriba notas de otra).
 *
 * Seguridad: docente dueño del curso/tutor de la sección, o admin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { saveCompetencyGradesSchema } from "@/lib/schemas";
import { resolveGradeScope } from "@/lib/grades/scope";
import { fetchGradeGrid, saveGradeEntries } from "@/lib/grades/queries";
import { fetchCatalog } from "@/lib/curriculum/server";

export const dynamic = "force-dynamic";

function parseBimester(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bimester = parseBimester(searchParams.get("bimester"));
  if (bimester === null) {
    return NextResponse.json(
      { ok: false, error: "Parámetro bimester inválido (debe ser 1-4)." },
      { status: 400 },
    );
  }

  const [ctx, denied] = await resolveGradeScope(request, {
    courseId: searchParams.get("courseId"),
    grade: searchParams.get("grade"),
    section: searchParams.get("section"),
    transversal: searchParams.get("transversal") === "1",
    bimester,
  });
  if (denied) return denied;
  const { scope } = ctx;

  try {
    const { areas, competencies } = await fetchCatalog();
    const area = areas.find((a) => a.id === scope.areaId);
    const scopeCompetencies = competencies
      .filter((c) => scope.competencyIds.includes(c.id))
      .sort((a, b) => a.order - b.order);
    const { students, entries } = await fetchGradeGrid(scope);

    return NextResponse.json({
      ok: true,
      scope: {
        kind: scope.kind,
        areaId: scope.areaId,
        areaName: area?.name ?? "",
        courseId: scope.courseId,
        grade: scope.grade,
        section: scope.section,
        bimester: scope.bimester,
        editable: scope.editable,
      },
      competencies: scopeCompetencies,
      students,
      entries,
    });
  } catch (err) {
    console.error("[grades GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [parsed, validationError] = await parseBody(request, saveCompetencyGradesSchema);
  if (validationError) return validationError;

  const [ctx, denied] = await resolveGradeScope(request, {
    courseId: parsed.courseId,
    grade: parsed.grade,
    section: parsed.section,
    transversal: parsed.transversal,
    bimester: parsed.bimester,
  });
  if (denied) return denied;
  const { user, scope } = ctx;

  if (!scope.editable) {
    return NextResponse.json(
      { ok: false, error: "Este bimestre aún no está disponible para registro." },
      { status: 403 },
    );
  }

  // Rechazo explícito (no descarte silencioso) de cualquier nota que caiga
  // fuera de las competencias de este scope — evita que un docente de un
  // área cuele una nota de otra. saveGradeEntries también filtra por
  // defensa en profundidad, pero acá la petición completa debe fallar, no
  // devolver 200 habiendo ignorado parte de lo que mandó el cliente.
  const competencySet = new Set(scope.competencyIds);
  const outOfScope = parsed.entries.filter((e) => !competencySet.has(e.competencyId));
  if (outOfScope.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `${outOfScope.length} nota(s) no pertenecen a las competencias de "${scope.kind === "transversal" ? "Transversales" : scope.grade + ' "' + scope.section + '"'}".`,
      },
      { status: 403 },
    );
  }

  try {
    await saveGradeEntries(scope, parsed.entries, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[grades PUT] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
