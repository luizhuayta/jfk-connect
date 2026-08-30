/**
 * Registro de acciones sensibles del panel de administración.
 *
 * Nunca debe romper la operación principal: si el INSERT falla se loguea
 * y se sigue. Tampoco debe persistir contraseñas ni hashes — `sanitizeMeta`
 * las elimina antes de escribir.
 */

import { query } from "@/lib/db";
import { logger } from "@/lib/logger";

export type AdminAction =
  | "user.create"
  | "user.delete"
  | "user.role_change"
  | "user.deactivate"
  | "user.activate"
  | "user.password_reset"
  | "student.unlink_parent"
  | "course.assign_teacher";

const SENSITIVE_KEY = /password|secret|token|hash|tempPwd|temp_pwd/i;

/** Quita claves sensibles (contraseñas, hashes, tokens) de un objeto plano. */
export function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string" && SENSITIVE_KEY.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export async function recordAdminAction(args: {
  actorId: string;
  action: AdminAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const meta = sanitizeMeta(args.meta);
  try {
    await query(
      `INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, summary, meta)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        args.actorId,
        args.action,
        args.entityType,
        args.entityId ?? null,
        args.summary,
        JSON.stringify(meta),
      ],
    );
  } catch (err) {
    logger.error(
      { err, route: "admin/audit", action: args.action },
      "no se pudo registrar la acción administrativa",
    );
  }
}
