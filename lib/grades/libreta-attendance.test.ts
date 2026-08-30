import { describe, expect, it } from "vitest";
import { attendanceFromBimesterRows, emptyAttendanceByBimester } from "@/lib/grades/libreta";

describe("attendanceFromBimesterRows", () => {
  it("devuelve ceros en los cuatro bimestres si no hay filas", () => {
    expect(attendanceFromBimesterRows([])).toEqual(emptyAttendanceByBimester());
  });

  it("rellena solo el bimestre presente y deja el resto en cero", () => {
    const attendance = attendanceFromBimesterRows([
      { bimester: 2, inasistencias: 3, tardanzas: 1 },
    ]);
    expect(attendance[1]).toEqual({ inasistencias: 0, tardanzas: 0 });
    expect(attendance[2]).toEqual({ inasistencias: 3, tardanzas: 1 });
    expect(attendance[3]).toEqual({ inasistencias: 0, tardanzas: 0 });
    expect(attendance[4]).toEqual({ inasistencias: 0, tardanzas: 0 });
  });

  it("ignora bimestres fuera de 1-4", () => {
    const attendance = attendanceFromBimesterRows([
      { bimester: 0, inasistencias: 9, tardanzas: 9 },
      { bimester: 5, inasistencias: 9, tardanzas: 9 },
      { bimester: 1, inasistencias: 2, tardanzas: 4 },
    ]);
    expect(attendance[1]).toEqual({ inasistencias: 2, tardanzas: 4 });
    expect(attendance[2]).toEqual({ inasistencias: 0, tardanzas: 0 });
  });
});
