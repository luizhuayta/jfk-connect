/**
 * POST /api/admin/courses/assign/explain
 *
 * Único punto con IA de la feature de asignación de cursos. La IA NO elige
 * ni rankea nada — recibe el resultado YA calculado por el motor
 * determinista (lib/courses/assignment.ts, vía lib/courses/queries.ts,
 * re-derivado en el servidor, nunca confiando en lo que mande el cliente) y
 * redacta un párrafo apto para un acta institucional a partir de
 * `reasons`. Si la IA está apagada, se devuelve una versión por plantilla
 * armada con las mismas razones — esta función NO depende de la IA para
 * ser usable.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { explainAssignmentSchema } from "@/lib/schemas";
import { fetchCourseCandidates } from "@/lib/courses/queries";
import { isAiEnabled } from "@/lib/ai/config";
import { AI_LIMITS } from "@/lib/ai/limits";
import { runAi } from "@/lib/ai/run";
import { requestJson } from "@/lib/ai/json";
import { aiErrorResponse } from "@/lib/ai/errors";
import { firstNameOnly } from "@/lib/ai/redact";
import { ASSIGNMENT_EXPLAIN_SYSTEM_PROMPT, buildAssignmentExplainPrompt } from "@/lib/ai/prompts/assignment";
import { guardAdminMutation } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

const explainResponseSchema = z.object({
  explanation: z.string().min(10).max(600),
});

function templateExplanation(args: { teacherName: string; courseName: string; grade: string; section: string; reasons: string[] }): string {
  if (args.reasons.length === 0) {
    return `Se propone a ${args.teacherName} para ${args.courseName} de ${args.grade} "${args.section}" por cumplir el área curricular requerida. No se identificaron ventajas particulares adicionales.`;
  }
  const reasonsText = args.reasons.map((r) => r.replace(/\.$/, "").toLowerCase()).join("; ");
  return `Se propone a ${args.teacherName} para ${args.courseName} de ${args.grade} "${args.section}" porque ${reasonsText}.`;
}

export async function POST(request: NextRequest) {
  const [user, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, explainAssignmentSchema);
  if (validationError) return validationError;

  try {
    const result = await fetchCourseCandidates(parsed.courseId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "Curso no encontrado." }, { status: 404 });
    }
    const candidate = result.candidates.find((c) => c.teacherId === parsed.teacherId);
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Docente no encontrado entre los candidatos de este curso." }, { status: 404 });
    }

    if (!isAiEnabled()) {
      return NextResponse.json({
        ok: true,
        explanation: templateExplanation({
          teacherName: candidate.teacherName,
          courseName: result.course.name,
          grade: result.course.grade,
          section: result.course.section,
          reasons: candidate.reasons,
        }),
        source: "template" as const,
      });
    }

    const explanation = await runAi({
      usageFeature: "assignment",
      userId: user.id,
      rateLimitKey: `ai:assign_explain:user:${user.id}`,
      rateLimitConfig: AI_LIMITS.assign_explain,
      refType: "course",
      refId: parsed.courseId,
      fn: async () => {
        const res = await requestJson({
          schema: explainResponseSchema,
          schemaName: "explicacion_asignacion",
          messages: [
            { role: "system", content: ASSIGNMENT_EXPLAIN_SYSTEM_PROMPT },
            {
              role: "user",
              content: buildAssignmentExplainPrompt({
                teacherFirstName: firstNameOnly(candidate.teacherName),
                courseName: result.course.name,
                grade: result.course.grade,
                section: result.course.section,
                reasons: candidate.reasons,
              }),
            },
          ],
        });
        return { data: res.data.explanation, usage: res.usage, model: res.model };
      },
    });

    return NextResponse.json({ ok: true, explanation, source: "ai" as const });
  } catch (err) {
    return aiErrorResponse(err, "admin/courses/assign/explain");
  }
}
