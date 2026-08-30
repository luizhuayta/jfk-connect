/**
 * Cliente de Supabase para IJFK
 *
 * Este cliente funciona tanto con Supabase Cloud como con la versión
 * self-hosted de Postgres (supabase/postgres en Docker).
 *
 * - Para Cloud: configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   con los valores de tu proyecto en https://supabase.com
 * - Para local: usa los valores por defecto que apuntan al contenedor
 *
 * Si necesitas el cliente de servidor (con service_role), usa getSupabaseAdmin()
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "local-anon-key";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "local-service-key";

/**
 * Cliente público (anon) - Seguro para usar en el navegador
 * Limitado por Row Level Security (RLS)
 */
let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window !== "undefined") {
    // En el navegador: crear singleton
    if (!browserClient) {
      browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    }
    return browserClient;
  }

  // En el servidor: siempre crear uno nuevo (puede haber caché de fetch)
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente de servidor (service_role) - SOLO para uso en server-side
 * Bypassea RLS, no exponer nunca al navegador
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseAdmin() sólo puede usarse en el servidor. " +
        "Nunca expongas SUPABASE_SERVICE_ROLE_KEY al cliente.",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * URL de la API REST de Supabase (PostgREST)
 */
export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;

/**
 * URL del storage de Supabase
 */
export const SUPABASE_STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

/**
 * Comprueba si la configuración de Supabase es válida.
 * (Corregido el bug de precedencia: antes `|| NODE_ENV === "production"` hacía
 * que SIEMPRE devolviera true en producción aunque no hubiera config.)
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    !!url &&
    !!anonKey &&
    anonKey !== "local-anon-key"
  );
}
