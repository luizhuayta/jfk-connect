"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { getInitials } from "@/lib/format";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { honorLinkClass, paperCardClass, quietLinkClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";

import { MAX_CHILDREN } from "@/lib/father/claim-student";

const STUDENT_STATUS: Record<string, { label: string; className: string }> = {
  activo: { label: "Matriculado", className: "bg-emerald-100 text-emerald-800" },
  retirado: { label: "Retirado", className: "bg-red-100 text-red-800" },
  trasladado: { label: "Trasladado", className: "bg-amber-100 text-amber-800" },
};

export default function StudentsPage() {
  const { students, loading, error, reload, selectStudent } = useFatherStudents();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const canAddMore = students.length < MAX_CHILDREN;

  if (loading) return <LoadingState label="Cargando a sus hijos..." />;

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">
            Mis hijos
          </h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Ficha de vínculo y matrícula — {SCHOOL_YEAR_LABEL}
          </p>
        </div>
        {students.length > 0 &&
          (canAddMore ? (
            <Button
              onClick={() => setShowClaimModal(true)}
              variant="outline"
              className="h-11 gap-1.5 rounded-lg font-semibold"
            >
              <Plus className="h-4 w-4" aria-hidden /> Vincular a su hijo
            </Button>
          ) : (
            <p className="max-w-[220px] text-right text-xs text-on-surface-variant">
              Llegó al máximo de {MAX_CHILDREN} hijos vinculados.
            </p>
          ))}
      </div>

      {students.length === 0 ? (
        <NoChildrenState onAddChild={() => setShowClaimModal(true)} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {students.map((student) => {
            const statusCfg =
              STUDENT_STATUS[student.status ?? "activo"] ?? STUDENT_STATUS.activo;
            return (
              <section key={student.id} className={cn(paperCardClass, "p-5")}>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-accent/40">
                    <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                      {getInitials(student.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-on-surface">
                      {student.name}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {student.grade} &quot;{student.section}&quot;
                      {student.shift ? ` · ${student.shift}` : ""}
                    </p>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        statusCfg.className,
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {student.status && student.status !== "activo" && (
                  <p className="mt-4 rounded-xl bg-error-container px-3 py-2 text-sm text-on-error-container">
                    Este alumno está {statusCfg.label.toLowerCase()}. Consulte en
                    Secretaría si necesita regularizar la matrícula.
                  </p>
                )}

                {student.courses_count != null && (
                  <p className="mt-4 text-sm text-on-surface-variant">
                    {student.courses_count} curso{student.courses_count === 1 ? "" : "s"} este año.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/father/grades?b=${CURRENT_BIMESTER}`}
                    onClick={() => selectStudent(student.id)}
                    className={cn(honorLinkClass, "flex-1")}
                  >
                    Ver la libreta
                  </Link>
                  <Link
                    href="/father/attendance"
                    onClick={() => selectStudent(student.id)}
                    className={cn(quietLinkClass, "flex-1")}
                  >
                    Ver asistencia
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ClaimChildModal
        open={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={(student) => {
          selectStudent(student.id);
          reload();
        }}
        canAddMore={canAddMore}
      />
    </div>
  );
}
