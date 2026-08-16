/**
 * POST /api/admin/courses/assign
 *
 * Asigna (o reasigna) un docente a un curso. Valida que el docente
 * tenga `subject` igual al `name` del curso.
 *
 * Body: { courseId: string, teacherId: string }
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  courseId: z.string().min(1, "courseId es obligatorio."),
  teacherId: z.string().min(1, "teacherId es obligatorio."),
});

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(request, assignSchema);
  if (validationError) return validationError;

  const { courseId, teacherId } = parsed;

  try {
    // 1. Buscar el curso
    const course = await queryOne<{ id: string; name: string; grade: string; section: string }>(
      "SELECT id, name, grade, section FROM courses WHERE id = $1",
      [courseId],
    );
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

    // 2. Buscar el docente
    const teacher = await queryOne<{
      id: string;
      full_name: string;
      subject: string | null;
      role: string;
      is_active: boolean;
    }>(
      "SELECT id, full_name, subject, role, is_active FROM users WHERE id = $1",
      [teacherId],
    );
    if (!teacher) {
      return NextResponse.json(
        { ok: false, error: "Docente no encontrado." },
        { status: 404 },
      );
    }

    if (teacher.role !== "docente") {
      return NextResponse.json(
        { ok: false, error: "El usuario seleccionado no es docente." },
        { status: 400 },
      );
    }

    if (!teacher.is_active) {
      return NextResponse.json(
        { ok: false, error: "El docente está inactivo." },
        { status: 400 },
      );
    }

    // 3. VALIDACIÓN CLAVE: subject del docente === name del curso
    if (!teacher.subject || teacher.subject !== course.name) {
      return NextResponse.json(
        {
          ok: false,
          error: `Este docente enseña "${teacher.subject ?? "(sin asignatura)"}", no puede asignarse a "${course.name}".`,
        },
        { status: 400 },
      );
    }

    // 4. Asignar
    await queryOne(
      "UPDATE courses SET teacher_id = $1, updated_at = now() WHERE id = $2",
      [teacherId, courseId],
    );

    return NextResponse.json({
      ok: true,
      message: `${teacher.full_name} asignado a ${course.name} — ${course.grade} "${course.section}".`,
    });
  } catch (err) {
    logger.error({ err, route: "admin/courses/assign" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}