"use client";

import { Sparkles } from "lucide-react";
import { useAssistant } from "@/components/assistant/useAssistant";
import AssistantSheet from "@/components/assistant/AssistantSheet";

/**
 * Botón flotante + panel del asistente. Una sola línea para montar en
 * cualquier layout de rol (father/teacher/admin) — se auto-oculta si
 * GET /api/ai/health no reporta la IA habilitada con soporte de
 * herramientas, así que montarlo no tiene costo cuando AI_ENABLED=0.
 */
export default function AssistantLauncher() {
  const { available, open, setOpen, messages, sending, error, send, reset } = useAssistant();

  if (!available) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2A5E] text-white shadow-lg hover:bg-[#162043] transition-colors"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <AssistantSheet
        open={open}
        onOpenChange={setOpen}
        messages={messages}
        sending={sending}
        error={error}
        onSend={send}
        onReset={reset}
      />
    </>
  );
}
