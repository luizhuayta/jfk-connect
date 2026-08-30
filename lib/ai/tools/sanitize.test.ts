import { describe, expect, it } from "vitest";
import { sanitizeToolResult, wrapUserText } from "@/lib/ai/tools/sanitize";

describe("sanitizeToolResult", () => {
  it("deja pasar un objeto pequeño", () => {
    expect(sanitizeToolResult({ a: 1, b: "hola" })).toEqual({ a: 1, b: "hola" });
  });

  it("trunca arrays a 20 ítems", () => {
    const out = sanitizeToolResult(Array.from({ length: 25 }, (_, i) => i)) as unknown[];
    expect(out).toHaveLength(21);
    expect(String(out[20])).toMatch(/5 más/);
  });

  it("trunca strings a 300 caracteres", () => {
    const out = sanitizeToolResult("x".repeat(400)) as string;
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(301);
  });

  it("reemplaza payloads serializados mayores a 4 KB", () => {
    const big = { items: Array.from({ length: 20 }, () => ({ t: "y".repeat(300) })) };
    const out = sanitizeToolResult(big) as { error: string };
    expect(out.error).toMatch(/demasiado grande/i);
  });
});

describe("wrapUserText", () => {
  it("envuelve el texto entre delimitadores", () => {
    expect(wrapUserText("Ana")).toBe("<<<texto_de_usuario>>>Ana<<<fin>>>");
  });
});
