"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/client/api";

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/** Valor con debounce; cancela el timer al desmontar o al cambiar el valor. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Fetch de un recurso admin con AbortController: si cambia `url` (filtros,
 * página, búsqueda) se cancela la petición anterior y no pisa el estado.
 */
export function useAdminResource<T>(
  url: string | null,
  parse: (data: Record<string, unknown> & { ok: true }) => T,
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const parseRef = useRef(parse);
  parseRef.current = parse;

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    apiGet(url, { signal: ac.signal })
      .then((d) => {
        if (!ac.signal.aborted) setData(parseRef.current(d));
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, reload };
}
