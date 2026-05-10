"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, TrendingUp, LayoutGrid, Sun, Moon,
  MapPin, UserRound, ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import { mockAdminSections, type AdminSection } from "@/data/mock";

const GRADES = ["1ro", "2do", "3ro", "4to", "5to"];

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "1ro": { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100",   dot: "bg-blue-400"   },
  "2do": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", dot: "bg-purple-400" },
  "3ro": { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100",  dot: "bg-amber-400"  },
  "4to": { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-100",dot: "bg-emerald-400"},
  "5to": { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-100",   dot: "bg-rose-400"   },
};

function avgColor(avg: number) {
  if (avg >= 15) return "text-emerald-600 font-bold";
  if (avg >= 13) return "text-[#0F172A] font-semibold";
  return "text-amber-600 font-semibold";
}

function attendanceBadge(pct: number) {
  if (pct >= 95) return "bg-emerald-100 text-emerald-700";
  if (pct >= 85) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

export default function AdminCoursesPage() {
  const [shiftFilter, setShiftFilter] = useState<"all" | "Mañana" | "Tarde">("all");
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set(["1ro"]));

  const totalSections = mockAdminSections.length;
  const totalStudents = mockAdminSections.reduce((s, sec) => s + sec.studentsTotal, 0);
  const globalAvg = mockAdminSections.reduce((s, sec) => s + sec.avgGrade, 0) / mockAdminSections.length;
  const morning = mockAdminSections.filter((s) => s.shift === "Mañana").length;
  const afternoon = mockAdminSections.filter((s) => s.shift === "Tarde").length;

  const filtered = useMemo(() =>
    shiftFilter === "all"
      ? mockAdminSections
      : mockAdminSections.filter((s) => s.shift === shiftFilter),
    [shiftFilter]
  );

  function toggleGrade(g: string) {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(g)) { next.delete(g); } else { next.add(g); }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Cursos y Secciones</h1>
          <p className="text-muted-foreground mt-1">
            Estructura académica · {totalSections} secciones · Año Lectivo 2026
          </p>
        </div>
        <Button className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Nueva sección
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Secciones",        value: totalSections,        icon: LayoutGrid, bg: "bg-[#1E2A5E]/5",  text: "text-[#1E2A5E]"   },
          { label: "Alumnos totales",  value: totalStudents,        icon: Users,      bg: "bg-blue-50",       text: "text-[#2563EB]"   },
          { label: "Turno mañana",     value: morning,              icon: Sun,        bg: "bg-amber-50",      text: "text-amber-600"   },
          { label: "Turno tarde",      value: afternoon,            icon: Moon,       bg: "bg-purple-50",     text: "text-purple-600"  },
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

      {/* Shift filter */}
      <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
        {(["all", "Mañana", "Tarde"] as const).map((sh) => (
          <button
            key={sh}
            onClick={() => setShiftFilter(sh)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              shiftFilter === sh ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {sh === "Mañana" && <Sun className="h-3.5 w-3.5" />}
            {sh === "Tarde"  && <Moon className="h-3.5 w-3.5" />}
            {sh === "all" ? "Todos los turnos" : `Turno ${sh}`}
          </button>
        ))}
      </div>

      {/* Sections by grade */}
      <div className="space-y-4">
        {GRADES.map((grade) => {
          const sections = filtered.filter((s) => s.grade === grade);
          if (sections.length === 0) return null;
          const color = GRADE_COLORS[grade];
          const isExpanded = expandedGrades.has(grade);
          const gradeStudents = sections.reduce((s, sec) => s + sec.studentsTotal, 0);
          const gradeAvg = sections.reduce((s, sec) => s + sec.avgGrade, 0) / sections.length;

          return (
            <Card key={grade} className="border-none shadow-sm rounded-xl overflow-hidden">
              {/* Grade header */}
              <button
                onClick={() => toggleGrade(grade)}
                className="w-full text-left"
              >
                <div className={`flex items-center justify-between px-6 py-4 ${color.bg} border-b ${color.border}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${color.border} bg-white/70 font-bold text-sm ${color.text}`}>
                      {grade.slice(0, 1)}°
                    </span>
                    <div>
                      <p className={`text-base font-bold ${color.text}`}>{grade} Secundaria</p>
                      <p className={`text-xs ${color.text} opacity-70`}>
                        {sections.length} secciones · {gradeStudents} alumnos · Promedio {gradeAvg.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {sections.map((sec) => (
                        <span
                          key={sec.id}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border font-bold text-xs ${color.border} ${color.text} bg-white/60`}
                        >
                          {sec.section}
                        </span>
                      ))}
                    </div>
                    {isExpanded
                      ? <ChevronUp className={`h-5 w-5 ${color.text}`} />
                      : <ChevronDown className={`h-5 w-5 ${color.text}`} />
                    }
                  </div>
                </div>
              </button>

              {/* Section cards */}
              {isExpanded && (
                <CardContent className="p-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sections.map((sec) => (
                      <SectionCard key={sec.id} sec={sec} color={color} />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({
  sec,
  color,
}: {
  sec: AdminSection;
  color: { bg: string; text: string; border: string; dot: string };
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 hover:shadow-sm transition-shadow ${color.bg} ${color.border}`}>
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${color.text}`}>
              {sec.grade} &quot;{sec.section}&quot;
            </span>
            <Badge className={`text-[10px] font-bold border-0 ${
              sec.shift === "Mañana"
                ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                : "bg-purple-100 text-purple-700 hover:bg-purple-100"
            }`}>
              {sec.shift === "Mañana" ? <Sun className="h-2.5 w-2.5 mr-1 inline" /> : <Moon className="h-2.5 w-2.5 mr-1 inline" />}
              {sec.shift}
            </Badge>
          </div>
        </div>
        <Badge className={`text-xs font-bold border-0 ${attendanceBadge(sec.attendanceRate)} hover:opacity-90`}>
          {sec.attendanceRate}%
        </Badge>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5">
        <div className={`flex items-center gap-2 text-xs ${color.text} opacity-80`}>
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{sec.tutor}</span>
        </div>
        <div className={`flex items-center gap-2 text-xs ${color.text} opacity-80`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {sec.room}
        </div>
        <div className={`flex items-center gap-2 text-xs ${color.text} opacity-80`}>
          <Users className="h-3.5 w-3.5 shrink-0" />
          {sec.studentsTotal} alumnos
        </div>
      </div>

      {/* Metrics */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5">
        <div className="text-center">
          <p className={`text-base font-bold ${avgColor(sec.avgGrade)}`}>{sec.avgGrade.toFixed(1)}</p>
          <p className={`text-[10px] ${color.text} opacity-60`}>Promedio</p>
        </div>
        <div className="text-center">
          <p className={`text-base font-bold ${color.text}`}>{sec.studentsTotal}</p>
          <p className={`text-[10px] ${color.text} opacity-60`}>Alumnos</p>
        </div>
        <button className={`text-xs font-semibold ${color.text} hover:opacity-80 transition-opacity flex items-center gap-1`}>
          <BookOpen className="h-3.5 w-3.5" />
          Ver detalle
        </button>
      </div>
    </div>
  );
}
