import type { ToolContext } from "@/lib/ai/tools/registry";

/** Índice 1-based → UUID precargado en el servidor. Nunca un studentId del modelo. */
export function resolveStudentId(ctx: ToolContext, hijo: number): string | null {
  return ctx.allowedStudentIds[hijo - 1] ?? null;
}
