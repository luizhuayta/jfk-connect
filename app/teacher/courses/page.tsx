"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, BookOpen, MapPin, ChevronRight, ChevronDown, ChevronUp,
  BarChart3, CheckCircle2, AlertCircle,
} from "lucide-react";
import { levelFromScore, levelBadgeClass } from "@/lib/grades/scale";
import { areaColor } from "@/lib/curriculum/colors";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses, type TeacherCourse } from "@/components/teacher/useTeacherCourses";

type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number;
};

// ─── Paleta unificada con Dashboard ──────────────────────────────────────────
const ICON_COLORS = {
  academic: { bg: "bg-[#1E2A5E]/10", text: "text-[#1E2A5E]" },
  people:   { bg: "bg-purple-50",    text: "text-purple-600" },
  progress: { bg: "bg-emerald-50",   text: "text-emerald-600" },
  gold:     { bg: "bg-amber-50",     text: "text-amber-600" },
  info:     { bg: "bg-blue-50",      text: "text-blue-600" },
};

// ─── Color condicional unificado (mismo criterio que Dashboard) ───────────────
function avgColor(avg: number | null): string {
  if (avg === null) return "text-gray-400";
  if (avg >= 15) return "text-emerald-600";
  if (avg >= 11) return "text-amber-600";
  return "text-red-500";
}

function rateColor(rate: number | null): string {
  if (rate === null) return "text-gray-400";
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 75) return "text-amber-600";
  return "text-red-500";
}

function avgBorderColor(avg: number | null): string {
  if (avg === null) return "border-l-gray-300";
  if (avg >= 15) return "border-l-emerald-500";
  if (avg >= 11) return "border-l-amber-500";
  return "border-l-red-500";
}

// Promedio de valores no nulos; null si ninguno tiene dato.
function avgOf(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n !== null);
  return vals.length ? vals.reduce((s, n) => s + n, 0) / vals.length : null;
}

export default function CoursesPage() {
  const { courses, loading, error, reload } = useTeacherCourses();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, CourseStudent[]>>({});

  const toggleExpand = async (courseId: string) => {
    if (expandedId === courseId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(courseId);
    if (!studentsMap[courseId]) {
      try {
        const r = await fetch(`/api/teacher/courses/${courseId}/students`);
        const data = await r.json();
        if (data.ok) setStudentsMap((prev) => ({ ...prev, [courseId]: data.students }));
      } catch {
        // silencioso
      }
    }
  };

  // ─── Agrupar cursos por subject (punto 1) ──────────────────────────────────
  const groupedCourses = useMemo(() => {
    const groups: Record<string, TeacherCourse[]> = {};
    for (const c of courses) {
      (groups[c.subject] ??= []).push(c);
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [courses]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(subject: string) {
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(subject) ? n.delete(subject) : n.add(subject);
      return n;
    });
  }

  const totalStudents = courses.reduce((s, c) => s + c.studentsTotal, 0);
  const globalAvg = avgOf(courses.map((c) => c.avgGrade));
  const globalAttendanceRaw = avgOf(courses.map((c) => c.attendanceRate));
  const globalAttendance = globalAttendanceRaw === null ? null : Math.round(globalAttendanceRaw);

  // ─── KPI: notas pendientes del bimestre actual (punto 5) ───────────────────
  // Derivado de los datos ya cargados: cursos con inProgress = true y !hasData
  const pendingGradesCount = courses.filter((c) => {
    const b = c.bimesters?.[String(c.currentBimester)];
    return b?.inProgress && !b?.hasData;
  }).length;

  if (loading) {
    return <LoadingState label="Cargando cursos..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Mis Cursos</h1>
        <p className="text-muted-foreground mt-1">
          Año Lectivo 2026 · {groupedCourses.length} asignaturas · {courses.length} secciones
        </p>
      </div>

      {/* Summary stats — paleta unificada con Dashboard (punto 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Cursos asignados — académico = azul */}
        <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-[#1E2A5E]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${ICON_COLORS.academic.bg} shrink-0`}>
              <BookOpen className={`h-5 w-5 ${ICON_COLORS.academic.text}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{courses.length}</p>
              <p className="text-xs text-muted-foreground">Secciones asignadas</p>
            </div>
          </CardContent>
        </Card>
        {/* Total alumnos — personas = morado */}
        <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-purple-500">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${ICON_COLORS.people.bg} shrink-0`}>
              <Users className={`h-5 w-5 ${ICON_COLORS.people.text}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total alumnos</p>
            </div>
          </CardContent>
        </Card>
        {/* Notas pendientes — progreso = verde (punto 5: reemplaza "Hrs/semana") */}
        <Card className={`border-none shadow-sm rounded-xl border-l-4 ${pendingGradesCount > 0 ? "border-l-amber-500" : "border-l-emerald-500"}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${pendingGradesCount > 0 ? "bg-amber-50" : ICON_COLORS.progress.bg} shrink-0`}>
              {pendingGradesCount > 0
                ? <AlertCircle className="h-5 w-5 text-amber-600" />
                : <CheckCircle2 className={`h-5 w-5 ${ICON_COLORS.progress.text}`} />}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{pendingGradesCount}</p>
              <p className="text-xs text-muted-foreground">Notas pendientes (B{courses[0]?.currentBimester ?? 2})</p>
            </div>
          </CardContent>
        </Card>
        {/* Promedio global — progreso = verde, con color condicional (punto 3) */}
        <Card className={`border-none shadow-sm rounded-xl border-l-4 ${avgBorderColor(globalAvg)}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${ICON_COLORS.progress.bg} shrink-0`}>
              <BarChart3 className={`h-5 w-5 ${ICON_COLORS.progress.text}`} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#0F172A]">{globalAvg !== null ? globalAvg.toFixed(1) : "—"}</p>
                {levelFromScore(globalAvg) && (
                  <Badge className={`text-xs font-bold ${levelBadgeClass(levelFromScore(globalAvg))}`}>
                    {levelFromScore(globalAvg)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Promedio global · {globalAttendance !== null ? `${globalAttendance}%` : "—"} asistencia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course cards — agrupadas por subject (punto 1) */}
      <div className="space-y-4">
        {groupedCourses.map(([subject, subjectCourses]) => {
          const dot = areaColor(subject).dot;
          const isCollapsed = collapsedGroups.has(subject);
          const subjectAvg = avgOf(subjectCourses.map((c) => c.avgGrade));
          const subjectAttendanceRaw = avgOf(subjectCourses.map((c) => c.attendanceRate));
          const subjectAttendance = subjectAttendanceRaw === null ? null : Math.round(subjectAttendanceRaw);

          return (
            <Card key={subject} className="border-none shadow-sm rounded-xl overflow-hidden">
              {/* Group header — colapsable */}
              <button
                onClick={() => toggleGroup(subject)}
                className="w-full text-left bg-gray-50/80 hover:bg-gray-50 transition-colors px-6 py-4 border-b border-gray-100"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${dot} shrink-0`} />
                    <h2 className="text-base font-bold text-[#0F172A]">{subject}</h2>
                    <Badge className="text-xs font-bold bg-gray-100 text-gray-600 border-0 hover:bg-gray-100">
                      {subjectCourses.length} {subjectCourses.length === 1 ? "sección" : "secciones"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${avgColor(subjectAvg)}`}>{subjectAvg !== null ? subjectAvg.toFixed(1) : "—"}</span>
                      <span className="text-xs text-muted-foreground ml-1">prom</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${rateColor(subjectAttendance)}`}>{subjectAttendance !== null ? `${subjectAttendance}%` : "—"}</span>
                      <span className="text-xs text-muted-foreground ml-1">asist</span>
                    </div>
                    {isCollapsed
                      ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      : <ChevronUp className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {/* Sections dentro del grupo */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {subjectCourses.map((course) => {
                    const students = studentsMap[course.id] ?? [];
                    const b1 = course.bimesters["1"];
                    const isExpanded = expandedId === course.id;
                    const currentB = course.bimesters[String(course.currentBimester)];
                    const isCurrentBimesterClosed = currentB?.hasData && !currentB?.inProgress;
                    const regBtnText = isCurrentBimesterClosed ? "Ver notas" : "Registrar Notas";

                    return (
                      <div key={course.id} className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          {/* Left: sección info */}
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`text-xs font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10`}>
                                  {course.grade} &quot;{course.section}&quot;
                                </Badge>
                                <Badge className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-100 border-0">
                                  B{course.currentBimester}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {course.studentsTotal}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {course.room}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: metrics con color condicional (punto 3) */}
                          <div className="flex items-center gap-5 flex-wrap">
                            <div className="text-center">
                              <p className={`text-xl font-bold ${avgColor(course.avgGrade)}`}>
                                {course.avgGrade !== null ? course.avgGrade.toFixed(1) : "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Promedio</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-xl font-bold ${rateColor(course.attendanceRate)}`}>{course.attendanceRate !== null ? `${course.attendanceRate}%` : "—"}</p>
                              <p className="text-[10px] text-muted-foreground">Asistencia</p>
                            </div>
                            <div className="flex gap-2">
                              {/* Punto 4: botón condicional según estado del bimestre */}
                              <Link href="/teacher/grades">
                                <Button
                                  className={`font-semibold rounded-lg h-9 px-4 text-sm ${
                                    isCurrentBimesterClosed
                                      ? "bg-gray-100 text-[#0F172A] hover:bg-gray-200"
                                      : "bg-[#F4C15C] text-[#1E2A5E] hover:bg-[#e0b04f]"
                                  }`}
                                >
                                  {regBtnText}
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                onClick={() => toggleExpand(course.id)}
                                className="rounded-lg border-gray-200 text-[#0F172A] h-9 px-3 hover:bg-gray-50"
                              >
                                {isExpanded ? "Ocultar" : "Ver alumnos"}
                                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Bimestres — chips compactos en una fila (punto 2) */}
                        <div className="flex gap-2 mt-3">
                          {["1", "2", "3", "4"].map((b, i) => {
                            const stat = course.bimesters[b];
                            const hasData = stat?.hasData ?? false;
                            const inProgress = stat?.inProgress ?? false;
                            const avg = stat?.avg ?? 0;
                            const isActive = course.currentBimester === Number(b);

                            return (
                              <div
                                key={b}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${
                                  hasData
                                    ? "bg-white border-gray-200"
                                    : inProgress
                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                    : "bg-gray-50 border-gray-100 text-muted-foreground"
                                }`}
                              >
                                <span className="font-bold">B{i + 1}</span>
                                {isActive && (
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" title="Bimestre activo" />
                                )}
                                {hasData ? (
                                  <span className={avgColor(avg)}>{avg.toFixed(1)}</span>
                                ) : inProgress ? (
                                  <span>En curso</span>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Expanded student list */}
                        {isExpanded && (
                          <div className="mt-4 bg-gray-50/50 rounded-xl px-4 py-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                                Lista de alumnos — {students.length} registrados
                              </p>
                              {b1 && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-100">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {b1.approved} aprobados B1
                                </Badge>
                              )}
                            </div>
                            {students.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                No hay alumnos registrados en esta sección.
                              </p>
                            ) : (
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
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}