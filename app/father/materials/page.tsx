"use client";

import { BookOpen } from "lucide-react";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { formatShortDate } from "@/lib/format";
import { paperCardClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";
import type { CourseMaterials, MaterialType } from "@/lib/father/types";

const TYPE_LABEL: Record<MaterialType, string> = {
  pdf: "PDF",
  pptx: "Presentación",
  docx: "Documento",
  xlsx: "Hoja de cálculo",
  img: "Imagen",
};

const EMPTY_COURSES: CourseMaterials[] = [];

export default function MaterialsPage() {
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: student,
  } = useFatherStudents();
  const {
    data: courses,
    error,
    handleRetry,
    loading: materialsLoading,
  } = useCachedFatherResource<CourseMaterials[]>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/materials",
    field: "courses",
    fallback: EMPTY_COURSES,
    errorMessage: "Error cargando materiales",
  });
  const coursesWithMaterials = courses.filter((c) => c.materials.length > 0);

  if (loading) return <LoadingState label="Cargando materiales..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">
          Materiales
        </h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          Para revisar en clase — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      <ChildSelector />

      {students.length > 0 && materialsLoading && courses.length === 0 && (
        <p className="text-sm text-on-surface-variant">Cargando materiales…</p>
      )}

      {students.length > 0 && (
        <>
          <p className={cn(paperCardClass, "p-4 text-sm text-on-surface")}>
            El colegio publica el listado de lo que se trabaja en aula. No hay
            archivo para descargar: se consulta con el docente en clase.
          </p>

          {coursesWithMaterials.length === 0 ? (
            <div className={cn(paperCardClass, "px-6 py-14 text-center")}>
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-on-surface-variant" aria-hidden />
              <p className="text-sm text-on-surface-variant">
                {student
                  ? `Aún no hay materiales publicados para ${student.name}.`
                  : "No hay materiales publicados."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {coursesWithMaterials.map((course) => (
                <section key={course.id} className={cn(paperCardClass, "overflow-hidden")}>
                  <div className="flex items-center justify-between bg-primary px-5 py-3">
                    <h2 className="text-sm font-bold text-white">{course.subject}</h2>
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {course.materials.length}{" "}
                      {course.materials.length === 1 ? "material" : "materiales"}
                    </span>
                  </div>
                  <ul className="divide-y divide-outline-variant/60">
                    {course.materials.map((m) => (
                      <li key={m.id} className="flex items-start gap-4 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight text-on-surface">
                            {m.title}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {TYPE_LABEL[m.type as MaterialType] ?? m.type}
                            {m.topic ? ` · ${m.topic}` : ""}
                            {m.size ? ` · ${m.size}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-on-surface-variant">
                          {formatShortDate(m.uploadedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
