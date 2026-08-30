"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { extractEnrollmentCode } from "@/lib/father/enrollment-code";
import { apiGet, readApiJson } from "@/lib/client/api";

export type AssistantVariant = "padre" | "docente" | "admin";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: { tool: string; ok: boolean }[];
}

export interface ClaimedChild {
  id: string;
  name: string;
  grade: string;
  section: string;
}

const assistantReplySchema = z.object({
  ok: z.literal(true),
  reply: z.string(),
  conversationId: z.string(),
  steps: z.array(z.object({ tool: z.string(), ok: z.boolean() })).optional(),
  claimed: z
    .object({
      id: z.string(),
      name: z.string(),
      grade: z.string(),
      section: z.string(),
    })
    .optional(),
});

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
 * resuelve con la respuesta completa.
 */
export function useAssistant(opts?: {
  variant?: AssistantVariant;
  onClaimed?: (student: ClaimedChild) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onClaimedRef = useRef(opts?.onClaimed);
  onClaimedRef.current = opts?.onClaimed;
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiGet("/api/ai/health");
        if (active) setAvailable(Boolean(data.ok && data.enabled && data.toolsEnabled));
      } catch {
        if (active) setAvailable(false);
      }
    })();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const reqId = ++reqIdRef.current;

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
      setSending(true);
      setLinking(opts?.variant === "padre" && Boolean(extractEnrollmentCode(trimmed)));
      setError(null);

      try {
        const r = await fetch("/api/assistant/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversationId ?? undefined, message: trimmed }),
          signal: ac.signal,
        });
        const raw = await readApiJson(r);
        if (reqId !== reqIdRef.current) return;
        const data = assistantReplySchema.parse(raw);
        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply,
            steps: data.steps,
          },
        ]);
        if (data.claimed) {
          onClaimedRef.current?.(data.claimed);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqId !== reqIdRef.current) return;
        const message = err instanceof Error ? err.message : "Error al consultar al asistente";
        setError(message);
      } finally {
        if (reqId === reqIdRef.current) {
          setSending(false);
          setLinking(false);
        }
      }
    },
    [conversationId, sending, opts?.variant],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    reqIdRef.current += 1;
    setSending(false);
    setConversationId(null);
    setMessages([]);
    setError(null);
    setLinking(false);
  }, []);

  return { available, open, setOpen, messages, sending, linking, error, send, reset };
}
