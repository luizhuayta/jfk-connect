"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAssistant, type AssistantVariant, type ClaimedChild } from "@/components/assistant/useAssistant";
import AssistantSheet from "@/components/assistant/AssistantSheet";
import ClaimChildModal from "@/components/father/ClaimChildModal";

/**
 * Botón flotante + panel del asistente. Una sola línea para montar en
 * cualquier layout de rol (father/teacher/admin) — se auto-oculta si
 * GET /api/ai/health no reporta la IA habilitada con soporte de
 * herramientas, así que montarlo no tiene costo cuando AI_ENABLED=0.
 *
 * `variant` solo cambia copy, chips y (en padre) el CTA de vincular.
 * Las herramientas reales se filtran en el servidor por el rol de la sesión.
 */
export default function AssistantLauncher({
  variant,
  hasChildren,
  onClaimed,
}: {
  variant: AssistantVariant;
  hasChildren?: boolean;
  onClaimed?: (student: ClaimedChild) => void;
}) {
  const { available, open, setOpen, messages, sending, linking, error, send, reset } = useAssistant({
    variant,
    onClaimed,
  });
  const [claimOpen, setClaimOpen] = useState(false);

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
        variant={variant}
        messages={messages}
        sending={sending}
        linking={linking}
        error={error}
        hasChildren={hasChildren}
        onSend={send}
        onReset={reset}
        onClaimClick={variant === "padre" ? () => setClaimOpen(true) : undefined}
      />
      {variant === "padre" && (
        <ClaimChildModal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          onClaimed={(student) => {
            onClaimed?.(student);
            setClaimOpen(false);
            void send("Acabo de vincular a un hijo. ¿Cuáles son sus notas?");
          }}
        />
      )}
    </>
  );
}
