"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FileImage, Presentation, Sheet, BookOpen, FolderOpen } from "lucide-react";
import StatCard from "@/components/father/StatCard";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { formatShortDate } from "@/lib/format";

type MaterialType = "pdf" | "pptx" | "docx" | "xlsx" | "img";

type Material = {
  id: string;
  title: string;
  type: MaterialType;
  size: string;
  topic: string;
  uploadedAt: string;
};

type CourseMaterials = {
  id: string;
  subject: string;
  materials: Material[];
};

const TYPE_META: Record<MaterialType, { label: string; icon: typeof FileText; bg: string; text: string; border: string }> = {
  pdf:  { label: "PDF",  icon: FileText,     bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"  },
  pptx: { label: "PPTX", icon: Presentation, bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  docx: { label: "DOCX", icon: FileText,     bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200"  },
  xlsx: { label: "XLSX", icon: Sheet,        bg: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-200"},
  img:  { label: "IMG",  icon: FileImage,    bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200"},
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
  const totalMaterials = courses.reduce((n, c) => n + c.materials.length, 0);

  if (loading) return <LoadingState label="Cargando materiales..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">Materiales</h1>
        <p className="text-muted-foreground mt-1">
          Recursos compartidos por los docentes — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={FolderOpen} value={courses.length} label="Cursos" tone="primary" />
            <StatCard
              icon={BookOpen}
              value={totalMaterials}
              label="Materiales publicados"
              tone="warning"
            />
          </div>

          {/* List grouped by course */}
          {coursesWithMaterials.length === 0 ? (
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden />
                <p className="text-muted-foreground">
                  {student
                    ? `Aún no hay materiales publicados para ${student.name}.`
                    : "No hay materiales publicados."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {coursesWithMaterials.map((course) => (
                <Card key={course.id} className="border-none shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between bg-primary px-5 py-3">
                      <h2 className="text-sm font-bold text-white">{course.subject}</h2>
                      {/* Dorado sólido (no al 25% de opacidad): mismo color
                          institucional, mejor contraste sobre el navy. */}
                      <Badge className="bg-accent text-primary text-[11px] font-bold hover:bg-accent">
                        {course.materials.length} archivo{course.materials.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {course.materials.map((m) => {
                        const meta = TYPE_META[m.type];
                        const Icon = meta.icon;
                        return (
                          <li
                            key={m.id}
                            className="flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors"
                          >
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${meta.bg} ${meta.border}`}
                            >
                              <Icon className={`h-5 w-5 ${meta.text}`} aria-hidden />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {m.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge className={`text-[10px] font-bold px-1.5 py-0.5 border-0 ${meta.bg} ${meta.text}`}>
                                  {meta.label}
                                </Badge>
                                {m.size && (
                                  <span className="text-[10px] text-muted-foreground">{m.size}</span>
                                )}
                                {m.topic && (
                                  <span className="text-[10px] text-muted-foreground bg-gray-100 rounded px-1.5 py-0.5">
                                    {m.topic}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatShortDate(m.uploadedAt)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            Los materiales se consultan en clase con el docente: por ahora el
            colegio solo publica el listado, sin archivo descargable.
          </p>
        </>
      )}
    </div>
  );
}
