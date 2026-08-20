import { CheckCircle2, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GridStats } from "@/lib/grades/stats";

export default function GradeSummaryCards({ stats }: { stats: GridStats }) {
  const tiles = [
    { label: "Con notas", value: `${stats.registered}/${stats.total}`, icon: Users, bg: "bg-[#1E2A5E]/10", text: "text-[#1E2A5E]" },
    { label: "Aprobados", value: stats.approved, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
    { label: "Desaprobados", value: stats.failed, icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600" },
    { label: "Promedio aula", value: stats.classAvg !== null ? stats.classAvg.toFixed(1) : "—", icon: TrendingUp, bg: "bg-amber-50", text: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <Card key={t.label} className="border-none shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.bg} shrink-0`}>
              <t.icon className={`h-4 w-4 ${t.text}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#0F172A]">{t.value}</p>
              <p className="text-[11px] text-muted-foreground">{t.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
