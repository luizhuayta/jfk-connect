import { letterGrade, letterGradeColor, desempeñoLabel } from "@/lib/letter-grade";
import { cn } from "@/lib/utils";

export type BimesterAverage = { label: string; avg: number | null };

/**
 * Selector/resumen de bimestres compartido (antes implementado por separado
 * en grades y students con markup casi idéntico). `onSelect` ausente lo
 * vuelve un resumen no interactivo (ficha de alumno); presente, un selector
 * con estado activo (página de Notas).
 */
export default function BimesterTiles({
  averages,
  active,
  onSelect,
  compact = false,
}: {
  averages: BimesterAverage[];
  active?: string;
  onSelect?: (label: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {averages.map((b, i) => (
          <div key={b.label} className="text-center bg-surface-container-low rounded-lg py-2">
            <p className="text-xs text-on-surface-variant">B{i + 1}</p>
            <p className="text-sm font-bold text-primary">
              {b.avg != null ? b.avg.toFixed(1) : "—"}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {averages.map((b, i) => {
        const isActive = active === b.label;
        const interactive = Boolean(onSelect);
        const ltr = letterGrade(b.avg);
        const Wrapper = interactive ? "button" : "div";
        return (
          <Wrapper
            key={b.label}
            {...(interactive
              ? { onClick: () => onSelect?.(b.label), "aria-pressed": isActive }
              : {})}
            className={cn(
              "rounded-xl p-3 text-center transition-all border-2",
              isActive
                ? "bg-primary border-primary text-white shadow-sm"
                : "bg-surface-container-lowest border-outline-variant/60 shadow-sm",
              interactive && !isActive && "hover:border-primary/30",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide mb-1",
                isActive ? "text-white/80" : "text-on-surface-variant",
              )}
            >
              Bimestre {i + 1}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className={cn("text-xl font-bold", isActive ? "text-accent" : "text-primary")}>
                {b.avg != null ? b.avg.toFixed(1) : "—"}
              </p>
              {ltr && (
                <span
                  className={cn(
                    "h-6 w-6 rounded-md border flex items-center justify-center text-[11px] font-bold",
                    isActive ? "border-white/40 text-white" : letterGradeColor(ltr),
                  )}
                >
                  {ltr}
                </span>
              )}
            </div>
            <p
              className={cn(
                "text-[10px] mt-1 font-medium",
                isActive ? "text-white/80" : "text-on-surface-variant",
              )}
            >
              {desempeñoLabel(b.avg)}
            </p>
          </Wrapper>
        );
      })}
    </div>
  );
}
