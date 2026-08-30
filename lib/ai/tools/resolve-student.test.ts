import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth";
import type { ToolContext } from "@/lib/ai/tools/registry";
import { resolveStudentId } from "@/lib/ai/tools/resolve-student";

const user: AuthUser = {
  id: "parent-1",
  email: "padre@ijfk.edu.pe",
  full_name: "Padre Demo",
  role: "padre",
  is_active: true,
  phone: null,
};

function ctx(allowedStudentIds: string[]): ToolContext {
  return { user, allowedStudentIds, allowedCourseIds: [] };
}

describe("resolveStudentId", () => {
  it("devuelve null si la lista de hijos está vacía", () => {
    expect(resolveStudentId(ctx([]), 1)).toBeNull();
  });

  it("devuelve null si el índice 1-based está fuera de rango", () => {
    expect(resolveStudentId(ctx(["stu-a"]), 0)).toBeNull();
    expect(resolveStudentId(ctx(["stu-a"]), 2)).toBeNull();
  });

  it("resuelve el UUID del hijo por índice 1-based", () => {
    expect(resolveStudentId(ctx(["stu-a", "stu-b"]), 1)).toBe("stu-a");
    expect(resolveStudentId(ctx(["stu-a", "stu-b"]), 2)).toBe("stu-b");
  });
});
