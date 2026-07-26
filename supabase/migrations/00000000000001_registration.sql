-- =============================================================================
-- IJFK - Migración: sistema de registro con verificación por email
-- =============================================================================
-- Agrega:
--   - Tabla pending_registrations: registros pendientes de verificar por email
--   - Columna email_verified_at en users (si no existe)
--   - Trigger para auto-crear perfil al verificar
-- =============================================================================

-- Agregar columna email_verified_at a users si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Agregar columna password_hash a users si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Tabla de registros pendientes de verificación ---------------------------
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  year TEXT NOT NULL,             -- "1", "2", "3", "4", "5"
  section TEXT NOT NULL,          -- "A"..."M"
  shift TEXT NOT NULL,            -- "mañana", "tarde"
  verification_code TEXT NOT NULL, -- código de 6 dígitos
  code_expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_code ON pending_registrations(verification_code);
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(code_expires_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_pending_updated_at ON pending_registrations;
CREATE TRIGGER trg_pending_updated_at
  BEFORE UPDATE ON pending_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Función para limpiar códigos expirados (puede ser invocada por cron)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_registrations()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM pending_registrations
  WHERE code_expires_at < now() - INTERVAL '1 day';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS -----------------------------------------------------------------------
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Política: permitir todo (server-side, sin auth para simplificar mock)
DROP POLICY IF EXISTS "Allow all" ON pending_registrations;
CREATE POLICY "Allow all" ON pending_registrations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE pending_registrations IS
  'Registros de usuarios pendientes de verificar su email. Tras verificar el código, se migran a la tabla users.';
COMMENT ON COLUMN pending_registrations.verification_code IS
  'Código de 6 dígitos enviado por email. Expira en 15 minutos.';
COMMENT ON COLUMN pending_registrations.attempts IS
  'Número de intentos de verificación fallidos.';
