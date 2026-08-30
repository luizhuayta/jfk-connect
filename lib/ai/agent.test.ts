import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AuthUser } from "@/lib/auth";
import type { ChatCompletionResponse } from "@/lib/ai/types";
import { defineTool, type ToolContext } from "@/lib/ai/tools/registry";
import { AiError } from "@/lib/ai/errors";

vi.mock("@/lib/ai/client", () => ({
  chatCompletion: vi.fn(),
}));

vi.mock("@/lib/ai/config", () => ({
  getAiConfig: vi.fn(() => ({
    modelText: "test-model",
    maxOutputTokens: 100,
    supportsTools: true,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { chatCompletion } from "@/lib/ai/client";
import { getAiConfig } from "@/lib/ai/config";
import { runToolLoop } from "@/lib/ai/agent";

const chatMock = vi.mocked(chatCompletion);
const configMock = vi.mocked(getAiConfig);

const user: AuthUser = {
  id: "t1",
  email: "d@ijfk.edu.pe",
  full_name: "Docente",
  role: "docente",
  is_active: true,
  phone: null,
};

const ctx: ToolContext = { user, allowedStudentIds: [], allowedCourseIds: ["c1"] };

const echoTool = defineTool({
  name: "eco",
  description: "Eco",
  params: z.object({ texto: z.string() }),
  roles: ["docente"],
  run: async (args) => ({ eco: args.texto }),
});

function completion(partial: Partial<ChatCompletionResponse["choices"][0]["message"]> & { finish_reason?: string }): ChatCompletionResponse {
  return {
    id: "cmpl",
    model: "test-model",
    choices: [
      {
        index: 0,
        finish_reason: partial.finish_reason ?? "stop",
        message: {
          role: "assistant",
          content: partial.content ?? null,
          tool_calls: partial.tool_calls,
        },
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

function toolCall(name: string, args: string, id = "call-1") {
  return { id, type: "function" as const, function: { name, arguments: args } };
}

describe("runToolLoop", () => {
  beforeEach(() => {
    chatMock.mockReset();
    configMock.mockReturnValue({
      modelText: "test-model",
      maxOutputTokens: 100,
      supportsTools: true,
    } as ReturnType<typeof getAiConfig>);
  });

  it("devuelve el texto cuando el modelo no pide herramientas", async () => {
    chatMock.mockResolvedValueOnce(completion({ content: "Hola" }));
    const result = await runToolLoop({
      messages: [{ role: "user", content: "hola" }],
      tools: [echoTool],
      ctx,
    });
    expect(result.reply).toBe("Hola");
    expect(result.steps).toEqual([]);
  });

  it("ejecuta una herramienta y usa el segundo paso como respuesta", async () => {
    chatMock
      .mockResolvedValueOnce(completion({ tool_calls: [toolCall("eco", '{"texto":"ok"}')] }))
      .mockResolvedValueOnce(completion({ content: "Listo" }));
    const result = await runToolLoop({
      messages: [{ role: "user", content: "eco" }],
      tools: [echoTool],
      ctx,
    });
    expect(result.reply).toBe("Listo");
    expect(result.steps).toEqual([{ tool: "eco", args: { texto: "ok" }, ok: true }]);
  });

  it("reporta argumentos JSON inválidos sin tumbar el bucle", async () => {
    chatMock
      .mockResolvedValueOnce(completion({ tool_calls: [toolCall("eco", "{no-json")] }))
      .mockResolvedValueOnce(completion({ content: "No pude" }));
    const result = await runToolLoop({
      messages: [{ role: "user", content: "eco" }],
      tools: [echoTool],
      ctx,
    });
    expect(result.steps[0]).toMatchObject({ tool: "eco", ok: false });
    expect(result.reply).toBe("No pude");
  });

  it("reporta argumentos zod inválidos", async () => {
    chatMock
      .mockResolvedValueOnce(completion({ tool_calls: [toolCall("eco", '{"texto":1}')] }))
      .mockResolvedValueOnce(completion({ content: "args mal" }));
    const result = await runToolLoop({
      messages: [{ role: "user", content: "eco" }],
      tools: [echoTool],
      ctx,
    });
    expect(result.steps[0].ok).toBe(false);
  });

  it("corta el bucle al agotar maxSteps", async () => {
    chatMock.mockResolvedValue(
      completion({ tool_calls: [toolCall("eco", '{"texto":"x"}')] }),
    );
    const result = await runToolLoop({
      messages: [{ role: "user", content: "loop" }],
      tools: [echoTool],
      ctx,
      maxSteps: 2,
    });
    expect(result.reply).toMatch(/número de pasos permitido/i);
    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("marca overflow cuando hay más de 6 tool calls en un paso", async () => {
    const calls = Array.from({ length: 8 }, (_, i) =>
      toolCall("eco", '{"texto":"x"}', `call-${i}`),
    );
    chatMock
      .mockResolvedValueOnce(completion({ tool_calls: calls }))
      .mockResolvedValueOnce(completion({ content: "demasiadas" }));
    const result = await runToolLoop({
      messages: [{ role: "user", content: "muchas" }],
      tools: [echoTool],
      ctx,
    });
    const overflow = result.steps.filter((s) => s.args === undefined && s.ok === false);
    expect(overflow).toHaveLength(2);
    expect(result.steps.filter((s) => s.ok)).toHaveLength(6);
  });

  it("lanza AiError si AI_SUPPORTS_TOOLS=0 y hay herramientas", async () => {
    configMock.mockReturnValue({
      modelText: "test-model",
      maxOutputTokens: 100,
      supportsTools: false,
    } as ReturnType<typeof getAiConfig>);
    await expect(
      runToolLoop({
        messages: [{ role: "user", content: "hola" }],
        tools: [echoTool],
        ctx,
      }),
    ).rejects.toBeInstanceOf(AiError);
    expect(chatMock).not.toHaveBeenCalled();
  });
});
