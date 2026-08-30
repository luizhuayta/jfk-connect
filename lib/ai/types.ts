/**
 * Tipos del protocolo OpenAI-compatible (/chat/completions) — IJFK.
 *
 * Solo se tipa lo que la app realmente usa: mensajes de texto/imagen, tool
 * calling, y el subconjunto de la respuesta que se lee. No es un cliente
 * genérico de terceros — es el contrato mínimo del adaptador propio.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface TextPart {
  type: "text";
  text: string;
}

export interface ImageUrlPart {
  type: "image_url";
  image_url: { url: string };
}

export type ContentPart = TextPart | ImageUrlPart;

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | ContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolFunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolDef {
  type: "function";
  function: ToolFunctionDef;
}

export interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: Record<string, unknown> };
}

export interface JsonObjectResponseFormat {
  type: "json_object";
}

export type ResponseFormat = JsonSchemaResponseFormat | JsonObjectResponseFormat;

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  tools?: ToolDef[];
  tool_choice?: "auto" | "none";
  response_format?: ResponseFormat;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: TokenUsage;
}
