/**
 * Bucle de function calling (tool loop) del asistente conversacional — IJFK.
 *
 * `runToolLoop` orquesta las idas y vueltas modelo↔herramientas. No hay
 * streaming en v1 (sin precedente de SSE en el repo — ver fase P5 del
 * plan): se resuelve todo en una sola llamada HTTP y se devuelve el texto
 * final más la lista de pasos (qué herramienta se llamó) para que el
 * cliente muestre "consultando: notas de tu hijo" mientras espera.
 *
 * Tope duro de pasos y de tamaño por resultado — ver lib/ai/tools/sanitize.ts.
 * Si el modelo pide una herramienta fuera de su rol, no se ejecuta: se
 * responde con un error de herramienta (nunca se lanza una excepción que
 * tumbe la conversación) y se registra en el step para poder auditar
 * intentos de escalada.
 */

import { getAiConfig } from "@/lib/ai/config";
import { chatCompletion } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { toOpenAiTools, type AssistantTool, type ToolContext } from "@/lib/ai/tools/registry";
import { sanitizeToolResult } from "@/lib/ai/tools/sanitize";
import type { ChatMessage, TokenUsage } from "@/lib/ai/types";

const DEFAULT_MAX_STEPS = 4;

export interface ToolStep {
  tool: string;
  args: unknown;
  ok: boolean;
}

export interface RunToolLoopArgs {
  messages: ChatMessage[];
  tools: AssistantTool[];
  ctx: ToolContext;
  maxSteps?: number;
}

export interface RunToolLoopResult {
  reply: string;
  steps: ToolStep[];
  usage: TokenUsage;
  model: string;
}

function addUsage(total: TokenUsage, extra: TokenUsage | undefined): TokenUsage {
  if (!extra) return total;
  return {
    prompt_tokens: total.prompt_tokens + extra.prompt_tokens,
    completion_tokens: total.completion_tokens + extra.completion_tokens,
    total_tokens: total.total_tokens + extra.total_tokens,
  };
}

export async function runToolLoop(args: RunToolLoopArgs): Promise<RunToolLoopResult> {
  const cfg = getAiConfig();
  const maxSteps = args.maxSteps ?? DEFAULT_MAX_STEPS;
  const toolByName = new Map(args.tools.map((t) => [t.name, t]));
  const toolDefs = toOpenAiTools(args.tools);

  const history: ChatMessage[] = [...args.messages];
  const steps: ToolStep[] = [];
  let usage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let lastModel = cfg.modelText;

  for (let step = 0; step < maxSteps; step++) {
    const response = await chatCompletion({
      model: cfg.modelText,
      messages: history,
      max_tokens: cfg.maxOutputTokens,
      temperature: 0.2,
      tools: toolDefs.length > 0 ? toolDefs : undefined,
      tool_choice: toolDefs.length > 0 ? "auto" : undefined,
    });

    usage = addUsage(usage, response.usage);
    lastModel = response.model;

    const choice = response.choices[0];
    const message = choice?.message;
    if (!message) {
      throw new AiError("invalid_response", "El proveedor de IA no devolvió ninguna respuesta.");
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const reply = typeof message.content === "string" ? message.content : "";
      return { reply: reply || "No pude generar una respuesta. Intenta reformular tu pregunta.", steps, usage, model: lastModel };
    }

    // El mensaje del asistente con tool_calls debe entrar en la historia
    // antes de los tool_results correspondientes (contrato del protocolo).
    history.push({ role: "assistant", content: message.content ?? null, tool_calls: toolCalls });

    for (const call of toolCalls) {
      const tool = toolByName.get(call.function.name);
      let resultPayload: unknown;
      let ok = false;
      let parsedArgs: unknown = undefined;

      if (!tool) {
        resultPayload = { error: "Herramienta no disponible." };
      } else {
        let rawArgs: unknown;
        try {
          rawArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          rawArgs = {};
        }
        const parsed = tool.params.safeParse(rawArgs);
        if (!parsed.success) {
          resultPayload = { error: "Argumentos inválidos para la herramienta." };
        } else {
          parsedArgs = parsed.data;
          try {
            const raw = await tool.run(parsed.data, args.ctx);
            resultPayload = sanitizeToolResult(raw);
            ok = true;
          } catch (err) {
            resultPayload = { error: err instanceof Error ? err.message : "Error al ejecutar la herramienta." };
          }
        }
      }

      steps.push({ tool: call.function.name, args: parsedArgs, ok });
      history.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ datos: resultPayload }),
      });
    }
  }

  return {
    reply: "No pude completar tu consulta en el número de pasos permitido. Intenta reformularla de forma más simple.",
    steps,
    usage,
    model: lastModel,
  };
}
