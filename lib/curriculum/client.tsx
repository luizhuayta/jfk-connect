"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Area, Competency } from "./types";

type CurriculumValue = {
  areas: Area[];
  competencies: Competency[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Competencias de un área, ya en orden. */
  competenciesOf: (areaId: number) => Competency[];
  /** Área por id, o undefined. */
  areaById: (areaId: number) => Area | undefined;
};

const CurriculumContext = createContext<CurriculumValue | null>(null);

/**
 * Provider único del catálogo (áreas + competencias), calcado del patrón de
 * `TeacherCoursesProvider` (components/teacher/useTeacherCourses.tsx): se
 * carga una sola vez y se comparte entre todas las páginas que lo necesiten.
 */
export function CurriculumProvider({ children }: { children: React.ReactNode }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);

  const fetchCatalog = useCallback(async () => {
    try {
      const r = await fetch("/api/curriculum");
      const data = await r.json();
      if (!active.current) return;
      if (!data.ok) throw new Error(data.error ?? "Error cargando el catálogo curricular");
      setAreas(data.areas);
      setCompetencies(data.competencies);
      setError(null);
    } catch (err) {
      if (!active.current) return;
      setError(err instanceof Error ? err.message : "Error cargando el catálogo curricular");
    }
  }, []);

  useEffect(() => {
    active.current = true;
    (async () => {
      await fetchCatalog();
      if (active.current) setLoading(false);
    })();
    return () => {
      active.current = false;
    };
  }, [fetchCatalog]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchCatalog();
    if (active.current) setLoading(false);
  }, [fetchCatalog]);

  const competenciesOf = useCallback(
    (areaId: number) => competencies.filter((c) => c.areaId === areaId),
    [competencies],
  );
  const areaById = useCallback((areaId: number) => areas.find((a) => a.id === areaId), [areas]);

  const value = useMemo<CurriculumValue>(
    () => ({ areas, competencies, loading, error, reload, competenciesOf, areaById }),
    [areas, competencies, loading, error, reload, competenciesOf, areaById],
  );

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>;
}

export function useCurriculum(): CurriculumValue {
  const ctx = useContext(CurriculumContext);
  if (!ctx) {
    throw new Error("useCurriculum debe usarse dentro de <CurriculumProvider>");
  }
  return ctx;
}
