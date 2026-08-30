"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { readApiJson } from "@/lib/client/api";

type UseCachedFatherResourceArgs<T> = {
  /** Hijo actualmente seleccionado (compartido vía useFatherStudents). */
  activeStudentId: string | null;
  /** Error de useFatherStudents; se combina con el error propio del fetch. */
  studentsError: string | null;
  reload: () => void | Promise<void>;
  /** Ruta de la API, p. ej. "/api/father/attendance". Se le agrega `?studentId=`. */
  endpoint: string;
  /** Campo del JSON de respuesta que contiene el dato, p. ej. "records". */
  field: string;
  /** Valor mostrado mientras no hay datos cacheados para el hijo activo. */
  fallback: T;
  /** Mensaje de error genérico si la respuesta no trae uno propio. */
  errorMessage: string;
  /** Query extra (p. ej. year=2026). Se incluye en la URL y en la clave de caché. */
  extraParams?: Record<string, string>;
};

/**
 * Cachea por hijo (studentId) el resultado de un endpoint GET
 * y solo lo pide una vez por hijo (hasta un handleRetry explícito).
 */
export function useCachedFatherResource<T>({
  activeStudentId,
  studentsError,
  reload,
  endpoint,
  field,
  fallback,
  errorMessage,
  extraParams,
}: UseCachedFatherResourceArgs<T>) {
  const [dataError, setDataError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState(false);
  const loadedIds = useRef(new Set<string>());
  const abortRef = useRef<AbortController | null>(null);

  const extraKey = extraParams
    ? new URLSearchParams(extraParams).toString()
    : "";
  const cacheKey = (studentId: string) => (extraKey ? `${studentId}?${extraKey}` : studentId);

  const error = dataError ?? studentsError;

  const load = useCallback(
    async (studentId: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const qs = new URLSearchParams({ studentId, ...extraParams });
        const r = await fetch(`${endpoint}?${qs.toString()}`, { signal: ac.signal });
        const data = await readApiJson(r);
        if (ac.signal.aborted) return;
        const key = extraKey ? `${studentId}?${extraKey}` : studentId;
        setCache((prev) => ({ ...prev, [key]: data[field] as T }));
        setDataError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDataError(err instanceof Error ? err.message : errorMessage);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [endpoint, field, errorMessage, extraKey],
  );

  useEffect(() => {
    if (!activeStudentId) {
      setLoading(false);
      return;
    }
    const key = cacheKey(activeStudentId);
    if (!loadedIds.current.has(key)) {
      loadedIds.current.add(key);
      load(activeStudentId);
    }
  }, [activeStudentId, load, extraKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleRetry = useCallback(() => {
    setDataError(null);
    loadedIds.current.clear();
    if (studentsError) {
      reload();
    } else if (activeStudentId) {
      loadedIds.current.add(cacheKey(activeStudentId));
      load(activeStudentId);
    }
  }, [studentsError, reload, activeStudentId, load, extraKey]);

  const data =
    (activeStudentId && cache[cacheKey(activeStudentId)]) || fallback;

  return { data, error, handleRetry, refresh: load, loading };
}
