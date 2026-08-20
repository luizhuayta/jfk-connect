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
import StatCard from "@/components/father/StatCard";
import BimesterTiles from "@/components/father/BimesterSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { levelBadgeClass, levelTextClass, dominantLevel, type Level } from "@/lib/grades/scale";
import { getInitials } from "@/lib/format";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useFatherStudents, type FatherStudent } from "@/components/father/useFatherStudents";
import { BIMESTERS } from "@/lib/grades/bimesters";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";

/** Máximo de hijos que un padre puede vincular (límite del claim). */
const MAX_CHILDREN = 5;

// Estado real del alumno (tabla students.status). 'activo' → Matriculado.
const STUDENT_STATUS: Record<string, { label: string; bg: string }> = {
  activo:     { label: "Matriculado", bg: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  retirado:   { label: "Retirado",    bg: "bg-red-100 text-red-600 hover:bg-red-100" },
  trasladado: { label: "Trasladado",  bg: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
};

export default function StudentsPage() {
  const { students, loading, error, reload, selectStudent } = useFatherStudents();
  const [libretaMap, setLibretaMap] = useState<Record<string, LibretaData>>({});
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Cargar la libreta de todos los hijos en paralelo (para el resumen por
  // nivel) al llegar la lista. Mismo endpoint que /father/grades — un solo
  // origen de verdad para lo que el padre ve de sus hijos.
  const loadAllLibretas = useCallback(async (list: FatherStudent[]) => {
    const results = await Promise.all(
      list.map(async (s) => {
        try {
          const r = await fetch(`/api/libreta?studentId=${s.id}`);
          const d = await r.json();
          return [s.id, d.ok ? (d.libreta as LibretaData) : null] as const;
        } catch {
          return [s.id, null] as const;
        }
      }),
    );
    setLibretaMap(Object.fromEntries(results.filter(([, v]) => v !== null)) as Record<string, LibretaData>);
  }, []);

  // Guard por conjunto de hijos: recarga solo cuando cambia la lista (p. ej.
  // tras vincular un hijo nuevo), evita re-fetchs en re-renders y mantiene el
  // effect sin setState síncrono (el setState vive tras el await).
  const loadedStudentsKey = useRef("");
  useEffect(() => {
    const key = students.map((s) => s.id).join(",");
    if (students.length > 0 && loadedStudentsKey.current !== key) {
      loadedStudentsKey.current = key;
      loadAllLibretas(students);
    }
  }, [students, loadAllLibretas]);

  /** Nivel predominante entre todas las competencias/bimestres calificados del año. */
  const getAnnualLevel = (studentId: string): Level | null => {
    const libreta = libretaMap[studentId];
    if (!libreta) return null;
    const levels = libreta.areas.flatMap((a) => a.competencies.flatMap((c) => Object.values(c.bimesters).map((b) => b.level)));
    return dominantLevel(levels);
  };

  /** Nivel predominante de un bimestre puntual, entre todas las áreas. */
  const getBimesterLevel = (studentId: string, bimester: BimesterKey): Level | null => {
    const libreta = libretaMap[studentId];
    if (!libreta) return null;
    const levels = libreta.areas.flatMap((a) => a.competencies.map((c) => c.bimesters[bimester].level));
    return dominantLevel(levels);
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
          <h1 className="text-2xl lg:text-3xl font-bold text-primary">Mis Hijos</h1>
          <p className="text-muted-foreground mt-1">
            Alumnos matriculados — {SCHOOL_YEAR_LABEL}
          </p>
        </div>
        {students.length > 0 && (
          canAddMore ? (
            <Button
              onClick={() => setShowClaimModal(true)}
              className="bg-primary text-white hover:bg-primary-hover rounded-xl h-10 gap-2 font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden /> Agregar hijo
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground max-w-[220px] text-right">
              Llegaste al máximo de {MAX_CHILDREN} hijos vinculados.
            </p>
          )
        )}
      </div>

      {students.length === 0 ? (
        <NoChildrenState onAddChild={() => setShowClaimModal(true)} />
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={CheckCircle2}
              value={students.length}
              label="Hijos matriculados"
              tone="primary"
            />
            <StatCard
              icon={Star}
              value={generalAverage != null ? generalAverage.toFixed(1) : "—"}
              label="Promedio general"
              tone="warning"
            />
            <StatCard
              icon={TrendingUp}
              value={averageAttendance != null ? `${averageAttendance}%` : "—"}
              label="Asistencia promedio"
              tone="success"
            />
          </div>

          {/* Student Cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            {students.map((student) => {
              const annualLevel = getAnnualLevel(student.id);
              const statusCfg = STUDENT_STATUS[student.status ?? "activo"] ?? STUDENT_STATUS.activo;

              const bimesterLevels = BIMESTERS.map((b) => ({
                label: b,
                level: getBimesterLevel(student.id, Number(b) as BimesterKey),
              }));

              return (
                <Card
                  key={student.id}
                  className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-accent/30">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-base leading-tight">
                          {student.name}
                        </p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="bg-gray-100 text-muted-foreground text-[11px]">
                            {student.grade} &quot;{student.section}&quot;
                          </Badge>
                          <Badge className={`${statusCfg.bg} text-[11px]`}>{statusCfg.label}</Badge>
                        </div>
                      </div>
                      {annualLevel && (
                        <div
                          className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg shrink-0 ${levelBadgeClass(annualLevel)}`}
                        >
                          {annualLevel}
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                        <p
                          className={`text-lg font-bold leading-tight ${
                            annualLevel ? levelTextClass(annualLevel) : "text-muted-foreground"
                          }`}
                        >
                          {annualLevel ?? "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">
                          Nivel general
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                        <p className="text-lg font-bold leading-tight text-primary">
                          {student.courses_count ?? "—"}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">
                          Cursos
                        </p>
                      </div>
                    </div>

                    {/* Bimester mini-summary */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Promedio por Bimestre
                      </p>
                      <BimesterTiles averages={bimesterLevels} compact />
                    </div>

                    {/* Acciones: seleccionan al hijo antes de navegar, así la
                        página destino muestra al alumno de esta tarjeta. */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        href="/father/grades"
                        className="flex-1"
                        onClick={() => selectStudent(student.id)}
                      >
                        <Button className="w-full bg-accent text-primary font-semibold hover:bg-accent-hover rounded-lg h-10 text-sm">
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
                          className="w-full rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white h-10 text-sm transition-colors"
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
