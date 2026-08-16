"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { Save, AlertTriangle, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { letterGrade, letterGradeColor } from "@/lib/letter-grade";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";

type GradeEntry = {
  studentId: string;
  n1: number;
  n2: number;
  n3: number;
  observation: string;
};

type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number;
};

const BIMESTERS = ["1", "2", "3", "4"];

// ─── A2: Promedio parcial con las notas disponibles ──────────────────────────
// Antes: exigía n1>0 && n2>0 && n3>0. Ahora: calcula con las notas > 0 que haya.
// Si solo N1 y N2 → (n1+n2)/2. Si las 3 → (n1+n2+n3)/3. Si ninguna → null.
function calcAverage(n1: number, n2: number, n3: number): number | null {
  const notes: number[] = [];
  if (n1 > 0) notes.push(n1);
  if (n2 > 0) notes.push(n2);
  if (n3 > 0) notes.push(n3);
  if (notes.length === 0) return null;
  return notes.reduce((a, b) => a + b, 0) / notes.length;
}

// ¿Está completo el registro? (las 3 notas > 0)
function isComplete(n1: number, n2: number, n3: number): boolean {
  return n1 > 0 && n2 > 0 && n3 > 0;
}

// ¿Hay al menos una nota? (para mostrar promedio parcial)
function hasSomeNotes(n1: number, n2: number, n3: number): boolean {
  return n1 > 0 || n2 > 0 || n3 > 0;
}

function gradeColor(n: number): string {
  if (n === 0) return "text-gray-400";
  if (n >= 17) return "text-emerald-600 font-bold";
  if (n >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}

function avgTextColor(avg: number): string {
  if (avg >= 15) return "text-emerald-600 font-bold";
  if (avg >= 11) return "text-amber-600 font-bold";
  return "text-red-500 font-bold";
}

export default function GradesPage() {
  const { courses, loading, error: coursesError, reload } = useTeacherCourses();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeBimester, setActiveBimester] = useState("2");
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [rows, setRows] = useState<Record<string, GradeEntry>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const loadGrid = useCallback(async (courseId: string, bimester: string) => {
    setLoadingGrid(true);
    try {
      const [stRes, grRes] = await Promise.all([
        fetch(`/api/teacher/courses/${courseId}/students`),
        fetch(`/api/teacher/courses/${courseId}/grades?bimester=${bimester}`),
      ]);
      const st = await stRes.json();
      const gr = await grRes.json();
      if (!st.ok) throw new Error(st.error);
      if (!gr.ok) throw new Error(gr.error);
      setStudents(st.students);
      const entries: GradeEntry[] = gr.entries;
      setRows(Object.fromEntries(entries.map((e) => [e.studentId, { ...e }])));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando notas");
    } finally {
      setLoadingGrid(false);
    }
  }, []);

  // Selecciona el primer curso una sola vez, apenas la lista compartida esté lista.
  useEffect(() => {
    if (initializedRef.current || courses.length === 0) return;
    initializedRef.current = true;
    const firstId = courses[0].id;
    setActiveCourseId(firstId);
    loadGrid(firstId, "2");
  }, [courses, loadGrid]);

  const retry = useCallback(async () => {
    setError(null);
    await reload();
    if (activeCourseId) await loadGrid(activeCourseId, activeBimester);
  }, [reload, activeCourseId, activeBimester, loadGrid]);

  function handleCourseChange(id: string) {
    setActiveCourseId(id);
    loadGrid(id, activeBimester);
  }

  function handleBimesterChange(b: string) {
    setActiveBimester(b);
    if (activeCourseId) loadGrid(activeCourseId, b);
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

  async function handleSave() {
    if (!activeCourseId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/teacher/courses/${activeCourseId}/grades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bimester: Number(activeBimester),
          entries: Object.values(rows),
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setSaved(true);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const course = courses.find((c) => c.id === activeCourseId);

  // Summary stats — usa calcAverage para incluir promedios parciales
  const stats = useMemo(() => {
    const withNotes = students
      .map((s) => rows[s.id])
      .filter((r) => r && hasSomeNotes(r.n1, r.n2, r.n3));
    const complete = withNotes.filter((r) => isComplete(r.n1, r.n2, r.n3)) ?? [];
    const avgs = withNotes.map((r) => calcAverage(r.n1, r.n2, r.n3)!);
    const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    // Aprobados/desaprobados solo sobre completos
    const completeAvgs = complete.map((r) => calcAverage(r.n1, r.n2, r.n3)!);
    return {
      registered: withNotes.length,
      total: students.length,
      approved: completeAvgs.filter((a) => a >= 11).length,
      failed: completeAvgs.filter((a) => a < 11).length,
      classAvg,
    };
  }, [rows, students]);

  // ─── B5: Conteo de notas pendientes para el sidebar ───────────────────────
  // Cursos con bimestre actual en curso (inProgress) y sin hasData
  const pendingGradesCount = courses.filter((c) => {
    const b = c.bimesters?.[String(c.currentBimester)];
    return b?.inProgress && !b?.hasData;
  }).length;

  const isLocked = activeBimester === "3" || activeBimester === "4";

  if (loading) {
    return <LoadingState label="Cargando cursos..." />;
  }

  if (error || coursesError) {
    return <ErrorState message={error ?? coursesError ?? ""} onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Registrar Notas</h1>
        <p className="text-muted-foreground mt-1">
          Ingresa N1, N2 y N3 por alumno — el promedio se calcula automáticamente
        </p>
      </div>

      {/* B1: Selectores compactos en una sola fila */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Dropdown de sección */}
        <select
          value={activeCourseId ?? ""}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] min-w-[200px]"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subject} — {c.grade} "{c.section}" · {c.studentsTotal} alumnos
            </option>
          ))}
        </select>

        {/* Tabs de bimestre en la misma fila */}
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          {BIMESTERS.map((b) => {
            const stat = course?.bimesters[b];
            const hasData = stat?.hasData ?? false;
            const inProgress = stat?.inProgress ?? false;
            const isActive = activeBimester === b;
            return (
              <button
                key={b}
                onClick={() => handleBimesterChange(b)}
                title={
                  hasData ? "Bimestre cerrado — notas registradas" :
                  inProgress ? "Bimestre en curso" :
                  "Bimestre no iniciado"
                }
                className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#1E2A5E] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                B{b}
                {hasData && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-emerald-500 border border-white" title="Cerrado" />
                )}
                {inProgress && !hasData && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500 border border-white" title="En curso" />
                )}
              </button>
            );
          })}
        </div>

        {/* B2: Leyenda de los puntos de color */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Cerrado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> En curso
          </span>
        </div>
      </div>

      {/* Grade table */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {course?.subject} · {course?.grade} &quot;{course?.section}&quot; · Bimestre {activeBimester}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{course?.room} · Turno {course?.shift}</p>
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
          ) : loadingGrid ? (
            <div className="py-12 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1E2A5E]" />
              <p className="text-sm text-muted-foreground mt-2">Cargando alumnos...</p>
            </div>
          ) : (
            <>
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-[#0F172A] font-semibold text-sm w-8">N°</TableHead>
                      <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm w-20">N1</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm w-20">N2</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm w-20">N3</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm w-24">Promedio</TableHead>
                      <TableHead className="text-center text-[#0F172A] font-semibold text-sm w-20">Nivel</TableHead>
                      <TableHead className="text-[#0F172A] font-semibold text-sm">Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const row = rows[student.id] ?? { studentId: student.id, n1: 0, n2: 0, n3: 0, observation: "" };
                      const average = calcAverage(row.n1, row.n2, row.n3);
                      const complete = isComplete(row.n1, row.n2, row.n3);
                      const hasNotes = hasSomeNotes(row.n1, row.n2, row.n3);
                      const lg = average !== null ? letterGrade(average) : null;

                      return (
                        <TableRow
                          key={student.id}
                          className={`hover:bg-gray-50/50 ${
                            complete && average! < 11 ? "bg-red-50/30" : ""
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
                          {/* A1: Inputs más anchos (w-20 en vez de w-14) para que "20.0" no se corte */}
                          {(["n1", "n2", "n3"] as const).map((field) => (
                            <TableCell key={field} className="text-center px-1">
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step="0.5"
                                value={row[field] === 0 ? "" : row[field]}
                                placeholder="—"
                                onChange={(e) => updateField(student.id, field, e.target.value)}
                                className="w-20 h-8 text-center text-sm mx-auto rounded-md border-gray-200 px-1"
                              />
                            </TableCell>
                          ))}
                          {/* A2: Promedio se calcula con las notas disponibles (parcial si falta n3) */}
                          <TableCell className="text-center">
                            {average !== null ? (
                              <span className={`text-sm ${avgTextColor(average)}`}>
                                {average.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </TableCell>
                          {/* B4: Nivel con color condicional por letra */}
                          <TableCell className="text-center">
                            {lg ? (
                              <Badge className={`text-xs font-bold ${letterGradeColor(lg)}`}>
                                {lg}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
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
                  <p className="text-xs text-muted-foreground">Con notas</p>
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
                      <p className="text-sm text-white/80">Promedio del aula — Bimestre {activeBimester}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-[#F4C15C]">{stats.classAvg.toFixed(1)}</p>
                        {letterGrade(stats.classAvg) && (
                          <Badge className={`text-xs font-bold ${letterGradeColor(letterGrade(stats.classAvg))}`}>
                            {letterGrade(stats.classAvg)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-[#F4C15C] text-[#1E2A5E] font-bold text-sm px-3 py-1 hover:bg-[#F4C15C]">
                    {stats.classAvg >= 16 ? "Excelente" : stats.classAvg >= 13 ? "Bueno" : "Regular"}
                  </Badge>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 gap-2 text-base"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Guardar notas — {course?.subject} Bimestre {activeBimester}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}