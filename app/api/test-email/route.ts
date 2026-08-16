/**
 * Endpoint de prueba para enviar emails
 *
 * POST /api/test-email
 * Body: { to: string, subject?: string, body?: string }
 *
 * Útil para validar que la integración de email está OK.
 *
 * Seguridad:
 *  - Solo admin (antes, en desarrollo cualquier usuario autenticado podía
 *    enviar emails arbitrarios con la identidad del colegio → spam/phishing).
 */

import { NextResponse, type NextRequest } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/mail";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => ({}));
    const to: string = body.to ?? "test@ijfk.local";
    const subject: string = body.subject ?? "Email de prueba - IJFK";
    const message: string =
      body.body ??
      "Este es un email de prueba enviado desde el Sistema Institucional IJFK.";

    const template = emailTemplates.announcement(
      subject,
      message,
      "Sistema IJFK - Test",
    );

    const result = await sendEmail({
      to,
      subject: template.subject,
      html: template.html,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Email enviado correctamente",
      messageId: result.messageId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST a este endpoint con { to: 'correo@ejemplo.com' } (requiere auth)",
    example: {
      to: "test@ijfk.local",
      subject: "Prueba",
      body: "Hola mundo",
    },
  });
}