/**
 * POST /api/ai/conclusions
 *
 * Genera BORRADORES de conclusión descriptiva (libreta SIAGIE) con IA, uno
 * por (alumno, competencia). No escribe en la base de datos — el docente
 * recibe las sugerencias, las revisa/edita en la grilla, y las guarda con
 * el PUT /api/grades de siempre (mismo flujo, mismo botón "Guardar").
 *
 * Guard: resolveGradeScope, exactamente el mismo que usa la grilla de
 * notas — sin envoltorio de autorización nuevo. Solo se permite generar si
 * el bimestre está abierto para registro (mismo criterio y mismo mensaje
 * que PUT /api/grades).
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { generateConclusionsSchema } from "@/lib/schemas";
import { resolveGradeScope } from "@/lib/grades/scope";
import { fetchGradeGrid, type GridEntry } from "@/lib/grades/queries";
import { fetchCatalog } from "@/lib/curriculum/server";
import { AI_LIMITS } from "@/lib/ai/limits";
import { runAi } from "@/lib/ai/run";
import { requestJson } from "@/lib/ai/json";
import { aiErrorResponse } from "@/lib/ai/errors";
import { firstNameOnly, buildAliases, rehydrate } from "@/lib/ai/redact";
import { conclusionsSystemPrompt } from "@/lib/ai/prompts/conclusions";
import { LEVEL_LABEL, type Level } from "@/lib/grades/scale";

export const dynamic = "force-dynamic";

const aiConclusionsResponseSchema = z.object({
  items: z.array(
    z.object({
      alias: z.string(),
      competencyId: z.number().int(),
      text: z.string().min(10).max(500),
    }),
  ),
});

function levelLabel(level: string | null): string {
  if (!level) return "sin nivel";
  return LEVEL_LABEL[level as Level] ?? "sin nivel";
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [parsed, validationError] = await parseBody(request, generateConclusionsSchema);
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

  try {
    const requestedCompetencyIds = parsed.competencyIds;
    const scopeCompetencyIds = requestedCompetencyIds
      ? scope.competencyIds.filter((id) => requestedCompetencyIds.includes(id))
      : scope.competencyIds;
    if (scopeCompetencyIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay competencias válidas para este scope." },
        { status: 400 },
      );
    }

    const { competencies } = await fetchCatalog();
    const competencyName = new Map(competencies.map((c) => [c.id, c.name]));

    const [current, previous] = await Promise.all([
      fetchGradeGrid(scope),
      parsed.bimester > 1 ? fetchGradeGrid({ ...scope, bimester: parsed.bimester - 1 }) : Promise.resolve(null),
    ]);

    const requestedStudentIds = new Set(parsed.studentIds);
    const students = current.students.filter((s) => requestedStudentIds.has(s.id));
    if (students.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ninguno de los alumnos indicados pertenece a este scope." },
        { status: 400 },
      );
    }

    const aliasMap = buildAliases(students.map((s) => ({ id: s.id })));

    const entriesByStudent = new Map<string, GridEntry[]>();
    for (const e of current.entries) {
      const list = entriesByStudent.get(e.studentId) ?? [];
      list.push(e);
      entriesByStudent.set(e.studentId, list);
    }
    const prevLevelByKey = new Map<string, string>();
    if (previous) {
      for (const e of previous.entries) {
        if (e.level) prevLevelByKey.set(`${e.studentId}:${e.competencyId}`, e.level);
      }
    }

    const skipped: string[] = [];
    const promptBlocks: string[] = [];

    for (const student of students) {
      const alias = aliasMap.get(student.id);
      if (!alias) continue;
      const entries = (entriesByStudent.get(student.id) ?? []).filter(
        (e) => scopeCompetencyIds.includes(e.competencyId) && e.score !== null,
      );
      if (entries.length === 0) {
        skipped.push(alias);
        continue;
      }
      const firstName = firstNameOnly(student.name);
      const lines = entries.map((e) => {
        const compName = competencyName.get(e.competencyId) ?? `Competencia ${e.competencyId}`;
        const prevLevel = prevLevelByKey.get(`${student.id}:${e.competencyId}`);
        const prevPart = prevLevel ? ` (bimestre anterior: ${levelLabel(prevLevel)})` : "";
        return `  - "${compName}" [competencyId=${e.competencyId}]: ${levelLabel(e.level)}${prevPart}`;
      });
      promptBlocks.push(`Alumno ${alias} (${firstName}):\n${lines.join("\n")}`);
    }

    if (promptBlocks.length === 0) {
      return NextResponse.json({ ok: true, suggestions: [], skipped, usage: null });
    }

    const suggestions = await runAi({
      usageFeature: "conclusions",
      userId: user.id,
      rateLimitKey: `ai:conclusions:user:${user.id}`,
      rateLimitConfig: AI_LIMITS.conclusions,
      refType: scope.kind === "course" ? "course" : "section",
      refId: scope.courseId ?? undefined,
      meta: { bimester: parsed.bimester, studentCount: students.length },
      fn: async () => {
        const result = await requestJson({
          schema: aiConclusionsResponseSchema,
          schemaName: "conclusiones_descriptivas",
          messages: [
            { role: "system", content: conclusionsSystemPrompt(parsed.tone, parsed.maxChars) },
            { role: "user", content: promptBlocks.join("\n\n") },
          ],
        });

        const seen = new Set<string>();
        const mapped = result.data.items.flatMap((item) => {
          if (!scopeCompetencyIds.includes(item.competencyId)) return [];
          const studentId = rehydrate(item.alias, aliasMap);
          if (!studentId) return [];
          const key = `${item.alias}:${item.competencyId}`;
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ studentId, competencyId: item.competencyId, text: item.text.slice(0, Math.min(parsed.maxChars, 500)) }];
        });

        return { data: mapped, usage: result.usage, model: result.model };
      },
    });

    return NextResponse.json({ ok: true, suggestions, skipped, usage: null });
  } catch (err) {
    return aiErrorResponse(err, "ai/conclusions");
  }
}
