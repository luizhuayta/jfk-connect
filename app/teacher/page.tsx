"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen, Users, Clock, BarChart3, ChevronRight,
  MapPin, CalendarDays, Bell, TrendingUp, CheckCircle2,
} from "lucide-react";
import {
  mockUserTeacher,
  mockTeacherCourses,
  mockTeacherSchedule,
  mockClassSessions,
  mockMaterials,
  DAYS,
} from "@/data/mock";

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  "Matemáticas":      { bg: "bg-blue-50",   text: "text-blue-700"   },
  "Lengua Castellana":{ bg: "bg-purple-50", text: "text-purple-700" },
  "Historia":         { bg: "bg-amber-50",  text: "text-amber-700"  },
};

function todaySchedule() {
  const name = new Date().toLocaleDateString("es-PE", { weekday: "long" });
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  const isWeekday = DAYS.includes(cap);
  const slots = isWeekday ? (mockTeacherSchedule[cap] ?? []).filter(Boolean) : [];
  return { day: cap, slots };
}

function recentActivity() {
  const sorted = [...mockClassSessions].sort((a, b) => b.date.localeCompare(a.date));
  const top4 = sorted.slice(0, 4);
  return top4.map((s) => {
    const course = mockTeacherCourses.find((c) => c.id === s.courseId);
    const A = s.records.filter((r) => r.status === "A").length;
    const total = s.records.length;
    return {
      date: s.date,
      text: `Asistencia registrada · ${course?.subject ?? ""} ${course?.grade ?? ""} "${course?.section ?? ""}" · ${A}/${total} presentes`,
    };
  });
}

function fmtDateLong(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    day: "numeric", month: "short",
  });
}

const today = todaySchedule();
const activity = recentActivity();

const totalStudents = mockTeacherCourses.reduce((s, c) => s + c.studentsTotal, 0);
const totalHours = mockTeacherCourses.reduce((s, c) => s + c.hoursPerWeek, 0);
const globalAvg = mockTeacherCourses.reduce((s, c) => s + c.avgGrade, 0) / mockTeacherCourses.length;
const globalAttendance = Math.round(
  mockTeacherCourses.reduce((s, c) => s + c.attendanceRate, 0) / mockTeacherCourses.length
);
const recentMaterials = [...mockMaterials].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 3);

export default function TeacherDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-[#1E2A5E] px-8 py-7 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenido, {mockUserTeacher.name}
          </h1>
          <p className="text-white/60 mt-1 text-sm capitalize" suppressHydrationWarning>
            {fmtDateLong(new Date().toISOString().slice(0, 10))} · Turno mañana
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher/attendance">
            <Button className="bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-xl h-10 px-5">
              Tomar asistencia
            </Button>
          </Link>
          <Link href="/teacher/grades">
            <Button variant="outline" className="border-white/20 text-white bg-white/10 hover:bg-white/20 rounded-xl h-10 px-5 font-semibold">
              Registrar notas
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Cursos asignados", value: mockTeacherCourses.length, icon: BookOpen,  bg: "bg-blue-50",    text: "text-[#2563EB]"    },
          { label: "Total alumnos",    value: totalStudents,             icon: Users,     bg: "bg-emerald-50", text: "text-emerald-600"  },
          { label: "Horas / semana",   value: totalHours,                icon: Clock,     bg: "bg-amber-50",   text: "text-amber-600"    },
          { label: "Promedio global",  value: globalAvg.toFixed(1),      icon: BarChart3, bg: "bg-purple-50",  text: "text-purple-600"   },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid: courses + today */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A]">Mis cursos</h2>
            <Link href="/teacher/courses" className="text-xs text-[#2563EB] font-semibold hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockTeacherCourses.map((c) => {
              const color = SUBJECT_COLORS[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
              return (
                <Card key={c.id} className="border-none shadow-sm rounded-xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.bg} shrink-0`}>
                          <BookOpen className={`h-4 w-4 ${color.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#0F172A]">{c.subject}</p>
                            <Badge className={`text-[10px] font-bold border-0 ${color.bg} ${color.text} hover:${color.bg}`}>
                              {c.grade} &quot;{c.section}&quot;
                            </Badge>
                          </div>
                          <div className="flex gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="h-3 w-3" />{c.studentsTotal} alumnos
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />{c.room}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-center">
                          <p className={`text-lg font-bold ${c.avgGrade >= 14 ? "text-emerald-600" : "text-amber-600"}`}>
                            {c.avgGrade.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Promedio</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-[#2563EB]">{c.attendanceRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Asistencia</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Today's schedule */}
        <Card className="border-none shadow-sm rounded-xl self-start">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#2563EB]" />
              Clases de hoy
            </h2>
            {today.slots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin clases programadas hoy</p>
            ) : (
              <div className="space-y-2">
                {today.slots.map((slot, i) => {
                  if (!slot) return null;
                  const color = SUBJECT_COLORS[slot.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
                  return (
                    <div key={i} className={`rounded-xl p-3 flex items-start gap-3 ${color.bg}`}>
                      <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${color.text.replace("text-", "bg-").replace("-700", "-500")}`} />
                      <div>
                        <p className={`text-xs font-bold ${color.text}`}>{slot.subject}</p>
                        <p className={`text-[10px] ${color.text} opacity-70`}>
                          {slot.grade} &quot;{slot.section}&quot; · {slot.room} · {slot.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/teacher/schedule">
              <Button variant="outline" className="w-full border-gray-200 text-[#0F172A] rounded-xl h-9 text-sm font-semibold mt-1">
                Ver horario completo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid: activity + materials + attendance */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Actividad reciente
            </h2>
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="border-l-2 border-gray-100 pl-3">
                  <p className="text-[10px] text-muted-foreground capitalize">{fmtDateShort(a.date)}</p>
                  <p className="text-xs text-[#0F172A] leading-snug mt-0.5">{a.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent materials */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#2563EB]" />
                Últimos materiales
              </h2>
              <Link href="/teacher/materials" className="text-[10px] text-[#2563EB] font-semibold hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="space-y-2">
              {recentMaterials.map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-[10px] font-bold text-white bg-[#2563EB] rounded px-1.5 py-0.5 uppercase shrink-0">
                    {m.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.size} · {fmtDateShort(m.uploadedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F4C15C]" />
              Resumen del año
            </h2>
            <div className="space-y-3">
              {mockTeacherCourses.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">{c.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${c.avgGrade >= 14 ? "text-emerald-600" : "text-amber-600"}`}>
                        {c.avgGrade.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">prom.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#2563EB]">{c.attendanceRate}%</p>
                      <p className="text-[10px] text-muted-foreground">asist.</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#64748B]">Global</p>
                <div className="flex gap-5">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#0F172A]">{globalAvg.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">prom.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#0F172A]">{globalAttendance}%</p>
                    <p className="text-[10px] text-muted-foreground">asist.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
