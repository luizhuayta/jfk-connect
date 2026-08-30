"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, UserRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { CandidateScore } from "@/lib/courses/assignment";
import { ConfirmDialog } from "@/components/admin/shared";
import { apiGet, apiSend } from "@/lib/client/api";

interface SuggestionsResponse {
  ok: boolean;
  error?: string;
  course?: { id: string; name: string; grade: string; section: string };
  candidates?: CandidateScore[];
}

/**
 * Reemplaza el `<select>` que solo filtraba por `subject === name`
 * (ver app/api/admin/courses/assign/route.ts, ya corregido) por una lista
 * rankeada del motor determinista (lib/courses/assignment.ts): puntaje,
 * razones (verde) y bloqueos (rojo) por candidato. El botón "Explicar con
 * IA" es opcional — la asignación funciona igual sin él.
 */
export default function AssignSuggestions({
  courseId,
  courseName,
  currentTeacherName,
  aiAvailable,
  onAssigned,
}: {
  courseId: string;
  courseName: string;
  currentTeacherName: string | null;
  aiAvailable: boolean;
  onAssigned: (teacherId: string, teacherName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateScore[]>([]);
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [explainingTeacherId, setExplainingTeacherId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Map<string, string>>(new Map());
  const [pendingAssign, setPendingAssign] = useState<{
    teacherId: string;
    teacherName: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiGet(
          `/api/admin/courses/assign/suggestions?courseId=${encodeURIComponent(courseId)}`,
        )) as SuggestionsResponse & { ok: true };
        if (!active) return;
        setCandidates(data.candidates ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error cargando sugerencias");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, courseId]);

  function requestAssign(teacherId: string, teacherName: string) {
    if (currentTeacherName) {
      setPendingAssign({ teacherId, teacherName });
      return;
    }
    void handleAssign(teacherId, teacherName);
  }

  async function handleAssign(teacherId: string, teacherName: string) {
    setAssigningTeacherId(teacherId);
    try {
      const data = await apiSend("/api/admin/courses/assign", "POST", { courseId, teacherId });
      toast.success(
        (typeof data.message === "string" && data.message) || `${teacherName} asignado.`,
      );
      setPendingAssign(null);
      onAssigned(teacherId, teacherName);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setAssigningTeacherId(null);
    }
  }

  async function handleExplain(teacherId: string) {
    setExplainingTeacherId(teacherId);
    try {
      const data = await apiSend("/api/admin/courses/assign/explain", "POST", {
        courseId,
        teacherId,
      });
      const explanation =
        typeof data.explanation === "string" ? data.explanation : "";
      setExplanations((prev) => new Map(prev).set(teacherId, explanation));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar la explicación");
    } finally {
      setExplainingTeacherId(null);
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 px-2.5 text-xs rounded-md border-gray-200 min-w-[160px] justify-start"
      >
        <UserRound className="h-3.5 w-3.5 mr-1.5 shrink-0" />
        <span className="truncate">{currentTeacherName ?? "Asignar docente..."}</span>
      </Button>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Asignar docente</SheetTitle>
          <SheetDescription>{courseName} — candidatos rankeados automáticamente</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading &&
            !error &&
            candidates.map((c) => (
              <div
                key={c.teacherId}
                className={`rounded-xl border p-3 space-y-2 ${
                  c.eligible ? "border-gray-200" : "border-red-100 bg-red-50/40 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{c.teacherName}</p>
                  {c.eligible && (
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {c.score} pts
                    </Badge>
                  )}
                </div>

                {c.reasons.length > 0 && (
                  <ul className="space-y-1">
                    {c.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                {c.blockers.length > 0 && (
                  <ul className="space-y-1">
                    {c.blockers.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-600">
                        <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                {explanations.get(c.teacherId) && (
                  <p className="text-[11px] text-muted-foreground bg-gray-50 rounded-lg p-2 italic">
                    {explanations.get(c.teacherId)}
                  </p>
                )}

                {c.eligible && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => requestAssign(c.teacherId, c.teacherName)}
                      disabled={assigningTeacherId === c.teacherId}
                      className="h-7 text-xs bg-[#1E2A5E] text-white hover:bg-[#162043] flex-1"
                    >
                      {assigningTeacherId === c.teacherId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Asignar"
                      )}
                    </Button>
                    {aiAvailable && !explanations.get(c.teacherId) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExplain(c.teacherId)}
                        disabled={explainingTeacherId === c.teacherId}
                        className="h-7 text-xs gap-1"
                      >
                        {explainingTeacherId === c.teacherId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Explicar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          {!loading && !error && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No hay docentes disponibles.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
    <ConfirmDialog
      open={pendingAssign !== null}
      onClose={() => setPendingAssign(null)}
      title="Reasignar docente"
      description={
        currentTeacherName && pendingAssign
          ? `Este curso ya está a cargo de ${currentTeacherName}. ¿Asignar a ${pendingAssign.teacherName}?`
          : undefined
      }
      confirmLabel="Reasignar"
      tone="primary"
      loading={assigningTeacherId !== null}
      onConfirm={() => {
        if (pendingAssign) void handleAssign(pendingAssign.teacherId, pendingAssign.teacherName);
      }}
    />
    </>
  );
}
