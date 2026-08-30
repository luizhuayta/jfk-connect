/**
 * Health check endpoint
 *
 * GET /api/health
 *
 * Devuelve el estado de los servicios críticos (BD, mail, app).
 * Útil para Docker healthcheck, monitoring y debugging.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyMailConnection } from "@/lib/mail";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    await query("SELECT 1");
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkMail(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER) {
    return { ok: false, error: "Configuración de SMTP incompleta" };
  }
  try {
    const ok = await verifyMailConnection();
    return ok ? { ok: true } : { ok: false, error: "No se pudo conectar al servidor SMTP" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const [db, mail] = await Promise.all([checkDatabase(), checkMail()]);

  const status =
    db.ok && mail.ok ? "healthy" : db.ok ? "degraded" : "unhealthy";

  return NextResponse.json(
    {
      status,
      service: "ijfk",
      version: process.env.NEXT_BUILD_ID ?? "local",
      uptime_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        mail,
      },
    },
    { status: status === "unhealthy" ? 503 : 200 },
  );
}
