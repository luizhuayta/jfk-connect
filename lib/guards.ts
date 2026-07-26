/**
 * Guardas de autorización a nivel de recurso (server-side).
 *
 * Complementan a lib/auth.ts (que verifica sesión y rol) comprobando que
 * el usuario autenticado es dueño del recurso concreto que pide.
 */

import { queryOne } from "@/lib/db";

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
