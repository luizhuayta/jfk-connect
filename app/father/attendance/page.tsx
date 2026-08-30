"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import WeekStrip from "@/components/father/WeekStrip";
import AttendanceMark from "@/components/father/AttendanceMark";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR, SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { toLocalISODate } from "@/lib/format";
import {
  ATTENDANCE_COUNT_LABEL,
  ATTENDANCE_DAY_LABEL,
  ATTENDANCE_STATUSES,
} from "@/lib/attendance/labels";
import { jornadaHeading } from "@/lib/attendance/jornada";
import { useJornadaHoy } from "@/lib/attendance/useJornadaHoy";
import { paperCardClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";
import { readApiJson } from "@/lib/client/api";
import type { AttendanceRecord } from "@/lib/father/types";
import MonthCalendar from "@/components/father/attendance/MonthCalendar";
import FaltasList from "@/components/father/attendance/FaltasList";
import JustifyModal from "@/components/father/attendance/JustifyModal";

const EMPTY_RECORDS: AttendanceRecord[] = [];

export default function AttendancePage() {
  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    reload,
    activeStudentId,
  } = useFatherStudents();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const {
    data: records,
    error,
    handleRetry,
    refresh: refreshRecords,
    loading: recordsLoading,
  } = useCachedFatherResource<AttendanceRecord[]>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/attendance",
    field: "records",
    fallback: EMPTY_RECORDS,
    errorMessage: "Error cargando asistencia",
    extraParams: { year: String(SCHOOL_YEAR) },
  });

  const [justifyTarget, setJustifyTarget] = useState<AttendanceRecord | null>(null);
  const [justifyReason, setJustifyReason] = useState("");
  const [justifySending, setJustifySending] = useState(false);
  const [justifyError, setJustifyError] = useState<string | null>(null);

  const openJustify = (rec: AttendanceRecord) => {
    setJustifyTarget(rec);
    setJustifyReason("");
    setJustifyError(null);
  };

  const closeJustify = useCallback(() => {
    if (justifySending) return;
    setJustifyTarget(null);
  }, [justifySending]);

  const { isClient, weekdayCap, isSchoolDay } = useJornadaHoy();
  const todayISO = toLocalISODate();
  const thisMonth = todayISO.slice(0, 7);

  const months = useMemo(() => {
    const set = new Set(records.map((r) => r.date.slice(0, 7)));
    set.add(thisMonth);
    return Array.from(set).sort().reverse();
  }, [records, thisMonth]);

  const activeMonth =
    selectedMonth && months.includes(selectedMonth) ? selectedMonth : thisMonth;

  const [year, month] = activeMonth.split("-").map(Number);
  const hasMonth = activeMonth.length > 0;

  const monthRecords = useMemo(
    () => (activeMonth ? records.filter((r) => r.date.startsWith(activeMonth)) : EMPTY_RECORDS),
    [records, activeMonth],
  );
  const recordByDate = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    for (const r of monthRecords) m.set(r.date, r);
    return m;
  }, [monthRecords]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { A: 0, F: 0, T: 0, J: 0 };
    monthRecords.forEach((r) => c[r.status]++);
    return c;
  }, [monthRecords]);

  const yearCounts = useMemo(() => {
    const c: Record<string, number> = { A: 0, F: 0, T: 0, J: 0 };
    records.forEach((r) => c[r.status]++);
    return c;
  }, [records]);

  const monthFaltas = monthRecords.filter((r) => r.status === "F" || r.justification);
  const todayRecord = records.find((r) => r.date === todayISO) ?? null;
  const todayStatus = todayRecord?.status ?? null;
  const honorToday = todayStatus === "A" || todayStatus === "J";
  const canJustifyToday = todayStatus === "F" && todayRecord && !todayRecord.justification;

  const jornadaTitle = jornadaHeading({
    isClient,
    isSchoolDay,
    weekdayCap,
    status: todayStatus,
  });

  const submitJustify = async () => {
    if (!justifyTarget) return;
    if (!justifyReason.trim()) {
      setJustifyError("Escriba el motivo de la justificación.");
      return;
    }
    setJustifySending(true);
    setJustifyError(null);
    try {
      const r = await fetch("/api/father/attendance/justify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId: justifyTarget.id, reason: justifyReason.trim() }),
      });
      await readApiJson(r);
      setJustifyTarget(null);
      setJustifyReason("");
      toast.success("Justificación enviada. El docente la revisará.");
      if (activeStudentId) await refreshRecords(activeStudentId);
    } catch (err) {
      setJustifyError(err instanceof Error ? err.message : "Error al enviar la justificación");
    } finally {
      setJustifySending(false);
    }
  };

  if (studentsLoading) return <LoadingState label="Cargando asistencia..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">Asistencia</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          Hoy y el mes — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      <ChildSelector />

      {students.length > 0 && (
        <>
          {recordsLoading && records.length === 0 && (
            <p className="text-sm text-on-surface-variant">Cargando asistencia…</p>
          )}
          <section className={cn(paperCardClass, "p-5 lg:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">{jornadaTitle}</h2>
              {isSchoolDay && honorToday && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
                  ● HOY
                </span>
              )}
            </div>
            {canJustifyToday && todayRecord && (
              <Button
                onClick={() => openJustify(todayRecord)}
                className="mt-4 h-11 rounded-lg bg-primary font-semibold text-white hover:bg-primary-hover"
              >
                Justificar la falta de hoy
              </Button>
            )}
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-on-surface">Esta semana</p>
              <WeekStrip records={records} todayISO={todayISO} loading={recordsLoading} />
            </div>
          </section>

          <section className={cn(paperCardClass, "p-5 lg:p-6 space-y-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-on-surface">El mes</h2>
              {months.length > 0 && (
                <div className="flex flex-wrap gap-1 rounded-lg bg-surface-container-low p-1">
                  {months.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonth(m)}
                      aria-pressed={activeMonth === m}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        activeMonth === m
                          ? "bg-primary text-white"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      {new Date(`${m}-01T12:00:00`).toLocaleDateString("es-PE", {
                        month: "short",
                        year: "numeric",
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!hasMonth ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Aún no hay registros de asistencia para este alumno.
              </p>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  {ATTENDANCE_STATUSES.map((s) => `${counts[s]} ${ATTENDANCE_DAY_LABEL[s].toLowerCase()}`).join(
                    " · ",
                  )}
                </p>

                <MonthCalendar
                  year={year}
                  month={month}
                  recordByDate={recordByDate}
                  todayISO={todayISO}
                  onJustify={openJustify}
                />

                <div className="flex flex-wrap gap-4">
                  {ATTENDANCE_STATUSES.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <AttendanceMark status={s} className="h-4 w-4" />
                      <span className="text-xs text-on-surface-variant">{ATTENDANCE_DAY_LABEL[s]}</span>
                    </div>
                  ))}
                </div>

                <FaltasList records={monthFaltas} onJustify={openJustify} />
              </>
            )}
          </section>

          <details className={cn(paperCardClass, "group")}>
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-on-surface marker:content-none [&::-webkit-details-marker]:hidden">
              Ver el año lectivo
            </summary>
            <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
              {ATTENDANCE_STATUSES.map((s) => (
                <div key={s} className="rounded-xl bg-surface-container-low px-3 py-3 text-center">
                  <p className="text-2xl font-bold text-on-surface">{yearCounts[s]}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{ATTENDANCE_COUNT_LABEL[s]}</p>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <JustifyModal
        target={justifyTarget}
        reason={justifyReason}
        sending={justifySending}
        error={justifyError}
        onReasonChange={setJustifyReason}
        onClose={closeJustify}
        onSubmit={submitJustify}
      />
    </div>
  );
}
