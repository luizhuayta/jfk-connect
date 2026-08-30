import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AuthUser } from "@/lib/auth";
import { SCHOOL_YEAR } from "@/lib/school-year";

vi.mock("@/lib/db", () => ({
  queryOne: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}));

import { queryOne } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { requireOwnedCourse, requireStudentAccess } from "@/lib/guards";

const queryOneMock = vi.mocked(queryOne);
const requireRoleMock = vi.mocked(requireRole);
const requireUserMock = vi.mocked(requireUser);

const TEACHER: AuthUser = {
  id: "teacher-1",
  email: "dmat01@ijfk.edu.pe",
  full_name: "Docente Uno",
  role: "docente",
  is_active: true,
  phone: null,
};

const OTHER_TEACHER: AuthUser = {
  ...TEACHER,
  id: "teacher-2",
  email: "dmat02@ijfk.edu.pe",
};

const ADMIN: AuthUser = {
  id: "admin-1",
  email: "admin@ijfk.edu.pe",
  full_name: "Admin",
  role: "admin",
  is_active: true,
  phone: null,
};

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";

const COURSE_ROW = {
  id: COURSE_ID,
  grade: "3er",
  section: "B",
  area_id: 1,
  teacher_id: TEACHER.id,
};

const STUDENT_REF = { id: STUDENT_ID, grade: "3er", section: "B" };

function req() {
  return new NextRequest("http://localhost/api/test");
}

function forbidden(message: string) {
  return [
    null,
    new Response(JSON.stringify({ ok: false, error: message }), { status: 403 }),
  ] as const;
}

describe("requireOwnedCourse", () => {
  beforeEach(() => {
    queryOneMock.mockReset();
    requireRoleMock.mockReset();
  });

  it("acepta al docente dueño del curso", async () => {
    requireRoleMock.mockResolvedValue([TEACHER, null]);
    queryOneMock.mockResolvedValue(COURSE_ROW);

    const [ctx, denied] = await requireOwnedCourse(req(), COURSE_ID);
    expect(denied).toBeNull();
    expect(ctx?.user.id).toBe(TEACHER.id);
    expect(ctx?.course.id).toBe(COURSE_ID);
    expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), ["docente", "admin"]);
  });

  it("rechaza a un docente que no es dueño", async () => {
    requireRoleMock.mockResolvedValue([OTHER_TEACHER, null]);
    queryOneMock.mockResolvedValue(COURSE_ROW);

    const [ctx, denied] = await requireOwnedCourse(req(), COURSE_ID);
    expect(ctx).toBeNull();
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(403);
  });

  it("devuelve 404 si el curso no existe", async () => {
    requireRoleMock.mockResolvedValue([TEACHER, null]);
    queryOneMock.mockResolvedValue(null);

    const [ctx, denied] = await requireOwnedCourse(req(), COURSE_ID);
    expect(ctx).toBeNull();
    expect(denied?.status).toBe(404);
  });

  it("acepta al admin cuando allowAdmin queda en true (default)", async () => {
    requireRoleMock.mockResolvedValue([ADMIN, null]);
    queryOneMock.mockResolvedValue({ ...COURSE_ROW, teacher_id: TEACHER.id });

    const [ctx, denied] = await requireOwnedCourse(req(), COURSE_ID);
    expect(denied).toBeNull();
    expect(ctx?.user.role).toBe("admin");
  });

  it("pide solo rol docente cuando allowAdmin es false", async () => {
    requireRoleMock.mockResolvedValue(forbidden("No tienes permisos para esta acción.") as never);

    const [ctx, denied] = await requireOwnedCourse(req(), COURSE_ID, { allowAdmin: false });
    expect(ctx).toBeNull();
    expect(denied?.status).toBe(403);
    expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), ["docente"]);
  });

  it("devuelve 400 si courseId no es un UUID", async () => {
    const [ctx, denied] = await requireOwnedCourse(req(), "no-es-uuid");
    expect(ctx).toBeNull();
    expect(denied?.status).toBe(400);
    expect(requireRoleMock).not.toHaveBeenCalled();
  });
});

describe("requireStudentAccess (tutor)", () => {
  beforeEach(() => {
    queryOneMock.mockReset();
    requireUserMock.mockReset();
    requireUserMock.mockResolvedValue([TEACHER, null]);
  });

  it("acepta al tutor de la sección en el año lectivo actual", async () => {
    queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM students")) return STUDENT_REF;
      if (sql.includes("section_tutors")) {
        expect(sql).toMatch(/year/);
        expect(params).toContain(SCHOOL_YEAR);
        expect(params).toContain(TEACHER.id);
        return { id: "tutor-row" };
      }
      return null;
    });

    const [ctx, denied] = await requireStudentAccess(req(), STUDENT_ID, { allowTutor: true });
    expect(denied).toBeNull();
    expect(ctx?.student.id).toBe(STUDENT_ID);
  });

  it("niega acceso a un tutor de un año anterior", async () => {
    queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM students")) return STUDENT_REF;
      if (sql.includes("section_tutors")) {
        const year = sql.includes("year") ? params[2] : undefined;
        // Solo hay fila de tutor para 2025; el año lectivo actual no coincide.
        if (year === 2025 || year === undefined) return { id: "old-tutor" };
        return null;
      }
      return null;
    });

    const [ctx, denied] = await requireStudentAccess(req(), STUDENT_ID, { allowTutor: true });
    expect(ctx).toBeNull();
    expect(denied?.status).toBe(403);
  });
});
