/**
 * POST /api/father/unlink-student
 *
 * Desvincula un estudiante de su apoderado. Solo el admin puede hacerlo
 * (el padre no puede desvincular por sí solo).
 *
 * Body: { studentId: string }
 *
 * Respuesta: { ok: true }
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const unlinkSchema = z.object({
  studentId: z.string().min(1, "studentId es obligatorio."),
});

export async function POST(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, unlinkSchema);
  if (validationError) return validationError;

  const { studentId } = parsed;

  try {
    // Verificar que el estudiante existe y tiene apoderado
    const student = await queryOne<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM students WHERE id = $1",
      [studentId],
    );

    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Estudiante no encontrado." },
        { status: 404 },
      );
    }

    if (student.parent_id === null) {
      return NextResponse.json(
        { ok: false, error: "Este alumno no tiene apoderado vinculado." },
        { status: 400 },
      );
    }

    await queryOne(
      `UPDATE students SET parent_id = NULL, parent_claimed_at = NULL WHERE id = $1`,
      [studentId],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "unlink-student", studentId }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}