import LevelBadge from "@/components/grades/LevelBadge";
import type { Level } from "@/lib/grades/scale";

export default function LibretaLegend({
  legend,
}: {
  legend: { level: Level; range: string; label: string }[];
}) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 pt-3">
        Leyenda
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        {legend.map((l) => (
          <div key={l.level} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <LevelBadge level={l.level} />
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-[#0F172A]">{l.range}</p>
              <p className="text-[10px] text-muted-foreground">{l.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
