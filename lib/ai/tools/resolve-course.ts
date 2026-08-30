import type { ToolContext } from "@/lib/ai/tools/registry";
import { courseBelongsToTeacher } from "@/lib/guards";

/** Índice 1-based → UUID precargado en el servidor. Nunca un courseId del modelo. */
export function resolveCourseId(ctx: ToolContext, curso: number): string | null {
  return ctx.allowedCourseIds[curso - 1] ?? null;
}

const ACCESS_DENIED = { error: "No tienes acceso a ese curso." };
const NO_COURSE = { error: "No tienes un curso con ese índice." };

/**
 * Resuelve el índice y re-verifica ownership (defensa en profundidad).
 * Devuelve el UUID o un objeto `{ error }` listo para devolver al modelo.
 */
export async function resolveOwnedCourse(
  ctx: ToolContext,
  curso: number,
): Promise<string | { error: string }> {
  const courseId = resolveCourseId(ctx, curso);
  if (!courseId) return NO_COURSE;
  if (!(await courseBelongsToTeacher(courseId, ctx.user.id))) return ACCESS_DENIED;
  return courseId;
}
