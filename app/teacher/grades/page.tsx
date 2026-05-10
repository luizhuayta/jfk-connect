"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import {
  mockTeacherCourses,
  mockCourseStudents,
  mockCourseGrades,
  type GradeEntry,
} from "@/data/mock";

const BIMESTERS = ["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"];

function avg3(n1: number, n2: number, n3: number) {
  return (n1 + n2 + n3) / 3;
}

function levelBadge(avg: number) {
  if (avg >= 18) return { label: "AD", cls: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A",  cls: "bg-blue-100 text-blue-700" };
  if (avg >= 11) return { label: "B",  cls: "bg-amber-100 text-amber-700" };
  return              { label: "C",  cls: "bg-red-100 text-red-600" };
}

function gradeColor(n: number) {
  if (n === 0) return "text-gray-400";
  if (n >= 17) return "text-emerald-600 font-bold";
  if (n >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}

export default function GradesPage() {
  const [activeCourseId, setActiveCourseId] = useState(mockTeacherCourses[0].id);
  const [activeBimester, setActiveBimester] = useState("Bimestre 2");
  const [saved, setSaved] = useState(false);

  const course = mockTeacherCourses.find((c) => c.id === activeCourseId)!;
  const students = mockCourseStudents[activeCourseId] ?? [];

  // Local editable state initialised from mock
  const [rows, setRows] = useState<Record<string, GradeEntry>>(() => {
    const entries = mockCourseGrades[activeCourseId]?.[activeBimester] ?? [];
    return Object.fromEntries(entries.map((e) => [e.studentId, { ...e }]));
  });

  // Re-init when course or bimester changes
  function switchContext(courseId: string, bimester: string) {
    const entries = mockCourseGrades[courseId]?.[bimester] ?? [];
    if (entries.length) {
      setRows(Object.fromEntries(entries.map((e) => [e.studentId, { ...e }])));
    } else {
      // blank rows for unregistered bimester
      const blankStudents = mockCourseStudents[courseId] ?? [];
      setRows(
        Object.fromEntries(
          blankStudents.map((s) => [s.id, { studentId: s.id, n1: 0, n2: 0, n3: 0, observation: "" }])
        )
      );
    }
    setSaved(false);
  }

  function handleCourseChange(id: string) {
    setActiveCourseId(id);
    switchContext(id, activeBimester);
  }

  function handleBimesterChange(b: string) {
    setActiveBimester(b);
    switchContext(activeCourseId, b);
  }

  function updateField(studentId: string, field: "n1" | "n2" | "n3" | "observation", value: string) {
    setRows((prev) => {
      const row = prev[studentId] ?? { studentId, n1: 0, n2: 0, n3: 0, observation: "" };
      if (field === "observation") return { ...prev, [studentId]: { ...row, observation: value } };
      const num = Math.min(20, Math.max(0, parseFloat(value) || 0));
      return { ...prev, [studentId]: { ...row, [field]: num } };
    });
    setSaved(false);
  }

  // Summary stats
  const stats = useMemo(() => {
    const complete = students
      .map((s) => rows[s.id])
      .filter((r) => r && r.n1 > 0 && r.n2 > 0 && r.n3 > 0);
    const avgs = complete.map((r) => avg3(r.n1, r.n2, r.n3));
    const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    return {
      registered: complete.length,
      total: students.length,
      approved: avgs.filter((a) => a >= 11).length,
      failed: avgs.filter((a) => a < 11).length,
      classAvg,
    };
  }, [rows, students]);

  const isLocked = activeBimester === "Bimestre 3" || activeBimester === "Bimestre 4";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Registrar Notas</h1>
        <p className="text-muted-foreground mt-1">
          Ingresa N1, N2 y N3 por alumno — el promedio se calcula automáticamente
        </p>
      </div>

      {/* Course selector */}
      <div className="flex gap-3 flex-wrap">
        {mockTeacherCourses.map((c) => {
          const isActive = activeCourseId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCourseChange(c.id)}
              className={`px-5 py-3 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? "border-[#2563EB] bg-[#2563EB]/5"
                  : "border-gray-200 bg-white hover:border-[#2563EB]/30"
              }`}
            >
              <p className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                {c.subject}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos
              </p>
            </button>
          );
        })}
      </div>

      {/* Bimester selector */}
      <div className="flex gap-1 bg-gray-50 rounded-lg p-1 w-fit">
        {BIMESTERS.map((b) => {
          const entries = mockCourseGrades[activeCourseId]?.[b] ?? [];
          const hasData = entries.some((e) => e.n3 > 0);
          const inProgress = entries.some((e) => e.n1 > 0) && !hasData;
          return (
            <button
              key={b}
              onClick={() => handleBimesterChange(b)}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeBimester === b
                  ? "bg-[#1E2A5E] text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {b}
              {hasData && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
              )}
              {inProgress && !hasData && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 border border-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Grade table */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {course.subject} · {course.grade} &quot;{course.section}&quot; · {activeBimester}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{course.room} · Turno {course.shift}</p>
            </div>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>

          {isLocked ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Este bimestre aún no está disponible para registro.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-[#0F172A] font-semibold text-sm w-8">N°</TableHead>
                      <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N1</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N2</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N3</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Promedio</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Nivel</TableHead>
                      <TableHead className="text-[#0F172A] font-semibold text-sm">Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const row = rows[student.id] ?? { studentId: student.id, n1: 0, n2: 0, n3: 0, observation: "" };
                      const average = avg3(row.n1, row.n2, row.n3);
                      const complete = row.n1 > 0 && row.n2 > 0 && row.n3 > 0;
                      const level = complete ? levelBadge(average) : null;

                      return (
                        <TableRow
                          key={student.id}
                          className={`hover:bg-gray-50/50 ${
                            complete && average < 11 ? "bg-red-50/30" : ""
                          }`}
                        >
                          <TableCell className="text-xs text-muted-foreground font-medium">
                            {String(student.order).padStart(2, "0")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                                  {student.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium text-[#0F172A] whitespace-nowrap">
                                {student.name}
                              </span>
                            </div>
                          </TableCell>
                          {(["n1", "n2", "n3"] as const).map((field) => (
                            <TableCell key={field} className="text-center px-2">
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                value={row[field] === 0 ? "" : row[field]}
                                placeholder="—"
                                onChange={(e) => updateField(student.id, field, e.target.value)}
                                className={`w-14 h-8 text-center text-sm mx-auto rounded-md border-gray-200 ${gradeColor(row[field])}`}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            {complete ? (
                              <span className={`text-sm font-bold ${gradeColor(average)}`}>
                                {average.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {level ? (
                              <Badge className={`text-xs font-bold border-0 ${level.cls} hover:${level.cls}`}>
                                {level.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.observation}
                              placeholder="Observación..."
                              onChange={(e) => updateField(student.id, "observation", e.target.value)}
                              className="h-8 text-sm rounded-md border-gray-200 min-w-[160px]"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary footer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#0F172A]">
                    {stats.registered}/{stats.total}
                  </p>
                  <p className="text-xs text-muted-foreground">Registrados</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprobados</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-500">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Desaprobados</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#2563EB]">
                    {stats.classAvg > 0 ? stats.classAvg.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Promedio aula</p>
                </div>
              </div>

              {/* Promedio banner */}
              {stats.classAvg > 0 && (
                <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-[#F4C15C]" />
                    <div>
                      <p className="text-sm text-white/80">Promedio del aula — {activeBimester}</p>
                      <p className="text-2xl font-bold text-[#F4C15C]">{stats.classAvg.toFixed(1)}</p>
                    </div>
                  </div>
                  <Badge className="bg-[#F4C15C] text-[#1E2A5E] font-bold text-sm px-3 py-1 hover:bg-[#F4C15C]">
                    {stats.classAvg >= 16 ? "Excelente" : stats.classAvg >= 13 ? "Bueno" : "Regular"}
                  </Badge>
                </div>
              )}

              <Button
                onClick={() => setSaved(true)}
                className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 gap-2 text-base"
              >
                <Save className="h-5 w-5" />
                Guardar notas — {course.subject} {activeBimester}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
