/**
 * Health check endpoint
 *
 * GET /api/health
 *
 * Devuelve el estado de los servicios críticos (BD, mail, app).
 * Útil para Docker healthcheck, monitoring y debugging.
 */

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAIL_HOST = process.env.MAIL_HOST ?? "";
const MAIL_PORT = parseInt(process.env.MAIL_PORT ?? "1025", 10);

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
  if (!MAIL_HOST) return { ok: false, error: "MAIL_HOST no configurado" };
  try {
    const t = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
    await t.verify();
    return { ok: true };
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
