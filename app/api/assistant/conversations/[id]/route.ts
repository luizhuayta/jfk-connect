/**
 * GET    /api/assistant/conversations/[id] — historial completo de una conversación
 * DELETE /api/assistant/conversations/[id] — la elimina
 *
 * Seguridad: dueño de la conversación (user_id) — cada padre/docente/admin
 * ve y borra solo las suyas.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { getConversation, fetchAllMessages, deleteConversation } from "@/lib/ai/conversations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const conv = await getConversation(id);
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Conversación no encontrada." }, { status: 404 });
    }
    const messages = await fetchAllMessages(id);
    return NextResponse.json({ ok: true, conversation: { id: conv.id, title: conv.title }, messages });
  } catch (err) {
    logger.error({ err, route: "assistant/conversations/[id] GET" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const conv = await getConversation(id);
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Conversación no encontrada." }, { status: 404 });
    }
    await deleteConversation(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "assistant/conversations/[id] DELETE" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
