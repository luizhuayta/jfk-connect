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
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  // En producción NO usamos el fallback: un secreto conocido permitiría a
  // cualquiera forjar sesiones (incluido admin). Fallamos rápido y con un
  // mensaje claro en los logs en lugar de correr inseguros.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET no está definido. Define un valor aleatorio de al menos 32 " +
        "caracteres en las variables de entorno de producción.",
    );
  }

  return "ijfk-dev-secret-change-in-production-32-characters";
}