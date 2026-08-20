import { Badge } from "@/components/ui/badge";
import { levelBadgeClass, type Level } from "@/lib/grades/scale";

export default function LevelBadge({
  level,
  className = "",
}: {
  level: Level | null;
  className?: string;
}) {
  if (!level) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge className={`text-xs font-bold border-0 hover:opacity-90 ${levelBadgeClass(level)} ${className}`}>
      {level}
    </Badge>
  );
}
