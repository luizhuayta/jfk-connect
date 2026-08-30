import { describe, expect, it } from "vitest";
import { sanitizeMeta } from "@/lib/admin/audit";

describe("sanitizeMeta", () => {
  it("deja pasar metadatos administrativos inocuos", () => {
    expect(
      sanitizeMeta({ email: "ana@ijfk.edu.pe", role: "docente", fromRole: "padre" }),
    ).toEqual({ email: "ana@ijfk.edu.pe", role: "docente", fromRole: "padre" });
  });

  it("elimina claves de contraseña, hash, token y secreto", () => {
    const out = sanitizeMeta({
      email: "ana@ijfk.edu.pe",
      password: "Demo2026!",
      tempPassword: "x",
      passwordHash: "abc",
      secret: "s",
      token: "t",
      hash: "h",
      resetToken: "rt",
    });
    expect(out).toEqual({ email: "ana@ijfk.edu.pe" });
    expect(JSON.stringify(out)).not.toMatch(/password|secret|token|hash/i);
  });

  it("no persiste valores de texto que parecen secretos", () => {
    const out = sanitizeMeta({
      note: "password temporal",
      summary: "reseteo de cuenta",
    });
    expect(out).not.toHaveProperty("note");
    expect(out).toHaveProperty("summary", "reseteo de cuenta");
  });

  it("devuelve objeto vacío si no hay meta", () => {
    expect(sanitizeMeta(undefined)).toEqual({});
  });
});
