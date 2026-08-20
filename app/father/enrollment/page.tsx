"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  CalendarDays,
  BookOpen,
  Clock,
  Hash,
  GraduationCap,
  User,
  Download,
  Loader2,
} from "lucide-react";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { getInitials, formatDate } from "@/lib/format";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { toast } from "sonner";
import { downloadConstancia } from "@/lib/report";

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

// Clases completas y estáticas (incluyen hover) para evitar el patrón inválido
// `hover:${...}` que Tailwind no genera.
const STATUS_CONFIG = {
  regular:     { label: "Matriculado",  bg: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  condicional: { label: "Condicional",  bg: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  pendiente:   { label: "Pendiente",    bg: "bg-red-100 text-red-700 hover:bg-red-100" },
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

  // Fuente de verdad: columnas reales docs_submitted / docs_total. El checklist
  // detallado solo se muestra si el colegio publicó el JSONB `docs`; antes se
  // fabricaba marcando como entregados los primeros N documentos de una lista
  // fija, lo que mostraba información falsa al padre.
  const docsOk    = enrollment?.docsSubmitted ?? 0;
  const docsTotal = enrollment?.docsTotal ?? 0;
  const docsPercent = docsTotal ? Math.round((docsOk / docsTotal) * 100) : 0;
  const docList: EnrollmentDoc[] = enrollment?.docs ?? [];

  const initials = student ? getInitials(student.name) : "";

  const enrolledDate = enrollment ? formatDate(enrollment.enrolledAt) : "—";

  // Descarga la constancia de matrícula del alumno activo.
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
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary">Matrícula</h1>
        <p className="text-muted-foreground mt-1">
          Estado de matrícula — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 &&
        (enrollment ? (
          <>
            {/* Status banner — el estado ya lo comunica el Badge de la derecha,
                sin necesitar además una barra de acento lateral redundante. */}
            <div className="flex items-center justify-between bg-primary rounded-xl px-6 py-5 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-accent/40">
                  <AvatarFallback className="bg-accent/20 text-accent font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-bold text-lg">{student?.name}</p>
                  <p className="text-white/80 text-sm">
                    {enrollment.grade} &quot;{enrollment.section}&quot; · {enrollment.shift}
                  </p>
                </div>
              </div>
              <Badge className={`text-sm font-bold px-4 py-2 ${STATUS_CONFIG[enrollment.status].bg}`}>
                {STATUS_CONFIG[enrollment.status].label}
              </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Enrollment details */}
              <Card className="border-none shadow-sm rounded-xl">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-bold text-foreground">Datos de Matrícula</h2>
                  <div className="space-y-2">
                    {[
                      { icon: Hash,          label: "Código",            value: enrollment.code },
                      { icon: CalendarDays,  label: "Fecha de matrícula", value: enrolledDate },
                      { icon: GraduationCap, label: "Grado y sección",   value: `${enrollment.grade} "${enrollment.section}"` },
                      { icon: Clock,         label: "Turno",             value: enrollment.shift },
                      { icon: BookOpen,      label: "Aula asignada",     value: enrollment.classroom },
                      { icon: User,          label: "Tutor",             value: enrollment.tutor },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <row.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                          <span className="text-sm font-semibold text-foreground text-right">
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleDownloadConstancia}
                    disabled={busy}
                    className="w-full bg-accent text-primary font-semibold hover:bg-accent-hover rounded-lg h-10 gap-2"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden />
                    )}
                    Descargar constancia de matrícula
                  </Button>
                </CardContent>
              </Card>

              {/* Documents checklist */}
              <Card className="border-none shadow-sm rounded-xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground">Documentos</h2>
                    <Badge
                      className={`text-xs font-bold ${
                        docsPercent === 100
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      {docsOk}/{docsTotal} entregados
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Progreso
                      </span>
                      <span className="text-base font-bold text-primary">{docsPercent}%</span>
                    </div>
                    <div
                      className="h-3 bg-gray-100 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={docsPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Documentos entregados"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          docsPercent === 100
                            ? "bg-emerald-500"
                            : docsPercent >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${docsPercent}%` }}
                      />
                    </div>
                  </div>

                  {docList.length > 0 ? (
                    <div className="space-y-2">
                      {docList.map((doc) => (
                        <div
                          key={doc.label}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            doc.submitted
                              ? "bg-emerald-50 border-emerald-100"
                              : "bg-red-50 border-red-100"
                          }`}
                        >
                          {doc.submitted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              doc.submitted ? "text-emerald-800" : "text-red-700"
                            }`}
                          >
                            {doc.label}
                          </span>
                          <span className="ml-auto text-xs font-semibold">
                            {doc.submitted ? (
                              <span className="text-emerald-600">Entregado</span>
                            ) : (
                              <span className="text-red-600">Pendiente</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      El colegio aún no publicó el detalle de los documentos. Consulta
                      en Secretaría cuáles te faltan entregar.
                    </p>
                  )}

                  {docsTotal > 0 && docsPercent < 100 && (
                    <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      Tienes documentos pendientes. Preséntate a Secretaría de lunes a
                      viernes de 8:00 a 13:00 hrs.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="border-none shadow-sm rounded-xl">
            <CardContent className="p-12 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden />
              <p className="text-muted-foreground">
                {student
                  ? `No se encontró información de matrícula de ${student.name}.`
                  : "No se encontró información de matrícula."}
              </p>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
