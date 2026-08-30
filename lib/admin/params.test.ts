import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  coursesListQuerySchema,
  enrollmentsListQuerySchema,
  parseQuery,
  studentsListQuerySchema,
  usersListQuerySchema,
} from "@/lib/admin/params";

function req(path: string, qs = ""): NextRequest {
  return new NextRequest(`http://localhost${path}${qs}`);
}

describe("usersListQuerySchema", () => {
  it("aplica defaults de paginación y filtros", () => {
    const [data, err] = parseQuery(req("/api/admin/users"), usersListQuerySchema);
    expect(err).toBeNull();
    expect(data).toMatchObject({ page: 1, limit: 50, role: "all", status: "all" });
  });

  it("acepta rol y estado válidos", () => {
    const [data, err] = parseQuery(
      req("/api/admin/users", "?role=docente&status=activo&page=2&limit=20"),
      usersListQuerySchema,
    );
    expect(err).toBeNull();
    expect(data).toMatchObject({ role: "docente", status: "activo", page: 2, limit: 20 });
  });

  it("rechaza un rol inválido con 400", async () => {
    const [data, err] = parseQuery(
      req("/api/admin/users", "?role=teacher"),
      usersListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
    const body = (await err!.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/rol/i);
  });

  it("rechaza página 0", async () => {
    const [data, err] = parseQuery(req("/api/admin/users", "?page=0"), usersListQuerySchema);
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
    const body = (await err!.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("rechaza limit mayor a 100", () => {
    const [data, err] = parseQuery(req("/api/admin/users", "?limit=200"), usersListQuerySchema);
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
  });
});

describe("studentsListQuerySchema", () => {
  it("normaliza section=all a ALL", () => {
    const [data, err] = parseQuery(
      req("/api/admin/students", "?section=all"),
      studentsListQuerySchema,
    );
    expect(err).toBeNull();
    expect(data?.section).toBe("ALL");
  });

  it("acepta sección A-M en minúsculas", () => {
    const [data, err] = parseQuery(
      req("/api/admin/students", "?section=b"),
      studentsListQuerySchema,
    );
    expect(err).toBeNull();
    expect(data?.section).toBe("B");
  });

  it("rechaza sección fuera de A-M", () => {
    const [data, err] = parseQuery(
      req("/api/admin/students", "?section=Z"),
      studentsListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
  });

  it("rechaza estado de alumno inválido", async () => {
    const [data, err] = parseQuery(
      req("/api/admin/students", "?status=baja"),
      studentsListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
    const body = (await err!.json()) as { error: string };
    expect(body.error).toMatch(/estado/i);
  });
});

describe("enrollmentsListQuerySchema", () => {
  it("acepta status y pay del servidor", () => {
    const [data, err] = parseQuery(
      req("/api/admin/enrollments", "?status=condicional&pay=parcial"),
      enrollmentsListQuerySchema,
    );
    expect(err).toBeNull();
    expect(data).toMatchObject({ status: "condicional", pay: "parcial" });
  });

  it("rechaza pay inválido", async () => {
    const [data, err] = parseQuery(
      req("/api/admin/enrollments", "?pay=gratis"),
      enrollmentsListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
    const body = (await err!.json()) as { error: string };
    expect(body.error).toMatch(/pago/i);
  });

  it("rechaza status de matrícula inválido", () => {
    const [data, err] = parseQuery(
      req("/api/admin/enrollments", "?status=activo"),
      enrollmentsListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
  });
});

describe("coursesListQuerySchema", () => {
  it("permite query vacío", () => {
    const [data, err] = parseQuery(req("/api/admin/courses"), coursesListQuerySchema);
    expect(err).toBeNull();
    expect(data).toEqual({});
  });

  it("acepta grado y sección", () => {
    const [data, err] = parseQuery(
      req("/api/admin/courses", "?grade=3ro&section=a"),
      coursesListQuerySchema,
    );
    expect(err).toBeNull();
    expect(data).toMatchObject({ grade: "3ro", section: "A" });
  });

  it("rechaza grado inválido", () => {
    const [data, err] = parseQuery(
      req("/api/admin/courses", "?grade=6to"),
      coursesListQuerySchema,
    );
    expect(data).toBeNull();
    expect(err?.status).toBe(400);
  });
});
