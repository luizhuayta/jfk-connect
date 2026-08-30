import { describe, expect, it } from "vitest";
import { attendanceColor, avgColor, formatAdminDate } from "@/lib/admin/theme";

describe("avgColor", () => {
  it("verde a partir de 14", () => {
    expect(avgColor(14)).toContain("text-emerald-600");
    expect(avgColor(18)).toContain("text-emerald-600");
  });

  it("neutro entre 11 y 13.9", () => {
    expect(avgColor(11)).toContain("text-[#0F172A]");
    expect(avgColor(13.9)).toContain("text-[#0F172A]");
  });

  it("rojo por debajo de 11", () => {
    expect(avgColor(10.9)).toContain("text-red-500");
    expect(avgColor(0)).toContain("text-red-500");
  });

  it("gris si no hay dato", () => {
    expect(avgColor(null)).toBe("text-gray-400");
  });
});

describe("attendanceColor", () => {
  it("verde a partir de 90", () => {
    expect(attendanceColor(90)).toBe("text-emerald-600");
    expect(attendanceColor(100)).toBe("text-emerald-600");
  });

  it("ámbar entre 75 y 89", () => {
    expect(attendanceColor(75)).toBe("text-amber-600");
    expect(attendanceColor(89)).toBe("text-amber-600");
  });

  it("rojo por debajo de 75", () => {
    expect(attendanceColor(74.9)).toBe("text-red-500");
  });

  it("gris si no hay dato", () => {
    expect(attendanceColor(null)).toBe("text-gray-400");
  });
});

describe("formatAdminDate", () => {
  it("devuelve raya si falta la fecha", () => {
    expect(formatAdminDate(null)).toBe("—");
    expect(formatAdminDate(undefined)).toBe("—");
    expect(formatAdminDate("")).toBe("—");
  });
});
