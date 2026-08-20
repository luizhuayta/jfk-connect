"use client";

import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useIsClient } from "@/lib/useIsClient";
import { areaColor } from "@/lib/curriculum/colors";

type ScheduleSlot = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
// Turno Mañana y Tarde son bloques de reloj distintos — Tarde arranca a las
// 13:30, 10 min después de que termina Mañana (no el mismo horario
// reetiquetado). Cada alumno pertenece a una sola sección, así que solo
// necesita el bloque de SU turno.
const PERIODS_MAÑANA = ["7:45 - 8:30", "8:30 - 9:15", "9:15 - 10:00", "10:20 - 11:05", "11:05 - 11:50", "11:50 - 12:35", "12:35 - 13:20"];
const PERIODS_TARDE = ["13:30 - 14:15", "14:15 - 15:00", "15:00 - 15:45", "16:05 - 16:50", "16:50 - 17:35", "17:35 - 18:20", "18:20 - 19:05"];
const RECESS_TIME: Record<string, string> = { Mañana: "10:00 – 10:20", Tarde: "15:45 – 16:05" };
function periodsForShift(shift: string | undefined) {
  return shift === "Tarde" ? PERIODS_TARDE : PERIODS_MAÑANA;
}

function subjectStyle(subject: string) {
  const c = areaColor(subject);
  return `${c.bg} ${c.text} ${c.border}`;
}

const DAY_SHORT: Record<string, string> = {
  "Lunes": "Lun", "Martes": "Mar", "Miércoles": "Mié",
  "Jueves": "Jue", "Viernes": "Vie",
};

const EMPTY_SCHEDULE: Record<string, (ScheduleSlot | null)[]> = {};

export default function SchedulePage() {
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: student,
  } = useFatherStudents();
  // El día actual solo se resalta tras hidratar: calcularlo en el render del
  // servidor genera un HTML distinto al del cliente (antes se tapaba con
  // `suppressHydrationWarning`).
  const isClient = useIsClient();
  const todayName = isClient
    ? (() => {
        const label = new Date().toLocaleDateString("es-PE", { weekday: "long" });
        return label.charAt(0).toUpperCase() + label.slice(1);
      })()
    : null;

  const {
    data: schedule,
    error,
    handleRetry,
  } = useCachedFatherResource<Record<string, (ScheduleSlot | null)[]>>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/schedule",
    field: "schedule",
    fallback: EMPTY_SCHEDULE,
    errorMessage: "Error cargando horario",
  });

  // Build unique subjects for the legend
  const subjects = Array.from(
    new Set(
      Object.values(schedule)
        .flat()
        .filter((s): s is ScheduleSlot => s !== null)
        .map((p) => p.subject),
    ),
  ).sort();

  const periods = periodsForShift(student?.shift);
  const dayRange = `${periods[0].split(" - ")[0]} – ${periods[periods.length - 1].split(" - ")[1]}`;

  if (loading) return <LoadingState label="Cargando horario..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      {/* Header — el turno sale del alumno, no está escrito a mano */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">Horario</h1>
        <p className="text-muted-foreground mt-1">
          {student?.shift ? `Turno ${student.shift.toLowerCase()} · ` : ""}
          {dayRange} · {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && (
        <>
          {/* Schedule grid */}
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Header row */}
                <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-primary">
                  <div className="p-3 text-xs font-semibold text-white/80 flex items-center justify-center">
                    Período
                  </div>
                  {DAYS.map((day) => {
                    const isToday = day === todayName;
                    return (
                      <div
                        key={day}
                        className={`relative p-3 text-center text-xs font-bold text-white border-l border-white/10 ${
                          isToday ? "bg-accent/25 ring-2 ring-accent ring-inset" : ""
                        }`}
                      >
                        <span className="hidden sm:block">{day}</span>
                        <span className="sm:hidden">{DAY_SHORT[day]}</span>
                        {isToday && (
                          <span className="block text-[10px] text-accent mt-0.5 font-bold tracking-wide">
                            ● HOY
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Recreo divider position — after 3rd period */}
                {periods.map((period, pi) => (
                  <Fragment key={period}>
                    {pi === 3 && (
                      <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-amber-50 border-y border-amber-200">
                        <div className="p-2 text-xs font-semibold text-amber-700 flex items-center justify-center">
                          {RECESS_TIME[student?.shift ?? "Mañana"]}
                        </div>
                        <div className="col-span-5 p-2 flex items-center">
                          <span className="text-xs font-bold text-amber-700">Recreo</span>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-[110px_repeat(5,1fr)] border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      {/* Time */}
                      <div className="p-3 flex items-center justify-center border-r border-gray-100">
                        <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                          {period}
                        </span>
                      </div>

                      {/* Cells per day */}
                      {DAYS.map((day) => {
                        const slot = schedule[day]?.[pi];
                        const isToday = day === todayName;
                        return (
                          <div
                            key={day}
                            className={`relative p-1.5 border-l border-gray-100 ${isToday ? "bg-primary/[0.04]" : ""}`}
                          >
                            {isToday && (
                              <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
                            )}
                            {slot ? (
                              <div
                                className={`rounded-lg border p-2 h-full flex flex-col gap-0.5 ${subjectStyle(slot.subject)} ${isToday ? "shadow-sm" : ""}`}
                              >
                                <p className="text-xs font-bold leading-tight">{slot.subject}</p>
                                <p className="text-[10px] opacity-80 leading-tight">{slot.teacher}</p>
                                <p className="text-[10px] opacity-70 leading-tight hidden md:block">
                                  {slot.room}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-200 p-2 h-full flex items-center justify-center min-h-[52px]">
                                <span className="text-[10px] text-muted-foreground">—</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          {subjects.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {student ? `Cursos de ${student.name}` : "Cursos"}
              </p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <span
                    key={sub}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${subjectStyle(sub)}`}
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
