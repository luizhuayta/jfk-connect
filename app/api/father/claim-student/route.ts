/**
 * POST /api/father/claim-student
 *
 * Vincula un estudiante al padre autenticado usando el código de matrícula
 * (enrollment_code) que el colegio entregó físicamente.
 *
 * Body: { enrollmentCode: string }
 *
 * Reglas:
 *   - Solo rol 'padre'.
 *   - Máximo 5 hijos por padre (verificado dentro de una transacción).
 *   - El enrollment_code debe existir en students y no tener ya apoderado.
 *   - El código se normaliza (trim + mayúsculas) y se busca case-insensitive.
 *   - Mensaje de error genérico: no distingue "no existe" de "ya vinculado"
 *     para no permitir enumerar códigos válidos.
 *   - Rate limiting por IP y por código (evita fuerza bruta de códigos, que
 *     son secuenciales y predecibles: 2026-1A-0001...).
 *
 * Respuesta: { ok: true, student: { id, name, grade, section } }
 */

import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { getClientIp, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_CHILDREN = 5;

/** Mismo mensaje para código inexistente y código ya vinculado (anti-enumeración). */
const GENERIC_ERROR =
  "No se pudo vincular el estudiante. Verifica el código e intenta de nuevo, o contacta a Secretaría.";

const claimSchema = z.object({
  enrollmentCode: z
    .string({ message: "El código de matrícula es obligatorio." })
    .trim()
    .min(1, "El código de matrícula es obligatorio."),
});

interface StudentRow {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  parent_id: string | null;
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, claimSchema);
  if (validationError) return validationError;

  const enrollmentCode = parsed.enrollmentCode.trim().toUpperCase();

  // Rate limiting: por IP (fuerza bruta desde una máquina) y por código
  // (protege un código concreto aunque venga de varias IPs).
  const ipLimit = rateLimit(`claim:ip:${getClientIp(request)}`, {
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." },
      { status: 429, headers: rateLimitHeaders(ipLimit, { maxAttempts: 20, windowMs: 15 * 60 * 1000 }) },
    );
  }

  const codeLimit = rateLimit(`claim:code:${enrollmentCode}`, {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!codeLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos con este código. Vuelve a intentar en una hora." },
      { status: 429, headers: rateLimitHeaders(codeLimit, { maxAttempts: 10, windowMs: 60 * 60 * 1000 }) },
    );
  }

  try {
    const result = await withTransaction(async (client) => {
      // 1. Límite de hijos dentro de la misma transacción que el UPDATE
      const countRow = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM students WHERE parent_id = $1",
        [user.id],
      );
      if ((countRow.rows[0]?.count ?? 0) >= MAX_CHILDREN) {
        return {
          error: {
            status: 400,
            msg: `No puedes vincular más de ${MAX_CHILDREN} hijos.`,
          },
        };
      }

      // 2. Buscar estudiante por código (case-insensitive)
      const student = await client.query<StudentRow>(
        `SELECT id, full_name, grade, section, parent_id
         FROM students
         WHERE lower(enrollment_code) = lower($1)
         LIMIT 1`,
        [enrollmentCode],
      );
      const row = student.rows[0];

      // Código inexistente O ya con apoderado → mismo error genérico
      if (!row || row.parent_id !== null) {
        return { error: { status: 404, msg: GENERIC_ERROR } };
      }

      // 3. Vincular (doble check con WHERE parent_id IS NULL)
      const updated = await client.query<{ id: string }>(
        `UPDATE students
         SET parent_id = $1, parent_claimed_at = now()
         WHERE id = $2 AND parent_id IS NULL
         RETURNING id`,
        [user.id, row.id],
      );

      if (!updated.rows[0]) {
        return { error: { status: 409, msg: GENERIC_ERROR } };
      }

      return { student: row };
    });

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.msg },
        { status: result.error.status },
      );
    }

    return NextResponse.json({
      ok: true,
      student: {
        id: result.student.id,
        name: result.student.full_name,
        grade: result.student.grade,
        section: result.student.section,
      },
    });
  } catch (err) {
    logger.error({ err, route: "claim-student", userId: user.id }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
