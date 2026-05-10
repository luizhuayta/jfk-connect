"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  mockTeacherCourses,
  mockCourseStudents,
  mockCourseGrades,
} from "@/data/mock";

const SUBJECT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Matemáticas":      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
  "Lengua Castellana": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  "Historia":         { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500"  },
};

function getAvgColor(avg: number) {
  if (avg >= 16) return "text-emerald-600";
  if (avg >= 13) return "text-blue-600";
  return "text-red-500";
}

function bimesterStats(courseId: string, bimester: string) {
  const entries = mockCourseGrades[courseId]?.[bimester] ?? [];
  if (!entries.length) return { avg: 0, approved: 0, failed: 0, total: 0 };
  const complete = entries.filter((e) => e.n3 > 0);
  const avgs = complete.map((e) => (e.n1 + e.n2 + e.n3) / 3);
  const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
  return {
    avg,
    approved: avgs.filter((a) => a >= 11).length,
    failed: avgs.filter((a) => a < 11).length,
    total: complete.length,
  };
}

export default function CoursesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalStudents = mockTeacherCourses.reduce((s, c) => s + c.studentsTotal, 0);
  const totalHours = mockTeacherCourses.reduce((s, c) => s + c.hoursPerWeek, 0);
  const globalAvg =
    mockTeacherCourses.reduce((s, c) => s + c.avgGrade, 0) / mockTeacherCourses.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Mis Cursos</h1>
        <p className="text-muted-foreground mt-1">
          Año Lectivo 2026 · Turno mañana
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Cursos asignados", value: mockTeacherCourses.length,      icon: BookOpen,    color: "text-[#2563EB]", bg: "bg-blue-50" },
          { label: "Total alumnos",    value: totalStudents,                   icon: Users,       color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Hrs / semana",     value: totalHours,                      icon: Clock,       color: "text-amber-600",  bg: "bg-amber-50"   },
          { label: "Promedio global",  value: globalAvg.toFixed(1),            icon: BarChart3,   color: "text-purple-600", bg: "bg-purple-50"  },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Course cards */}
      <div className="space-y-4">
        {mockTeacherCourses.map((course) => {
          const color = SUBJECT_COLORS[course.subject] ?? { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" };
          const students = mockCourseStudents[course.id] ?? [];
          const b1 = bimesterStats(course.id, "Bimestre 1");
          const b2 = bimesterStats(course.id, "Bimestre 2");
          const isExpanded = expandedId === course.id;

          return (
            <Card key={course.id} className="border-none shadow-sm rounded-xl overflow-hidden">
              {/* Main row */}
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: title + info */}
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color.bg} shrink-0`}>
                        <BookOpen className={`h-5 w-5 ${color.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-[#0F172A]">{course.subject}</h2>
                          <Badge className={`text-xs font-bold border-0 ${color.bg} ${color.text} hover:${color.bg}`}>
                            {course.grade} &quot;{course.section}&quot;
                          </Badge>
                          <Badge className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-100 border-0">
                            Bimestre {course.currentBimester}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {course.studentsTotal} alumnos
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {course.room}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {course.hoursPerWeek} hrs/sem
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: metrics */}
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getAvgColor(course.avgGrade)}`}>
                          {course.avgGrade.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">Promedio</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{course.attendanceRate}%</p>
                        <p className="text-xs text-muted-foreground">Asistencia</p>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/teacher/grades">
                          <Button className="bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-9 px-4 text-sm">
                            Registrar Notas
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => setExpandedId(isExpanded ? null : course.id)}
                          className="rounded-lg border-gray-200 text-[#0F172A] h-9 px-3 hover:bg-gray-50"
                        >
                          {isExpanded ? "Ocultar" : "Ver alumnos"}
                          <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bimester mini-stats */}
                  <div className="grid grid-cols-4 gap-3 mt-5">
                    {["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"].map((b, i) => {
                      const entries = mockCourseGrades[course.id]?.[b] ?? [];
                      const hasData = entries.some((e) => e.n3 > 0);
                      const inProgress = entries.some((e) => e.n1 > 0) && !hasData;
                      const avg = hasData
                        ? (() => {
                            const avgs = entries.filter((e) => e.n3 > 0).map((e) => (e.n1 + e.n2 + e.n3) / 3);
                            return avgs.length ? avgs.reduce((a, x) => a + x, 0) / avgs.length : 0;
                          })()
                        : 0;

                      return (
                        <div
                          key={b}
                          className={`rounded-xl p-3 text-center border ${
                            hasData
                              ? "bg-white border-gray-100"
                              : inProgress
                              ? "bg-amber-50 border-amber-100"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <p className="text-xs text-muted-foreground mb-1">B{i + 1}</p>
                          {hasData ? (
                            <p className={`text-lg font-bold ${getAvgColor(avg)}`}>{avg.toFixed(1)}</p>
                          ) : inProgress ? (
                            <p className="text-xs font-semibold text-amber-600">En curso</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded student list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Lista de alumnos — {students.length} registrados
                      </p>
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {b1.approved} aprobados B1
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {students.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E2A5E]/10 text-[#1E2A5E] text-[10px] font-bold shrink-0">
                            {st.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0F172A] truncate">{st.name}</p>
                            <p className="text-[10px] text-muted-foreground">N° {String(st.order).padStart(2, "0")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
