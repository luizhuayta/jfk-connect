"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiSend } from "@/lib/client/api";
import type { ScopeValue } from "@/lib/grades/scopeValue";

export interface ConclusionSuggestion {
  studentId: string;
  competencyId: number;
  text: string;
}

const BATCH_SIZE = 12;

/**
 * Genera conclusiones descriptivas con IA (POST /api/ai/conclusions) y las
 * aplica a la grilla vía `applySuggestions` (ver useCompetencyGrid.ts) — el
 * docente las revisa/edita y las guarda con el botón "Guardar" de siempre.
 * Este hook NUNCA escribe en la base de datos por su cuenta.
 */
export function useConclusionsAi(args: {
  scope: ScopeValue | null;
  bimester: number;
  applySuggestions: (items: ConclusionSuggestion[]) => void;
}) {
  const { scope, bimester, applySuggestions } = args;
  const [aiAvailable, setAiAvailable] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiGet("/api/ai/health");
        if (active) setAiAvailable(Boolean(data.ok && data.enabled));
      } catch {
        if (active) setAiAvailable(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const scopeBody = useCallback((): Record<string, unknown> | null => {
    if (!scope) return null;
    return scope.type === "course"
      ? { courseId: scope.courseId }
      : { grade: scope.grade, section: scope.section, transversal: true };
  }, [scope]);

  const requestBatch = useCallback(
    async (studentIds: string[]): Promise<ConclusionSuggestion[]> => {
      const base = scopeBody();
      if (!base) return [];
      const data = await apiSend("/api/ai/conclusions", "POST", { ...base, bimester, studentIds });
      return (data.suggestions as ConclusionSuggestion[]) ?? [];
    },
    [scopeBody, bimester],
  );

  const generateForStudent = useCallback(
    async (studentId: string) => {
      setGeneratingFor(studentId);
      try {
        const suggestions = await requestBatch([studentId]);
        if (suggestions.length === 0) {
          toast.error("El alumno no tiene notas registradas para generar conclusiones.");
          return;
        }
        applySuggestions(suggestions);
        toast.success(`${suggestions.length} conclusión(es) generada(s). Revísalas antes de guardar.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al generar conclusiones con IA");
      } finally {
        setGeneratingFor(null);
      }
    },
    [requestBatch, applySuggestions],
  );

  const generateForSection = useCallback(
    async (studentIds: string[]) => {
      if (studentIds.length === 0) return;
      setGeneratingBatch(true);
      const chunks: string[][] = [];
      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        chunks.push(studentIds.slice(i, i + BATCH_SIZE));
      }
      setProgress({ done: 0, total: chunks.length });
      let totalGenerated = 0;
      try {
        for (let i = 0; i < chunks.length; i++) {
          const suggestions = await requestBatch(chunks[i]);
          applySuggestions(suggestions);
          totalGenerated += suggestions.length;
          setProgress({ done: i + 1, total: chunks.length });
        }
        toast.success(`${totalGenerated} conclusión(es) generada(s). Revísalas antes de guardar.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al generar conclusiones con IA");
      } finally {
        setGeneratingBatch(false);
        setProgress(null);
      }
    },
    [requestBatch, applySuggestions],
  );

  return { aiAvailable, generatingFor, generatingBatch, progress, generateForStudent, generateForSection };
}
