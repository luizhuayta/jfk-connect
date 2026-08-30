-- =============================================================================
-- IJFK - Migración 013: auditoría administrativa + índices del panel admin
-- =============================================================================
-- Aditiva e idempotente. No DROP, no ALTER destructivo.
--  - admin_audit_log: rastro de acciones sensibles del panel (borrado de
--    usuario, cambio de rol, desactivación, reseteo de contraseña,
--    desvinculación de apoderado, asignación de docente).
--  - Índices de lectura del dashboard y listados admin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,
  summary      TEXT NOT NULL,
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
  ON admin_audit_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity
  ON admin_audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_cg_year
  ON competency_grades (year);

CREATE INDEX IF NOT EXISTS idx_users_role_active
  ON users (role, is_active);

CREATE INDEX IF NOT EXISTS idx_attendance_status
  ON attendance (status);
