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

export type AnnouncementCategory =
  | "urgente"
  | "importante"
  | "general"
  | "informativo";

export type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  sender: string;
  date: string;
  read: boolean;
  audience?: string;
};

type AnnouncementsValue = {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  reload: () => Promise<void>;
  /** Marca un aviso como leído (optimista) y lo persiste en el backend. */
  markRead: (id: string) => void;
  /** Aviso que se debe abrir al entrar a la lista (deep-link desde el inicio). */
  pendingOpenId: string | null;
  /** Marca el aviso como leído y pide que la lista lo abra al montarse. */
  requestOpen: (id: string) => void;
  consumePendingOpen: () => void;
};

const AnnouncementsContext = createContext<AnnouncementsValue | null>(null);

/**
 * Provider único de avisos.
 *
 * Antes `FatherSidebar`, `FatherTopBar`, el dashboard y la página de avisos
 * llamaban cada uno a `/api/announcements` (4 fetches por carga) y los dos
 * contadores de no leídos quedaban desincronizados al abrir un aviso, porque la
 * lectura solo se guardaba en el estado local de la página.
 */
export function AnnouncementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const active = useRef(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const r = await fetch("/api/announcements");
      const data = await r.json();
      if (!active.current) return;
      if (!data.ok) throw new Error(data.error ?? "Error cargando avisos");
      setAnnouncements(data.announcements);
      setError(null);
    } catch (err) {
      if (!active.current) return;
      setError(err instanceof Error ? err.message : "Error cargando avisos");
    }
  }, []);

  useEffect(() => {
    active.current = true;
    (async () => {
      await fetchAnnouncements();
      if (active.current) setLoading(false);
    })();
    return () => {
      active.current = false;
    };
  }, [fetchAnnouncements]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchAnnouncements();
    if (active.current) setLoading(false);
  }, [fetchAnnouncements]);

  const markRead = useCallback((id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
    );
    // Persistencia fire-and-forget: si falla, el badge se recalcula en la
    // siguiente carga desde announcement_reads.
    fetch(`/api/announcements/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, []);

  const requestOpen = useCallback(
    (id: string) => {
      setPendingOpenId(id);
      markRead(id);
    },
    [markRead],
  );

  const consumePendingOpen = useCallback(() => setPendingOpenId(null), []);

  const value = useMemo<AnnouncementsValue>(
    () => ({
      announcements,
      loading,
      error,
      unreadCount: announcements.filter((a) => !a.read).length,
      reload,
      markRead,
      pendingOpenId,
      requestOpen,
      consumePendingOpen,
    }),
    [
      announcements,
      loading,
      error,
      reload,
      markRead,
      pendingOpenId,
      requestOpen,
      consumePendingOpen,
    ],
  );

  return (
    <AnnouncementsContext.Provider value={value}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements(): AnnouncementsValue {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) {
    throw new Error(
      "useAnnouncements debe usarse dentro de <AnnouncementsProvider>",
    );
  }
  return ctx;
}
