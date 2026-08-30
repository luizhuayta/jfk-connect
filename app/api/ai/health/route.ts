/**
 * GET /api/ai/health
 *
 * Estado de la capa de IA — SIN pingear al proveedor real en cada llamada
 * (esta ruta la consulta toda la UI de IA al montar cada launcher/botón
 * para decidir si mostrarse; pingear de verdad en cada carga de página
 * gastaría tokens y añadiría latencia sin necesidad). Solo reporta si está
 * habilitada y con qué modelo quedaría configurada.
 *
 * Requiere sesión (cualquier rol) — no es información sensible, pero
 * tampoco hay motivo para exponerla sin autenticar.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { isAiEnabled, getAiConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const [, denied] = await requireUser(request);
  if (denied) return denied;

  const enabled = isAiEnabled();
  const cfg = getAiConfig();

  return NextResponse.json({
    ok: true,
    enabled,
    model: enabled ? cfg.modelText : null,
    visionEnabled: enabled && cfg.supportsVision,
    toolsEnabled: enabled && cfg.supportsTools,
  });
}
