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
 *   - Máximo 5 hijos por padre.
 *   - El enrollment_code debe existir en students.
 *   - El estudiante no debe tener ya un parent_id (no se puede reclamar 2 veces).
 *   - Race-condition protegida con WHERE parent_id IS NULL en el UPDATE.
 *
 * Respuesta: { ok: true, student: { id, name, grade, section } }
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_CHILDREN = 5;

const claimSchema = z.object({
  enrollmentCode: z
    .string({ message: "El código de matrícula es obligatorio." })
    .trim()
    .min(1, "El código de matrícula es obligatorio."),
});

export async function POST(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, claimSchema);
  if (validationError) return validationError;

  const { enrollmentCode } = parsed;

  try {
    // 1. Verificar que el padre tiene < 5 hijos
    const countRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM students WHERE parent_id = $1",
      [user.id],
    );
    if ((countRow?.count ?? 0) >= MAX_CHILDREN) {
      return NextResponse.json(
        { ok: false, error: `No puedes vincular más de ${MAX_CHILDREN} hijos.` },
        { status: 400 },
      );
    }

    // 2. Buscar estudiante por enrollment_code
    const student = await queryOne<{
      id: string;
      full_name: string;
      grade: string;
      section: string;
      parent_id: string | null;
    }>(
      `SELECT id, full_name, grade, section, parent_id
       FROM students
       WHERE enrollment_code = $1
       LIMIT 1`,
      [enrollmentCode],
    );

    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Código de matrícula no encontrado. Verifica e intenta de nuevo." },
        { status: 404 },
      );
    }

    if (student.parent_id !== null) {
      return NextResponse.json(
        { ok: false, error: "Este alumno ya tiene un apoderado vinculado. Contacta a Secretaría si crees que es un error." },
        { status: 409 },
      );
    }

    // 3. Vincular (doble check con WHERE parent_id IS NULL)
    const updated = await queryOne<{ id: string }>(
      `UPDATE students
       SET parent_id = $1, parent_claimed_at = now()
       WHERE id = $2 AND parent_id IS NULL
       RETURNING id`,
      [user.id, student.id],
    );

    if (!updated) {
      // Race condition: alguien lo reclamó entre el SELECT y el UPDATE
      return NextResponse.json(
        { ok: false, error: "Este alumno acaba de ser vinculado por otro apoderado. Intenta de nuevo." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        name: student.full_name,
        grade: student.grade,
        section: student.section,
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