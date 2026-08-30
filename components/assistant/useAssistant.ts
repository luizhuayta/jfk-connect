"use client";

import { useCallback, useEffect, useState } from "react";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  steps?: { tool: string; ok: boolean }[];
}

const STEP_LABELS: Record<string, string> = {
  obtener_fecha_actual: "consultando la fecha",
  listar_avisos: "revisando avisos",
  listar_mis_hijos: "consultando tus hijos",
  notas_de_hijo: "consultando notas",
  asistencia_de_hijo: "consultando asistencia",
  horario_de_hijo: "consultando horario",
  materiales_de_hijo: "consultando materiales",
  estado_matricula: "consultando matrícula",
  listar_mis_cursos: "consultando tus cursos",
  resumen_notas_curso: "consultando notas del curso",
  alumnos_en_riesgo: "consultando alumnos en riesgo",
  asistencia_seccion: "consultando asistencia de la sección",
  mi_horario: "consultando tu horario",
  estadisticas_generales: "consultando estadísticas",
  cursos_sin_docente: "consultando cursos sin docente",
  secciones_con_notas_pendientes: "consultando notas pendientes",
  buscar_alumno: "buscando alumno",
  resumen_asistencia: "consultando asistencia",
};

export function stepLabel(tool: string): string {
  return STEP_LABELS[tool] ?? `consultando: ${tool}`;
}

/**
 * Toda la capa de transporte del asistente aislada aquí — sin streaming en
 * v1 (ver lib/ai/agent.ts), así que "enviando" es un solo fetch que
 * resuelve con la respuesta completa. Aislarlo en un hook propio es lo que
 * permite migrar a streaming después tocando solo este archivo + el
 * componente de mensajes, sin tocar el resto de la UI.
 */
export function useAssistant() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/ai/health");
        const data = await r.json();
        if (active) setAvailable(Boolean(data.ok && data.enabled && data.toolsEnabled));
      } catch {
        if (active) setAvailable(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSending(true);
      setError(null);

      try {
        const r = await fetch("/api/assistant/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationId ?? undefined, message: trimmed }),
        });
        const data = await r.json();
        if (!data.ok) throw new Error(data.error ?? "Error al consultar al asistente");

        setConversationId(data.conversationId);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, steps: data.steps }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al consultar al asistente";
        setError(message);
        setMessages((prev) => [...prev, { role: "assistant", content: message }]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending],
  );

  const reset = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return { available, open, setOpen, messages, sending, error, send, reset };
}
