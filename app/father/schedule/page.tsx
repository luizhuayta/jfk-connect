"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useIsClient } from "@/lib/useIsClient";
import { areaColor } from "@/lib/curriculum/colors";
import { paperCardClass, honorLinkClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";
import { downloadHorario } from "@/lib/report";
import type { ScheduleSlot } from "@/lib/father/types";
import {
  SCHEDULE_DAYS,
  DAY_SHORT,
  RECESS_TIME,
  periodsForShift,
} from "@/lib/schedule/periods";

function subjectStyle(subject: string) {
  const c = areaColor(subject);
  return `${c.bg} ${c.text} ${c.border}`;
}

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
    loading: scheduleLoading,
  } = useCachedFatherResource<Record<string, (ScheduleSlot | null)[]>>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/schedule",
    field: "schedule",
    fallback: EMPTY_SCHEDULE,
    errorMessage: "Error cargando horario",
  });

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(schedule)
            .flat()
            .filter((s): s is ScheduleSlot => s !== null)
            .map((p) => p.subject),
        ),
      ).sort(),
    [schedule],
  );

  const periods = periodsForShift(student?.shift);
  const dayRange = `${periods[0].split(" - ")[0]} – ${periods[periods.length - 1].split(" - ")[1]}`;
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!student) return;
    setBusy(true);
    try {
      await downloadHorario({
        student: {
          name: student.name,
          grade: student.grade,
          section: student.section,
        },
        shift: student.shift ?? "",
        periods: [...periods],
        recessLabel: RECESS_TIME[student.shift ?? "Mañana"] ?? RECESS_TIME.Mañana,
        schedule,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el horario");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Cargando horario..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      {/* Header — el turno sale del alumno, no está escrito a mano */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">Horario</h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            {student?.shift ? `Turno ${student.shift.toLowerCase()} · ` : ""}
            {dayRange} · {SCHOOL_YEAR_LABEL}
          </p>
          {students.length > 0 && (
            <p className="mt-1 text-xs text-on-surface-variant">
              El PDF sale en hoja horizontal A4, listo para imprimir.
            </p>
          )}
        </div>
        {students.length > 0 && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy || !student}
            className={cn(honorLinkClass, "disabled:opacity-60")}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Descargar horario PDF
          </button>
        )}
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && scheduleLoading && Object.keys(schedule).length === 0 && (
        <p className="text-sm text-on-surface-variant">Cargando horario…</p>
      )}

      {students.length > 0 && (
        <>
          {todayName && SCHEDULE_DAYS.includes(todayName as (typeof SCHEDULE_DAYS)[number]) && (
            <section className={cn(paperCardClass, "p-5")}>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">
                Hoy, {todayName}
              </h2>
              <ol className="mt-4 space-y-2">
                {periods.map((period, pi) => {
                  const slot = schedule[todayName]?.[pi] ?? null;
                  return (
                    <li key={period}>
                      {pi === 3 && (
                        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          Recreo · {RECESS_TIME[student?.shift ?? "Mañana"]}
                        </p>
                      )}
                      <div className="flex items-baseline gap-3">
                        <span className="w-28 shrink-0 font-mono text-xs tabular-nums text-on-surface-variant">
                          {period}
                        </span>
                        {slot ? (
                          <span className="text-sm font-semibold text-on-surface">{slot.subject}</span>
                        ) : (
                          <span className="text-sm text-on-surface-variant">—</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
          {todayName && !SCHEDULE_DAYS.includes(todayName as (typeof SCHEDULE_DAYS)[number]) && (
            <p className="text-sm text-on-surface-variant">
              Hoy no hay clase. El horario de la semana:
            </p>
          )}

          {/* Schedule grid */}
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Header row */}
                <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-primary">
                  <div className="p-3 text-xs font-semibold text-white/80 flex items-center justify-center">
                    Período
                  </div>
                  {SCHEDULE_DAYS.map((day) => {
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
                          <span className="block text-xs font-bold tracking-wide text-accent mt-0.5">
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
                        <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground text-center leading-tight">
                          {period}
                        </span>
                      </div>

                      {/* Cells per day */}
                      {SCHEDULE_DAYS.map((day) => {
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
                                <p className="text-xs opacity-80 leading-tight">{slot.teacher}</p>
                                <p className="text-xs opacity-70 leading-tight hidden md:block">
                                  {slot.room}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-200 p-2 h-full flex items-center justify-center min-h-[52px]">
                                <span className="text-xs text-muted-foreground">—</span>
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
