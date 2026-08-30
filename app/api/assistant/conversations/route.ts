/**
 * GET /api/assistant/conversations — lista las conversaciones del usuario actual.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/ai/conversations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  try {
    const conversations = await listConversations(user.id);
    return NextResponse.json({
      ok: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c.message_count,
        lastMessageAt: c.last_message_at,
      })),
    });
  } catch (err) {
    logger.error({ err, route: "assistant/conversations GET" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
