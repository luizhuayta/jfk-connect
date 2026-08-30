"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, AlertTriangle, Clock } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

const FEATURE_LABEL: Record<string, string> = {
  conclusions: "Conclusiones descriptivas",
  import_vision: "OCR de fotos (importador)",
  import_match: "Matching de alumnos (IA)",
  assistant: "Asistente conversacional",
  assignment: "Asignación de cursos (explicación)",
};

interface UsageResponse {
  ok: boolean;
  error?: string;
  enabled: boolean;
  model: string | null;
  totals: { calls: number; tokens: number; errors: number };
  byFeature: { feature: string; calls: number; totalTokens: number; avgLatencyMs: number | null; errors: number }[];
  byDay: { day: string; calls: number; totalTokens: number }[];
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="border-none shadow-sm rounded-xl">
      <CardContent className="p-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E2A5E]/10 shrink-0">
          <Icon className="h-5 w-5 text-[#1E2A5E]" />
        </div>
        <div>
          <p className="text-xl font-bold text-[#0F172A]">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Panel de uso y costo de IA — GET /api/admin/ai/usage (ai_usage_log,
 * migración 010). Reporta tokens, no dólares: el proveedor y sus tarifas se
 * eligen en runtime vía env (ver .env.example), no hay tabla de precios
 * fija en el repo.
 */
export default function AdminAiPage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/ai/usage");
        const json: UsageResponse = await r.json();
        if (!json.ok) throw new Error(json.error ?? "Error cargando uso de IA");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando uso de IA");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Cargando uso de IA..." />;
  if (error || !data) return <ErrorState message={error ?? "Error desconocido"} />;

  const chartData = data.byDay.map((d) => ({ name: d.day.slice(5), value: d.totalTokens }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Uso de IA</h1>
          <p className="text-muted-foreground mt-1">Auditoría de llamadas al proveedor de IA — tokens, latencia y errores.</p>
        </div>
        <Badge className={data.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
          {data.enabled ? `Activo · ${data.model}` : "IA deshabilitada"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Sparkles} label="Llamadas totales" value={String(data.totals.calls)} />
        <StatCard icon={Zap} label="Tokens totales" value={data.totals.tokens.toLocaleString("es-PE")} />
        <StatCard icon={AlertTriangle} label="Errores" value={String(data.totals.errors)} />
      </div>

      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-[#0F172A] mb-4">Tokens consumidos — últimos 14 días</p>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin actividad registrada en este período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" fill="#1E2A5E" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-semibold text-[#0F172A]">Por función</p>
          {data.byFeature.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin actividad registrada todavía.</p>
          ) : (
            <div className="space-y-2">
              {data.byFeature.map((f) => (
                <div key={f.feature} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{FEATURE_LABEL[f.feature] ?? f.feature}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.calls} llamada(s) · {f.totalTokens.toLocaleString("es-PE")} tokens
                      {f.avgLatencyMs !== null && (
                        <>
                          {" · "}
                          <Clock className="h-3 w-3 inline -mt-0.5" /> {f.avgLatencyMs} ms prom.
                        </>
                      )}
                    </p>
                  </div>
                  {f.errors > 0 && (
                    <Badge className="bg-red-100 text-red-600 text-xs">{f.errors} error(es)</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
