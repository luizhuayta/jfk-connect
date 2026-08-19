"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import StatCard from "@/components/father/StatCard";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  TrendingUp,
  Loader2,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { toLocalISODate } from "@/lib/format";

type AttendanceStatus = "A" | "F" | "T" | "J"; // Asistió · Falta · Tardanza · Justificado

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

// Referencia estable para "sin registros": evita que `records` cambie de
// identidad en cada render y dispare el warning de exhaustive-deps en useMemo.
const EMPTY_RECORDS: AttendanceRecord[] = [];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; plural: string; short: string; dot: string; text: string; bg: string }> = {
  A: { label: "Asistió",     plural: "Asistencias", short: "A", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  F: { label: "Falta",       plural: "Faltas",       short: "F", dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 border-red-200" },
  T: { label: "Tardanza",    plural: "Tardanzas",    short: "T", dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  J: { label: "Justificado", plural: "Justificados", short: "J", dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
};

// Chips para el estado de una justificación enviada por el padre.
const JUST_STATUS: Record<Justification["status"], { label: string; chip: string; dot: string }> = {
  pendiente: { label: "En revisión", chip: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  aprobada:  { label: "Justificado", chip: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  rechazada: { label: "Rechazado",   chip: "bg-red-100 text-red-600 border-red-200",       dot: "bg-red-500" },
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function calendarWeeks(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
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

  // Modal de justificación
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

  // Meses disponibles derivados de los registros reales (sin hardcodear).
  const months = useMemo(
    () => Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort().reverse(),
    [records],
  );

  // Mes activo derivado: el seleccionado si sigue disponible; si no, el más reciente.
  const activeMonth =
    selectedMonth && months.includes(selectedMonth) ? selectedMonth : (months[0] ?? "");

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

  // Conteos del mes y del año (memoizados: antes se recalculaban en cada render).
  const { counts, attendance } = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { A: 0, F: 0, T: 0, J: 0 };
    monthRecords.forEach((r) => c[r.status]++);
    const total = monthRecords.length;
    return {
      counts: c,
      attendance: total ? Math.round(((c.A + c.T + c.J) / total) * 100) : 0,
    };
  }, [monthRecords]);

  const { allCounts, annualAttendance } = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { A: 0, F: 0, T: 0, J: 0 };
    records.forEach((r) => c[r.status]++);
    const total = records.length;
    return {
      allCounts: c,
      annualAttendance: total ? Math.round(((c.A + c.T + c.J) / total) * 100) : 0,
    };
  }, [records]);

  const weeks = hasMonth ? calendarWeeks(year, month) : [];
  const todayISO = toLocalISODate();

  // Faltas (con o sin justificación) del mes, para el panel "Faltas y
  // justificaciones" (la justificación aprobada marca el día como 'J').
  const monthFaltas = monthRecords.filter((r) => r.status === "F" || r.justification);

  const submitJustify = async () => {
    if (!justifyTarget) return;
    if (!justifyReason.trim()) {
      setJustifyError("Escribe el motivo de la justificación.");
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
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">Asistencia</h1>
        <p className="text-muted-foreground mt-1">
          Registro de asistencia — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && (
        <>
          {/* Year summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <StatCard
                icon={TrendingUp}
                value={`${annualAttendance}%`}
                label="Asist. anual"
                tone="primary"
                layout="centered"
              />
            </div>
            {(["A", "F", "T", "J"] as AttendanceStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = s === "A" ? CheckCircle2 : s === "F" ? XCircle : s === "T" ? Clock : FileCheck;
              const tone: "success" | "error" | "warning" | "primary" =
                s === "A" ? "success" : s === "F" ? "error" : s === "T" ? "warning" : "primary";
              return (
                <StatCard
                  key={s}
                  icon={Icon}
                  value={allCounts[s]}
                  label={cfg.plural}
                  tone={tone}
                  layout="centered"
                />
              );
            })}
          </div>

          {/* Month selector + calendar */}
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Month tabs */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold text-foreground">Asistencia mensual</h2>
                {months.length > 0 && (
                  <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 flex-wrap">
                    {months.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        aria-pressed={activeMonth === m}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          activeMonth === m
                            ? "bg-primary text-white"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {new Date(m + "-01T12:00:00").toLocaleDateString("es-PE", {
                          month: "short",
                          year: "numeric",
                        })}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!hasMonth ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aún no hay registros de asistencia para este alumno.
                </div>
              ) : (
                <>
                  {/* Month stats strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(["A", "F", "T", "J"] as AttendanceStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <div key={s} className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                          <p className={`text-2xl font-bold ${cfg.text}`}>{counts[s]}</p>
                          <p className={`text-xs font-medium mt-0.5 ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar grid — min-w garantiza celdas ≥44px (mínimo táctil)
                      incluso en móvil; solo hace scroll horizontal por debajo
                      de ese ancho, igual que la grilla de Horario. */}
                  <div className="overflow-x-auto">
                  <div className="space-y-0.5 min-w-[364px]">
                    {/* Day names header */}
                    <div className="grid grid-cols-7 mb-0.5">
                      {DAY_NAMES.map((d) => (
                        <div
                          key={d}
                          className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground py-1.5"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 gap-0.5">
                        {week.map((day, di) => {
                          if (!day) return <div key={di} />;
                          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const rec = recordByDate.get(dateStr);
                          const status = rec?.status;
                          // El fin de semana solo se atenúa si no hay registro:
                          // si el colegio registró clase un sábado, se muestra.
                          const weekend = isWeekend(year, month, day) && !status;
                          const isToday = dateStr === todayISO;
                          const canJustify = status === "F" && !rec?.justification;
                          const jDot = rec?.justification
                            ? JUST_STATUS[rec.justification.status].dot
                            : "";

                          const cell = (
                            <>
                              <span className={isToday ? "underline decoration-2" : undefined}>{day}</span>
                              {status && (
                                <span
                                  className={`text-[10px] font-bold leading-none mt-0.5 ${STATUS_CONFIG[status].text}`}
                                  aria-hidden
                                >
                                  {STATUS_CONFIG[status].short}
                                </span>
                              )}
                              {rec?.justification && (
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${jDot} mt-0.5`}
                                  aria-hidden
                                />
                              )}
                            </>
                          );

                          const label = status
                            ? `${longDate(dateStr)}: ${STATUS_CONFIG[status].label}${
                                rec?.justification
                                  ? ` · ${JUST_STATUS[rec.justification.status].label}`
                                  : ""
                              }`
                            : longDate(dateStr);

                          if (canJustify && rec) {
                            return (
                              <button
                                key={di}
                                type="button"
                                onClick={() => openJustify(rec)}
                                title={`${label} — toca para justificar`}
                                aria-label={`${label}. Justificar esta falta`}
                                className={`relative flex min-h-11 flex-col items-center justify-center rounded-md aspect-square text-xs font-bold transition-colors cursor-pointer border ring-offset-1 hover:ring-2 hover:ring-red-300 focus-visible:ring-2 focus-visible:ring-red-400 ${STATUS_CONFIG.F.bg} ${STATUS_CONFIG.F.text}`}
                              >
                                {cell}
                              </button>
                            );
                          }

                          return (
                            <div
                              key={di}
                              title={label}
                              className={`relative flex min-h-11 flex-col items-center justify-center rounded-md aspect-square text-xs font-medium transition-colors ${
                                weekend
                                  ? "text-gray-500 bg-gray-50/50"
                                  : status
                                  ? `${STATUS_CONFIG[status].bg} border ${STATUS_CONFIG[status].text} font-bold`
                                  : "text-gray-400 border border-dashed border-gray-200"
                              } ${isToday ? "ring-2 ring-accent" : ""}`}
                            >
                              {cell}
                              {/* `title` no se anuncia de forma confiable en lectores de
                                  pantalla: el estado real del día también queda como
                                  texto accesible aquí. */}
                              <span className="sr-only">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  </div>

                  {monthFaltas.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Las faltas sin justificar están marcadas en rojo: tócalas en el
                      calendario o usa el botón «Justificar» de la lista.
                    </p>
                  )}

                  {/* Faltas y justificaciones */}
                  {monthFaltas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Faltas y justificaciones
                      </p>
                      <div className="space-y-2">
                        {monthFaltas.map((rec) => {
                          const just = rec.justification;
                          return (
                            <div
                              key={rec.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border ${
                                just?.status === "aprobada"
                                  ? "bg-blue-50 border-blue-200"
                                  : just?.status === "rechazada"
                                  ? "bg-red-50 border-red-200"
                                  : "bg-amber-50 border-amber-200"
                              }`}
                            >
                              <FileQuestion
                                aria-hidden
                                className={`h-4 w-4 shrink-0 ${
                                  just?.status === "aprobada"
                                    ? "text-blue-600"
                                    : just?.status === "rechazada"
                                    ? "text-red-500"
                                    : "text-amber-600"
                                }`}
                              />
              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground capitalize leading-tight">
                                  {longDate(rec.date)}
                                </p>
                                {just ? (
                                  <>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      Motivo: {just.reason}
                                    </p>
                                    {just.adminResponse && (
                                      <p className="text-xs mt-0.5">
                                        <span className="font-semibold text-foreground/80">
                                          Respuesta del docente:{" "}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {just.adminResponse}
                                        </span>
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Falta sin justificar
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {just ? (
                                  <Badge className={`text-[11px] font-bold border ${JUST_STATUS[just.status].chip}`}>
                                    {JUST_STATUS[just.status].label}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => openJustify(rec)}
                                    className="bg-primary text-white hover:bg-primary-hover rounded-lg text-xs h-8"
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

                  {/* Attendance bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-primary rounded-xl px-6 py-5">
                    <div>
                      <p className="text-sm text-white/80">Asistencia del mes</p>
                      <p className="text-3xl font-bold text-accent">{attendance}%</p>
                    </div>
                    <Badge
                      className={`font-bold text-sm px-3 py-1 ${
                        attendance >= 90
                          ? "bg-accent text-primary hover:bg-accent"
                          : attendance >= 75
                          ? "bg-amber-300 text-amber-900 hover:bg-amber-300"
                          : "bg-red-500 text-white hover:bg-red-500"
                      }`}
                    >
                      {attendance >= 90 ? "Óptima" : attendance >= 75 ? "Regular" : "Crítica"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status legend */}
          <div className="flex flex-wrap gap-4">
            {(["A", "F", "T", "J"] as AttendanceStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${cfg.dot}`} aria-hidden />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold">{cfg.short}</span> · {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal: justificar falta */}
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

          <p className="text-sm text-muted-foreground capitalize">
            {justifyTarget ? longDate(justifyTarget.date) : ""}
          </p>

          <div>
            <label
              htmlFor="justify-reason"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
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
              className="w-full mt-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {justifyReason.length}/500
            </p>
          </div>

          {justifyError && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {justifyError}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground bg-gray-50 rounded-lg px-3 py-2">
            El docente revisará tu solicitud. Si la aprueba, la falta se marcará como
            justificada en tu registro.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={closeJustify}
              disabled={justifySending}
              className="flex-1 rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitJustify}
              disabled={justifySending || !justifyReason.trim()}
              className="flex-1 bg-primary text-white hover:bg-primary-hover rounded-lg"
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
