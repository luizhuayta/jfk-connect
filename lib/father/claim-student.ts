/**
 * Vincular un alumno al padre autenticado por `enrollment_code`.
 *
 * Extraído de la route REST para reutilizarlo desde el asistente: el código
 * de matrícula NUNCA debe llegar al proveedor de IA. El asistente detecta el
 * patrón, llama aquí, y manda al modelo un texto ya saneado.
 */

import { withTransaction } from "@/lib/db";
import { rateLimit, rateLimitHeaders, type RateLimitConfig } from "@/lib/rate-limit";
import { MAX_CHILDREN } from "@/lib/father/limits";

export { extractEnrollmentCode, redactEnrollmentCodes } from "@/lib/father/enrollment-code";
export { MAX_CHILDREN };

/** Mismo mensaje para código inexistente y código ya vinculado (anti-enumeración). */
export const CLAIM_GENERIC_ERROR =
  "No se pudo vincular el estudiante. Verifica el código e intenta de nuevo, o contacta a Secretaría.";

export const CLAIM_IP_LIMIT: RateLimitConfig = {
  maxAttempts: 20,
  windowMs: 15 * 60 * 1000,
};

export const CLAIM_CODE_LIMIT: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 60 * 60 * 1000,
};

/** Límite por padre autenticado: el único que un atacante no puede evadir. */
export const CLAIM_PARENT_HOUR_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000,
};

export const CLAIM_PARENT_DAY_LIMIT: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 24 * 60 * 60 * 1000,
};

export interface ClaimedStudent {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export type ClaimResult =
  | { ok: true; student: ClaimedStudent }
  | { ok: false; error: string; status: number; headers?: Record<string, string> };

interface StudentRow {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  parent_id: string | null;
}

/**
 * Vincula al alumno cuyo `enrollment_code` coincide, si está libre.
 * Aplica rate limit por padre, por IP (si hay) y por código antes de tocar la BD.
 */
export async function claimStudentForParent(args: {
  parentId: string;
  enrollmentCode: string;
  clientIp: string | null;
}): Promise<ClaimResult> {
  const enrollmentCode = args.enrollmentCode.trim().toUpperCase();

  const parentHour = rateLimit(`claim:parent:${args.parentId}`, CLAIM_PARENT_HOUR_LIMIT);
  if (!parentHour.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera unos minutos y vuelve a intentar.",
      status: 429,
      headers: rateLimitHeaders(parentHour, CLAIM_PARENT_HOUR_LIMIT),
    };
  }

  const parentDay = rateLimit(`claim:parent-day:${args.parentId}`, CLAIM_PARENT_DAY_LIMIT);
  if (!parentDay.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera unas horas y vuelve a intentar.",
      status: 429,
      headers: rateLimitHeaders(parentDay, CLAIM_PARENT_DAY_LIMIT),
    };
  }

  if (args.clientIp) {
    const ipLimit = rateLimit(`claim:ip:${args.clientIp}`, CLAIM_IP_LIMIT);
    if (!ipLimit.ok) {
      return {
        ok: false,
        error: "Demasiados intentos. Espera unos minutos y vuelve a intentar.",
        status: 429,
        headers: rateLimitHeaders(ipLimit, CLAIM_IP_LIMIT),
      };
    }
  }

  const codeLimit = rateLimit(`claim:code:${enrollmentCode}`, CLAIM_CODE_LIMIT);
  if (!codeLimit.ok) {
    return {
      ok: false,
      error: "Demasiados intentos con este código. Vuelve a intentar en una hora.",
      status: 429,
      headers: rateLimitHeaders(codeLimit, CLAIM_CODE_LIMIT),
    };
  }

  type TxResult =
    | { error: { status: number; msg: string }; student?: undefined }
    | { error?: undefined; student: StudentRow };

  const result = await withTransaction(async (client): Promise<TxResult> => {
    const countRow = await client.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM students WHERE parent_id = $1",
      [args.parentId],
    );
    if ((countRow.rows[0]?.count ?? 0) >= MAX_CHILDREN) {
      return {
        error: {
          status: 400,
          msg: `No puedes vincular más de ${MAX_CHILDREN} hijos.`,
        },
      };
    }

    const student = await client.query<StudentRow>(
      `SELECT id, full_name, grade, section, parent_id
       FROM students
       WHERE lower(enrollment_code) = lower($1)
       LIMIT 1`,
      [enrollmentCode],
    );
    const row = student.rows[0];

    if (!row || row.parent_id !== null) {
      return { error: { status: 404, msg: CLAIM_GENERIC_ERROR } };
    }

    const updated = await client.query<{ id: string }>(
      `UPDATE students
       SET parent_id = $1, parent_claimed_at = now()
       WHERE id = $2 AND parent_id IS NULL
       RETURNING id`,
      [args.parentId, row.id],
    );

    if (!updated.rows[0]) {
      return { error: { status: 409, msg: CLAIM_GENERIC_ERROR } };
    }

    return { student: row };
  });

  if (result.error) {
    return { ok: false, error: result.error.msg, status: result.error.status };
  }

  return {
    ok: true,
    student: {
      id: result.student.id,
      name: result.student.full_name,
      grade: result.student.grade,
      section: result.student.section,
    },
  };
}
