"use client";

import { Input } from "@/components/ui/input";
import LevelBadge from "./LevelBadge";
import { levelFromScore } from "@/lib/grades/scale";

/**
 * Una celda de captura: número 0-20 + la letra derivada EN VIVO al lado
 * (feedback inmediato de la escala AD/A/B/C mientras el docente escribe).
 * En modo lectura (readOnly) solo muestra el número + letra, sin input.
 */
export default function CompetencyScoreCell({
  value,
  onChange,
  readOnly,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly: boolean;
}) {
  const level = levelFromScore(value);

  if (readOnly) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-sm font-semibold text-[#0F172A]">{value ?? "—"}</span>
        <LevelBadge level={level} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Input
        type="number"
        min={0}
        max={20}
        step={0.5}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange?.(null);
            return;
          }
          const n = Number(raw);
          if (Number.isNaN(n)) return;
          onChange?.(Math.max(0, Math.min(20, n)));
        }}
        className="w-16 h-8 text-center text-sm"
      />
      <LevelBadge level={level} />
    </div>
  );
}
