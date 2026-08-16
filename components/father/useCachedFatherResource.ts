"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type UseCachedFatherResourceArgs<T> = {
  /** Hijo actualmente seleccionado (compartido vía useFatherStudents). */
  activeStudentId: string | null;
  /** Error de useFatherStudents; se combina con el error propio del fetch. */
  studentsError: string | null;
  reload: () => void | Promise<void>;
  /** Ruta de la API, p. ej. "/api/father/grades". Se le agrega `?studentId=`. */
  endpoint: string;
  /** Campo del JSON de respuesta que contiene el dato, p. ej. "grades". */
  field: string;
  /** Valor mostrado mientras no hay datos cacheados para el hijo activo. */
  fallback: T;
  /** Mensaje de error genérico si la respuesta no trae uno propio. */
  errorMessage: string;
};

/**
 * Cachea por hijo (studentId) el resultado de un endpoint GET /api/father/*
 * y solo lo pide una vez por hijo (hasta un handleRetry explícito). Extrae la
 * lógica que se repetía casi idéntica en grades/attendance/enrollment/
 * schedule/materials.
 */
export function useCachedFatherResource<T>({
  activeStudentId,
  studentsError,
  reload,
  endpoint,
  field,
  fallback,
  errorMessage,
}: UseCachedFatherResourceArgs<T>) {
  const [dataError, setDataError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, T>>({});
  const loadedIds = useRef(new Set<string>());

  const error = dataError ?? studentsError;

  const load = useCallback(
    async (studentId: string) => {
      try {
        const r = await fetch(`${endpoint}?studentId=${studentId}`);
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCache((prev) => ({ ...prev, [studentId]: data[field] }));
        setDataError(null);
      } catch (err) {
        setDataError(err instanceof Error ? err.message : errorMessage);
      }
    },
    [endpoint, field, errorMessage],
  );

  // Cargar el recurso del hijo activo una sola vez (el ref evita re-fetchs en
  // re-renders y mantiene el effect sin setState síncrono).
  useEffect(() => {
    if (activeStudentId && !loadedIds.current.has(activeStudentId)) {
      loadedIds.current.add(activeStudentId);
      load(activeStudentId);
    }
  }, [activeStudentId, load]);

  const handleRetry = useCallback(() => {
    setDataError(null);
    loadedIds.current.clear();
    if (studentsError) {
      reload();
    } else if (activeStudentId) {
      loadedIds.current.add(activeStudentId);
      load(activeStudentId);
    }
  }, [studentsError, reload, activeStudentId, load]);

  const data = (activeStudentId && cache[activeStudentId]) || fallback;

  return { data, error, handleRetry, refresh: load };
}
