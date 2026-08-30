import { Badge } from "@/components/ui/badge";
import { LEVEL_LABEL, levelBadgeClass, type Level } from "@/lib/grades/scale";
import { cn } from "@/lib/utils";

export default function LevelBadge({
  level,
  className = "",
  showLabel = false,
  compact = false,
}: {
  level: Level | null;
  className?: string;
  /** Muestra «Logro esperado» junto a la letra. El padre no tiene que recordar AD/A/B/C. */
  showLabel?: boolean;
  /** Sello fijo 32×32 para celdas de tabla: «AD» cabe sin desbordar. */
  compact?: boolean;
}) {
  if (!level) return <span className="text-xs text-muted-foreground">—</span>;
  const seal = compact ? (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold leading-none tabular-nums",
        levelBadgeClass(level),
        className,
      )}
    >
      {level}
    </span>
  ) : (
    <Badge className={cn("text-xs font-bold border-0 hover:opacity-90", levelBadgeClass(level), className)}>
      {level}
    </Badge>
  );
  if (!showLabel) return seal;
  return (
    <span className="inline-flex items-center gap-1.5">
      {seal}
      <span className="text-xs text-muted-foreground">{LEVEL_LABEL[level]}</span>
    </span>
  );
}
