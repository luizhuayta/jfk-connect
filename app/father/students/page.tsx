"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Plus, Star } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { letterGrade, letterGradeColor } from "@/lib/letter-grade";
import { getInitials } from "@/lib/format";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useFatherStudents, type FatherStudent } from "@/components/father/useFatherStudents";

type GradeRow = { bimester: number; note: number };

const BIMESTERS = ["1", "2", "3", "4"];

/** Máximo de hijos que un padre puede vincular (límite del claim). */
const MAX_CHILDREN = 5;

// Estado real del alumno (tabla students.status). 'activo' → Matriculado.
const STUDENT_STATUS: Record<string, { label: string; bg: string }> = {
  activo:     { label: "Matriculado", bg: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  retirado:   { label: "Retirado",    bg: "bg-red-100 text-red-600 hover:bg-red-100" },
  trasladado: { label: "Trasladado",  bg: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
};

// Color de texto por letra canónica (A/B/C/D) — evita `color.split(" ")[1]`.
const LETTER_TEXT: Record<string, string> = {
  A: "text-emerald-600",
  B: "text-blue-600",
  C: "text-amber-600",
  D: "text-red-500",
};

export default function StudentsPage() {
  const { students, loading, error, reload, selectStudent } = useFatherStudents();
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, GradeRow[]>>>({});
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Cargar notas de todos los hijos en paralelo (para promedios) al llegar la lista.
  const loadAllGrades = useCallback(async (list: FatherStudent[]) => {
    const results = await Promise.all(
      list.map(async (s) => {
        try {
          const gr = await fetch(`/api/father/grades?studentId=${s.id}`);
          const gd = await gr.json();
          return [s.id, gd.ok ? gd.grades : {}] as const;
        } catch {
          return [s.id, {}] as const;
        }
      }),
    );
    setGradesMap(Object.fromEntries(results));
  }, []);

  // Guard por conjunto de hijos: recarga solo cuando cambia la lista (p. ej.
  // tras vincular un hijo nuevo), evita re-fetchs en re-renders y mantiene el
  // effect sin setState síncrono (el setState vive tras el await).
  const loadedStudentsKey = useRef("");
  useEffect(() => {
    const key = students.map((s) => s.id).join(",");
    if (students.length > 0 && loadedStudentsKey.current !== key) {
      loadedStudentsKey.current = key;
      loadAllGrades(students);
    }
  }, [students, loadAllGrades]);

  const getAnnualAverage = (studentId: string): number | null => {
    const allNotes = Object.values(gradesMap[studentId] ?? {}).flat();
    if (!allNotes.length) return null;
    return allNotes.reduce((sum, n) => sum + n.note, 0) / allNotes.length;
  };

  const canAddMore = students.length < MAX_CHILDREN;

  const withAvg = students.filter((s) => s.avg_grade != null);
  const generalAverage = withAvg.length
    ? withAvg.reduce((sum, s) => sum + (s.avg_grade ?? 0), 0) / withAvg.length
    : null;
  const withAttendance = students.filter((s) => s.attendance_rate != null);
  const averageAttendance = withAttendance.length
    ? Math.round(
        withAttendance.reduce((s, st) => s + (st.attendance_rate ?? 0), 0) /
          withAttendance.length,
      )
    : null;

  if (loading) return <LoadingState label="Cargando alumnos..." />;

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1E2A5E]">Mis Hijos</h1>
          <p className="text-muted-foreground mt-1">
            Alumnos matriculados — {SCHOOL_YEAR_LABEL}
          </p>
        </div>
        {students.length > 0 && canAddMore && (
          <Button
            onClick={() => setShowClaimModal(true)}
            className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" aria-hidden /> Agregar hijo
          </Button>
        )}
      </div>

      {students.length === 0 ? (
        <NoChildrenState onAddChild={() => setShowClaimModal(true)} />
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-[#1E2A5E]">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E2A5E]/10">
                  <CheckCircle2 className="h-5 w-5 text-[#1E2A5E]" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E2A5E]">{students.length}</p>
                  <p className="text-xs text-muted-foreground">Hijos matriculados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
                  <Star className="h-5 w-5 text-amber-600" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E2A5E]">
                    {generalAverage != null ? generalAverage.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Promedio general</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E2A5E]">
                    {averageAttendance != null ? `${averageAttendance}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Asistencia promedio</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            {students.map((student) => {
              const annualAvg = getAnnualAverage(student.id);
              const statusCfg = STUDENT_STATUS[student.status ?? "activo"] ?? STUDENT_STATUS.activo;
              const avgTextColor =
                annualAvg == null
                  ? "text-muted-foreground"
                  : annualAvg >= 17
                  ? "text-emerald-600"
                  : annualAvg >= 14
                  ? "text-blue-600"
                  : "text-amber-600";
              const avgBg =
                annualAvg == null
                  ? "bg-gray-50"
                  : annualAvg >= 17
                  ? "bg-emerald-50"
                  : annualAvg >= 14
                  ? "bg-blue-50"
                  : "bg-amber-50";

              return (
                <Card
                  key={student.id}
                  className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-[#F4C15C]/30">
                        <AvatarFallback className="bg-[#1E2A5E]/10 text-[#1E2A5E] font-bold text-base">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-[#0F172A] text-base leading-tight">
                          {student.name}
                        </p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="bg-gray-100 text-[#64748B] text-[11px]">
                            {student.grade} &quot;{student.section}&quot;
                          </Badge>
                          <Badge className={`${statusCfg.bg} text-[11px]`}>{statusCfg.label}</Badge>
                        </div>
                      </div>
                      {letterGrade(annualAvg) && (
                        <div
                          className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg shrink-0 ${letterGradeColor(letterGrade(annualAvg))}`}
                        >
                          {letterGrade(annualAvg)}
                        </div>
                      )}
                    </div>

                    {/* Aviso cuando el alumno no está activo */}
                    {student.status && student.status !== "activo" && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        Este alumno está {statusCfg.label.toLowerCase()}. Contacta a
                        Secretaría si necesitas regularizar su matrícula.
                      </p>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`rounded-xl ${avgBg} p-2.5 text-center`}>
                        <p className={`text-lg font-bold leading-tight ${avgTextColor}`}>
                          {annualAvg != null ? annualAvg.toFixed(1) : "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">
                          Promedio
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                        <p
                          className={`text-lg font-bold leading-tight ${
                            letterGrade(annualAvg)
                              ? LETTER_TEXT[letterGrade(annualAvg)!]
                              : "text-muted-foreground"
                          }`}
                        >
                          {letterGrade(annualAvg) ?? "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">
                          Nivel
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                        <p className="text-lg font-bold leading-tight text-[#1E2A5E]">
                          {student.courses_count ?? "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">
                          Cursos
                        </p>
                      </div>
                    </div>

                    {/* Bimester mini-summary */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Promedio por Bimestre
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {BIMESTERS.map((b, i) => {
                          const notes = gradesMap[student.id]?.[b] ?? [];
                          const avg = notes.length
                            ? notes.reduce((s, n) => s + n.note, 0) / notes.length
                            : null;
                          return (
                            <div key={b} className="text-center bg-gray-50 rounded-lg py-2">
                              <p className="text-xs text-muted-foreground">B{i + 1}</p>
                              <p className="text-sm font-bold text-[#1E2A5E]">
                                {avg != null ? avg.toFixed(1) : "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Acciones: seleccionan al hijo antes de navegar, así la
                        página destino muestra al alumno de esta tarjeta. */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        href="/father/grades"
                        className="flex-1"
                        onClick={() => selectStudent(student.id)}
                      >
                        <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10 text-sm">
                          Ver Notas
                        </Button>
                      </Link>
                      <Link
                        href="/father/attendance"
                        className="flex-1"
                        onClick={() => selectStudent(student.id)}
                      >
                        <Button
                          variant="outline"
                          className="w-full rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white h-10 text-sm transition-colors"
                        >
                          Asistencia
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modal de reclamo */}
      <ClaimChildModal
        open={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={() => reload()}
        canAddMore={canAddMore}
      />
    </div>
  );
}
