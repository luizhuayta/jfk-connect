/**
 * Secreto compartido para firmar/verificar el JWT de sesión de IJFK.
 *
 * Es un módulo puro (sin imports de `node:crypto`) para que pueda importarse
 * desde `middleware.ts` (que corre en el Edge Runtime) además de desde
 * `lib/session.ts` (Node Runtime, API routes).
 *
 * En producción SIEMPRE define la variable de entorno JWT_SECRET con un valor
 * aleatorio de al menos 32 caracteres.
 */

export const SESSION_COOKIE = "ijfk_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ??
    "ijfk-dev-secret-change-in-production-32-characters"
  );
}