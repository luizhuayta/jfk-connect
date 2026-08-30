"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2, Pencil, Eye, Sparkles } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useCompetencyGrid } from "@/components/grades/useCompetencyGrid";
import { useConclusionsAi } from "@/components/grades/useConclusionsAi";
import CompetencyGradeTable from "@/components/grades/CompetencyGradeTable";
import GenerateConclusionsModal from "@/components/grades/GenerateConclusionsModal";
import ScopeSelector, { type ScopeOption } from "@/components/grades/ScopeSelector";
import BimesterTabs from "@/components/grades/BimesterTabs";
import GradeSummaryCards from "@/components/grades/GradeSummaryCards";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { encodeScope, decodeScope } from "@/lib/grades/scopeValue";
import { computeGridStats } from "@/lib/grades/stats";

type AdminCourseOption = { id: string; subject: string; grade: string; section: string };
type SectionOption = { grade: string; section: string };

/**
 * Vista del admin: misma grilla que el docente (CompetencyGradeTable), en
 * modo solo-lectura por defecto con un botón "Editar notas" que la
 * desbloquea — evita ediciones accidentales sobre las ~700 secciones del
 * colegio. A diferencia del docente, el admin puede elegir "Competencias
 * transversales" de CUALQUIER sección (no solo donde es tutor — el guard
 * del servidor ya lo permite para el rol admin).
 */
export default function AdminGradesPage() {
  const [courses, setCourses] = useState<AdminCourseOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [scopeRaw, setScopeRaw] = useState<string | null>(null);
  const [bimester, setBimester] = useState(String(CURRENT_BIMESTER));
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    (async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const r = await fetch("/api/admin/courses");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCourses(data.courses);
        setSections(data.sections ?? []);
      } catch (err) {
        setCoursesError(err instanceof Error ? err.message : "Error cargando cursos");
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, []);

  const options: ScopeOption[] = useMemo(
    () => [
      ...courses.map((c) => ({
        value: encodeScope({ type: "course", courseId: c.id }),
        label: `${c.subject} · ${c.grade} "${c.section}"`,
      })),
      ...sections.map((s) => ({
        value: encodeScope({ type: "transversal", grade: s.grade, section: s.section }),
        label: `${s.grade} "${s.section}"`,
        group: "Competencias transversales",
      })),
    ],
    [courses, sections],
  );

  const activeRaw = scopeRaw ?? options[0]?.value ?? null;
  const scope = useMemo(() => (activeRaw ? decodeScope(activeRaw) : null), [activeRaw]);

  const grid = useCompetencyGrid(scope, Number(bimester));
  const readOnly = !editMode || grid.scope?.editable === false;
  const stats = useMemo(
    () =>
      computeGridStats(
        grid.students.map((s) => s.id),
        grid.competencies.map((c) => c.id),
        (studentId, competencyId) => grid.getEntry(studentId, competencyId).score,
      ),
    [grid],
  );

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const conclusionsAi = useConclusionsAi({ scope, bimester: Number(bimester), applySuggestions: grid.applySuggestions });
  const gradedStudentIds = useMemo(
    () =>
      grid.students
        .filter((s) => grid.competencies.some((c) => grid.getEntry(s.id, c.id).score !== null))
        .map((s) => s.id),
    [grid],
  );

  if (coursesLoading) return <LoadingState label="Cargando cursos..." />;
  if (coursesError) return <ErrorState message={coursesError} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Notas</h1>
          <p className="text-muted-foreground mt-1">Registro académico por curso y bimestre · Año Lectivo 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditMode((v) => !v)}
            className="rounded-xl h-10 gap-2 font-semibold"
          >
            {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editMode ? "Ver solo lectura" : "Editar notas"}
          </Button>
          {editMode && conclusionsAi.aiAvailable && (
            <Button
              variant="outline"
              onClick={() => setShowGenerateModal(true)}
              disabled={grid.scope?.editable === false || gradedStudentIds.length === 0}
              className="rounded-xl h-10 gap-2 font-semibold border-[#1E2A5E] text-[#1E2A5E] hover:bg-[#1E2A5E]/5"
            >
              <Sparkles className="h-4 w-4" />
              Generar conclusiones
            </Button>
          )}
          {editMode && (
            <Button
              onClick={grid.save}
              disabled={grid.dirtyCount === 0 || grid.saving || grid.scope?.editable === false}
              className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
            >
              {grid.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {grid.dirtyCount > 0 ? `Guardar (${grid.dirtyCount})` : "Guardar"}
            </Button>
          )}
        </div>
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

          {editMode && grid.scope && !grid.scope.editable && (
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
                readOnly={readOnly}
                onScoreChange={grid.setScore}
                onConclusionChange={grid.setConclusion}
                onGenerateConclusions={
                  editMode && conclusionsAi.aiAvailable ? conclusionsAi.generateForStudent : undefined
                }
                generatingFor={conclusionsAi.generatingFor}
              />
            </CardContent>
          </Card>
        </>
      )}

      <GenerateConclusionsModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        studentCount={gradedStudentIds.length}
        generating={conclusionsAi.generatingBatch}
        progress={conclusionsAi.progress}
        onGenerate={async () => {
          await conclusionsAi.generateForSection(gradedStudentIds);
          setShowGenerateModal(false);
        }}
      />
    </div>
  );
}
