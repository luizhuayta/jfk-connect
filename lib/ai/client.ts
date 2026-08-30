/**
 * Cliente HTTP plano para el endpoint /chat/completions — IJFK.
 *
 * Cero dependencias nuevas: `fetch` nativo de Node 20 basta para hablar con
 * cualquier proveedor OpenAI-compatible. Reintenta solo lo que tiene sentido
 * reintentar (429/5xx/red) — nunca 400/401/403, que son errores de
 * configuración o de prompt: reintentarlos solo quema presupuesto de IA.
 */

import { getAiConfig } from "@/lib/ai/config";
import { AiError } from "@/lib/ai/errors";
import { scrubChatRequest } from "@/lib/ai/redact";
import type { ChatCompletionRequest, ChatCompletionResponse } from "@/lib/ai/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + Math.random() * 250;
}

export interface ChatCompletionOptions {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

/** Llama a POST {baseUrl}/chat/completions con timeout y retry. Lanza AiError tipado en cualquier fallo. */
export async function chatCompletion(
  body: ChatCompletionRequest,
  opts: ChatCompletionOptions = {},
): Promise<ChatCompletionResponse> {
  const cfg = getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    throw new AiError("disabled", "La IA está deshabilitada o falta configurar AI_API_KEY.");
  }

  const timeoutMs = opts.timeoutMs ?? cfg.timeoutMs;
  const maxRetries = opts.retries ?? cfg.maxRetries;
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = opts.signal ? AbortSignal.any([timeoutSignal, opts.signal]) : timeoutSignal;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
          ...cfg.extraHeaders,
        },
        body: JSON.stringify(scrubChatRequest(body)),
        signal: combinedSignal,
      });
    } catch (err) {
      lastErr = err;
      const errName = err instanceof Error ? err.name : "";
      const isAbort = errName === "AbortError" || errName === "TimeoutError";
      if (attempt < maxRetries) {
        await sleep(jitteredBackoff(attempt));
        continue;
      }
      throw new AiError(
        isAbort ? "timeout" : "upstream",
        isAbort ? "Tiempo de espera agotado al llamar al proveedor de IA." : "No se pudo conectar con el proveedor de IA.",
        { retryable: true },
      );
    }

    if (response.ok) {
      const json: unknown = await response.json();
      return json as ChatCompletionResponse;
    }

    // 429/5xx son candidatos a reintento; 4xx (salvo 429) son errores de
    // configuración/prompt y no se reintentan.
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxRetries) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
      await sleep(retryAfterMs && Number.isFinite(retryAfterMs) ? retryAfterMs : jitteredBackoff(attempt));
      continue;
    }

    const bodyText = await response.text().catch(() => "");
    lastErr = new Error(`HTTP ${response.status}: ${bodyText.slice(0, 500)}`);

    if (response.status === 429) {
      throw new AiError("rate_limited", "El proveedor de IA respondió con límite de tasa excedido.", {
        status: response.status,
      });
    }
    throw new AiError("upstream", `El proveedor de IA respondió con un error (${response.status}).`, {
      status: response.status,
    });
  }

  throw lastErr instanceof AiError
    ? lastErr
    : new AiError("upstream", "No se pudo completar la solicitud de IA tras varios intentos.");
}
