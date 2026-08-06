"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Users, CalendarDays, TrendingUp, Loader2 } from "lucide-react";

type AdminCourse = {
  id: string; subject: string; grade: string; section: string;
  studentsTotal: number; attendanceRate: number;
};
type Student = { id: string; name: string; initials: string; order: number };
type SessionSummary = { date: string; a: number; f: number; t: number; j: number; total: number };

const RECENT_DATES = ["2026-05-08", "2026-05-07", "2026-05-06", "2026-05-05", "2026-05-04", "2026-04-30", "2026-04-29", "2026-04-28", "2026-04-27"];

const STATUS_META = {
  A: { label: "Presente", icon: CheckCircle2, badge: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  F: { label: "Falta", icon: XCircle, badge: "bg-red-50 border-red-200 text-red-600" },
  T: { label: "Tardanza", icon: Clock, badge: "bg-amber-50 border-amber-200 text-amber-700" },
};
const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  "Matemáticas": { bg: "bg-blue-50", text: "text-blue-700" },
  "Lengua Castellana": { bg: "bg-purple-50", text: "text-purple-700" },
  "Historia": { bg: "bg-amber-50", text: "text-amber-700" },
  "Comunicación": { bg: "bg-purple-50", text: "text-purple-700" },
  "Ciencia y Tecnología": { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Inglés": { bg: "bg-cyan-50", text: "text-cyan-700" },
};

function fmtDate(iso: string) { return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" }); }
function fmtDateLong(iso: string) { return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

export default function AdminAttendancePage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(RECENT_DATES[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [courseStats, setCourseStats] = useState<Record<string, { pct: number; faltas: number; sesiones: number }>>({});
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
      const byStudent: Record<string, string> = {};
      for (const r of at.records) byStudent[r.studentId] = r.status;
      setRecords(byStudent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/courses");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCourses(data.courses);
        // Cargar estadísticas por curso (faltas totales, sesiones, %)
        const stats: Record<string, { pct: number; faltas: number; sesiones: number }> = {};
        await Promise.all(data.courses.map(async (c: AdminCourse) => {
          const sumRes = await fetch(`/api/teacher/courses/${c.id}/attendance`);
          const sum = await sumRes.json();
          if (sum.ok) {
            const totA = sum.sessions.reduce((s: number, x: SessionSummary) => s + x.a, 0);
            const totF = sum.sessions.reduce((s: number, x: SessionSummary) => s + x.f, 0);
            const totAll = sum.sessions.reduce((s: number, x: SessionSummary) => s + x.total, 0);
            stats[c.id] = {
              pct: totAll ? Math.round((totA / totAll) * 100) : c.attendanceRate,
              faltas: totF,
              sesiones: sum.sessions.length,
            };
          } else {
            stats[c.id] = { pct: c.attendanceRate, faltas: 0, sesiones: 0 };
          }
        }));
        setCourseStats(stats);
        if (data.courses.length > 0) {
          const firstId = data.courses[0].id;
          setActiveCourseId(firstId);
          await loadContext(firstId, RECENT_DATES[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadContext]);

  function handleCourse(id: string) { setActiveCourseId(id); loadContext(id, activeDate); }
  function handleDate(d: string) { setActiveDate(d); if (activeCourseId) loadContext(activeCourseId, d); }

  const course = courses.find((c) => c.id === activeCourseId);
  const counts = useMemo(() => {
    const vals = Object.values(records);
    return { A: vals.filter((v) => v === "A").length, F: vals.filter((v) => v === "F").length, T: vals.filter((v) => v === "T").length, total: students.length };
  }, [records, students]);
  const pct = counts.total ? Math.round(((counts.A + counts.T) / counts.total) * 100) : 0;
  const datesWithRecords = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const history = sessions.filter((s) => s.date !== activeDate).map((s) => ({ date: s.date, A: s.a, F: s.f, T: s.t, pct: s.total ? Math.round(((s.a + s.t) / s.total) * 100) : 0 })).slice(0, 5);

  if (loading) { return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" /><p className="text-sm text-muted-foreground mt-2">Cargando...</p></div>; }
  if (error) { return <div className="py-16 text-center text-red-600 text-sm">{error}</div>; }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Asistencia</h1>
        <p className="text-muted-foreground mt-1">Seguimiento de asistencia por curso y sesión · Año Lectivo 2026</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {courses.map((c) => {
          const stat = courseStats[c.id] ?? { pct: c.attendanceRate, faltas: 0, sesiones: 0 };
          const color = SUBJECT_COLORS[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
          const isActive = activeCourseId === c.id;
          const borderColor = stat.pct >= 90 ? "border-l-emerald-500" : stat.pct >= 75 ? "border-l-amber-500" : "border-l-red-500";
          return (
            <button key={c.id} onClick={() => handleCourse(c.id)} className={`text-left rounded-xl transition-all ${isActive ? "ring-2 ring-[#2563EB] ring-offset-1" : ""}`}>
              <Card className={`border-none shadow-sm rounded-xl border-l-4 ${borderColor}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.bg} shrink-0`}><Users className={`h-4 w-4 ${color.text}`} /></div>
                    <div className="min-w-0"><p className="text-sm font-bold text-[#0F172A] truncate">{c.subject}</p><p className="text-xs text-muted-foreground">{c.grade} &quot;{c.section}&quot;</p></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center"><p className={`text-lg font-bold ${stat.pct >= 90 ? "text-emerald-600" : stat.pct >= 75 ? "text-amber-600" : "text-red-500"}`}>{stat.pct}%</p><p className="text-[10px] text-muted-foreground">Asist.</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-red-500">{stat.faltas}</p><p className="text-[10px] text-muted-foreground">Faltas</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-[#0F172A]">{stat.sesiones}</p><p className="text-[10px] text-muted-foreground">Sesiones</p></div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Sesiones recientes — {course?.subject} {course?.grade} &quot;{course?.section}&quot;</p>
        <div className="flex gap-1.5 flex-wrap">
          {RECENT_DATES.map((d) => {
            const hasRecord = datesWithRecords.has(d);
            return (
              <button key={d} onClick={() => handleDate(d)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${activeDate === d ? "bg-[#1E2A5E] text-white border-[#1E2A5E]" : hasRecord ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white text-[#64748B] border-gray-200"}`}>{fmtDate(d)}</button>
            );
          })}
        </div>
      </div>

      {Object.keys(records).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Presentes", value: counts.A, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", border: "border-l-4 border-l-emerald-500" },
            { label: "Tardanzas", value: counts.T, cls: "bg-amber-50 border-amber-200 text-amber-700", border: "border-l-4 border-l-amber-500" },
            { label: "Faltas", value: counts.F, cls: "bg-red-50 border-red-200 text-red-600", border: "border-l-4 border-l-red-500" },
            { label: "% Asistencia", value: `${pct}%`, cls: "bg-[#1E2A5E]/5 border-[#1E2A5E]/10 text-[#1E2A5E]", border: "border-l-4 border-l-[#1E2A5E]" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.border} p-2.5 text-center ${s.cls}`}><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] font-medium mt-0.5 uppercase tracking-wide">{s.label}</p></div>
          ))}
        </div>
      )}

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">{course?.subject} · {course?.grade} &quot;{course?.section}&quot;</h2>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{fmtDateLong(activeDate)}</p>
            </div>
            {loadingGrid && <Loader2 className="h-4 w-4 animate-spin text-[#1E2A5E]" />}
            {!loadingGrid && Object.keys(records).length === 0 && <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Sin registro</Badge>}
          </div>
          {!loadingGrid && Object.keys(records).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm pl-5 w-10">N°</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((st) => {
                  const status = (records[st.id] ?? null) as "A" | "F" | "T" | null;
                  const meta = status ? STATUS_META[status] : null;
                  const Icon = meta?.icon;
                  const rowBorder = status === "F" ? "border-l-red-400" : status === "T" ? "border-l-amber-400" : status === "A" ? "border-l-emerald-400" : "border-l-transparent";
                  return (
                    <TableRow key={st.id} className={`hover:bg-gray-50/50 border-l-4 ${rowBorder}`}>
                      <TableCell className="pl-5 text-xs text-muted-foreground font-medium">{String(st.order).padStart(2, "0")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">{st.initials}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium text-[#0F172A]">{st.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {meta && Icon ? <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badge}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#2563EB]" />Historial de sesiones — {course?.subject} {course?.grade} &quot;{course?.section}&quot;</h2>
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
                    <TableRow key={h.date} className={`cursor-pointer hover:bg-gray-50/50 transition-colors ${activeDate === h.date ? "bg-[#1E2A5E]/5" : ""}`} onClick={() => handleDate(h.date)}>
                      <TableCell className="text-sm font-medium text-[#0F172A] capitalize">{fmtDateLong(h.date)}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-emerald-600">{h.A}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-amber-600">{h.T}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-red-500">{h.F}</TableCell>
                      <TableCell className="text-center"><Badge className={`text-xs font-bold border-0 hover:opacity-90 ${h.pct >= 90 ? "bg-emerald-100 text-emerald-700" : h.pct >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{h.pct}%</Badge></TableCell>
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