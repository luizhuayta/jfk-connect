-- =============================================================================
-- IJFK - Migración 006: mejoras del panel de padres
-- =============================================================================
-- Agrega:
--   - Tabla attendance_justifications: solicitudes del padre para justificar
--     una falta; el docente las aprueba/rechaza (al aprobar, la asistencia
--     pasa a 'J').
--   - Tabla announcement_reads: avisos leídos por usuario (permite que cada
--     padre/docente tenga su propio estado de lectura sin tocar is_read global).
--
-- Idempotente: usa IF NOT EXISTS / DO $$ guards. Se aplica automáticamente al
-- primer arranque del contenedor (docker-entrypoint-initdb.d), igual que las
-- migraciones 000-005.
-- =============================================================================

-- =============================================================================
-- Tabla: attendance_justifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance_justifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(attendance_id)
);

CREATE INDEX IF NOT EXISTS idx_justifications_status ON attendance_justifications(status);
CREATE INDEX IF NOT EXISTS idx_justifications_student ON attendance_justifications(student_id);
CREATE INDEX IF NOT EXISTS idx_justifications_attendance ON attendance_justifications(attendance_id);

-- =============================================================================
-- Tabla: announcement_reads (lectura de avisos por usuario)
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcement_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
  ON announcement_reads(announcement_id);

-- =============================================================================
-- Row Level Security (mismo patrón permisivo que el resto del esquema)
-- =============================================================================
ALTER TABLE attendance_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Nota: el rol 'authenticated' solo existe en Supabase Cloud; en el Postgres
-- local (Docker) no existe, así que solo creamos las políticas si el rol está.
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOR t IN SELECT unnest(ARRAY['attendance_justifications','announcement_reads']) LOOP
      EXECUTE format('
        DROP POLICY IF EXISTS "Allow authenticated full access" ON %I;
        CREATE POLICY "Allow authenticated full access" ON %I
          FOR ALL
          TO authenticated
          USING (true)
          WITH CHECK (true);
      ', t, t);
    END LOOP;
  END IF;
END $$;

-- =============================================================================
-- Comentarios
-- =============================================================================
COMMENT ON TABLE attendance_justifications
  IS 'Solicitud del padre para justificar una falta. Al aprobar el docente, attendance.status pasa a J.';
COMMENT ON COLUMN attendance_justifications.status
  IS 'pendiente | aprobada | rechazada';
COMMENT ON TABLE announcement_reads
  IS 'Aviso marcado como leído por un usuario concreto (estado por usuario).';
