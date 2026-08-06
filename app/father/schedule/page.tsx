"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type ScheduleSlot = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05", // tras recreo
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
];

const SUBJECT_STYLES: Record<string, string> = {
  "Matemáticas":  "bg-blue-50   text-blue-800   border-blue-200",
  "Comunicación": "bg-purple-50 text-purple-800 border-purple-200",
  "Inglés":       "bg-emerald-50 text-emerald-800 border-emerald-200",
  "HGE":          "bg-amber-50  text-amber-800  border-amber-200",
  "Ciencias":     "bg-cyan-50   text-cyan-800   border-cyan-200",
  "EPT":          "bg-orange-50 text-orange-800 border-orange-200",
  "Ed. Física":   "bg-lime-50   text-lime-800   border-lime-200",
  "Arte":         "bg-pink-50   text-pink-800   border-pink-200",
  "DPCC":         "bg-teal-50   text-teal-800   border-teal-200",
  "Religión":     "bg-violet-50 text-violet-800 border-violet-200",
  "Tutoría":      "bg-gray-100  text-gray-700   border-gray-200",
};

function subjectStyle(subject: string) {
  return SUBJECT_STYLES[subject] ?? "bg-gray-50 text-gray-700 border-gray-200";
}

const DAY_SHORT: Record<string, string> = {
  "Lunes": "Lun", "Martes": "Mar", "Miércoles": "Mié",
  "Jueves": "Jue", "Viernes": "Vie",
};

const TODAY_DAY = new Date().toLocaleDateString("es-PE", { weekday: "long" });
const capitalized = TODAY_DAY.charAt(0).toUpperCase() + TODAY_DAY.slice(1);

export default function SchedulePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [scheduleCache, setScheduleCache] = useState<Record<string, Record<string, (ScheduleSlot | null)[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/father/schedule?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setScheduleCache((prev) => ({ ...prev, [studentId]: data.schedule }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando horario");
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
          await loadSchedule(firstId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSchedule]);

  const handleSelectStudent = (studentId: string) => {
    setActiveStudentId(studentId);
    if (!scheduleCache[studentId]) loadSchedule(studentId);
  };

  const student = students.find((s) => s.id === activeStudentId);
  const schedule = (activeStudentId && scheduleCache[activeStudentId]) || {};

  // Build unique subjects for the legend
  const subjects = Array.from(
    new Set(
      Object.values(schedule)
        .flat()
        .filter((s): s is ScheduleSlot => s !== null)
        .map((p) => p.subject),
    ),
  ).sort();

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando horario...</p>
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
        <h1 className="text-3xl font-bold text-[#1E2A5E]">Horario</h1>
        <p className="text-muted-foreground mt-1">
          Turno mañana · 7:45 – 13:20 · Año Lectivo 2026
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
                  {s.grade} &quot;{s.section}&quot; · Turno mañana
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule grid */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-[#1E2A5E]">
            <div className="p-3 text-xs font-semibold text-white/60 flex items-center justify-center">
              Período
            </div>
            {DAYS.map((day) => {
              const isToday = day === capitalized;
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

          {/* Recreo divider position — after 3rd period */}
          {PERIODS.map((period, pi) => (
            <Fragment key={period}>
              {pi === 3 && (
                <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-amber-50 border-y border-amber-200">
                  <div className="p-2 text-xs font-semibold text-amber-700 flex items-center justify-center">
                    10:00 – 10:20
                  </div>
                  <div className="col-span-5 p-2 flex items-center">
                    <span className="text-xs font-bold text-amber-700">🔔 Recreo</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[120px_repeat(5,1fr)] border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                {/* Time */}
                <div className="p-3 flex items-center justify-center border-r border-gray-100">
                  <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                    {period}
                  </span>
                </div>

                {/* Cells per day */}
                {DAYS.map((day) => {
                  const slot = schedule[day]?.[pi];
                  const isToday = day === capitalized;
                  return (
                    <div
                      key={day}
                      className={`relative p-1.5 border-l border-gray-100 ${isToday ? "bg-[#1E2A5E]/[0.04]" : ""}`}
                    >
                      {isToday && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#F4C15C]" />
                      )}
                      {slot ? (
                        <div
                          className={`rounded-lg border p-2 h-full flex flex-col gap-0.5 ${subjectStyle(slot.subject)} ${isToday ? "shadow-sm" : ""}`}
                        >
                          <p className="text-xs font-bold leading-tight">{slot.subject}</p>
                          <p className="text-[10px] opacity-70 leading-tight hidden sm:block">{slot.teacher}</p>
                          <p className="text-[10px] opacity-60 leading-tight hidden md:block">{slot.room}</p>
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

      {/* Legend */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
          Cursos de {student?.name}
        </p>
        <div className="flex flex-wrap gap-2">
          {subjects.map((sub) => (
            <span
              key={sub}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${subjectStyle(sub)}`}
            >
              {sub}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
