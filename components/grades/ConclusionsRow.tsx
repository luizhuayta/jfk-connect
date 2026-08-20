import { Textarea } from "@/components/ui/textarea";
import type { Competency } from "@/lib/curriculum/types";

/**
 * Fila expandible (una por alumno) con un textarea de conclusión
 * descriptiva por competencia. Va en fila aparte, no en columna: con 4
 * competencias (Matemática), 4 textareas metidos en la misma fila de la
 * tabla serían inusables.
 */
export default function ConclusionsRow({
  competencies,
  getConclusion,
  onChange,
  readOnly,
}: {
  competencies: Competency[];
  getConclusion: (competencyId: number) => string;
  onChange?: (competencyId: number, value: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Conclusiones descriptivas
      </p>
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
