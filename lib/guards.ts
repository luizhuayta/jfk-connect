/**
 * Guardas de autorización a nivel de recurso (server-side).
 *
 * Complementan a lib/auth.ts (que verifica sesión y rol) comprobando que
 * el usuario autenticado es dueño del recurso concreto que pide.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Devuelve true si el estudiante pertenece al padre indicado.
 */
export async function studentBelongsToParent(
  studentId: string,
  parentId: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM students WHERE id = $1 AND parent_id = $2",
    [studentId, parentId],
  );
  return row !== null;
}

/**
 * Combina requireRole('padre') + lectura de ?studentId= + verificación de
 * pertenencia en un solo paso. Usado por las rutas GET /api/father/* que
 * devuelven datos de un hijo concreto (grades, attendance, schedule,
 * materials, enrollment) — antes repetían este mismo bloque cada una.
 */
export async function requireOwnedStudent(
  request: NextRequest,
): Promise<[string, null] | [null, NextResponse]> {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return [null, denied];

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Falta el parámetro studentId." },
        { status: 400 },
      ),
    ];
  }

  if (!(await studentBelongsToParent(studentId, user.id))) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Este estudiante no está vinculado a tu cuenta." },
        { status: 403 },
      ),
    ];
  }

  return [studentId, null];
}

/**
 * Devuelve true si el curso está asignado al docente indicado.
 */
export async function courseBelongsToTeacher(
  courseId: string,
  teacherId: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "SELECT id FROM courses WHERE id = $1 AND teacher_id = $2",
    [courseId, teacherId],
  );
  return row !== null;
}
