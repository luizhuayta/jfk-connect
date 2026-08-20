"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import BimesterTabs from "@/components/grades/BimesterTabs";
import LibretaTable from "@/components/libreta/LibretaTable";
import LibretaLegend from "@/components/libreta/LibretaLegend";
import AttendanceBlock from "@/components/libreta/AttendanceBlock";
import { downloadLibreta, printLibreta } from "@/lib/report";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

const EMPTY_LIBRETA: LibretaData | null = null;

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
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  const { data: libreta, error, handleRetry } = useCachedFatherResource<LibretaData | null>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/libreta",
    field: "libreta",
    fallback: EMPTY_LIBRETA,
    errorMessage: "Error cargando la libreta",
  });

  const handleLibreta = async (action: "pdf" | "print") => {
    if (!activeStudentId) return;
    setBusy(action);
    try {
      if (action === "pdf") await downloadLibreta(activeStudentId);
      else await printLibreta(activeStudentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar la libreta");
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
          Informe de progreso de las competencias — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      {/* Selector de hijo (selección compartida con el resto del panel) */}
      <ChildSelector />

      {students.length > 0 && libreta && (
        <>
          <BimesterTabs active={activeBimester} onSelect={setActiveBimester} />

          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-6">
              <h2 className="text-base font-bold text-foreground">
                {student ? student.name : ""} — {libreta.student.grade} &quot;{libreta.student.section}&quot;
              </h2>

              <LibretaTable areas={libreta.areas} activeBimester={Number(activeBimester) as BimesterKey} />

              <AttendanceBlock attendance={libreta.attendance} />

              <LibretaLegend legend={libreta.legend} />

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleLibreta("pdf")}
                  disabled={busy !== null}
                  variant="outline"
                  className="rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors gap-2"
                >
                  {busy === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Descargar Libreta PDF
                </Button>
                <Button
                  onClick={() => handleLibreta("print")}
                  disabled={busy !== null}
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
