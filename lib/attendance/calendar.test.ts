import { describe, expect, it } from "vitest";
import { calendarWeeks } from "@/lib/attendance/calendar";

describe("calendarWeeks", () => {
  it("cubre todos los días del mes en filas de 7, con huecos null", () => {
    const year = 2026;
    const month = 3;
    const weeks = calendarWeeks(year, month);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = weeks.flat().filter((d): d is number => d !== null);

    expect(days).toEqual(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    expect(weeks.every((week) => week.length === 7)).toBe(true);

    const firstWeekday = new Date(year, month - 1, 1).getDay();
    expect(weeks[0].slice(0, firstWeekday).every((cell) => cell === null)).toBe(true);
    expect(weeks[0][firstWeekday]).toBe(1);
  });

  it("alinea agosto 2026 (sábado) con el padding correcto", () => {
    const weeks = calendarWeeks(2026, 8);
    expect(new Date(2026, 7, 1).getDay()).toBe(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks[0].length).toBe(7);
    expect(weeks.flat().filter((d) => d !== null).at(-1)).toBe(31);
  });
});
