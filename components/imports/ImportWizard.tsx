"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ScopeSelector, { type ScopeOption } from "@/components/grades/ScopeSelector";
import BimesterTabs from "@/components/grades/BimesterTabs";
import UploadDropzone from "@/components/imports/UploadDropzone";
import ImportReviewTable, { type ReviewRow, type ReviewCell, type RosterOption } from "@/components/imports/ImportReviewTable";
import ImportSummary from "@/components/imports/ImportSummary";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { decodeScope } from "@/lib/grades/scopeValue";

type WizardStep = "scope" | "upload" | "review" | "done";

interface JobDetail {
  job: { id: string; status: string; bimester: number };
  rows: ReviewRow[];
  roster: RosterOption[];
  competencies?: { id: number; name: string }[];
}

/**
 * Orquesta las 3 fases del importador: elegir scope+bimestre → subir y
 * analizar el archivo → revisar/corregir y aplicar. Reutilizable por
 * /teacher/imports y /admin/imports (mismo patrón que CompetencyGradeTable
 * es compartida por /teacher/grades y /admin/grades) — quien la usa arma
 * `scopeOptions`.
 */
export default function ImportWizard({ scopeOptions }: { scopeOptions: ScopeOption[] }) {
  const [step, setStep] = useState<WizardStep>("scope");
  const [scopeRaw, setScopeRaw] = useState<string | null>(null);
  const [bimester, setBimester] = useState(String(CURRENT_BIMESTER));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [applying, setApplying] = useState(false);
  const [ignoreUnmatched, setIgnoreUnmatched] = useState(false);
  const [result, setResult] = useState<{ applied: number; skippedUnmatched: number; skippedExisting: number } | null>(null);
  const patchTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const activeRaw = scopeRaw ?? scopeOptions[0]?.value ?? null;
  const scope = useMemo(() => (activeRaw ? decodeScope(activeRaw) : null), [activeRaw]);

  function scopeFormFields(): Record<string, string> {
    if (!scope) return {};
    return scope.type === "course"
      ? { courseId: scope.courseId, bimester }
      : { grade: scope.grade, section: scope.section, transversal: "1", bimester };
  }

  async function refreshDetail(id: string) {
    const r = await fetch(`/api/imports/grades/${id}`);
    const data = await r.json();
    if (!data.ok) throw new Error(data.error ?? "Error cargando el trabajo de importación");
    setDetail(data);
    return data as JobDetail;
  }

  async function handleUploadAndParse() {
    if (!file || !scope) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      for (const [k, v] of Object.entries(scopeFormFields())) form.append(k, v);

      const uploadR = await fetch("/api/imports/grades", { method: "POST", body: form });
      const uploadData = await uploadR.json();
      if (!uploadData.ok) throw new Error(uploadData.error ?? "Error al subir el archivo");
      setJobId(uploadData.jobId);

      const parseR = await fetch(`/api/imports/grades/${uploadData.jobId}/parse`, { method: "POST" });
      const parseData = await parseR.json();
      if (!parseData.ok) throw new Error(parseData.error ?? "Error al analizar el archivo");

      await refreshDetail(uploadData.jobId);
      setStep("review");
      toast.success("Archivo analizado. Revisa las coincidencias antes de aplicar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el archivo");
    } finally {
      setUploading(false);
    }
  }

  async function patchRow(rowId: string, patch: Record<string, unknown>) {
    if (!jobId) return;
    try {
      const r = await fetch(`/api/imports/grades/${jobId}/rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar el cambio");
    }
  }

  function handleMatchChange(rowId: string, studentId: string | null) {
    setDetail((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, matchedStudentId: studentId, matchMethod: studentId ? "manual" : null, status: (studentId ? "ok" : "sin_match") as ReviewRow["status"] }
          : r,
      );
      return { ...prev, rows };
    });
    void patchRow(rowId, { matchedStudentId: studentId, status: studentId ? "ok" : "sin_match" });
  }

  function handleScoreChange(rowId: string, competencyId: number, score: number | null) {
    setDetail((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const cells = r.cells.map((c) =>
          c.competencyId === competencyId
            ? { ...c, score, status: (score === null ? "vacio" : "ok") as ReviewCell["status"] }
            : c,
        );
        return { ...r, cells };
      });
      return { ...prev, rows };
    });

    const key = `${rowId}:${competencyId}`;
    const existing = patchTimers.current.get(key);
    if (existing) clearTimeout(existing);
    patchTimers.current.set(
      key,
      setTimeout(() => {
        void patchRow(rowId, { cells: [{ competencyId, score }] });
        patchTimers.current.delete(key);
      }, 600),
    );
  }

  async function handleApply() {
    if (!jobId) return;
    setApplying(true);
    try {
      const r = await fetch(`/api/imports/grades/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ignoreUnmatched, overwriteExisting: false }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setResult(data.result);
      setStep("done");
      toast.success(`${data.result.applied} nota(s) aplicada(s) a la libreta.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aplicar la importación");
    } finally {
      setApplying(false);
    }
  }

  function reset() {
    setStep("scope");
    setFile(null);
    setJobId(null);
    setDetail(null);
    setResult(null);
    setIgnoreUnmatched(false);
  }

  const competencyList = useMemo(() => {
    if (!detail) return [];
    const map = new Map<number, string>();
    for (const row of detail.rows) {
      for (const cell of row.cells) {
        if (!map.has(cell.competencyId)) map.set(cell.competencyId, cell.columnLabel ?? `Competencia ${cell.competencyId}`);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [detail]);

  const counts = useMemo(() => {
    if (!detail) return { ready: 0, ambiguous: 0, unmatched: 0 };
    return {
      ready: detail.rows.filter((r) => r.status === "ok").length,
      ambiguous: detail.rows.filter((r) => r.status === "ambiguo").length,
      unmatched: detail.rows.filter((r) => r.status === "sin_match").length,
    };
  }, [detail]);

  if (scopeOptions.length === 0) {
    return <p className="text-sm text-muted-foreground">No tienes cursos disponibles para importar notas.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <ScopeSelector options={scopeOptions} value={activeRaw ?? ""} onChange={setScopeRaw} className="max-w-xs" />
        <BimesterTabs active={bimester} onSelect={setBimester} />
      </div>

      {step === "scope" && (
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Elige el curso/sección y el bimestre arriba, luego continúa para subir el archivo.
            </p>
            <Button
              onClick={() => setStep("upload")}
              disabled={!scope}
              className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-4">
            <UploadDropzone onFileSelected={setFile} disabled={uploading} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("scope")} disabled={uploading} className="rounded-xl">
                Atrás
              </Button>
              <Button
                onClick={handleUploadAndParse}
                disabled={!file || uploading}
                className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Subir y analizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && detail && (
        <div className="space-y-4">
          <Card className="border-none shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <ImportReviewTable
                rows={detail.rows}
                competencies={competencyList}
                roster={detail.roster}
                onMatchChange={handleMatchChange}
                onScoreChange={handleScoreChange}
              />
            </CardContent>
          </Card>
          <ImportSummary
            ready={counts.ready}
            ambiguous={counts.ambiguous}
            unmatched={counts.unmatched}
            applying={applying}
            ignoreUnmatched={ignoreUnmatched}
            onIgnoreUnmatchedChange={setIgnoreUnmatched}
            onApply={handleApply}
          />
        </div>
      )}

      {step === "done" && result && (
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-[#0F172A]">
              <strong>{result.applied}</strong> nota(s) aplicada(s).{" "}
              {result.skippedExisting > 0 && `${result.skippedExisting} omitida(s) por ya tener nota registrada. `}
              {result.skippedUnmatched > 0 && `${result.skippedUnmatched} fila(s) omitida(s) por no tener alumno asignado.`}
            </p>
            <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
              <RotateCcw className="h-4 w-4" /> Nueva importación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
