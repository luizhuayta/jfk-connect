-- =============================================================================
-- IJFK - Migración: cambio obligatorio de contraseña + recuperación
-- =============================================================================
-- Agrega:
--   - Columna must_change_password en users (para forzar cambio tras primer login)
--   - Tabla password_reset_codes: códigos temporales para recuperar contraseña
-- =============================================================================

-- Columna must_change_password en users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Tabla de códigos de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_reset_code ON password_reset_codes(code);
CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_codes(expires_at);

-- Trigger updated_at (la tabla no tiene, pero no es crítico)

-- RLS
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all reset codes" ON password_reset_codes;
CREATE POLICY "Allow all reset codes" ON password_reset_codes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Comentarios
COMMENT ON COLUMN users.must_change_password IS
  'Si true, el usuario debe cambiar su contraseña antes de poder usar el sistema.';
COMMENT ON TABLE password_reset_codes IS
  'Códigos de un solo uso para recuperación de contraseña. Expiran en 30 minutos.';
