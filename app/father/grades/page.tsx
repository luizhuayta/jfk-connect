"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import BimesterTabs from "@/components/grades/BimesterTabs";
import LibretaTable from "@/components/libreta/LibretaTable";
import LibretaLegend from "@/components/libreta/LibretaLegend";
import AttendanceBlock from "@/components/libreta/AttendanceBlock";
import { downloadLibreta, printLibreta } from "@/lib/report";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { CURRENT_BIMESTER, parseBimesterParam } from "@/lib/grades/bimesters";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { paperCardClass } from "@/components/father/chrome";
import { cn } from "@/lib/utils";

const EMPTY_LIBRETA: LibretaData | null = null;

function GradesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: student,
  } = useFatherStudents();
  const [activeBimester, setActiveBimester] = useState(() =>
    parseBimesterParam(searchParams.get("b")),
  );
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);

  useEffect(() => {
    setActiveBimester(parseBimesterParam(searchParams.get("b")));
  }, [searchParams]);

  const selectBimester = (bimester: string) => {
    setActiveBimester(parseBimesterParam(bimester));
    const params = new URLSearchParams(searchParams.toString());
    params.set("b", bimester);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data: libreta, error, handleRetry, loading: libretaLoading } = useCachedFatherResource<LibretaData | null>({
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

  if (loading) return <LoadingState label="Cargando la libreta..." />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">Libreta</h1>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          Competencias y nivel de logro — {SCHOOL_YEAR_LABEL}
        </p>
      </div>

      <ChildSelector />

      {students.length > 0 && libretaLoading && !libreta && (
        <p className="text-sm text-on-surface-variant">Cargando la libreta…</p>
      )}

      {students.length > 0 && libreta && (
        <>
          <BimesterTabs
            active={activeBimester}
            onSelect={selectBimester}
            currentBimester={CURRENT_BIMESTER}
            showOpenDots={false}
          />

          <section className={cn(paperCardClass, "space-y-6 overflow-x-auto p-5")}>
              <h2 className="text-base font-bold text-on-surface">
                {student ? student.name : ""} — {libreta.student.grade} &quot;{libreta.student.section}&quot;
              </h2>

              <LibretaTable areas={libreta.areas} activeBimester={Number(activeBimester) as BimesterKey} />

              <AttendanceBlock attendance={libreta.attendance} />

              <LibretaLegend legend={libreta.legend} />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleLibreta("pdf")}
                  disabled={busy !== null}
                  variant="outline"
                  className="h-11 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors gap-2"
                >
                  {busy === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Descargar PDF
                </Button>
                <Button
                  onClick={() => handleLibreta("print")}
                  disabled={busy !== null}
                  variant="ghost"
                  className="h-11 rounded-lg text-on-surface-variant hover:text-on-surface gap-2"
                >
                  {busy === "print" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Printer className="h-4 w-4" aria-hidden />
                  )}
                  Imprimir
                </Button>
              </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function GradesPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando la libreta..." />}>
      <GradesPageInner />
    </Suspense>
  );
}
