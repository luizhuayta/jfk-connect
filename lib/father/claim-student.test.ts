import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(),
}));

import { withTransaction } from "@/lib/db";
import { clearRateLimitStore } from "@/lib/rate-limit";
import {
  CLAIM_GENERIC_ERROR,
  CLAIM_PARENT_DAY_LIMIT,
  CLAIM_PARENT_HOUR_LIMIT,
  MAX_CHILDREN,
  claimStudentForParent,
} from "@/lib/father/claim-student";

const withTransactionMock = vi.mocked(withTransaction);

const FREE_STUDENT = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Ana Pérez",
  grade: "3er",
  section: "B",
  parent_id: null as string | null,
};

function mockClient(opts: {
  childCount?: number;
  student?: typeof FREE_STUDENT | null;
  updateRows?: { id: string }[];
}): PoolClient {
  const childCount = opts.childCount ?? 0;
  const student = opts.student === undefined ? FREE_STUDENT : opts.student;
  const updateRows = opts.updateRows ?? (student ? [{ id: student.id }] : []);

  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("COUNT(*)")) return { rows: [{ count: childCount }] };
      if (sql.includes("SELECT id, full_name")) {
        return { rows: student ? [student] : [] };
      }
      if (sql.includes("UPDATE students")) {
        return { rows: updateRows };
      }
      throw new Error(`SQL inesperado en el mock: ${sql}`);
    }),
  } as unknown as PoolClient;
}

function useClient(client: PoolClient) {
  withTransactionMock.mockImplementation(async (fn) => fn(client));
}

describe("claimStudentForParent", () => {
  beforeEach(() => {
    clearRateLimitStore();
    withTransactionMock.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearRateLimitStore();
  });

  it("rechaza cuando el padre ya tiene el tope de hijos", async () => {
    useClient(mockClient({ childCount: MAX_CHILDREN }));
    const result = await claimStudentForParent({
      parentId: "parent-max",
      enrollmentCode: "2026-3B-0001",
      clientIp: null,
    });
    expect(result).toEqual({
      ok: false,
      error: `No puedes vincular más de ${MAX_CHILDREN} hijos.`,
      status: 400,
    });
  });

  it("usa el mismo mensaje genérico si el código no existe o ya está vinculado", async () => {
    useClient(mockClient({ student: null }));
    const missing = await claimStudentForParent({
      parentId: "parent-missing",
      enrollmentCode: "2026-3B-0002",
      clientIp: null,
    });
    expect(missing).toEqual({ ok: false, error: CLAIM_GENERIC_ERROR, status: 404 });

    clearRateLimitStore();
    useClient(
      mockClient({
        student: { ...FREE_STUDENT, parent_id: "otro-padre" },
      }),
    );
    const taken = await claimStudentForParent({
      parentId: "parent-taken",
      enrollmentCode: "2026-3B-0003",
      clientIp: null,
    });
    expect(taken).toEqual({ ok: false, error: CLAIM_GENERIC_ERROR, status: 404 });
  });

  it("trata como carrera un UPDATE que no actualiza ninguna fila", async () => {
    useClient(mockClient({ updateRows: [] }));
    const result = await claimStudentForParent({
      parentId: "parent-race",
      enrollmentCode: "2026-3B-0004",
      clientIp: null,
    });
    expect(result).toEqual({ ok: false, error: CLAIM_GENERIC_ERROR, status: 409 });
  });

  it("vincula al alumno libre", async () => {
    useClient(mockClient({}));
    const result = await claimStudentForParent({
      parentId: "parent-ok",
      enrollmentCode: "2026-3B-0005",
      clientIp: null,
    });
    expect(result).toEqual({
      ok: true,
      student: { id: FREE_STUDENT.id, name: "Ana Pérez", grade: "3er", section: "B" },
    });
  });

  it("aplica el límite por padre de 5 intentos por hora", async () => {
    useClient(mockClient({ student: null }));
    const parentId = "parent-hour";
    for (let i = 0; i < CLAIM_PARENT_HOUR_LIMIT.maxAttempts; i++) {
      const result = await claimStudentForParent({
        parentId,
        enrollmentCode: `2026-3B-${String(1000 + i).padStart(4, "0")}`,
        clientIp: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(404);
    }

    const blocked = await claimStudentForParent({
      parentId,
      enrollmentCode: "2026-3B-1999",
      clientIp: null,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok === false) {
      expect(blocked.status).toBe(429);
      expect(blocked.error).toMatch(/minutos/i);
    }
    expect(withTransactionMock).toHaveBeenCalledTimes(CLAIM_PARENT_HOUR_LIMIT.maxAttempts);
  });

  it("aplica el límite diario por padre tras resetear la ventana horaria", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    useClient(mockClient({ student: null }));
    const parentId = "parent-day";

    for (let i = 0; i < CLAIM_PARENT_HOUR_LIMIT.maxAttempts; i++) {
      await claimStudentForParent({
        parentId,
        enrollmentCode: `2026-1A-${String(2000 + i).padStart(4, "0")}`,
        clientIp: null,
      });
    }

    vi.setSystemTime(new Date("2026-03-01T11:05:00Z"));

    const remainingInDay =
      CLAIM_PARENT_DAY_LIMIT.maxAttempts - CLAIM_PARENT_HOUR_LIMIT.maxAttempts;
    for (let i = 0; i < remainingInDay; i++) {
      const result = await claimStudentForParent({
        parentId,
        enrollmentCode: `2026-1A-${String(3000 + i).padStart(4, "0")}`,
        clientIp: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.status).toBe(404);
    }

    // El siguiente intento caería a la vez en el tope horario (6/hora) y
    // en el diario (11/día). Adelantamos la ventana horaria para que falle
    // solo el cubo diario.
    vi.setSystemTime(new Date("2026-03-01T12:10:00Z"));

    const blocked = await claimStudentForParent({
      parentId,
      enrollmentCode: "2026-1A-3999",
      clientIp: null,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok === false) {
      expect(blocked.status).toBe(429);
      expect(blocked.error).toMatch(/horas/i);
    }
  });
});
