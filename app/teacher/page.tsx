"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Users, TrendingUp, Calendar, FileText, ChevronRight, Clock,
  Loader2, AlertCircle, GraduationCap, Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { letterGrade, letterGradeColor } from "@/lib/letter-grade";

type TeacherCourse = {
  id: string;
  subject: string;
  grade: string;
  section: string;
  studentsTotal: number;
  avgGrade: number;
  attendanceRate: number;
  currentBimester: number;
  bimesters: Record<string, { hasData: boolean; inProgress: boolean }>;
};

type ScheduleSlot = {
  time: string;
  subject: string;
  grade: string;
  section: string;
  room: string;
};

// "7:45 - 8:30" → minutos desde medianoche (inicio / fin)
function slotRange(time: string): { start: number; end: number } | null {
  const m = time.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return {
    start: Number(m[1]) * 60 + Number(m[2]),
    end: Number(m[3]) * 60 + Number(m[4]),
  };
}

// ─── Paleta de colores de íconos (criterio unificado) ────────────────────────
// académico = azul, social/personas = morado, progreso = verde, logros = dorado
const ICON_COLORS = {
  academic: { bg: "bg-[#1E2A5E]/10", text: "text-[#1E2A5E]" },    // azul institucional
  people:   { bg: "bg-purple-50",    text: "text-purple-600" },   // morado
  progress: { bg: "bg-emerald-50",   text: "text-emerald-600" },  // verde
  gold:     { bg: "bg-amber-50",     text: "text-amber-600" },    // dorado
  info:     { bg: "bg-blue-50",      text: "text-blue-600" },     // azul claro
};

// ─── Indicador de color condicional para bordes ──────────────────────────────
function rateBorderColor(rate: number): string {
  if (rate >= 90) return "border-l-emerald-500";
  if (rate >= 75) return "border-l-amber-500";
  return "border-l-red-500";
}
function gradeBorderColor(grade: number): string {
  if (grade >= 15) return "border-l-emerald-500";
  if (grade >= 11) return "border-l-amber-500";
  return "border-l-red-500";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function TeacherPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaySlots, setTodaySlots] = useState<(ScheduleSlot | null)[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/teacher/courses");
        const data = await r.json();
        if (data.ok) setCourses(data.courses);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Horario real del docente: extraer solo las clases de hoy
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/teacher/schedule");
        const data = await r.json();
        if (data.ok) {
          const dayName = new Date().toLocaleDateString("es-PE", { weekday: "long" });
          const cap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          setTodaySlots(data.schedule?.[cap] ?? []);
        }
      } finally {
        setScheduleLoading(false);
      }
    })();
  }, []);

  const totalStudents = courses.reduce((s, c) => s + c.studentsTotal, 0);
  const avgGrade = courses.length
    ? courses.reduce((s, c) => s + c.avgGrade, 0) / courses.length
    : 0;
  const attendance = courses.length
    ? Math.round(courses.reduce((s, c) => s + c.attendanceRate, 0) / courses.length)
    : 0;
  const avgLetter = letterGrade(avgGrade);

  // ─── Pendientes de hoy (derivados de los datos ya cargados) ────────────────
  // Cursos con notas pendientes del bimestre actual (inProgress = true)
  const coursesWithPendingGrades = courses.filter((c) => {
    const b = c.bimesters?.[String(c.currentBimester)];
    return b?.inProgress && !b?.hasData;
  });

  // ─── Clases de hoy y próxima clase (horario real del docente) ─────────────
  const todayName = new Date().toLocaleDateString("es-PE", { weekday: "long" });
  const todayCapitalized = todayName.charAt(0).toUpperCase() + todayName.slice(1);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const todayClasses = todaySlots.filter((s): s is ScheduleSlot => s !== null);
  // Próxima clase = la primera cuyo fin aún no pasó (puede estar en curso)
  const nextClass = todayClasses.find((s) => {
    const range = slotRange(s.time);
    return range !== null && range.end > nowMin;
  }) ?? null;
  const isInProgress = (s: ScheduleSlot) => {
    const range = slotRange(s.time);
    return range !== null && range.start <= nowMin && nowMin < range.end;
  };

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">
          {getGreeting()} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes el resumen de tu actividad docente.
        </p>
      </div>

      {/* Stats — 4 tarjetas con indicador de color en borde izquierdo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mis Cursos */}
        <Card className={`border-none shadow-sm rounded-xl border-l-4 ${ICON_COLORS.academic.text.replace("text-", "border-l-").replace("[#1E2A5E]", "[#1E2A5E]")}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Mis Cursos</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_COLORS.academic.bg}`}>
                <BookOpen className={`h-4 w-4 ${ICON_COLORS.academic.text}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-3xl font-bold text-[#0F172A]">{courses.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Activos este bimestre</p>
          </CardContent>
        </Card>

        {/* Total Alumnos */}
        <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Alumnos</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_COLORS.people.bg}`}>
                <Users className={`h-4 w-4 ${ICON_COLORS.people.text}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-3xl font-bold text-[#0F172A]">{totalStudents}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Suma de todos los cursos</p>
          </CardContent>
        </Card>

        {/* Promedio General — con letra A/B/C/D debajo del número */}
        <Card className={`border-none shadow-sm rounded-xl border-l-4 ${gradeBorderColor(avgGrade)}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Promedio General</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_COLORS.progress.bg}`}>
                <TrendingUp className={`h-4 w-4 ${ICON_COLORS.progress.text}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-[#0F172A]">{avgGrade.toFixed(1)}</p>
                {avgLetter && (
                  <Badge className={`text-xs font-bold ${letterGradeColor(avgLetter)}`}>
                    {avgLetter}
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">De 20 puntos</p>
          </CardContent>
        </Card>

        {/* Asistencia */}
        <Card className={`border-none shadow-sm rounded-xl border-l-4 ${rateBorderColor(attendance)}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Asistencia</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ICON_COLORS.gold.bg}`}>
                <Calendar className={`h-4 w-4 ${ICON_COLORS.gold.text}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-[#0F172A]">{attendance}%</p>
                <span className={`text-xs font-bold ${attendance >= 90 ? "text-emerald-600" : attendance >= 75 ? "text-amber-600" : "text-red-500"}`}>
                  {attendance >= 90 ? "Óptima" : attendance >= 75 ? "Regular" : "Crítica"}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Promedio de mis cursos</p>
          </CardContent>
        </Card>
      </div>

      {/* Fila: Pendientes de hoy + Próxima clase */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pendientes de hoy */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-[#0F172A]">Pendientes de hoy</h2>
            </div>
            {/* Notas pendientes del bimestre actual */}
            {coursesWithPendingGrades.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Notas pendientes (B{courses[0]?.currentBimester ?? 2})</p>
                {coursesWithPendingGrades.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push("/teacher/grades")}
                    className="w-full flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 hover:bg-amber-100 transition-colors text-left"
                  >
                    <span className="text-xs font-medium text-amber-900">
                      {c.subject} — {c.grade} &quot;{c.section}&quot;
                    </span>
                    <ChevronRight className="h-3 w-3 text-amber-600" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay notas pendientes del bimestre actual. ✓</p>
            )}
            {/* Asistencia de hoy — acceso directo al registro */}
            <div className="space-y-1.5 pt-2 border-t border-gray-50">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Asistencia de hoy</p>
              <button
                onClick={() => router.push("/teacher/attendance")}
                className="w-full flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-xs font-medium text-[#0F172A]">Registrar o verificar la asistencia de hoy</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Próxima clase / Horario de hoy */}
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1E2A5E]" />
              <h2 className="text-sm font-bold text-[#0F172A]">Clases de hoy — {todayCapitalized}</h2>
            </div>
            {scheduleLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando horario...
              </div>
            ) : todayClasses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tienes clases programadas hoy.</p>
            ) : (
              <div className="space-y-2">
                {/* Próxima clase destacada */}
                {nextClass && (
                  <button
                    onClick={() => router.push("/teacher/schedule")}
                    className="w-full flex items-center gap-3 rounded-xl bg-[#1E2A5E]/5 border border-[#1E2A5E]/10 px-4 py-3 hover:bg-[#1E2A5E]/10 transition-colors text-left"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_COLORS.academic.bg}`}>
                      <GraduationCap className={`h-5 w-5 ${ICON_COLORS.academic.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] truncate">
                        {nextClass.subject} — {nextClass.grade} &quot;{nextClass.section}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isInProgress(nextClass) ? "En curso · " : "Próxima clase · "}
                        {nextClass.time}{nextClass.room ? ` · ${nextClass.room}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )}
                {/* Lista completa del día: pasadas atenuadas, próxima resaltada */}
                <div className="space-y-1">
                  {todayClasses.map((s, i) => {
                    const range = slotRange(s.time);
                    const isPast = range !== null && range.end <= nowMin;
                    const isNext = s === nextClass;
                    return (
                      <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${isNext ? "bg-[#1E2A5E]/5 font-semibold text-[#1E2A5E]" : isPast ? "text-muted-foreground" : "text-[#0F172A]"}`}>
                        <span className="font-mono">{s.time}</span>
                        <span className="truncate ml-2">{s.subject} · {s.grade} &quot;{s.section}&quot;</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas — orden: Asistencia, Registrar Notas, Mis Cursos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Asistencia (primero) */}
        <button onClick={() => router.push("/teacher/attendance")} className="text-left">
          <Card className="border-none shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${ICON_COLORS.gold.bg} flex items-center justify-center`}>
                <Calendar className={`h-6 w-6 ${ICON_COLORS.gold.text}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0F172A]">Asistencia</p>
                <p className="text-xs text-muted-foreground">Registrar asistencia diaria</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
        {/* 2. Registrar Notas */}
        <button onClick={() => router.push("/teacher/grades")} className="text-left">
          <Card className="border-none shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${ICON_COLORS.info.bg} flex items-center justify-center`}>
                <FileText className={`h-6 w-6 ${ICON_COLORS.info.text}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0F172A]">Registrar Notas</p>
                <p className="text-xs text-muted-foreground">Calificaciones por bimestre</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
        {/* 3. Mis Cursos */}
        <button onClick={() => router.push("/teacher/courses")} className="text-left">
          <Card className="border-none shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${ICON_COLORS.academic.bg} flex items-center justify-center`}>
                <BookOpen className={`h-6 w-6 ${ICON_COLORS.academic.text}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0F172A]">Mis Cursos</p>
                <p className="text-xs text-muted-foreground">Ver y gestionar cursos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Información del sistema — banner delgado de una línea */}
      <div className="flex items-center gap-2 rounded-lg bg-[#1E2A5E]/5 border border-[#1E2A5E]/10 px-4 py-2.5">
        <Info className="h-4 w-4 text-[#1E2A5E] shrink-0" />
        <p className="text-xs text-muted-foreground">
          Tu nombre, email y rol se cargan desde la base de datos. Los cambios que haga el administrador se reflejan automáticamente.
        </p>
      </div>
    </div>
  );
}