"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { formatDate } from "@/lib/format";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { toast } from "sonner";
import { downloadConstancia } from "@/lib/report";
import { honorLinkClass, paperCardClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";

type EnrollmentDoc = { label: string; submitted: boolean };

type Enrollment = {
  studentId: string;
  code: string;
  year: number;
  grade: string;
  section: string;
  shift: string;
  classroom: string;
  enrolledAt: string;
  status: "regular" | "condicional" | "pendiente";
  docs: EnrollmentDoc[];
  docsTotal: number;
  docsSubmitted: number;
  tutor: string;
};

const STATUS_WORD: Record<Enrollment["status"], { label: string; className: string }> = {
  regular: { label: "Matriculado", className: "text-emerald-800" },
  condicional: { label: "Condicional", className: "text-amber-800" },
  pendiente: { label: "Pendiente", className: "text-red-700" },
};

export default function EnrollmentPage() {
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: student,
  } = useFatherStudents();
  const {
    data: enrollment,
    error,
    handleRetry,
  } = useCachedFatherResource<Enrollment | null>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/enrollment",
    field: "enrollment",
    fallback: null,
    errorMessage: "Error cargando matrícula",
  });

  const docsOk = enrollment?.docsSubmitted ?? 0;
  const docsTotal = enrollment?.docsTotal ?? 0;
  const docList: EnrollmentDoc[] = enrollment?.docs ?? [];
  const enrolledDate = enrollment ? formatDate(enrollment.enrolledAt) : "—";
  const [busy, setBusy] = useState(false);

  const handleDownloadConstancia = async () => {
    if (!student || !enrollment) return;
    setBusy(true);
    try {
      await downloadConstancia({
        student: {
          name: student.name,
          grade: enrollment.grade,
          section: enrollment.section,
        },
        code: enrollment.code,
        year: enrollment.year,
        shift: enrollment.shift,
        classroom: enrollment.classroom,
        tutor: enrollment.tutor,
        docsSubmitted: enrollment.docsSubmitted,
        docsTotal: enrollment.docsTotal,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar la constancia");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Cargando matrícula..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">Matrícula</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">{SCHOOL_YEAR_LABEL}</p>
      </div>

      <ChildSelector />

      {students.length > 0 &&
        (enrollment ? (
          <section className={cn(paperCardClass, "p-5 sm:p-8")}>
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-outline-variant pb-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-on-surface">
                  {student?.name}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {enrollment.grade} &quot;{enrollment.section}&quot; · Turno {enrollment.shift}
                </p>
              </div>
              <p className={cn("text-sm font-semibold", STATUS_WORD[enrollment.status].className)}>
                {STATUS_WORD[enrollment.status].label}
              </p>
            </header>

            <dl className="mt-6 divide-y divide-outline-variant/70">
              {[
                { label: "Código de matrícula", value: enrollment.code, mono: true },
                { label: "Fecha de matrícula", value: enrolledDate },
                { label: "Grado y sección", value: `${enrollment.grade} "${enrollment.section}"` },
                { label: "Turno", value: enrollment.shift },
                { label: "Aula", value: enrollment.classroom },
                { label: "Tutor", value: enrollment.tutor },
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-6"
                >
                  <dt className="text-xs font-medium text-on-surface-variant">{row.label}</dt>
                  <dd
                    className={cn(
                      "text-sm font-semibold text-on-surface",
                      row.mono && "font-mono tabular-nums tracking-wide",
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              onClick={handleDownloadConstancia}
              disabled={busy}
              className={cn(honorLinkClass, "mt-6 disabled:opacity-60")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Descargar constancia de matrícula
            </button>

            <div className="mt-10 border-t border-outline-variant pt-8">
              <h3 className="text-base font-bold text-on-surface">Documentos</h3>
              {docsTotal > 0 ? (
                <p className="mt-1 text-sm text-on-surface-variant">
                  {docsOk} de {docsTotal} entregados
                </p>
              ) : null}

              {docList.length > 0 ? (
                <ul className="mt-4 divide-y divide-outline-variant/70">
                  {docList.map((doc) => (
                    <li
                      key={doc.label}
                      className="flex items-baseline justify-between gap-4 py-2.5"
                    >
                      <span className="text-sm text-on-surface">{doc.label}</span>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          doc.submitted ? "text-emerald-800" : "text-amber-800",
                        )}
                      >
                        {doc.submitted ? "Entregado" : "Pendiente"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-on-surface-variant">
                  El colegio aún no publicó el detalle de los documentos. Consulte en Secretaría
                  cuáles faltan entregar.
                </p>
              )}

              {docsTotal > 0 && docsOk < docsTotal && (
                <p className="mt-4 text-sm text-on-surface-variant">
                  Tiene documentos pendientes. Preséntese en Secretaría de lunes a viernes de 8:00 a
                  13:00.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className={cn(paperCardClass, "p-8")}>
            <p className="text-sm text-on-surface-variant">
              {student
                ? `No se encontró información de matrícula de ${student.name}.`
                : "No se encontró información de matrícula."}
            </p>
          </section>
        ))}
    </div>
  );
}
