"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Save, CalendarDays, Loader2, FileQuestion } from "lucide-react";
import { recentWeekdays, toLocalISODate } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";

type Status = "A" | "F" | "T" | "J";

type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number;
};

type SessionSummary = { date: string; a: number; f: number; t: number; j: number; total: number };

type JustificationItem = {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  date: string;
  reason: string;
  status: "pendiente" | "aprobada" | "rechazada";
  adminResponse: string | null;
};

const STATUS = {
  A: { label: "Presente",   short: "A", btn: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", rowBg: "bg-emerald-50/30", rowBorder: "border-l-emerald-400", icon: CheckCircle2 },
  F: { label: "Falta",      short: "F", btn: "bg-red-500 text-white hover:bg-red-600 shadow-sm",         text: "text-red-600",    bg: "bg-red-50 border-red-200",         rowBg: "bg-red-50/40",    rowBorder: "border-l-red-500",    icon: XCircle },
  T: { label: "Tardanza",   short: "T", btn: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",     text: "text-amber-700",  bg: "bg-amber-50 border-amber-200",     rowBg: "bg-amber-50/40",  rowBorder: "border-l-amber-500",  icon: Clock },
  J: { label: "Justificada", short: "J", btn: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm",      text: "text-blue-700",   bg: "bg-blue-50 border-blue-200",       rowBg: "bg-blue-50/40",   rowBorder: "border-l-blue-400",   icon: FileQuestion },
};

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtDateLong(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function AttendancePage() {
  const recentDates = useMemo(() => recentWeekdays(9), []);
  const { courses, loading, error: coursesError, reload } = useTeacherCourses();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(recentDates[0]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Justificaciones enviadas por los padres para este curso.
  const [justifications, setJustifications] = useState<JustificationItem[]>([]);
  const [justResponse, setJustResponse] = useState<Record<string, string>>({});
  const [justBusy, setJustBusy] = useState<string | null>(null);

  const loadContext = useCallback(async (courseId: string, date: string) => {
    setLoadingGrid(true);
    try {
      const [stRes, atRes, sumRes, justRes] = await Promise.all([
        fetch(`/api/teacher/courses/${courseId}/students`),
        fetch(`/api/teacher/courses/${courseId}/attendance?date=${date}`),
        fetch(`/api/teacher/courses/${courseId}/attendance`),
        fetch(`/api/teacher/courses/${courseId}/justifications`),
      ]);
      const st = await stRes.json();
      const at = await atRes.json();
      const sum = await sumRes.json();
      const just = await justRes.json();
      if (!st.ok) throw new Error(st.error);
      if (!at.ok) throw new Error(at.error);
      setStudents(st.students);
      if (sum.ok) setSessions(sum.sessions);
      if (just.ok) setJustifications(just.justifications);
      const byStudent: Record<string, Status> = {};
      for (const s of st.students) byStudent[s.id] = "A";
      for (const rec of at.records) byStudent[rec.studentId] = rec.status;
      setRecords(byStudent);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando asistencia");
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  // Selecciona el primer curso una sola vez, apenas la lista compartida esté lista.
  useEffect(() => {
    if (initializedRef.current || courses.length === 0) return;
    initializedRef.current = true;
    const firstId = courses[0].id;
    setActiveCourseId(firstId);
    loadContext(firstId, recentDates[0]);
  }, [courses, loadContext, recentDates]);

  const retry = useCallback(async () => {
    setError(null);
    await reload();
    if (activeCourseId) await loadContext(activeCourseId, activeDate);
  }, [reload, activeCourseId, activeDate, loadContext]);

  function handleCourse(id: string) {
    setActiveCourseId(id);
    loadContext(id, activeDate);
  }

  function handleDate(d: string) {
    setActiveDate(d);
    if (activeCourseId) loadContext(activeCourseId, d);
  }

  function setAll(status: Status) {
    // No sobreescribe alumnos con falta ya justificada (J) — eso solo cambia
    // al aprobar/rechazar una justificación o con un clic individual explícito.
    setRecords((prev) =>
      Object.fromEntries(
        students.map((s) => [s.id, prev[s.id] === "J" ? "J" : status]),
      ),
    );
    setSaved(false);
  }

  async function handleSave() {
    if (!activeCourseId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/teacher/courses/${activeCourseId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: activeDate,
          records: Object.entries(records).map(([studentId, status]) => ({ studentId, status })),
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setSaved(true);
      // Refrescar resumen/historial
      const sumRes = await fetch(`/api/teacher/courses/${activeCourseId}/attendance`);
      const sum = await sumRes.json();
      if (sum.ok) setSessions(sum.sessions);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(j: JustificationItem, decision: "aprobar" | "rechazar") {
    if (!activeCourseId) return;
    setJustBusy(j.id);
    try {
      const r = await fetch(`/api/teacher/courses/${activeCourseId}/justifications/${j.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, response: justResponse[j.id] || null }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setJustResponse((prev) => { const next = { ...prev }; delete next[j.id]; return next; });
      // Refrescar grid/sesiones/justificaciones (al aprobar, la falta pasa a J).
      await loadContext(activeCourseId, activeDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al revisar la justificación");
    } finally {
      setJustBusy(null);
    }
  }

  const course = courses.find((c) => c.id === activeCourseId);

  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      A: vals.filter((v) => v === "A").length,
      F: vals.filter((v) => v === "F").length,
      T: vals.filter((v) => v === "T").length,
      J: vals.filter((v) => v === "J").length,
      total: vals.length,
    };
  }, [records]);

  // Presentes + tardanzas + faltas justificadas cuentan como asistencia.
  const pct = counts.total ? Math.round(((counts.A + counts.T + counts.J) / counts.total) * 100) : 0;

  const datesWithRecords = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  // History: past sessions for this course
  const history = sessions
    .filter((s) => s.date !== activeDate)
    .map((s) => ({
      date: s.date,
      A: s.a,
      F: s.f,
      T: s.t,
      J: s.j,
      pct: s.total ? Math.round(((s.a + s.t + s.j) / s.total) * 100) : 0,
    }))
    .slice(0, 5);

  if (loading) {
    return <LoadingState label="Cargando cursos..." />;
  }

  if (error || coursesError) {
    return <ErrorState message={error ?? coursesError ?? ""} onRetry={retry} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Asistencia</h1>
        <p className="text-muted-foreground mt-1">
          Registro de asistencia por sesión de clase
        </p>
      </div>

      {/* Course selector */}
      <div className="flex gap-3 flex-wrap">
        {courses.map((c) => {
          const isActive = activeCourseId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCourse(c.id)}
              className={`px-5 py-3 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? "border-[#2563EB] bg-[#2563EB]/5"
                  : "border-gray-200 bg-white hover:border-[#2563EB]/30"
              }`}
            >
              <p className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                {c.subject}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos
              </p>
            </button>
          );
        })}
      </div>

      {/* Date selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> Sesiones recientes
          </p>
          <input
            type="date"
            value={activeDate}
            max={toLocalISODate()}
            onChange={(e) => e.target.value && handleDate(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-gray-200 text-xs text-[#0F172A]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {recentDates.map((d) => {
            const hasRecord = datesWithRecords.has(d);
            return (
              <button
                key={d}
                onClick={() => handleDate(d)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                  activeDate === d
                    ? "bg-[#1E2A5E] text-white border-[#1E2A5E] shadow-sm"
                    : hasRecord
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-white text-[#64748B] border-gray-200 hover:border-[#1E2A5E]/40"
                }`}
              >
                {fmtDate(d)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Attendance card */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* Session header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {course?.subject} · {course?.grade} &quot;{course?.section}&quot;
              </h2>
              <p className="text-sm text-muted-foreground capitalize mt-0.5">
                {fmtDateLong(activeDate)} · {course?.room}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Marcar todos:</span>
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
                {(["A", "T", "F"] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setAll(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      s === "A" ? "text-emerald-700 hover:bg-emerald-50" :
                      s === "F" ? "text-red-600 hover:bg-red-50" :
                                 "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    {s} · {STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingGrid ? (
            <div className="py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1E2A5E]" />
              <p className="text-sm text-muted-foreground mt-2">Cargando alumnos...</p>
            </div>
          ) : (
            <>
              {/* Stats strip */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "Presentes",  value: counts.A, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { label: "Tardanzas",  value: counts.T, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                  { label: "Faltas",     value: counts.F, cls: "bg-red-50 border-red-200 text-red-600" },
                  { label: "Justificadas", value: counts.J, cls: "bg-blue-50 border-blue-200 text-blue-700" },
                  { label: "% Asistencia", value: `${pct}%`, cls: "bg-[#1E2A5E]/5 border-[#1E2A5E]/10 text-[#1E2A5E]" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.cls}`}>
                    <p className="text-lg font-bold leading-tight">{s.value}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Student list */}
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-[#0F172A] font-semibold text-sm w-10">N°</TableHead>
                      <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const status = records[student.id] ?? "A";
                      const cfg = STATUS[status];
                      const Icon = cfg.icon;
                      return (
                        <TableRow
                          key={student.id}
                          className={`border-l-4 transition-colors ${cfg.rowBg} ${cfg.rowBorder}`}
                        >
                          <TableCell className="text-xs text-muted-foreground font-medium py-2.5">
                            {String(student.order).padStart(2, "0")}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                                  {student.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-[#0F172A]">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
                              {(["A", "T", "F"] as Status[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    setRecords((prev) => ({ ...prev, [student.id]: s }));
                                    setSaved(false);
                                  }}
                                  title={STATUS[s].label}
                                  aria-label={`${STATUS[s].label} — ${student.name}`}
                                  className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                                    status === s
                                      ? STATUS[s].btn
                                      : "text-gray-400 hover:bg-gray-100"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Save */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 gap-2 text-base"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : saved ? (
                  <><CheckCircle2 className="h-5 w-5" /> Asistencia guardada</>
                ) : (
                  <><Save className="h-5 w-5" /> Guardar asistencia — {fmtDate(activeDate)}</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Justificaciones pendientes */}
      {justifications.filter((j) => j.status === "pendiente").length > 0 && (
        <Card className="border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-amber-600" />
              Justificaciones pendientes — {course?.subject} {course?.grade} &quot;{course?.section}&quot;
            </h2>
            <div className="space-y-3">
              {justifications
                .filter((j) => j.status === "pendiente")
                .map((j) => (
                  <div key={j.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{j.studentName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {fmtDateLong(j.date)} · solicitado por {j.parentName}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[11px] font-bold">
                        En revisión
                      </Badge>
                    </div>
                    <p className="text-sm text-[#334155] bg-white rounded-lg border border-amber-100 px-3 py-2">
                      <span className="font-semibold">Motivo: </span>{j.reason}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        value={justResponse[j.id] ?? ""}
                        onChange={(e) => setJustResponse((prev) => ({ ...prev, [j.id]: e.target.value }))}
                        placeholder="Respuesta (opcional)..."
                        className="flex-1 min-w-[160px] h-9 px-3 rounded-lg border border-input bg-white text-sm"
                      />
                      <Button
                        size="sm"
                        disabled={justBusy === j.id}
                        onClick={() => handleReview(j, "aprobar")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg h-9 px-4 text-xs font-bold"
                      >
                        {justBusy === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓ Aprobar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={justBusy === j.id}
                        onClick={() => handleReview(j, "rechazar")}
                        className="rounded-lg h-9 px-4 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50"
                      >
                        ✕ Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      {history.length > 0 && (
        <Card className="border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#2563EB]" />
              Historial reciente — {course?.subject} {course?.grade} &quot;{course?.section}&quot;
            </h2>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-[#0F172A] font-semibold text-sm">Fecha</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Presentes</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Tardanzas</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Faltas</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Justificadas</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Asistencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow
                      key={h.date}
                      className="hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleDate(h.date)}
                    >
                      <TableCell className="text-sm font-medium text-[#0F172A] capitalize">
                        {fmtDateLong(h.date)}
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold text-emerald-600">{h.A}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-amber-600">{h.T}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-red-500">{h.F}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-blue-600">{h.J}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs font-bold border-0 hover:bg-opacity-100 ${
                          h.pct >= 90 ? "bg-emerald-100 text-emerald-700" :
                          h.pct >= 75 ? "bg-amber-100 text-amber-700" :
                                        "bg-red-100 text-red-600"
                        }`}>
                          {h.pct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
