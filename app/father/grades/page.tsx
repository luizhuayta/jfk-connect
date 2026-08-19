"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import BimesterTiles from "@/components/father/BimesterSelector";
import { letterGrade, letterGradeColor, desempeñoLabel } from "@/lib/letter-grade";
import { downloadBoletín, printBoletín } from "@/lib/report-pdf";
import { SCHOOL_YEAR, SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

type GradeRow = {
  bimester: number;
  course: string;
  note: number;
  level: "AD" | "A" | "B" | "C" | null;
  letter_grade: string | null;
  observation: string;
};

const BIMESTERS = ["1", "2", "3", "4"];

const EMPTY_GRADES: Record<string, GradeRow[]> = {};

export default function GradesPage() {
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: student,
  } = useFatherStudents();
  const [activeBimester, setActiveBimester] = useState("1");
  const { data: studentGrades, error, handleRetry } = useCachedFatherResource<
    Record<string, GradeRow[]>
  >({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/grades",
    field: "grades",
    fallback: EMPTY_GRADES,
    errorMessage: "Error cargando notas",
  });

  const notes = studentGrades[activeBimester] ?? [];
  const average: number | null = notes.length
    ? notes.reduce((sum, n) => sum + n.note, 0) / notes.length
    : null;
  const levelLabel = desempeñoLabel(average);

  const bimesterAverages = BIMESTERS.map((b) => {
    const bn = studentGrades[b] ?? [];
    const avg: number | null = bn.length
      ? bn.reduce((s, n) => s + n.note, 0) / bn.length
      : null;
    return { label: b, avg };
  });

  // Descarga / imprime el boletín del bimestre activo. Usa las notas ya
  // cacheadas (todos los bimestres) y la asistencia se obtiene al vuelo.
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  const handleBoletín = async (action: "pdf" | "print") => {
    if (!activeStudentId || !student) return;
    setBusy(action);
    try {
      const opts = {
        studentId: activeStudentId,
        student: {
          name: student.name,
          grade: student.grade,
          section: student.section,
        },
        year: SCHOOL_YEAR,
        bimester: Number(activeBimester),
        grades: Object.values(studentGrades).flat(),
      };
      if (action === "pdf") await downloadBoletín(opts);
      else await printBoletín(opts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el boletín");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <LoadingState label="Cargando notas..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">Notas</h1>
        <p className="text-muted-foreground mt-1">
          Calificaciones por bimestre — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && (
        <>
          {/* Bimester strip */}
          <BimesterTiles
            averages={bimesterAverages}
            active={activeBimester}
            onSelect={setActiveBimester}
          />

          {/* Grades Card */}
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-base font-bold text-foreground">
                Bimestre {activeBimester}
                {student ? ` — ${student.name}` : ""}
              </h2>

              {/* Grade Table */}
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-foreground font-semibold text-sm">Curso</TableHead>
                      <TableHead className="text-foreground font-semibold text-sm">Nota</TableHead>
                      <TableHead className="text-foreground font-semibold text-sm">Nivel</TableHead>
                      <TableHead className="text-right text-foreground font-semibold text-sm">
                        Observación
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                          Aún no hay notas registradas para este bimestre.
                        </TableCell>
                      </TableRow>
                    )}
                    {notes.map((row, idx) => {
                      const ltr = letterGrade(row.note);
                      return (
                        <TableRow key={idx} className="hover:bg-gray-50/50">
                          <TableCell className="text-sm font-medium text-foreground py-2.5">
                            {row.course}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span
                              className={`text-sm font-bold ${
                                row.note >= 17
                                  ? "text-emerald-600"
                                  : row.note >= 14
                                  ? "text-primary"
                                  : "text-amber-600"
                              }`}
                            >
                              {row.note.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {/* Letra canónica: viene del trigger de BD (letter_grade);
                                fallback al cálculo local por si la fila es vieja. */}
                            {ltr ? (
                              <Badge className={`text-[11px] font-bold ${letterGradeColor(row.letter_grade ?? ltr)}`}>
                                {row.letter_grade ?? ltr}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground py-2.5 whitespace-normal break-words max-w-[220px]">
                            {row.observation}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Promedio */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-primary rounded-xl px-6 py-5">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/80">
                      Promedio del Bimestre {activeBimester}
                    </p>
                    <p className="text-3xl font-bold text-accent mt-1">
                      {average != null ? average.toFixed(1) : "—"}
                    </p>
                  </div>
                  {letterGrade(average) && (
                    <div
                      className={`h-14 w-14 rounded-xl border-2 flex items-center justify-center font-bold text-xl ${letterGradeColor(letterGrade(average))}`}
                    >
                      {letterGrade(average)}
                    </div>
                  )}
                </div>
                <Badge className="bg-accent text-primary font-bold text-sm px-3 py-1 hover:bg-accent">
                  {levelLabel}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleBoletín("pdf")}
                  disabled={busy !== null || notes.length === 0}
                  variant="outline"
                  className="rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors gap-2"
                >
                  {busy === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Descargar Boletín PDF
                </Button>
                <Button
                  onClick={() => handleBoletín("print")}
                  disabled={busy !== null || notes.length === 0}
                  variant="outline"
                  className="rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors gap-2"
                >
                  {busy === "print" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Printer className="h-4 w-4" aria-hidden />
                  )}
                  Imprimir Reporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
