"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  GraduationCap, Users, TrendingUp, Search, Plus,
  MoreHorizontal, Phone, AlertTriangle,
} from "lucide-react";
import { mockAdminStudents, mockAdminSections } from "@/data/mock";

const GRADES = ["1ro", "2do", "3ro", "4to", "5to"];

function levelBadge(avg: number) {
  if (avg >= 18) return { label: "AD", cls: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A",  cls: "bg-blue-100 text-blue-700" };
  if (avg >= 11) return { label: "B",  cls: "bg-amber-100 text-amber-700" };
  return              { label: "C",  cls: "bg-red-100 text-red-600" };
}

function avgColor(avg: number) {
  if (avg >= 14) return "text-emerald-600 font-bold";
  if (avg >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}

function attendanceColor(pct: number) {
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 75) return "text-amber-600";
  return "text-red-500";
}

export default function AdminStudentsPage() {
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "retirado" | "trasladado">("all");
  const [query, setQuery] = useState("");

  const totalStudents = mockAdminSections.reduce((s, sec) => s + sec.studentsTotal, 0);
  const globalAvg = mockAdminSections.reduce((s, sec) => s + sec.avgGrade, 0) / mockAdminSections.length;
  const globalAttendance = Math.round(
    mockAdminSections.reduce((s, sec) => s + sec.attendanceRate, 0) / mockAdminSections.length
  );
  const atRisk = mockAdminStudents.filter((s) => s.avgGrade < 11 || s.attendanceRate < 80).length;

  const sections = useMemo(() => {
    if (gradeFilter === "all") return Array.from(new Set(mockAdminStudents.map((s) => s.section))).sort();
    return Array.from(new Set(mockAdminStudents.filter((s) => s.grade === gradeFilter).map((s) => s.section))).sort();
  }, [gradeFilter]);

  const filtered = useMemo(() => {
    return mockAdminStudents.filter((s) => {
      if (gradeFilter !== "all" && s.grade !== gradeFilter) return false;
      if (sectionFilter !== "all" && s.section !== sectionFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.dni.includes(q) && !s.parentName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [gradeFilter, sectionFilter, statusFilter, query]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Alumnos</h1>
          <p className="text-muted-foreground mt-1">
            Padrón general de alumnos matriculados · Año Lectivo 2026
          </p>
        </div>
        <Button className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Nuevo alumno
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total matriculados", value: totalStudents,       icon: GraduationCap, bg: "bg-blue-50",    text: "text-[#2563EB]"   },
          { label: "Promedio general",   value: globalAvg.toFixed(1),icon: TrendingUp,    bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "% Asistencia",       value: `${globalAttendance}%`, icon: Users,      bg: "bg-purple-50",  text: "text-purple-600"  },
          { label: "En riesgo",          value: atRisk,              icon: AlertTriangle, bg: "bg-red-50",     text: "text-red-600"     },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Grade */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          <button
            onClick={() => { setGradeFilter("all"); setSectionFilter("all"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              gradeFilter === "all" ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Todos
          </button>
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => { setGradeFilter(g); setSectionFilter("all"); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                gradeFilter === g ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Section */}
        {gradeFilter !== "all" && (
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            <button
              onClick={() => setSectionFilter("all")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sectionFilter === "all" ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Todas
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSectionFilter(sec)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  sectionFilter === sec ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "activo", "retirado", "trasladado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nombre, DNI o apoderado..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-60 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-[#0F172A] font-semibold text-sm pl-5 w-10">N°</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Grado / Sección</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm hidden md:table-cell">Apoderado</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Promedio</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden sm:table-cell">Nivel</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Asistencia</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm pr-5">Acc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((st, idx) => {
                const level = levelBadge(st.avgGrade);
                const isAtRisk = st.avgGrade < 11 || st.attendanceRate < 80;
                return (
                  <TableRow
                    key={st.id}
                    className={`hover:bg-gray-50/50 transition-colors ${isAtRisk ? "bg-red-50/20" : ""}`}
                  >
                    <TableCell className="pl-5 text-xs text-muted-foreground font-medium">
                      {String(idx + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                            {st.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{st.name}</p>
                          <p className="text-[11px] text-muted-foreground">DNI {st.dni}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10">
                          {st.grade} &quot;{st.section}&quot;
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{st.shift}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="text-xs font-medium text-[#0F172A]">{st.parentName}</p>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Phone className="h-2.5 w-2.5" />{st.parentPhone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm ${avgColor(st.avgGrade)}`}>
                        {st.avgGrade.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge className={`text-[11px] font-bold border-0 ${level.cls} hover:opacity-90`}>
                        {level.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      <span className={`text-sm font-semibold ${attendanceColor(st.attendanceRate)}`}>
                        {st.attendanceRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {st.status === "activo" ? (
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Activo
                        </span>
                      ) : st.status === "retirado" ? (
                        <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          Retirado
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          Trasladado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center pr-5">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No se encontraron alumnos con ese criterio
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {mockAdminStudents.length} alumnos registrados en muestra
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
