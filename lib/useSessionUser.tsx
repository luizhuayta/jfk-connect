"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
}

type SessionUserState = { user: SessionUser | null; loading: boolean };

const SessionUserContext = createContext<SessionUserState | null>(null);

/**
 * Provee la sesión del usuario autenticado a todo un subárbol para que
 * `/api/auth/me` se pida una sola vez, aunque varios componentes del mismo
 * árbol (sidebar, top bar, dashboard) llamen a `useSessionUser()`.
 */
export function SessionUserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.ok) setUser(data.user);
        else router.push("/login");
      })
      .catch(() => {
        if (active) router.push("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <SessionUserContext.Provider value={{ user, loading }}>
      {children}
    </SessionUserContext.Provider>
  );
}

/**
 * Carga el usuario autenticado desde /api/auth/me (la sesión vive en la cookie
 * httpOnly `ijfk_session`, no hay token en el cliente). Si la sesión no es
 * válida, redirige a /login.
 *
 * Si hay un `SessionUserProvider` en un ancestro, reutiliza su fetch en vez
 * de pedir /api/auth/me de nuevo (antes cada consumidor —sidebar, navbar,
 * dashboard del padre— hacía su propio fetch por separado).
 */
export function useSessionUser(): SessionUserState {
  const ctx = useContext(SessionUserContext);
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return; // el SessionUserProvider ancestro ya se encarga
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.ok) setUser(data.user);
        else router.push("/login");
      })
      .catch(() => {
        if (active) router.push("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ctx, router]);

  return ctx ?? { user, loading };
}
