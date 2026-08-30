/**
 * Persistencia del asistente conversacional (ai_conversations/ai_messages,
 * migración 010) — IJFK.
 *
 * Solo se persisten los mensajes `user`/`assistant` finales — los pasos
 * intermedios de herramientas de un turno (tool_calls, resultados) viven y
 * mueren dentro de una sola llamada a `runToolLoop` (lib/ai/agent.ts) y no
 * necesitan sobrevivir entre turnos: cada turno nuevo reconstruye su propio
 * intercambio de herramientas desde cero. Esto reduce el contexto que se
 * reenvía al modelo (los mensajes `tool` son los que más tokens gastan) y
 * simplifica la reconstrucción del historial.
 */

import { query, queryOne, withTransaction } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";
import { scrubOutbound } from "@/lib/ai/redact";

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string | null;
  role_at_creation: AuthUser["role"];
  message_count: number;
  last_message_at: string | null;
}

export interface MessageRow {
  seq: number;
  role: "user" | "assistant";
  content: string;
}

const CONTEXT_MESSAGE_LIMIT = 12;

export async function createConversation(userId: string, role: AuthUser["role"], title?: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO ai_conversations (user_id, role_at_creation, title) VALUES ($1, $2, $3) RETURNING id`,
    [userId, role, title ?? null],
  );
  if (!row) throw new Error("No se pudo crear la conversación.");

  // Limpieza oportunista de conversaciones viejas (>90 días) — best-effort,
  // no bloquea la creación si falla.
  void query(`SELECT cleanup_old_ai_conversations()`).catch(() => {});

  return row.id;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  return queryOne<ConversationRow>(
    `SELECT id, user_id, title, role_at_creation, message_count, last_message_at FROM ai_conversations WHERE id = $1`,
    [id],
  );
}

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  const r = await query<ConversationRow>(
    `SELECT id, user_id, title, role_at_creation, message_count, last_message_at
     FROM ai_conversations WHERE user_id = $1 ORDER BY last_message_at DESC NULLS LAST, created_at DESC LIMIT 30`,
    [userId],
  );
  return r.rows;
}

/** Últimos N mensajes (user/assistant) en orden cronológico — el contexto que se manda al modelo. */
export async function fetchRecentMessages(conversationId: string, limit = CONTEXT_MESSAGE_LIMIT): Promise<MessageRow[]> {
  const r = await query<MessageRow>(
    `SELECT seq, role, content FROM ai_messages
     WHERE conversation_id = $1 AND role IN ('user', 'assistant')
     ORDER BY seq DESC LIMIT $2`,
    [conversationId, limit],
  );
  return r.rows.reverse().map((m) => ({ ...m, content: scrubOutbound(m.content) }));
}

export async function fetchAllMessages(conversationId: string): Promise<MessageRow[]> {
  const r = await query<MessageRow>(
    `SELECT seq, role, content FROM ai_messages WHERE conversation_id = $1 AND role IN ('user', 'assistant') ORDER BY seq`,
    [conversationId],
  );
  return r.rows.map((m) => ({ ...m, content: scrubOutbound(m.content) }));
}

/** Agrega el turno (mensaje del usuario + respuesta del asistente) y actualiza los contadores de la conversación, en una transacción. */
export async function appendTurn(
  conversationId: string,
  userText: string,
  assistantText: string,
  totalTokens: number,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(`SELECT id FROM ai_conversations WHERE id = $1 FOR UPDATE`, [conversationId]);
    const nextSeqRow = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM ai_messages WHERE conversation_id = $1`,
      [conversationId],
    );
    const seqStart = nextSeqRow.rows[0].next;
    const safeUser = scrubOutbound(userText);
    const safeAssistant = scrubOutbound(assistantText);

    await client.query(
      `INSERT INTO ai_messages (conversation_id, seq, role, content) VALUES ($1, $2, 'user', $3)`,
      [conversationId, seqStart, safeUser],
    );
    await client.query(
      `INSERT INTO ai_messages (conversation_id, seq, role, content, total_tokens) VALUES ($1, $2, 'assistant', $3, $4)`,
      [conversationId, seqStart + 1, safeAssistant, totalTokens],
    );

    await client.query(
      `UPDATE ai_conversations
       SET message_count = message_count + 2, last_message_at = now(),
           title = COALESCE(title, LEFT($2, 60))
       WHERE id = $1`,
      [conversationId, safeUser],
    );
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await query(`DELETE FROM ai_conversations WHERE id = $1`, [id]);
}
