"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, FileCheck, TrendingUp, Loader2 } from "lucide-react";

type AttendanceStatus = "A" | "F" | "T" | "J"; // Asistió · Falta · Tardanza · Justificado

type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type AttendanceRecord = { date: string; status: AttendanceStatus };

const MONTHS = [
  { label: "Marzo",  value: "2026-03" },
  { label: "Abril",  value: "2026-04" },
  { label: "Mayo",   value: "2026-05" },
];

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; dot: string; text: string; bg: string }> = {
  A: { label: "Asistió",     short: "A", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  F: { label: "Falta",       short: "F", dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 border-red-200" },
  T: { label: "Tardanza",    short: "T", dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  J: { label: "Justificado", short: "J", dot: "bg-blue-400",    text: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
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

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState("2026-05");
  const [recordsCache, setRecordsCache] = useState<Record<string, AttendanceRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/father/attendance?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setRecordsCache((prev) => ({ ...prev, [studentId]: data.records }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando asistencia");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/father/students");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setStudents(data.students);
        if (data.students.length > 0) {
          const firstId = data.students[0].id;
          setActiveStudentId(firstId);
          await loadRecords(firstId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRecords]);

  const handleSelectStudent = (studentId: string) => {
    setActiveStudentId(studentId);
    if (!recordsCache[studentId]) loadRecords(studentId);
  };

  const records = (activeStudentId && recordsCache[activeStudentId]) || [];
  const [year, month] = activeMonth.split("-").map(Number);

  // Records for the selected month
  const monthRecords = records.filter((r) => r.date.startsWith(activeMonth));
  const byDate = Object.fromEntries(monthRecords.map((r) => [r.date, r.status]));

  // Stats for selected month
  const total  = monthRecords.length;
  const counts = { A: 0, F: 0, T: 0, J: 0 };
  monthRecords.forEach((r) => counts[r.status]++);
  const attendance = total ? Math.round(((counts.A + counts.T + counts.J) / total) * 100) : 0;

  // All-year stats
  const allCounts = { A: 0, F: 0, T: 0, J: 0 };
  records.forEach((r) => allCounts[r.status]++);
  const allTotal = records.length;
  const annualAttendance = allTotal
    ? Math.round(((allCounts.A + allCounts.T + allCounts.J) / allTotal) * 100)
    : 0;

  const weeks = calendarWeeks(year, month);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando asistencia...</p>
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
        <h1 className="text-3xl font-bold text-[#1E2A5E]">Asistencia</h1>
        <p className="text-muted-foreground mt-1">
          Registro de asistencia — Año Lectivo 2026
        </p>
      </div>

      {/* Student Selector */}
      <div className="flex gap-3 flex-wrap">
        {students.map((s) => {
          const initials = s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const isActive = activeStudentId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSelectStudent(s.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-[#1E2A5E] bg-[#1E2A5E]/5"
                  : "border-gray-200 bg-white hover:border-[#1E2A5E]/30"
              }`}
            >
              <Avatar className="h-9 w-9 border border-[#F4C15C]/40">
                <AvatarFallback className={`text-xs font-semibold ${isActive ? "bg-[#1E2A5E] text-white" : "bg-[#1E2A5E]/10 text-[#1E2A5E]"}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className={`text-sm font-semibold ${isActive ? "text-[#1E2A5E]" : "text-[#0F172A]"}`}>
                  {s.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.grade} &quot;{s.section}&quot;
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Year summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-none shadow-sm rounded-xl col-span-2 sm:col-span-1 border-l-4 border-l-[#1E2A5E]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-5 w-5 text-[#1E2A5E] mb-1" />
            <p className="text-2xl font-bold text-[#1E2A5E]">{annualAttendance}%</p>
            <p className="text-xs text-muted-foreground">Asist. anual</p>
          </CardContent>
        </Card>
        {(["A", "F", "T", "J"] as AttendanceStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = s === "A" ? CheckCircle2 : s === "F" ? XCircle : s === "T" ? Clock : FileCheck;
          const borderColor = s === "A" ? "border-l-emerald-500" : s === "F" ? "border-l-red-500" : s === "T" ? "border-l-amber-500" : "border-l-blue-400";
          return (
            <Card key={s} className={`border-none shadow-sm rounded-xl border-l-4 ${borderColor}`}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Icon className={`h-5 w-5 mb-1 ${cfg.text}`} />
                <p className={`text-2xl font-bold ${cfg.text}`}>{allCounts[s]}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}s</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Month selector + calendar */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6 space-y-5">
          {/* Month tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-[#0F172A]">Asistencia mensual</h2>
            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
              {MONTHS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setActiveMonth(m.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeMonth === m.value
                      ? "bg-[#1E2A5E] text-white"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month stats strip */}
          <div className="grid grid-cols-4 gap-3">
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

          {/* Calendar grid */}
          <div className="space-y-0.5">
            {/* Day names header */}
            <div className="grid grid-cols-7 mb-0.5">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground py-1.5">
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
                  const status = byDate[dateStr] as AttendanceStatus | undefined;
                  const weekend = isWeekend(year, month, day);

                  return (
                    <div
                      key={di}
                      className={`relative flex flex-col items-center justify-center rounded-md aspect-square text-xs font-medium transition-colors ${
                        weekend
                          ? "text-gray-300 bg-gray-50/50"
                          : status
                          ? `${STATUS_CONFIG[status].bg} border ${STATUS_CONFIG[status].text} font-bold`
                          : "text-gray-400 border border-dashed border-gray-200"
                      }`}
                    >
                      {day}
                      {status && !weekend && (
                        <span className={`text-[8px] font-bold leading-none mt-0.5 ${STATUS_CONFIG[status].text}`}>
                          {STATUS_CONFIG[status].short}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Attendance bar */}
          <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-5">
            <div>
              <p className="text-sm text-white/80">Asistencia del mes</p>
              <p className="text-3xl font-bold text-[#F4C15C]">{attendance}%</p>
            </div>
            <Badge
              className={`font-bold text-sm px-3 py-1 hover:bg-[#F4C15C] ${
                attendance >= 90
                  ? "bg-[#F4C15C] text-[#1E2A5E]"
                  : attendance >= 75
                  ? "bg-amber-400 text-amber-900"
                  : "bg-red-400 text-white"
              }`}
            >
              {attendance >= 90 ? "Óptima" : attendance >= 75 ? "Regular" : "Crítica"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3">
        {(["A", "F", "T", "J"] as AttendanceStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
