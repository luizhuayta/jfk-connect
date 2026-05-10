"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Save, X, CheckCircle2, Sun, Moon } from "lucide-react";
import {
  mockAdminSections,
  mockSchedules,
  mockTeacherSchedule,
  PERIODS,
  DAYS,
  type SchedulePeriod,
} from "@/data/mock";

// Map section id → schedule data
// sec-5A and sec-3B have real data from mockSchedules (student "1" and "2")
// For the teacher's sections (1ro A, 2do B, 3ro C) we build from mockTeacherSchedule
function buildSectionSchedule(sectionId: string): Record<string, (SchedulePeriod | null)[]> {
  if (sectionId === "sec-5A") return mockSchedules["1"];
  if (sectionId === "sec-3B") return mockSchedules["2"];
  // Build from teacher schedule for known sections
  const empty: Record<string, (SchedulePeriod | null)[]> = {};
  DAYS.forEach((day) => {
    empty[day] = PERIODS.map(() => null);
  });
  if (sectionId === "sec-1A" || sectionId === "sec-2B" || sectionId === "sec-3C") {
    DAYS.forEach((day) => {
      const slots = mockTeacherSchedule[day] ?? [];
      const sectionMap: Record<string, string> = {
        "sec-1A": "1ro-A", "sec-2B": "2do-B", "sec-3C": "3ro-C",
      };
      const target = sectionMap[sectionId];
      empty[day] = slots.map((slot) => {
        if (!slot) return null;
        const key = `${slot.grade}-${slot.section}`;
        if (key !== target) return null;
        return {
          time: slot.time,
          subject: slot.subject,
          teacher: "Prof. González",
          room: slot.room,
        };
      });
    });
  }
  return empty;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Matemáticas":      { bg: "bg-blue-50",    text: "text-blue-800",    border: "border-blue-200"   },
  "Comunicación":     { bg: "bg-purple-50",  text: "text-purple-800",  border: "border-purple-200" },
  "Lengua Castellana":{ bg: "bg-purple-50",  text: "text-purple-800",  border: "border-purple-200" },
  "Historia":         { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200"  },
  "HGE":              { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-200"  },
  "Ciencias":         { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200"},
  "Inglés":           { bg: "bg-cyan-50",    text: "text-cyan-800",    border: "border-cyan-200"   },
  "Ed. Física":       { bg: "bg-lime-50",    text: "text-lime-800",    border: "border-lime-200"   },
  "DPCC":             { bg: "bg-rose-50",    text: "text-rose-800",    border: "border-rose-200"   },
  "EPT":              { bg: "bg-orange-50",  text: "text-orange-800",  border: "border-orange-200" },
  "Arte":             { bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-200"},
  "Tutoría":          { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200"  },
  "Religión":         { bg: "bg-stone-50",   text: "text-stone-700",   border: "border-stone-200"  },
};

const DAY_SHORT: Record<string, string> = {
  Lunes: "Lun", Martes: "Mar", Miércoles: "Mié", Jueves: "Jue", Viernes: "Vie",
};

export default function AdminSchedulePage() {
  const [activeSectionId, setActiveSectionId] = useState("sec-5A");
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const section = mockAdminSections.find((s) => s.id === activeSectionId)!;
  const schedule = buildSectionSchedule(activeSectionId);

  const grades = ["1ro", "2do", "3ro", "4to", "5to"];
  const visibleSections = gradeFilter === "all"
    ? mockAdminSections
    : mockAdminSections.filter((s) => s.grade === gradeFilter);

  function handleSave() {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Horarios</h1>
          <p className="text-muted-foreground mt-1">
            Gestión del horario académico por sección · Turno mañana 7:45–13:20
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" /> Guardado
            </span>
          )}
          {editMode ? (
            <>
              <Button
                onClick={handleSave}
                className="bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-xl h-10 gap-2"
              >
                <Save className="h-4 w-4" /> Guardar cambios
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditMode(false)}
                className="rounded-xl h-10 gap-2 border-gray-200"
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditMode(true)}
              className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
            >
              <Pencil className="h-4 w-4" /> Editar horario
            </Button>
          )}
        </div>
      </div>

      {/* Grade filter + section selector */}
      <div className="space-y-3">
        {/* Grade tabs */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setGradeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              gradeFilter === "all" ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Todos
          </button>
          {grades.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                gradeFilter === g ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Section buttons */}
        <div className="flex gap-2 flex-wrap">
          {visibleSections.map((s) => {
            const isActive = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSectionId(s.id)}
                className={`px-4 py-2.5 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? "border-[#2563EB] bg-[#2563EB]/5"
                    : "border-gray-200 bg-white hover:border-[#2563EB]/30"
                }`}
              >
                <p className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                  {s.grade} &quot;{s.section}&quot;
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  {s.shift === "Mañana" ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                  {s.shift} · {s.room}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section info banner */}
      <div className="flex items-center gap-4 bg-[#1E2A5E]/5 border border-[#1E2A5E]/10 rounded-xl px-5 py-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-[#1E2A5E]">{section.grade} &quot;{section.section}&quot; — {section.tutor}</p>
          <p className="text-xs text-muted-foreground">{section.room} · Turno {section.shift} · {section.studentsTotal} alumnos</p>
        </div>
        {editMode && (
          <Badge className="ml-auto bg-amber-100 text-amber-700 border-0 font-semibold text-xs hover:bg-amber-100">
            Modo edición activo — haz clic en una celda para modificar
          </Badge>
        )}
      </div>

      {/* Timetable grid */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-[#1E2A5E]">
            <div className="p-3 text-xs font-semibold text-white/50 flex items-center justify-center">
              Período
            </div>
            {DAYS.map((day) => (
              <div key={day} className="p-3 text-center text-xs font-bold text-white border-l border-white/10">
                <span className="hidden sm:block">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
              </div>
            ))}
          </div>

          {/* Period rows */}
          {PERIODS.map((period, pi) => (
            <div key={period}>
              {pi === 3 && (
                <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-amber-50 border-y border-amber-200">
                  <div className="p-2 text-xs font-semibold text-amber-700 flex items-center justify-center">
                    10:00 – 10:20
                  </div>
                  <div className="col-span-5 p-2 flex items-center">
                    <span className="text-xs font-bold text-amber-700">🔔 Recreo</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <div className="p-2.5 flex items-center justify-center border-r border-gray-100">
                  <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
                    {period}
                  </span>
                </div>
                {DAYS.map((day) => {
                  const slot = schedule[day]?.[pi] ?? null;
                  const style = slot
                    ? (SUBJECT_COLORS[slot.subject] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" })
                    : null;

                  return (
                    <div
                      key={day}
                      className={`p-1.5 border-l border-gray-100 ${editMode ? "cursor-pointer hover:ring-2 hover:ring-[#2563EB]/30 hover:ring-inset" : ""}`}
                      title={editMode ? "Clic para editar este período" : undefined}
                    >
                      {slot && style ? (
                        <div className={`rounded-lg border p-2 h-full flex flex-col gap-0.5 ${style.bg} ${style.border} ${editMode ? "ring-1 ring-inset ring-transparent hover:ring-[#2563EB]/40" : ""}`}>
                          <p className={`text-[11px] font-bold leading-tight ${style.text}`}>
                            {slot.subject}
                          </p>
                          <p className={`text-[10px] leading-tight hidden sm:block ${style.text} opacity-70`}>
                            {slot.teacher}
                          </p>
                          <div className={`hidden md:flex items-center gap-0.5 text-[10px] leading-tight ${style.text} opacity-60`}>
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {slot.room}
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-lg border border-dashed border-gray-200 p-2 h-full flex items-center justify-center min-h-[52px] ${editMode ? "hover:border-[#2563EB]/50 hover:bg-[#2563EB]/5" : ""}`}>
                          {editMode ? (
                            <span className="text-[10px] text-[#2563EB]/60 font-medium">+ Asignar</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Leyenda de colores</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUBJECT_COLORS).slice(0, 8).map(([subject, color]) => (
            <div
              key={subject}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${color.bg} ${color.text} ${color.border}`}
            >
              {subject}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
