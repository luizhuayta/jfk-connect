"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, RotateCcw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { stepLabel, type AssistantMessage, type AssistantVariant } from "@/components/assistant/useAssistant";

const COPY: Record<AssistantVariant, { description: string; empty: string; suggestions: string[] }> = {
  padre: {
    description: "Pregunta sobre notas, asistencia, horarios o avisos de tus hijos.",
    empty: "Hola. Puedo consultar las notas, la asistencia y el horario de tus hijos.",
    suggestions: [
      "¿Cuáles son las notas de este bimestre?",
      "¿Cómo va la asistencia?",
      "¿Cuál es el horario de esta semana?",
    ],
  },
  docente: {
    description: "Pregunta sobre tus cursos, notas, alumnos en riesgo o tu horario.",
    empty: "Hola. Puedo resumir las notas de tus cursos, listar alumnos en riesgo y consultar tu horario.",
    suggestions: [
      "Resumen de notas de mis cursos",
      "Alumnos en riesgo este bimestre",
      "¿Cuál es mi horario de hoy?",
    ],
  },
  admin: {
    description: "Pregunta sobre estadísticas, notas pendientes o cursos sin docente.",
    empty: "Hola. Puedo darte un panorama del colegio: matrícula, notas pendientes y cursos sin asignar.",
    suggestions: [
      "Estadísticas del colegio",
      "Secciones con notas pendientes",
      "Cursos sin docente asignado",
    ],
  },
};

/**
 * Panel de chat — usa components/ui/sheet.tsx (ya existente en el repo).
 * La respuesta se renderiza como TEXTO PLANO (sin dangerouslySetInnerHTML,
 * sin markdown→HTML): elimina cualquier vector de exfiltración por
 * link/imagen si algo se colara en la respuesta del modelo.
 */
export default function AssistantSheet({
  open,
  onOpenChange,
  variant,
  messages,
  sending,
  linking,
  error,
  hasChildren,
  onSend,
  onReset,
  onClaimClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: AssistantVariant;
  messages: AssistantMessage[];
  sending: boolean;
  linking?: boolean;
  error: string | null;
  hasChildren?: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
  onClaimClick?: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const copy = COPY[variant];
  const showClaimCta = variant === "padre" && hasChildren === false && Boolean(onClaimClick);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSend(input);
    setInput("");
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F4C15C]" />
              <SheetTitle>Asistente IJFK</SheetTitle>
            </div>
            <button onClick={onReset} className="p-1.5 rounded hover:bg-gray-100" aria-label="Nueva conversación" title="Nueva conversación">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 && (
            <div className="py-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center">{copy.empty}</p>
              {showClaimCta && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
                  <p className="text-sm text-[#0F172A]">
                    Aún no tienes hijos vinculados. Pega el código de matrícula de la constancia o vincúlalo aquí.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={onClaimClick}
                  >
                    <UserPlus className="h-4 w-4" />
                    Vincular con código de matrícula
                  </Button>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {(showClaimCta ? [] : copy.suggestions).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSend(s)}
                    className="text-left text-sm rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50 text-[#1E2A5E]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[#1E2A5E] text-white" : "bg-gray-100 text-[#0F172A]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3.5 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {linking ? "Vinculando…" : "Pensando…"}
              </div>
            </div>
          )}
          {!sending && lastAssistant?.steps && lastAssistant.steps.length > 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              {lastAssistant.steps.map((s) => stepLabel(s.tool)).join(" · ")}
            </p>
          )}
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={showClaimCta ? "Pega el código de matrícula o escribe…" : "Escribe tu pregunta..."}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !input.trim()} size="icon" className="bg-[#1E2A5E] hover:bg-[#162043] shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
