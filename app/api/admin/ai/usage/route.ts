/**
 * GET /api/admin/ai/usage
 *
 * Panel de uso y costo de la capa de IA (ai_usage_log, migración 010):
 * total de llamadas/tokens por feature, serie diaria de los últimos 14
 * días, y tasa de error. No hay tabla de precios por proveedor en el
 * repo (el proveedor y sus tarifas se eligen en runtime vía env, ver
 * .env.example) — esto reporta tokens, no dólares.
 *
 * Seguridad: solo rol 'admin' (mismo criterio que la tabla en la
 * migración: RLS la restringe a admin cuando aplica RLS real).
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isAiEnabled, getAiConfig } from "@/lib/ai/config";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface ByFeatureRow {
  feature: string;
  calls: string;
  total_tokens: string | null;
  avg_latency_ms: string | null;
  errors: string;
}

interface ByDayRow {
  day: string;
  calls: string;
  total_tokens: string | null;
}

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const [byFeature, byDay] = await Promise.all([
      query<ByFeatureRow>(
        `SELECT feature, count(*) AS calls, sum(total_tokens) AS total_tokens,
                round(avg(latency_ms)) AS avg_latency_ms,
                count(*) FILTER (WHERE NOT ok) AS errors
         FROM ai_usage_log
         GROUP BY feature ORDER BY calls DESC`,
      ),
      query<ByDayRow>(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                count(*) AS calls, sum(total_tokens) AS total_tokens
         FROM ai_usage_log
         WHERE created_at >= now() - interval '14 days'
         GROUP BY 1 ORDER BY 1`,
      ),
    ]);

    const totals = byFeature.rows.reduce(
      (acc, r) => ({
        calls: acc.calls + Number(r.calls),
        tokens: acc.tokens + Number(r.total_tokens ?? 0),
        errors: acc.errors + Number(r.errors),
      }),
      { calls: 0, tokens: 0, errors: 0 },
    );

    return NextResponse.json({
      ok: true,
      enabled: isAiEnabled(),
      model: isAiEnabled() ? getAiConfig().modelText : null,
      totals,
      byFeature: byFeature.rows.map((r) => ({
        feature: r.feature,
        calls: Number(r.calls),
        totalTokens: Number(r.total_tokens ?? 0),
        avgLatencyMs: r.avg_latency_ms ? Number(r.avg_latency_ms) : null,
        errors: Number(r.errors),
      })),
      byDay: byDay.rows.map((r) => ({ day: r.day, calls: Number(r.calls), totalTokens: Number(r.total_tokens ?? 0) })),
    });
  } catch (err) {
    logger.error({ err, route: "admin/ai/usage" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
