/**
 * Registro tipado de herramientas del asistente conversacional — IJFK.
 *
 * El núcleo de seguridad vive en `ToolContext`: para `padre` y `docente`,
 * `allowedStudentIds` / `allowedCourseIds` se resuelven en el servidor
 * ANTES de invocar al modelo. Las herramientas de esos roles nunca reciben
 * un UUID como parámetro — reciben un ÍNDICE dentro de esas listas.
 *
 * Las herramientas concretas por rol viven en padre.ts / docente.ts /
 * admin.ts / common.ts (fase P5) — este archivo solo define el contrato.
 */

import { z, type ZodType, type infer as zInfer } from "zod";
import type { AuthUser } from "@/lib/auth";
import type { ToolDef } from "@/lib/ai/types";

export interface ToolContext {
  user: AuthUser;
  /** IDs de los hijos del padre, resueltos por el servidor antes de invocar al modelo. Vacío para roles distintos de "padre". */
  allowedStudentIds: string[];
  /** IDs de los cursos del docente, resueltos por el servidor. Vacío para roles distintos de "docente". */
  allowedCourseIds: string[];
}

export interface AssistantTool<P extends ZodType = ZodType> {
  name: string;
  description: string;
  params: P;
  roles: AuthUser["role"][];
  run: (args: zInfer<P>, ctx: ToolContext) => Promise<unknown>;
}

/** Azúcar sintáctica para declarar una herramienta con inferencia de tipos correcta en `run`. */
export function defineTool<P extends ZodType>(tool: AssistantTool<P>): AssistantTool<P> {
  return tool;
}

/** Filtra el catálogo completo de herramientas a las permitidas para un rol. */
export function toolsForRole(all: AssistantTool[], role: AuthUser["role"]): AssistantTool[] {
  return all.filter((t) => t.roles.includes(role));
}

/** Convierte el subconjunto de herramientas de un rol al formato `tools` del protocolo OpenAI-compatible. */
export function toOpenAiTools(tools: AssistantTool[]): ToolDef[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.params) as Record<string, unknown>,
    },
  }));
}
