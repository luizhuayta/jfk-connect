"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";

/**
 * Genera conclusiones descriptivas para TODOS los alumnos con notas
 * completas de la grilla actual. Ver useConclusionsAi.ts — este modal es
 * solo la UI, no llama a la API directamente.
 */
export default function GenerateConclusionsModal({
  open,
  onClose,
  studentCount,
  generating,
  progress,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  studentCount: number;
  generating: boolean;
  progress: { done: number; total: number } | null;
  onGenerate: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} titleId="generate-conclusions-title" closable={!generating}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#F4C15C]" />
          <h2 id="generate-conclusions-title" className="text-lg font-bold text-[#0F172A]">
            Generar conclusiones con IA
          </h2>
        </div>
        <ModalCloseButton onClose={onClose} disabled={generating} />
      </div>

      <p className="text-sm text-muted-foreground">
        Se generarán conclusiones descriptivas para los <strong>{studentCount}</strong> alumno(s) con notas
        registradas en esta grilla. Los alumnos sin ninguna nota se omiten.
      </p>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        Revisa y edita cada conclusión antes de guardar. La IA puede equivocarse — el texto generado no se
        guarda hasta que presiones &quot;Guardar&quot; en la grilla.
      </div>

      {generating && progress && (
        <div className="space-y-1.5">
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground text-center">
            Generando lote {progress.done} de {progress.total}…
          </p>
        </div>
      )}

      {!generating && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          Entiendo que debo revisar cada conclusión antes de guardar.
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onClose} disabled={generating} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={onGenerate}
          disabled={generating || !confirmed || studentCount === 0}
          className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar"}
        </Button>
      </div>
    </Modal>
  );
}
