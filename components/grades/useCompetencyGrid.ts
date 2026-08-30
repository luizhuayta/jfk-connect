"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Competency } from "@/lib/curriculum/types";
import type { ScopeValue } from "@/lib/grades/scopeValue";
import type { GridStudent, EntryValue } from "./CompetencyGradeTable";

export type GradeScopeInfo = {
  kind: "course" | "transversal";
  areaId: number;
  areaName: string;
  courseId: string | null;
  grade: string;
  section: string;
  bimester: number;
  editable: boolean;
};

const EMPTY_ENTRY: EntryValue = { score: null, conclusion: "" };

function entryKey(studentId: string, competencyId: number): string {
  return `${studentId}:${competencyId}`;
}

/**
 * Hook único de captura de notas, compartido por el panel docente y el
 * admin — antes cada uno tenía su propio `loadGrid` casi idéntico
 * (2 fetches en paralelo a endpoints distintos). Ahora es 1 fetch a
 * /api/grades, con dirty-tracking: el PUT solo manda las celdas que
 * cambiaron (antes se mandaban las ~30-40 filas siempre).
 */
export function useCompetencyGrid(scope: ScopeValue | null, bimester: number) {
  const [scopeInfo, setScopeInfo] = useState<GradeScopeInfo | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [students, setStudents] = useState<GridStudent[]>([]);
  const [values, setValues] = useState<Map<string, EntryValue>>(new Map());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const active = useRef(true);

  const load = useCallback(async () => {
    if (!scope) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ bimester: String(bimester) });
      if (scope.type === "course") {
        params.set("courseId", scope.courseId);
      } else {
        params.set("grade", scope.grade);
        params.set("section", scope.section);
        params.set("transversal", "1");
      }
      const r = await fetch(`/api/grades?${params}`);
      const data = await r.json();
      if (!active.current) return;
      if (!data.ok) throw new Error(data.error ?? "Error cargando notas");

      setScopeInfo(data.scope);
      setCompetencies(data.competencies);
      setStudents(data.students);
      const map = new Map<string, EntryValue>();
      for (const e of data.entries as { studentId: string; competencyId: number; score: number | null; conclusion: string | null }[]) {
        map.set(entryKey(e.studentId, e.competencyId), { score: e.score, conclusion: e.conclusion ?? "" });
      }
      setValues(map);
      setDirty(new Set());
    } catch (err) {
      if (!active.current) return;
      setError(err instanceof Error ? err.message : "Error cargando notas");
    } finally {
      if (active.current) setLoading(false);
    }
    // `scope` debe venir memoizado (useMemo) desde quien llama al hook —
    // si se reconstruye en cada render, esto recarga en bucle.
  }, [scope, bimester]);

  useEffect(() => {
    active.current = true;
    (async () => {
      await load();
    })();
    return () => {
      active.current = false;
    };
  }, [load]);

  const getEntry = useCallback(
    (studentId: string, competencyId: number): EntryValue =>
      values.get(entryKey(studentId, competencyId)) ?? EMPTY_ENTRY,
    [values],
  );

  const setScore = useCallback((studentId: string, competencyId: number, score: number | null) => {
    const k = entryKey(studentId, competencyId);
    setValues((prev) => {
      const next = new Map(prev);
      next.set(k, { ...(next.get(k) ?? EMPTY_ENTRY), score });
      return next;
    });
    setDirty((prev) => new Set(prev).add(k));
  }, []);

  const setConclusion = useCallback((studentId: string, competencyId: number, conclusion: string) => {
    const k = entryKey(studentId, competencyId);
    setValues((prev) => {
      const next = new Map(prev);
      next.set(k, { ...(next.get(k) ?? EMPTY_ENTRY), conclusion });
      return next;
    });
    setDirty((prev) => new Set(prev).add(k));
  }, []);

  /**
   * Aplica un lote de conclusiones sugeridas por IA (POST /api/ai/conclusions)
   * como si el docente las hubiera tipeado — quedan "sucias" y las persiste
   * el mismo botón "Guardar" de siempre, sin tocar el flujo de guardado. Un
   * solo setValues/setDirty por lote (no N llamadas a setConclusion, que
   * causarían N renders sobre una grilla de 40x4 celdas).
   */
  const applySuggestions = useCallback(
    (items: { studentId: string; competencyId: number; text: string }[]) => {
      if (items.length === 0) return;
      setValues((prev) => {
        const next = new Map(prev);
        for (const item of items) {
          const k = entryKey(item.studentId, item.competencyId);
          next.set(k, { ...(next.get(k) ?? EMPTY_ENTRY), conclusion: item.text });
        }
        return next;
      });
      setDirty((prev) => {
        const next = new Set(prev);
        for (const item of items) next.add(entryKey(item.studentId, item.competencyId));
        return next;
      });
    },
    [],
  );

  const save = useCallback(async () => {
    if (!scope || dirty.size === 0) return;
    setSaving(true);
    try {
      const entries = [...dirty].map((k) => {
        const sep = k.lastIndexOf(":");
        const studentId = k.slice(0, sep);
        const competencyId = Number(k.slice(sep + 1));
        const v = values.get(k) ?? EMPTY_ENTRY;
        return {
          studentId,
          competencyId,
          score: v.score,
          conclusion: v.conclusion || undefined,
        };
      });

      const body: Record<string, unknown> =
        scope.type === "course"
          ? { bimester, courseId: scope.courseId, entries }
          : { bimester, grade: scope.grade, section: scope.section, transversal: true, entries };

      const r = await fetch("/api/grades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error ?? "Error al guardar las notas");
      setDirty(new Set());
      toast.success("Notas guardadas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar las notas");
    } finally {
      setSaving(false);
    }
  }, [scope, bimester, dirty, values]);

  return {
    scope: scopeInfo,
    competencies,
    students,
    getEntry,
    setScore,
    setConclusion,
    applySuggestions,
    dirtyCount: dirty.size,
    loading,
    error,
    saving,
    save,
    reload: load,
  };
}
