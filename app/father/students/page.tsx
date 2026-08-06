"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, CheckCircle2, Loader2, Plus, GraduationCap } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import { letterGrade, letterGradeColor } from "@/lib/letter-grade";

type Student = {
  id: string;
  name: string;
  grade: string;
  section: string;
  attendance_rate: number;
};

type GradeRow = { bimester: number; note: number };

const BIMESTERS = ["1", "2", "3", "4"];

function getLevel(avg: number) {
  if (avg >= 18) return { label: "AD", color: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A", color: "bg-blue-100 text-blue-700" };
  if (avg >= 11) return { label: "B", color: "bg-amber-100 text-amber-700" };
  return { label: "C", color: "bg-red-100 text-red-700" };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, GradeRow[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/father/students");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setStudents(data.students);
        // Cargar notas de todos los hijos en paralelo (para promedios)
        const results = await Promise.all(
          data.students.map(async (s: Student) => {
            const gr = await fetch(`/api/father/grades?studentId=${s.id}`);
            const gd = await gr.json();
            return [s.id, gd.ok ? gd.grades : {}] as const;
          }),
        );
        setGradesMap(Object.fromEntries(results));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getAnnualAverage = (studentId: string) => {
    const allNotes = Object.values(gradesMap[studentId] ?? {}).flat();
    if (!allNotes.length) return 0;
    return allNotes.reduce((sum, n) => sum + n.note, 0) / allNotes.length;
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando alumnos...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E2A5E]">Mis Hijos</h1>
          <p className="text-muted-foreground mt-1">
            Alumnos matriculados — Año Lectivo 2026
          </p>
        </div>
        {students.length < 5 && (
          <Button
            onClick={() => setShowClaimModal(true)}
            className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" /> Agregar hijo
          </Button>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-[#1E2A5E]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E2A5E]/10">
              <CheckCircle2 className="h-5 w-5 text-[#1E2A5E]" />
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
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E2A5E]">12</p>
              <p className="text-xs text-muted-foreground">Cursos por alumno</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-xl border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E2A5E]">
                {students.length
                  ? Math.round(
                      students.reduce((s, st) => s + st.attendance_rate, 0) / students.length,
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-muted-foreground">Asistencia promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Cards */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No tienes hijos vinculados. Usa tu código de matrícula para vincularlos.
          </p>
          <Button
            onClick={() => setShowClaimModal(true)}
            className="bg-[#1E2A5E] text-white hover:bg-[#162043] gap-2"
          >
            <Plus className="h-4 w-4" /> Vincular a mi hijo
          </Button>
        </div>
      ) : (
      <div className="grid gap-6 sm:grid-cols-2">
        {students.map((student) => {
          const initials = student.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const annualAvg = getAnnualAverage(student.id);
          const level = getLevel(annualAvg);
          const avgTextColor =
            annualAvg >= 17
              ? "text-emerald-600"
              : annualAvg >= 14
              ? "text-blue-600"
              : "text-amber-600";
          const avgBg =
            annualAvg >= 17
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
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0F172A] text-base leading-tight">{student.name}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-[#64748B] text-[11px]"
                      >
                        {student.grade} &quot;{student.section}&quot;
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 text-[11px] hover:bg-emerald-100">
                        Matriculado
                      </Badge>
                    </div>
                  </div>
                  {letterGrade(annualAvg) && (
                    <div className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg shrink-0 ${letterGradeColor(letterGrade(annualAvg))}`}>
                      {letterGrade(annualAvg)}
                    </div>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className={`rounded-xl ${avgBg} p-2.5 text-center`}>
                    <p className={`text-lg font-bold leading-tight ${avgTextColor}`}>
                      {annualAvg.toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">Promedio</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                    <p className={`text-lg font-bold leading-tight ${level.color.split(" ")[1]}`}>{level.label}</p>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">Nivel</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2.5 text-center">
                    <p className="text-lg font-bold leading-tight text-[#1E2A5E]">12</p>
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mt-0.5">Cursos</p>
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
                      const avg =
                        notes.reduce((s, n) => s + n.note, 0) / (notes.length || 1);
                      return (
                        <div key={b} className="text-center bg-gray-50 rounded-lg py-2">
                          <p className="text-xs text-muted-foreground">B{i + 1}</p>
                          <p className="text-sm font-bold text-[#1E2A5E]">
                            {avg.toFixed(1)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link href="/father/grades" className="flex-1">
                    <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10 text-sm">
                      Ver Notas
                    </Button>
                  </Link>
                  <Link href="/father/attendance" className="flex-1">
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
      )}

      {/* Modal de reclamo */}
      <ClaimChildModal
        open={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={async () => {
          // Recargar estudiantes tras reclamo
          try {
            const r = await fetch("/api/father/students");
            const data = await r.json();
            if (data.ok) setStudents(data.students);
          } catch {
            // silencioso
          }
        }}
        canAddMore={students.length < 5}
      />
    </div>
  );
}
