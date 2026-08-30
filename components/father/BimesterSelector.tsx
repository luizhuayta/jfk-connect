import { LEVEL_LABEL, levelBadgeClass, type Level } from "@/lib/grades/scale";
import { cn } from "@/lib/utils";

/** Nivel predominante de un bimestre — nunca un número (el padre solo ve letras). */
export type BimesterAverage = { label: string; level: Level | null };

/**
 * Selector/resumen de bimestres compartido (antes implementado por separado
 * en grades y students con markup casi idéntico). `onSelect` ausente lo
 * vuelve un resumen no interactivo (ficha de alumno); presente, un selector
 * con estado activo. Muestra solo el nivel de logro (AD/A/B/C), nunca la
 * nota 0-20 — coherente con la libreta (lib/grades/libreta.ts) que tampoco
 * expone el número al padre.
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
            <p className={cn("text-sm font-bold", b.level ? levelBadgeClass(b.level) : "text-primary")}>
              {b.level ?? "—"}
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
                "text-xs font-semibold uppercase tracking-wide mb-1",
                isActive ? "text-white/80" : "text-on-surface-variant",
              )}
            >
              Bimestre {i + 1}
            </p>
            <div className="flex items-center justify-center gap-2">
              {b.level ? (
                <span
                  className={cn(
                    "h-8 min-w-8 px-2 rounded-md border flex items-center justify-center text-base font-bold",
                    isActive ? "border-white/40 text-white" : levelBadgeClass(b.level),
                  )}
                >
                  {b.level}
                </span>
              ) : (
                <p className={cn("text-xl font-bold", isActive ? "text-accent" : "text-primary")}>—</p>
              )}
            </div>
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                isActive ? "text-white/80" : "text-on-surface-variant",
              )}
            >
              {b.level ? LEVEL_LABEL[b.level] : "Sin notas"}
            </p>
          </Wrapper>
        );
      })}
    </div>
  );
}
