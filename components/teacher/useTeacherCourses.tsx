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

export type BimesterStat = {
  avg: number;
  approved: number;
  failed: number;
  total: number;
  hasData: boolean;
  inProgress: boolean;
};

export type TeacherCourse = {
  id: string;
  subject: string;
  grade: string;
  section: string;
  shift: string;
  room: string;
  studentsTotal: number;
  hoursPerWeek: number;
  currentBimester: number;
  avgGrade: number | null;
  attendanceRate: number | null;
  bimesters: Record<string, BimesterStat>;
};

type TeacherCoursesValue = {
  courses: TeacherCourse[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const TeacherCoursesContext = createContext<TeacherCoursesValue | null>(null);

/**
 * Provider único de los cursos del docente autenticado.
 *
 * Antes cada una de las páginas del panel (dashboard, cursos, notas,
 * asistencia, horario, materiales) y el propio TeacherSidebar llamaban a
 * `/api/teacher/courses` por su cuenta. Ahora la lista se carga una sola vez
 * en el layout y se comparte.
 */
export function TeacherCoursesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);

  const fetchCourses = useCallback(async () => {
    try {
      const r = await fetch("/api/teacher/courses");
      const data = await r.json();
      if (!active.current) return;
      if (!data.ok) throw new Error(data.error ?? "Error cargando cursos");
      setCourses(data.courses);
      setError(null);
    } catch (err) {
      if (!active.current) return;
      setError(err instanceof Error ? err.message : "Error cargando cursos");
    }
  }, []);

  useEffect(() => {
    active.current = true;
    (async () => {
      await fetchCourses();
      if (active.current) setLoading(false);
    })();
    return () => {
      active.current = false;
    };
  }, [fetchCourses]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchCourses();
    if (active.current) setLoading(false);
  }, [fetchCourses]);

  const value = useMemo<TeacherCoursesValue>(
    () => ({ courses, loading, error, reload }),
    [courses, loading, error, reload],
  );

  return (
    <TeacherCoursesContext.Provider value={value}>
      {children}
    </TeacherCoursesContext.Provider>
  );
}

/**
 * Acceso a los cursos del docente autenticado. Debe usarse dentro de
 * `TeacherCoursesProvider` (montado en `app/teacher/layout.tsx`).
 */
export function useTeacherCourses(): TeacherCoursesValue {
  const ctx = useContext(TeacherCoursesContext);
  if (!ctx) {
    throw new Error(
      "useTeacherCourses debe usarse dentro de <TeacherCoursesProvider>",
    );
  }
  return ctx;
}
