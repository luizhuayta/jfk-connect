import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";

function fakeRequest(headers: Record<string, string>): NextRequest {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
  } as NextRequest;
}

describe("getClientIp", () => {
  const previous = process.env.TRUST_PROXY;

  afterEach(() => {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });

  it("sin TRUST_PROXY no lee X-Forwarded-For y nunca devuelve 'unknown'", () => {
    process.env.TRUST_PROXY = "0";
    const ip = getClientIp(fakeRequest({ "x-forwarded-for": "203.0.113.10" }));
    expect(ip).toBeNull();
    expect(ip).not.toBe("unknown");
  });

  it("con TRUST_PROXY=1 usa el primer hop de X-Forwarded-For", () => {
    process.env.TRUST_PROXY = "1";
    expect(getClientIp(fakeRequest({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" }))).toBe(
      "203.0.113.10",
    );
  });

  it("con TRUST_PROXY=1 usa X-Real-IP si no hay X-Forwarded-For", () => {
    process.env.TRUST_PROXY = "1";
    expect(getClientIp(fakeRequest({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("con TRUST_PROXY=1 y sin headers fiables devuelve null, no 'unknown'", () => {
    process.env.TRUST_PROXY = "1";
    const ip = getClientIp(fakeRequest({}));
    expect(ip).toBeNull();
    expect(ip).not.toBe("unknown");
  });
});
