/**
 * POST /api/father/claim-student
 *
 * Vincula un estudiante al padre autenticado usando el código de matrícula
 * (enrollment_code) que el colegio entregó físicamente.
 *
 * Body: { enrollmentCode: string }
 *
 * La lógica (tope de hijos, anti-enumeración, rate limits) vive en
 * `lib/father/claim-student.ts` para reutilizarla desde el asistente sin
 * mandar el código al proveedor de IA.
 *
 * Respuesta: { ok: true, student: { id, name, grade, section } }
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { claimStudentForParent } from "@/lib/father/claim-student";
import { ENROLLMENT_CODE_EXACT_RE } from "@/lib/father/enrollment-code";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const claimSchema = z.object({
  enrollmentCode: z
    .string({ message: "El código de matrícula es obligatorio." })
    .trim()
    .regex(ENROLLMENT_CODE_EXACT_RE, "El código de matrícula no tiene un formato válido."),
});

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, claimSchema);
  if (validationError) return validationError;

  try {
    const result = await claimStudentForParent({
      parentId: user.id,
      enrollmentCode: parsed.enrollmentCode,
      clientIp: getClientIp(request),
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status, headers: result.headers },
      );
    }

    return NextResponse.json({ ok: true, student: result.student });
  } catch (err) {
    logger.error({ err, route: "claim-student", userId: user.id }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
