"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, Users, CalendarDays, TrendingUp } from "lucide-react";
import {
  mockTeacherCourses,
  mockCourseStudents,
  mockClassSessions,
} from "@/data/mock";

const RECENT_DATES = [
  "2026-05-08", "2026-05-07", "2026-05-06", "2026-05-05", "2026-05-04",
  "2026-04-30", "2026-04-29", "2026-04-28", "2026-04-27",
];

const STATUS_META = {
  A: { label: "Presente",  icon: CheckCircle2, badge: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  F: { label: "Falta",     icon: XCircle,      badge: "bg-red-50 border-red-200 text-red-600"             },
  T: { label: "Tardanza",  icon: Clock,        badge: "bg-amber-50 border-amber-200 text-amber-700"       },
};

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  "Matemáticas":       { bg: "bg-blue-50",   text: "text-blue-700"   },
  "Lengua Castellana": { bg: "bg-purple-50", text: "text-purple-700" },
  "Historia":          { bg: "bg-amber-50",  text: "text-amber-700"  },
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

export default function AdminAttendancePage() {
  const [activeCourseId, setActiveCourseId] = useState(mockTeacherCourses[0].id);
  const [activeDate, setActiveDate] = useState(RECENT_DATES[0]);

  const course = mockTeacherCourses.find((c) => c.id === activeCourseId)!;
  const students = mockCourseStudents[activeCourseId] ?? [];

  const session = mockClassSessions.find(
    (s) => s.courseId === activeCourseId && s.date === activeDate
  );

  const recordMap = useMemo(() =>
    Object.fromEntries((session?.records ?? []).map((r) => [r.studentId, r.status])),
    [session]
  );

  const counts = useMemo(() => {
    const vals = Object.values(recordMap);
    return {
      A: vals.filter((v) => v === "A").length,
      F: vals.filter((v) => v === "F").length,
      T: vals.filter((v) => v === "T").length,
      total: students.length,
    };
  }, [recordMap, students]);

  const pct = counts.total ? Math.round(((counts.A + counts.T) / counts.total) * 100) : 0;

  // Summary across all sessions for this course
  const courseSummary = useMemo(() => {
    const sessions = mockClassSessions.filter((s) => s.courseId === activeCourseId);
    const totals = { A: 0, F: 0, T: 0, sessions: sessions.length };
    sessions.forEach((s) => {
      s.records.forEach((r) => { totals[r.status]++; });
    });
    const all = totals.A + totals.F + totals.T;
    return { ...totals, pct: all ? Math.round(((totals.A + totals.T) / all) * 100) : 0 };
  }, [activeCourseId]);

  // History rows
  const history = RECENT_DATES.map((date) => {
    const sess = mockClassSessions.find((s) => s.courseId === activeCourseId && s.date === date);
    if (!sess) return null;
    const A = sess.records.filter((r) => r.status === "A").length;
    const F = sess.records.filter((r) => r.status === "F").length;
    const T = sess.records.filter((r) => r.status === "T").length;
    const tot = sess.records.length;
    return { date, A, F, T, pct: tot ? Math.round(((A + T) / tot) * 100) : 0 };
  }).filter(Boolean) as { date: string; A: number; F: number; T: number; pct: number }[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Asistencia</h1>
        <p className="text-muted-foreground mt-1">
          Seguimiento de asistencia por curso y sesión · Año Lectivo 2026
        </p>
      </div>

      {/* Course summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {mockTeacherCourses.map((c) => {
          const sessions = mockClassSessions.filter((s) => s.courseId === c.id);
          const totA = sessions.reduce((s, sess) => s + sess.records.filter((r) => r.status === "A").length, 0);
          const totAll = sessions.reduce((s, sess) => s + sess.records.length, 0);
          const totF = sessions.reduce((s, sess) => s + sess.records.filter((r) => r.status === "F").length, 0);
          const pctGlobal = totAll ? Math.round((totA / totAll) * 100) : 0;
          const color = SUBJECT_COLORS[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
          const isActive = activeCourseId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCourseId(c.id)}
              className={`text-left rounded-xl border-2 transition-all ${
                isActive ? "border-[#2563EB]" : "border-transparent"
              }`}
            >
              <Card className="border-none shadow-sm rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color.bg} shrink-0`}>
                      <Users className={`h-4 w-4 ${color.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{c.subject}</p>
                      <p className="text-xs text-muted-foreground">{c.grade} &quot;{c.section}&quot;</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className={`text-xl font-bold ${pctGlobal >= 90 ? "text-emerald-600" : pctGlobal >= 75 ? "text-amber-600" : "text-red-500"}`}>
                        {pctGlobal}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Asistencia</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-red-500">{totF}</p>
                      <p className="text-[10px] text-muted-foreground">Faltas total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-[#0F172A]">{sessions.length}</p>
                      <p className="text-[10px] text-muted-foreground">Sesiones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Date selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" /> Sesiones recientes — {course.subject} {course.grade} &quot;{course.section}&quot;
        </p>
        <div className="flex gap-2 flex-wrap">
          {RECENT_DATES.map((d) => {
            const hasRecord = mockClassSessions.some(
              (s) => s.courseId === activeCourseId && s.date === d
            );
            return (
              <button
                key={d}
                onClick={() => setActiveDate(d)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  activeDate === d
                    ? "bg-[#1E2A5E] text-white border-[#1E2A5E]"
                    : hasRecord
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-white text-[#64748B] border-gray-200"
                }`}
              >
                {fmtDate(d)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session stats strip */}
      {session && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Presentes",   value: counts.A,   cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "Tardanzas",   value: counts.T,   cls: "bg-amber-50 border-amber-200 text-amber-700"       },
            { label: "Faltas",      value: counts.F,   cls: "bg-red-50 border-red-200 text-red-600"             },
            { label: "% Asistencia",value: `${pct}%`,  cls: "bg-[#1E2A5E]/5 border-[#1E2A5E]/10 text-[#1E2A5E]" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Student attendance table (read-only) */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {course.subject} · {course.grade} &quot;{course.section}&quot;
              </h2>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{fmtDateLong(activeDate)}</p>
            </div>
            {!session && (
              <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Sin registro</Badge>
            )}
          </div>
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
                const status = (recordMap[st.id] ?? null) as "A" | "F" | "T" | null;
                const meta = status ? STATUS_META[status] : null;
                const Icon = meta?.icon;
                return (
                  <TableRow
                    key={st.id}
                    className={`hover:bg-gray-50/50 ${
                      status === "F" ? "bg-red-50/30" :
                      status === "T" ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <TableCell className="pl-5 text-xs text-muted-foreground font-medium">
                      {String(st.order).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                            {st.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-[#0F172A]">{st.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {meta && Icon ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badge}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History table */}
      {history.length > 0 && (
        <Card className="border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#2563EB]" />
              Historial de sesiones — {course.subject} {course.grade} &quot;{course.section}&quot;
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
                      className={`cursor-pointer hover:bg-gray-50/50 transition-colors ${activeDate === h.date ? "bg-[#1E2A5E]/5" : ""}`}
                      onClick={() => setActiveDate(h.date)}
                    >
                      <TableCell className="text-sm font-medium text-[#0F172A] capitalize">
                        {fmtDateLong(h.date)}
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold text-emerald-600">{h.A}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-amber-600">{h.T}</TableCell>
                      <TableCell className="text-center text-sm font-semibold text-red-500">{h.F}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs font-bold border-0 hover:opacity-90 ${
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
