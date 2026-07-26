"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { CheckCircle2, XCircle, Clock, Save, CalendarDays, Loader2 } from "lucide-react";

type Status = "A" | "F" | "T";

type TeacherCourse = {
  id: string;
  subject: string;
  grade: string;
  section: string;
  room: string;
  studentsTotal: number;
};

type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number;
};

type SessionSummary = { date: string; a: number; f: number; t: number; j: number; total: number };

const STATUS = {
  A: { label: "Presente",  short: "A", btn: "bg-emerald-500 text-white hover:bg-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  F: { label: "Falta",     short: "F", btn: "bg-red-500 text-white hover:bg-red-600",         text: "text-red-600",    bg: "bg-red-50 border-red-200",         icon: XCircle },
  T: { label: "Tardanza",  short: "T", btn: "bg-amber-500 text-white hover:bg-amber-600",     text: "text-amber-700",  bg: "bg-amber-50 border-amber-200",     icon: Clock },
};

const RECENT_DATES = [
  "2026-05-08", "2026-05-07", "2026-05-06", "2026-05-05", "2026-05-04",
  "2026-04-30", "2026-04-29", "2026-04-28", "2026-04-27",
];

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
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(RECENT_DATES[0]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContext = useCallback(async (courseId: string, date: string) => {
    setLoadingGrid(true);
    try {
      const [stRes, atRes, sumRes] = await Promise.all([
        fetch(`/api/teacher/courses/${courseId}/students`),
        fetch(`/api/teacher/courses/${courseId}/attendance?date=${date}`),
        fetch(`/api/teacher/courses/${courseId}/attendance`),
      ]);
      const st = await stRes.json();
      const at = await atRes.json();
      const sum = await sumRes.json();
      if (!st.ok) throw new Error(st.error);
      if (!at.ok) throw new Error(at.error);
      setStudents(st.students);
      if (sum.ok) setSessions(sum.sessions);
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/teacher/courses");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCourses(data.courses);
        if (data.courses.length > 0) {
          const firstId = data.courses[0].id;
          setActiveCourseId(firstId);
          await loadContext(firstId, RECENT_DATES[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando cursos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadContext]);

  function handleCourse(id: string) {
    setActiveCourseId(id);
    loadContext(id, activeDate);
  }

  function handleDate(d: string) {
    setActiveDate(d);
    if (activeCourseId) loadContext(activeCourseId, d);
  }

  function setAll(status: Status) {
    setRecords(Object.fromEntries(students.map((s) => [s.id, status])));
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

  const course = courses.find((c) => c.id === activeCourseId);

  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      A: vals.filter((v) => v === "A").length,
      F: vals.filter((v) => v === "F").length,
      T: vals.filter((v) => v === "T").length,
      total: vals.length,
    };
  }, [records]);

  const pct = counts.total ? Math.round(((counts.A + counts.T) / counts.total) * 100) : 0;

  const datesWithRecords = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  // History: past sessions for this course
  const history = sessions
    .filter((s) => s.date !== activeDate)
    .map((s) => ({
      date: s.date,
      A: s.a,
      F: s.f,
      T: s.t,
      pct: s.total ? Math.round(((s.a + s.t) / s.total) * 100) : 0,
    }))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando cursos...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600 text-sm">{error}</div>;
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
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" /> Sesiones recientes
        </p>
        <div className="flex gap-2 flex-wrap">
          {RECENT_DATES.map((d) => {
            const hasRecord = datesWithRecords.has(d);
            return (
              <button
                key={d}
                onClick={() => handleDate(d)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  activeDate === d
                    ? "bg-[#1E2A5E] text-white border-[#1E2A5E]"
                    : hasRecord
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-white text-[#64748B] border-gray-200 hover:border-[#1E2A5E]/30"
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
        <CardContent className="p-6 space-y-5">
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
              {(["A", "F", "T"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setAll(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    s === "A" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" :
                    s === "F" ? "border-red-200 text-red-600 hover:bg-red-50" :
                               "border-amber-200 text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  Todos {STATUS[s].label}
                </button>
              ))}
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
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Presentes",  value: counts.A, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { label: "Tardanzas",  value: counts.T, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                  { label: "Faltas",     value: counts.F, cls: "bg-red-50 border-red-200 text-red-600" },
                  { label: "% Asistencia", value: `${pct}%`, cls: "bg-[#1E2A5E]/5 border-[#1E2A5E]/10 text-[#1E2A5E]" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
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
                          className={`transition-colors ${
                            status === "F" ? "bg-red-50/40" :
                            status === "T" ? "bg-amber-50/40" : ""
                          }`}
                        >
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {String(student.order).padStart(2, "0")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                                  {student.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-[#0F172A]">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {(["A", "T", "F"] as Status[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => {
                                    setRecords((prev) => ({ ...prev, [student.id]: s }));
                                    setSaved(false);
                                  }}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                                    status === s
                                      ? STATUS[s].btn
                                      : "border-gray-200 text-gray-400 hover:border-gray-300 bg-white"
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
