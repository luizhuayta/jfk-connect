"use client";

import { useMemo } from "react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";
import ImportWizard from "@/components/imports/ImportWizard";
import { buildTeacherScopeOptions } from "@/lib/teacher/scope-options";

/**
 * Importar notas desde Excel/CSV/foto — mismas opciones de scope que
 * /teacher/grades (cursos propios + secciones donde es tutor).
 */
export default function TeacherImportsPage() {
  const { courses, tutoredSections, loading, error } = useTeacherCourses();

  const options = useMemo(
    () => buildTeacherScopeOptions(courses, tutoredSections),
    [courses, tutoredSections],
  );

  if (loading) return <LoadingState label="Cargando cursos..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Importar notas</h1>
        <p className="text-muted-foreground mt-1">
          Sube un Excel, CSV, o una foto de tu acta de notas — revisa las coincidencias antes de aplicarlas.
        </p>
      </div>

      <ImportWizard scopeOptions={options} />
    </div>
  );
}
