/**
 * Validación de query params de los listados del panel de administración.
 * Un valor inválido (rol, estado, página) devuelve 400 en vez de una lista vacía.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType, type infer as zInfer } from "zod";
import type { ParseResult } from "@/lib/validate";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const usersListQuerySchema = paginationQuerySchema.extend({
  role: z
    .enum(["admin", "docente", "padre", "all"], { message: "Rol no válido." })
    .optional()
    .default("all"),
  status: z
    .enum(["activo", "inactivo", "all"], { message: "Estado no válido." })
    .optional()
    .default("all"),
  q: z.string().trim().max(120).optional(),
});

export const studentsListQuerySchema = paginationQuerySchema.extend({
  grade: z
    .enum(["1ro", "2do", "3ro", "4to", "5to", "all"], { message: "Grado no válido." })
    .optional()
    .default("all"),
  section: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "ALL" || /^[A-M]$/.test(v), {
      message: "Sección no válida.",
    })
    .optional()
    .default("ALL"),
  status: z
    .enum(["activo", "retirado", "trasladado", "all"], {
      message: "Estado no válido.",
    })
    .optional()
    .default("all"),
  q: z.string().trim().max(120).optional(),
});

export const enrollmentsListQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(["regular", "condicional", "pendiente", "all"], {
      message: "Estado de matrícula no válido.",
    })
    .optional()
    .default("all"),
  pay: z
    .enum(["completo", "parcial", "pendiente", "all"], {
      message: "Filtro de pago no válido.",
    })
    .optional()
    .default("all"),
  q: z.string().trim().max(120).optional(),
});

export const coursesListQuerySchema = z.object({
  grade: z
    .enum(["1ro", "2do", "3ro", "4to", "5to"], { message: "Grado no válido." })
    .optional(),
  section: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-M]$/, "Sección no válida.")
    .optional(),
});

export type UsersListQuery = z.infer<typeof usersListQuerySchema>;
export type StudentsListQuery = z.infer<typeof studentsListQuerySchema>;
export type EnrollmentsListQuery = z.infer<typeof enrollmentsListQuerySchema>;
export type CoursesListQuery = z.infer<typeof coursesListQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Convierte URLSearchParams a objeto y valida con Zod. */
export function parseQuery<T extends ZodType>(
  request: NextRequest,
  schema: T,
): ParseResult<zInfer<T>> {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== "") raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues?.[0]?.message ?? "Parámetros no válidos.";
    return [
      null,
      NextResponse.json({ ok: false, error: first }, { status: 400 }),
    ];
  }
  return [result.data, null];
}
