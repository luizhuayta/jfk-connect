import { Loader2, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Competency } from "@/lib/curriculum/types";

/**
 * Fila expandible (una por alumno) con un textarea de conclusión
 * descriptiva por competencia. Va en fila aparte, no en columna: con 4
 * competencias (Matemática), 4 textareas metidos en la misma fila de la
 * tabla serían inusables.
 *
 * `onGenerate`/`generating` son opcionales (feature de IA — ver
 * POST /api/ai/conclusions): sin ellos esta fila se comporta exactamente
 * igual que antes.
 */
export default function ConclusionsRow({
  competencies,
  getConclusion,
  onChange,
  readOnly,
  onGenerate,
  generating,
}: {
  competencies: Competency[];
  getConclusion: (competencyId: number) => string;
  onChange?: (competencyId: number, value: string) => void;
  readOnly: boolean;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conclusiones descriptivas
        </p>
        {!readOnly && onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1E2A5E] hover:text-[#162043] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generar con IA
          </button>
        )}
      </div>
      {competencies.map((c) => {
        const value = getConclusion(c.id);
        return (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 items-start">
            <p className="text-xs text-muted-foreground pt-2">{c.name}</p>
            {readOnly ? (
              <p className="text-xs text-[#0F172A] py-2">{value || "—"}</p>
            ) : (
              <Textarea
                value={value}
                onChange={(e) => onChange?.(c.id, e.target.value)}
                placeholder="Conclusión descriptiva (opcional)"
                className="text-xs min-h-[50px]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
