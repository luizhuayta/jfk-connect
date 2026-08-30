"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { FileQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import WeekStrip from "@/components/father/WeekStrip";
import AttendanceMark from "@/components/father/AttendanceMark";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { toLocalISODate } from "@/lib/format";
import { useIsClient } from "@/lib/useIsClient";
import {
  ATTENDANCE_COUNT_LABEL,
  ATTENDANCE_DAY_LABEL,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/attendance/labels";
import { jornadaHeading, weekdayCapitalized } from "@/lib/attendance/jornada";
import { paperCardClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";

type Justification = {
  status: "pendiente" | "aprobada" | "rechazada";
  reason: string;
  adminResponse: string | null;
};

type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
  justification: Justification | null;
};

const EMPTY_RECORDS: AttendanceRecord[] = [];

const STATUS_TONE: Record<AttendanceStatus, { text: string; bg: string }> = {
  A: { text: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" },
  F: { text: "text-red-800", bg: "bg-red-50 border-red-200" },
  T: { text: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
  J: { text: "text-blue-800", bg: "bg-blue-50 border-blue-200" },
};

const JUST_STATUS: Record<Justification["status"], { label: string; chip: string; dot: string }> = {
  pendiente: { label: "En revisión", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  aprobada: { label: "Justificado", chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  rechazada: { label: "Rechazado", chip: "bg-red-100 text-red-800", dot: "bg-red-500" },
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function calendarWeeks(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  return weeks;
}

function isWeekend(year: number, month: number, day: number) {
  const wd = new Date(year, month - 1, day).getDay();
  return wd === 0 || wd === 6;
}

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function AttendancePage() {
  const {
    students,
    loading,
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
  } = useCachedFatherResource<AttendanceRecord[]>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/attendance",
    field: "records",
    fallback: EMPTY_RECORDS,
    errorMessage: "Error cargando asistencia",
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

  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  const weekdayCap = now ? weekdayCapitalized(now) : "";
  const isSchoolDay = now ? now.getDay() >= 1 && now.getDay() <= 5 : false;
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
    const c: Record<AttendanceStatus, number> = { A: 0, F: 0, T: 0, J: 0 };
    monthRecords.forEach((r) => c[r.status]++);
    return c;
  }, [monthRecords]);

  const allCounts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { A: 0, F: 0, T: 0, J: 0 };
    records.forEach((r) => c[r.status]++);
    return c;
  }, [records]);

  const weeks = hasMonth ? calendarWeeks(year, month) : [];
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
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
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

  if (loading) return <LoadingState label="Cargando asistencia..." />;

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
              <WeekStrip records={records} todayISO={todayISO} />
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

                <div className="overflow-x-auto">
                  <div className="min-w-[364px] space-y-0.5">
                    <div className="mb-0.5 grid grid-cols-7">
                      {DAY_NAMES.map((d) => (
                        <div
                          key={d}
                          className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {weeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 gap-0.5">
                        {week.map((day, di) => {
                          if (!day) return <div key={di} />;
                          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const rec = recordByDate.get(dateStr);
                          const status = rec?.status;
                          const weekend = isWeekend(year, month, day) && !status;
                          const isToday = dateStr === todayISO;
                          const canJustify = status === "F" && !rec?.justification;
                          const jDot = rec?.justification ? JUST_STATUS[rec.justification.status].dot : "";
                          const honorCell = isToday && (status === "A" || status === "J");
                          const faltaToday = isToday && status === "F";

                          const cell = (
                            <>
                              <span className={isToday ? "underline decoration-2" : undefined}>{day}</span>
                              {status && (
                                <span className="mt-0.5" aria-hidden>
                                  <AttendanceMark status={status} className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {rec?.justification && (
                                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", jDot)} aria-hidden />
                              )}
                            </>
                          );

                          const label = status
                            ? `${longDate(dateStr)}: ${ATTENDANCE_DAY_LABEL[status]}${
                                rec?.justification ? ` · ${JUST_STATUS[rec.justification.status].label}` : ""
                              }`
                            : longDate(dateStr);

                          const ring = honorCell
                            ? "ring-2 ring-accent"
                            : faltaToday
                              ? "ring-2 ring-red-400"
                              : isToday
                                ? "ring-2 ring-outline-variant"
                                : "";

                          if (canJustify && rec) {
                            return (
                              <button
                                key={di}
                                type="button"
                                onClick={() => openJustify(rec)}
                                title={`${label} — toque para justificar`}
                                aria-label={`${label}. Justificar esta falta`}
                                className={cn(
                                  "relative flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center rounded-md border text-xs font-bold transition-colors hover:ring-2 hover:ring-red-300 focus-visible:ring-2 focus-visible:ring-red-400",
                                  STATUS_TONE.F.bg,
                                  STATUS_TONE.F.text,
                                  ring,
                                )}
                              >
                                {cell}
                              </button>
                            );
                          }

                          return (
                            <div
                              key={di}
                              title={label}
                              className={cn(
                                "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-md text-xs font-medium",
                                weekend
                                  ? "bg-gray-50/50 text-gray-500"
                                  : status
                                    ? cn("border font-bold", STATUS_TONE[status].bg, STATUS_TONE[status].text)
                                    : "border border-dashed border-gray-200 text-gray-400",
                                ring,
                              )}
                            >
                              {cell}
                              <span className="sr-only">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {ATTENDANCE_STATUSES.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <AttendanceMark status={s} className="h-4 w-4" />
                      <span className="text-xs text-on-surface-variant">{ATTENDANCE_DAY_LABEL[s]}</span>
                    </div>
                  ))}
                </div>

                {monthFaltas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      Faltas y justificaciones
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Las faltas sin justificar están en rojo: tóquelas en el calendario o use
                      «Justificar».
                    </p>
                    <div className="space-y-2">
                      {monthFaltas.map((rec) => {
                        const just = rec.justification;
                        return (
                          <div
                            key={rec.id}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border p-3",
                              just?.status === "aprobada"
                                ? "border-blue-200 bg-blue-50"
                                : just?.status === "rechazada"
                                  ? "border-red-200 bg-red-50"
                                  : "border-amber-200 bg-amber-50",
                            )}
                          >
                            <FileQuestion
                              aria-hidden
                              className={cn(
                                "h-4 w-4 shrink-0",
                                just?.status === "aprobada"
                                  ? "text-blue-700"
                                  : just?.status === "rechazada"
                                    ? "text-red-600"
                                    : "text-amber-700",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold capitalize leading-tight text-on-surface">
                                {longDate(rec.date)}
                              </p>
                              {just ? (
                                <>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                                    Motivo: {just.reason}
                                  </p>
                                  {just.adminResponse && (
                                    <p className="mt-0.5 text-xs">
                                      <span className="font-semibold">Respuesta del docente: </span>
                                      <span className="text-on-surface-variant">{just.adminResponse}</span>
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="mt-0.5 text-xs text-on-surface-variant">
                                  Faltó sin justificar
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {just ? (
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                                    JUST_STATUS[just.status].chip,
                                  )}
                                >
                                  {JUST_STATUS[just.status].label}
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => openJustify(rec)}
                                  className="h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover"
                                >
                                  Justificar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                  <p className="text-2xl font-bold text-on-surface">{allCounts[s]}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{ATTENDANCE_COUNT_LABEL[s]}</p>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <Modal
        open={Boolean(justifyTarget)}
        onClose={closeJustify}
        titleId="justify-title"
        closable={!justifySending}
        className="space-y-4"
      >
        <>
          <div className="flex items-center justify-between">
            <h2 id="justify-title" className="text-xl font-bold text-primary">
              Justificar falta
            </h2>
            <ModalCloseButton onClose={closeJustify} disabled={justifySending} />
          </div>

          <p className="text-sm capitalize text-on-surface-variant">
            {justifyTarget ? longDate(justifyTarget.date) : ""}
          </p>

          <div>
            <label
              htmlFor="justify-reason"
              className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            >
              Motivo de la justificación *
            </label>
            <textarea
              id="justify-reason"
              value={justifyReason}
              onChange={(e) => setJustifyReason(e.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              placeholder="Ej: Inasistencia por cita médica..."
              className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-right text-xs text-on-surface-variant">
              {justifyReason.length}/500
            </p>
          </div>

          {justifyError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {justifyError}
            </p>
          )}

          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
            El docente revisará su solicitud. Si la aprueba, el día se marcará como
            justificado.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={closeJustify}
              disabled={justifySending}
              className="h-11 flex-1 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitJustify}
              disabled={justifySending || !justifyReason.trim()}
              className="h-11 flex-1 rounded-lg bg-primary text-white hover:bg-primary-hover"
            >
              {justifySending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Enviar justificación"
              )}
            </Button>
          </div>
        </>
      </Modal>
    </div>
  );
}
