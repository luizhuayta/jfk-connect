"use client";

import { useState, useEffect, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Clock } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";

type TeacherSlot = {
  time: string;
  subject: string;
  grade: string;
  section: string;
  room: string;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05",
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
];

// Mismo catálogo de materias/colores que app/teacher/courses/page.tsx (SUBJECT_DOT),
// expandido a bg/text/border para las celdas del horario.
const SUBJECT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Matemáticas":          { bg: "bg-blue-50",    text: "text-blue-800",    border: "border-blue-200",    dot: "bg-blue-500" },
  "Comunicación":         { bg: "bg-purple-50",  text: "text-purple-800",  border: "border-purple-200",  dot: "bg-purple-500" },
  "Ciencia y Tecnología": { bg: "bg-cyan-50",    text: "text-cyan-800",    border: "border-cyan-200",    dot: "bg-cyan-500" },
  "Cívica":               { bg: "bg-rose-50",    text: "text-rose-800",    border: "border-rose-200",    dot: "bg-rose-500" },
  "Religión":             { bg: "bg-violet-50",  text: "text-violet-800",  border: "border-violet-200",  dot: "bg-violet-500" },
  "Arte":                 { bg: "bg-pink-50",    text: "text-pink-800",    border: "border-pink-200",    dot: "bg-pink-500" },
  "Educación Física":     { bg: "bg-lime-50",    text: "text-lime-800",    border: "border-lime-200",    dot: "bg-lime-500" },
  "EPT":                  { bg: "bg-orange-50",  text: "text-orange-800",  border: "border-orange-200",  dot: "bg-orange-500" },
  "Tutoría":              { bg: "bg-slate-50",   text: "text-slate-800",   border: "border-slate-200",   dot: "bg-slate-500" },
  "Inglés":               { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  "HGE":                  { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200",   dot: "bg-amber-500" },
  "DPCC":                 { bg: "bg-teal-50",    text: "text-teal-800",    border: "border-teal-200",    dot: "bg-teal-500" },
};

const DAY_SHORT: Record<string, string> = {
  "Lunes": "Lun", "Martes": "Mar", "Miércoles": "Mié",
  "Jueves": "Jue", "Viernes": "Vie",
};

const todayName = new Date().toLocaleDateString("es-PE", { weekday: "long" });
const todayCapitalized = todayName.charAt(0).toUpperCase() + todayName.slice(1);

export default function SchedulePage() {
  const { courses, loading: coursesLoading, error: coursesError, reload } = useTeacherCourses();
  const [schedule, setSchedule] = useState<Record<string, (TeacherSlot | null)[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const schRes = await fetch("/api/teacher/schedule");
      const sch = await schRes.json();
      if (!sch.ok) throw new Error(sch.error);
      setSchedule(sch.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando horario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  // Today's classes
  const todaySlots = (schedule[todayCapitalized] ?? []).filter(Boolean);

  // Weekly totals
  const totalPeriods = Object.values(schedule)
    .flatMap((day) => day)
    .filter(Boolean).length;

  const totalHours = courses.reduce((s, c) => s + c.hoursPerWeek, 0);

  if (loading || coursesLoading) {
    return <LoadingState label="Cargando horario..." />;
  }

  if (error || coursesError) {
    return (
      <ErrorState
        message={error ?? coursesError ?? ""}
        onRetry={async () => {
          setError(null);
          await Promise.all([load(), reload()]);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Mi Horario</h1>
        <p className="text-muted-foreground mt-1">
          Turno mañana · 7:45 – 13:20 · Año Lectivo 2026
        </p>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Períodos / semana", value: totalPeriods, icon: Clock,  bg: "bg-blue-50",   text: "text-[#2563EB]" },
          { label: "Horas pedagógicas", value: totalHours,   icon: Clock,  bg: "bg-purple-50", text: "text-purple-600" },
          { label: "Secciones a cargo", value: courses.length, icon: Users, bg: "bg-amber-50", text: "text-amber-600" },
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

      {/* Today's classes strip */}
      {todaySlots.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
            Clases de hoy — {todayCapitalized}
          </p>
          <div className="flex gap-3 flex-wrap">
            {todaySlots.map((slot, i) => {
              if (!slot) return null;
              const style = SUBJECT_STYLES[slot.subject] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400" };
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                  <div>
                    <p className={`text-sm font-bold ${style.text}`}>{slot.subject}</p>
                    <p className={`text-xs ${style.text} opacity-70`}>
                      {slot.grade} &quot;{slot.section}&quot; · {slot.room} · {slot.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule grid */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-[#1E2A5E]">
            <div className="p-3 text-xs font-semibold text-white/50 flex items-center justify-center">
              Período
            </div>
            {DAYS.map((day) => {
              const isToday = day === todayCapitalized;
              return (
                <div
                  key={day}
                  className={`relative p-3 text-center text-xs font-bold text-white border-l border-white/10 ${
                    isToday ? "bg-[#F4C15C]/25 ring-2 ring-[#F4C15C] ring-inset" : ""
                  }`}
                >
                  <span className="hidden sm:block">{day}</span>
                  <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  {isToday && (
                    <span className="block text-[10px] text-[#F4C15C] mt-0.5 font-bold tracking-wide">● HOY</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {PERIODS.map((period, pi) => (
            <Fragment key={period}>
              {pi === 3 && (
                <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-amber-50 border-y border-amber-200">
                  <div className="p-2 text-xs font-semibold text-amber-700 flex items-center justify-center">
                    10:00 – 10:20
                  </div>
                  <div className="col-span-5 p-2 flex items-center">
                    <span className="text-xs font-bold text-amber-700">🔔 Recreo</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[110px_repeat(5,1fr)] border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
                {/* Time */}
                <div className="p-2.5 flex items-center justify-center border-r border-gray-100">
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
                    {period}
                  </span>
                </div>

                {/* Cells */}
                {DAYS.map((day) => {
                  const slot = schedule[day]?.[pi] ?? null;
                  const isToday = day === todayCapitalized;
                  const style = slot
                    ? (SUBJECT_STYLES[slot.subject] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" })
                    : null;

                  return (
                    <div
                      key={day}
                      className={`relative p-1.5 border-l border-gray-100 ${
                        isToday ? "bg-[#1E2A5E]/[0.04]" : ""
                      }`}
                    >
                      {isToday && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#F4C15C]" />
                      )}
                      {slot && style ? (
                        <div className={`rounded-lg border p-2 h-full flex flex-col gap-0.5 ${style.bg} ${style.border} ${isToday ? "shadow-sm" : ""}`}>
                          <p className={`text-[11px] font-bold leading-tight ${style.text}`}>
                            {slot.subject}
                          </p>
                          <p className={`text-[10px] leading-tight hidden sm:block ${style.text} opacity-70`}>
                            {slot.grade} &quot;{slot.section}&quot;
                          </p>
                          <div className={`flex items-center gap-0.5 text-[10px] leading-tight hidden md:flex ${style.text} opacity-60`}>
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {slot.room}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 p-2 h-full flex items-center justify-center min-h-[52px]">
                          <span className="text-[10px] text-muted-foreground">—</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Course legend */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
          Leyenda · Cursos asignados
        </p>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => {
            const style = SUBJECT_STYLES[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400" };
            return (
              <div
                key={c.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${style.bg} ${style.border}`}
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <div>
                  <p className={`text-xs font-bold leading-tight ${style.text}`}>{c.subject}</p>
                  <p className={`text-[10px] ${style.text} opacity-70`}>
                    {c.grade} &quot;{c.section}&quot; · {c.room} · {c.hoursPerWeek} hrs/sem
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
