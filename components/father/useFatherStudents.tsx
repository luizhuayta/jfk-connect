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
import { readApiJson } from "@/lib/client/api";
import type { FatherStudent } from "@/lib/father/types";

export type { FatherStudent };

type FatherStudentsValue = {
  students: FatherStudent[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Hijo activo (el seleccionado o el primero de la lista). */
  activeStudentId: string | null;
  activeStudent: FatherStudent | null;
  /** Cambia el hijo activo; la selección se comparte entre todas las páginas. */
  selectStudent: (studentId: string) => void;
};

const STORAGE_KEY = "ijfk_father_active_student";

function readStoredId(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

const FatherStudentsContext = createContext<FatherStudentsValue | null>(null);

/**
 * Provider único de los hijos del padre autenticado.
 *
 * Antes cada una de las 7 páginas del panel llamaba a `/api/father/students`
 * por su cuenta (7 fetches por sesión) y guardaba su propio `selectedId`, así
 * que al navegar de Notas a Asistencia la selección se perdía y volvía al
 * primer hijo. Ahora la lista y la selección viven en el layout.
 */
export function FatherStudentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [students, setStudents] = useState<FatherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    setSelectedId(readStoredId());
    setHydrated(true);
  }, []);

  const selectStudent = useCallback((studentId: string) => {
    setSelectedId(studentId);
    writeStoredId(studentId);
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const r = await fetch("/api/father/students");
      const data = await readApiJson(r);
      if (!active.current) return;
      setStudents(data.students as FatherStudent[]);
      setError(null);
    } catch (err) {
      if (!active.current) return;
      setError(err instanceof Error ? err.message : "Error cargando datos");
    }
  }, []);

  useEffect(() => {
    active.current = true;
    (async () => {
      await fetchStudents();
      if (active.current) setLoading(false);
    })();
    return () => {
      active.current = false;
    };
  }, [fetchStudents]);

  useEffect(() => {
    if (!hydrated || students.length === 0) return;
    if (selectedId && students.some((s) => s.id === selectedId)) return;
    const next = students[0].id;
    setSelectedId(next);
    writeStoredId(next);
  }, [hydrated, students, selectedId]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchStudents();
    if (active.current) setLoading(false);
  }, [fetchStudents]);

  const value = useMemo<FatherStudentsValue>(() => {
    // Si el hijo seleccionado ya no existe (p. ej. tras un reload), cae al primero.
    const activeStudentId =
      (selectedId && students.some((s) => s.id === selectedId)
        ? selectedId
        : students[0]?.id) ?? null;
    return {
      students,
      loading,
      error,
      reload,
      activeStudentId,
      activeStudent: students.find((s) => s.id === activeStudentId) ?? null,
      selectStudent,
    };
  }, [students, loading, error, reload, selectedId, selectStudent]);

  return (
    <FatherStudentsContext.Provider value={value}>
      {children}
    </FatherStudentsContext.Provider>
  );
}

/**
 * Acceso a los hijos del padre y al hijo activo compartido. Debe usarse dentro
 * de `FatherStudentsProvider` (montado en `app/father/layout.tsx`).
 */
export function useFatherStudents(): FatherStudentsValue {
  const ctx = useContext(FatherStudentsContext);
  if (!ctx) {
    throw new Error(
      "useFatherStudents debe usarse dentro de <FatherStudentsProvider>",
    );
  }
  return ctx;
}
