/**
 * POST /api/assistant/messages
 *
 * Un turno del asistente conversacional: recibe el mensaje, resuelve el
 * `ToolContext` (para `padre`, la lista de hijos vía `parent_id`; para
 * `docente`, la lista de cursos vía `teacher_id` — SIEMPRE en el servidor,
 * antes de invocar al modelo), corre el bucle de herramientas, y persiste
 * el turno. Sin streaming (ver lib/ai/agent.ts).
 *
 * Si el padre pega un código de matrícula, se vincula al hijo AQUÍ de forma
 * determinista (misma lógica que POST /api/father/claim-student) y el código
 * se sustituye por `[codigo_matricula]` antes de hablar con el proveedor.
 *
 * Rate limit doble: por usuario Y por IP.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { assistantMessageSchema } from "@/lib/schemas";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { AI_LIMITS } from "@/lib/ai/limits";
import { runAi } from "@/lib/ai/run";
import { runToolLoop } from "@/lib/ai/agent";
import { aiErrorResponse } from "@/lib/ai/errors";
import { assistantSystemPrompt } from "@/lib/ai/prompts/assistant";
import { toolsForRole } from "@/lib/ai/tools/registry";
import { ALL_TOOLS } from "@/lib/ai/tools";
import {
  createConversation,
  getConversation,
  fetchRecentMessages,
  appendTurn,
} from "@/lib/ai/conversations";
import { query } from "@/lib/db";
import type { ChatMessage } from "@/lib/ai/types";
import { logger } from "@/lib/logger";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { SCHOOL_YEAR } from "@/lib/school-year";
import {
  claimStudentForParent,
  extractEnrollmentCode,
  redactEnrollmentCodes,
  type ClaimedStudent,
} from "@/lib/father/claim-student";

export const dynamic = "force-dynamic";

async function loadStudentIds(parentId: string): Promise<string[]> {
  const r = await query<{ id: string }>(
    `SELECT id FROM students WHERE parent_id = $1 ORDER BY full_name`,
    [parentId],
  );
  return r.rows.map((row) => row.id);
}

async function loadCourseIds(teacherId: string): Promise<string[]> {
  const r = await query<{ id: string }>(
    `SELECT id FROM courses WHERE teacher_id = $1 ORDER BY grade, section, name`,
    [teacherId],
  );
  return r.rows.map((row) => row.id);
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const ip = getClientIp(request);
  if (ip) {
    const ipLimit = rateLimit(`ai:assistant:ip:${ip}`, AI_LIMITS.assistant);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { ok: false, error: "Has hecho demasiadas solicitudes de IA. Intenta en unos minutos." },
        { status: 429 },
      );
    }
  }

  const [parsed, validationError] = await parseBody(request, assistantMessageSchema);
  if (validationError) return validationError;

  try {
    let conversationId = parsed.conversationId;
    if (conversationId) {
      const conv = await getConversation(conversationId);
      if (!conv || conv.user_id !== user.id) {
        return NextResponse.json({ ok: false, error: "Conversación no encontrada." }, { status: 404 });
      }
    } else {
      conversationId = await createConversation(user.id, user.role);
    }

    let allowedStudentIds: string[] = [];
    let allowedCourseIds: string[] = [];
    if (user.role === "padre") {
      allowedStudentIds = await loadStudentIds(user.id);
    } else if (user.role === "docente") {
      allowedCourseIds = await loadCourseIds(user.id);
    }

    let messageForModel = parsed.message;
    let claimed: ClaimedStudent | undefined;
    let claimNote: string | null = null;

    if (user.role === "padre") {
      const code = extractEnrollmentCode(parsed.message);
      if (code) {
        const claim = await claimStudentForParent({
          parentId: user.id,
          enrollmentCode: code,
          clientIp: ip,
        });
        messageForModel = redactEnrollmentCodes(parsed.message);
        if (claim.ok) {
          claimed = claim.student;
          allowedStudentIds = await loadStudentIds(user.id);
          claimNote =
            "[sistema: se vinculó un hijo correctamente. Si el usuario pidió notas, asistencia, horario o matrícula, llama YA a la herramienta correspondiente con hijo=1. Si no pidió nada concreto, lista los hijos y ofrece consultar.]";
        } else {
          claimNote =
            "[sistema: no se pudo vincular con el código indicado. Pide que lo revise o use el botón de vincular. No inventes hijos.]";
        }
      }
    }

    if (claimNote) {
      messageForModel = `${messageForModel}\n${claimNote}`;
    }

    const history = await fetchRecentMessages(conversationId);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: assistantSystemPrompt(user.role, {
          schoolYear: SCHOOL_YEAR,
          currentBimester: CURRENT_BIMESTER,
          childCount: user.role === "padre" ? allowedStudentIds.length : undefined,
          courseCount: user.role === "docente" ? allowedCourseIds.length : undefined,
        }),
      },
      ...history.map((m): ChatMessage => ({ role: m.role, content: m.content })),
      { role: "user", content: messageForModel },
    ];

    const tools = toolsForRole(ALL_TOOLS, user.role);

    try {
      const result = await runAi({
        usageFeature: "assistant",
        userId: user.id,
        rateLimitKey: `ai:assistant:user:${user.id}`,
        rateLimitConfig: AI_LIMITS.assistant,
        refType: "conversation",
        refId: conversationId,
        fn: async () => {
          const loopResult = await runToolLoop({
            messages,
            tools,
            ctx: { user, allowedStudentIds, allowedCourseIds },
          });
          return { data: loopResult, usage: loopResult.usage, model: loopResult.model };
        },
      });

      await appendTurn(conversationId, redactEnrollmentCodes(parsed.message), result.reply, result.usage.total_tokens);

      return NextResponse.json({
        ok: true,
        conversationId,
        reply: result.reply,
        steps: result.steps.map((s) => ({ tool: s.tool, ok: s.ok })),
        ...(claimed ? { claimed } : {}),
      });
    } catch (err) {
      if (claimed) {
        logger.error({ err, route: "assistant/messages" }, "IA falló tras vincular un hijo");
        const fallback = `Vinculé a ${claimed.name}. No pude responder tu consulta ahora, vuelve a intentarlo.`;
        try {
          await appendTurn(conversationId, redactEnrollmentCodes(parsed.message), fallback, 0);
        } catch (persistErr) {
          logger.error({ err: persistErr, route: "assistant/messages" }, "no se pudo persistir el turno de fallback");
        }
        return NextResponse.json({
          ok: true,
          conversationId,
          reply: fallback,
          steps: [],
          claimed,
        });
      }
      logger.error({ err, route: "assistant/messages" }, "error inesperado");
      return aiErrorResponse(err, "assistant/messages");
    }
  } catch (err) {
    logger.error({ err, route: "assistant/messages" }, "error inesperado");
    return aiErrorResponse(err, "assistant/messages");
  }
}
