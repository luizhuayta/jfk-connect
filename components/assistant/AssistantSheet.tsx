"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { stepLabel, type AssistantMessage } from "@/components/assistant/useAssistant";

/**
 * Panel de chat — usa components/ui/sheet.tsx (ya existente en el repo).
 * La respuesta se renderiza como TEXTO PLANO (sin dangerouslySetInnerHTML,
 * sin markdown→HTML): elimina cualquier vector de exfiltración por
 * link/imagen si algo se colara en la respuesta del modelo — ver §6 del
 * plan de esta fase.
 */
export default function AssistantSheet({
  open,
  onOpenChange,
  messages,
  sending,
  error,
  onSend,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: AssistantMessage[];
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onReset: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <SheetDescription>Pregunta sobre notas, asistencia, horarios o avisos.</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Hola, soy el asistente del sistema. Pregúntame lo que necesites saber.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                Pensando…
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
            placeholder="Escribe tu pregunta..."
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
