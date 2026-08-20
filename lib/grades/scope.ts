import { NextResponse, type NextRequest } from "next/server";
import { requireOwnedCourse, requireTutoredSection, type CourseRef } from "@/lib/guards";
import { fetchCatalog } from "@/lib/curriculum/server";
import { isBimesterOpen } from "@/lib/grades/bimesters";
import type { AuthUser } from "@/lib/auth";

export type GradeScope = {
  kind: "course" | "transversal";
  areaId: number;
  competencyIds: number[];
  grade: string;
  section: string;
  courseId: string | null;
  bimester: number;
  editable: boolean;
};

type ScopeInput = {
  courseId?: string | null;
  grade?: string | null;
  section?: string | null;
  transversal?: boolean;
  bimester: number;
};

/**
 * Resuelve QUIÉN puede leer/escribir esta grilla de notas y QUÉ
 * competencias caen dentro de su alcance, en un solo sitio — antes cada
 * ruta de notas repetía su propio guard + su propia interpretación de qué
 * está bloqueado. Dos formas de scope:
 *
 *  - `courseId` → notas de un área normal. Guard: requireOwnedCourse
 *    (docente dueño del curso, o admin).
 *  - `grade` + `section` + `transversal=1` → competencias transversales
 *    (no tienen curso propio). Guard: requireTutoredSection (tutor de esa
 *    sección, o admin).
 *
 * El PUT usa `competencyIds` para rechazar cualquier nota que caiga fuera
 * del área/bloque que le corresponde a quien escribe (ej. que un docente
 * de Matemática no pueda colar una nota de Religión).
 */
export async function resolveGradeScope(
  request: NextRequest,
  input: ScopeInput,
): Promise<[{ user: AuthUser; scope: GradeScope }, null] | [null, NextResponse]> {
  const { areas, competencies } = await fetchCatalog();

  if (input.courseId) {
    const [ctx, denied] = await requireOwnedCourse(request, input.courseId);
    if (denied) return [null, denied];
    const { user, course } = ctx as { user: AuthUser; course: CourseRef };

    if (course.areaId === null) {
      return [
        null,
        NextResponse.json(
          { ok: false, error: "Este curso no tiene un área curricular asignada." },
          { status: 409 },
        ),
      ];
    }

    const competencyIds = competencies.filter((c) => c.areaId === course.areaId).map((c) => c.id);
    const scope: GradeScope = {
      kind: "course",
      areaId: course.areaId,
      competencyIds,
      grade: course.grade,
      section: course.section,
      courseId: course.id,
      bimester: input.bimester,
      editable: isBimesterOpen(input.bimester),
    };
    return [{ user, scope }, null];
  }

  if (input.transversal && input.grade && input.section) {
    const [user, denied] = await requireTutoredSection(request, input.grade, input.section);
    if (denied) return [null, denied];

    const transversalArea = areas.find((a) => a.isTransversal);
    if (!transversalArea) {
      return [
        null,
        NextResponse.json(
          { ok: false, error: "No hay un área transversal configurada." },
          { status: 500 },
        ),
      ];
    }

    const competencyIds = competencies
      .filter((c) => c.areaId === transversalArea.id)
      .map((c) => c.id);
    const scope: GradeScope = {
      kind: "transversal",
      areaId: transversalArea.id,
      competencyIds,
      grade: input.grade,
      section: input.section,
      courseId: null,
      bimester: input.bimester,
      editable: isBimesterOpen(input.bimester),
    };
    return [{ user, scope }, null];
  }

  return [
    null,
    NextResponse.json(
      { ok: false, error: "Falta courseId, o grade+section+transversal." },
      { status: 400 },
    ),
  ];
}
