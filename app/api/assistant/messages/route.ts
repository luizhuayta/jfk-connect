/**
 * POST /api/assistant/messages
 *
 * Un turno del asistente conversacional: recibe el mensaje, resuelve el
 * `ToolContext` (para `padre`, la lista de hijos vía `parent_id`; para
 * `docente`, la lista de cursos vía `teacher_id` — SIEMPRE en el servidor,
 * antes de invocar al modelo), corre el bucle de herramientas, y persiste
 * el turno. Sin streaming (ver lib/ai/agent.ts).
 *
 * Rate limit doble: por usuario Y por IP — un usuario no puede evadir el
 * límite rotando de sesión, ni un atacante sin sesión válida (aunque igual
 * necesitaría una sesión real, `requireUser` va primero).
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

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const ipLimit = rateLimit(`ai:assistant:ip:${getClientIp(request)}`, AI_LIMITS.assistant);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Has hecho demasiadas solicitudes de IA. Intenta en unos minutos." },
      { status: 429 },
    );
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

    // Resolución de acceso ANTES de invocar al modelo — el núcleo de
    // seguridad de las herramientas de padre/docente (ver lib/ai/tools/).
    let allowedStudentIds: string[] = [];
    let allowedCourseIds: string[] = [];
    if (user.role === "padre") {
      const r = await query<{ id: string }>(`SELECT id FROM students WHERE parent_id = $1 ORDER BY full_name`, [user.id]);
      allowedStudentIds = r.rows.map((row) => row.id);
    } else if (user.role === "docente") {
      const r = await query<{ id: string }>(`SELECT id FROM courses WHERE teacher_id = $1`, [user.id]);
      allowedCourseIds = r.rows.map((row) => row.id);
    }

    const history = await fetchRecentMessages(conversationId);
    const messages: ChatMessage[] = [
      { role: "system", content: assistantSystemPrompt(user.role) },
      ...history.map((m): ChatMessage => ({ role: m.role, content: m.content })),
      { role: "user", content: parsed.message },
    ];

    const tools = toolsForRole(ALL_TOOLS, user.role);

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

    await appendTurn(conversationId, parsed.message, result.reply, result.usage.total_tokens);

    return NextResponse.json({
      ok: true,
      conversationId,
      reply: result.reply,
      steps: result.steps.map((s) => ({ tool: s.tool, ok: s.ok })),
    });
  } catch (err) {
    logger.error({ err, route: "assistant/messages" }, "error inesperado");
    return aiErrorResponse(err, "assistant/messages");
  }
}
