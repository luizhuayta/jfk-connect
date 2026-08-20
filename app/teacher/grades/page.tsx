"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";
import { useCompetencyGrid } from "@/components/grades/useCompetencyGrid";
import CompetencyGradeTable from "@/components/grades/CompetencyGradeTable";
import ScopeSelector, { type ScopeOption } from "@/components/grades/ScopeSelector";
import BimesterTabs from "@/components/grades/BimesterTabs";
import GradeSummaryCards from "@/components/grades/GradeSummaryCards";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { encodeScope, decodeScope } from "@/lib/grades/scopeValue";
import { computeGridStats } from "@/lib/grades/stats";

/**
 * Captura de notas por competencia. Antes: 464 líneas monolíticas con su
 * propio fetch/estado/tabla. Ahora: selector + tabs + tabla vienen de
 * components/grades/, y todo el fetch/dirty-tracking/guardado vive en
 * useCompetencyGrid — esta página solo arma las opciones del selector y
 * conecta las piezas.
 */
export default function TeacherGradesPage() {
  const { courses, tutoredSections, loading: coursesLoading, error: coursesError } = useTeacherCourses();
  const [scopeRaw, setScopeRaw] = useState<string | null>(null);
  const [bimester, setBimester] = useState(String(CURRENT_BIMESTER));

  const options: ScopeOption[] = useMemo(
    () => [
      ...courses.map((c) => ({
        value: encodeScope({ type: "course", courseId: c.id }),
        label: `${c.subject} · ${c.grade} "${c.section}"`,
      })),
      ...tutoredSections.map((t) => ({
        value: encodeScope({ type: "transversal", grade: t.grade, section: t.section }),
        label: `${t.grade} "${t.section}"`,
        group: "Competencias transversales",
      })),
    ],
    [courses, tutoredSections],
  );

  const activeRaw = scopeRaw ?? options[0]?.value ?? null;
  const scope = useMemo(() => (activeRaw ? decodeScope(activeRaw) : null), [activeRaw]);

  const grid = useCompetencyGrid(scope, Number(bimester));
  const stats = useMemo(
    () =>
      computeGridStats(
        grid.students.map((s) => s.id),
        grid.competencies.map((c) => c.id),
        (studentId, competencyId) => grid.getEntry(studentId, competencyId).score,
      ),
    [grid],
  );

  if (coursesLoading) return <LoadingState label="Cargando cursos..." />;
  if (coursesError) return <ErrorState message={coursesError} />;
  if (options.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-[#0F172A]">Notas</h1>
        <p className="text-muted-foreground">Todavía no tienes cursos asignados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Notas</h1>
          <p className="text-muted-foreground mt-1">Registro de competencias por bimestre</p>
        </div>
        <Button
          onClick={grid.save}
          disabled={grid.dirtyCount === 0 || grid.saving || grid.scope?.editable === false}
          className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
        >
          {grid.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {grid.dirtyCount > 0 ? `Guardar (${grid.dirtyCount})` : "Guardar"}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ScopeSelector options={options} value={activeRaw ?? ""} onChange={setScopeRaw} className="max-w-xs" />
        <BimesterTabs active={bimester} onSelect={setBimester} />
      </div>

      {grid.loading ? (
        <LoadingState label="Cargando notas..." />
      ) : grid.error ? (
        <ErrorState message={grid.error} onRetry={grid.reload} />
      ) : (
        <>
          <GradeSummaryCards stats={stats} />

          {grid.scope && !grid.scope.editable && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Este bimestre aún no está disponible para registro — puedes ver las notas pero no editarlas.
            </p>
          )}

          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <CompetencyGradeTable
                competencies={grid.competencies}
                students={grid.students}
                getEntry={grid.getEntry}
                readOnly={grid.scope?.editable === false}
                onScoreChange={grid.setScore}
                onConclusionChange={grid.setConclusion}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
