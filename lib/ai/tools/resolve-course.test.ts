import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth";
import type { ToolContext } from "@/lib/ai/tools/registry";
import { resolveCourseId } from "@/lib/ai/tools/resolve-course";

const user: AuthUser = {
  id: "teacher-1",
  email: "dmat01@ijfk.edu.pe",
  full_name: "Docente Demo",
  role: "docente",
  is_active: true,
  phone: null,
};

function ctx(allowedCourseIds: string[]): ToolContext {
  return { user, allowedStudentIds: [], allowedCourseIds };
}

describe("resolveCourseId", () => {
  it("devuelve null si la lista de cursos está vacía", () => {
    expect(resolveCourseId(ctx([]), 1)).toBeNull();
  });

  it("devuelve null si el índice 1-based está fuera de rango", () => {
    expect(resolveCourseId(ctx(["crs-a"]), 0)).toBeNull();
    expect(resolveCourseId(ctx(["crs-a"]), 2)).toBeNull();
  });

  it("resuelve el UUID del curso por índice 1-based", () => {
    expect(resolveCourseId(ctx(["crs-a", "crs-b"]), 1)).toBe("crs-a");
    expect(resolveCourseId(ctx(["crs-a", "crs-b"]), 2)).toBe("crs-b");
  });
});
