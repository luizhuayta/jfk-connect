-- =============================================================================
-- IJFK - Migración: horarios (schedule_entries) y materiales (materials)
-- =============================================================================
-- Agrega:
--   - Tabla schedule_entries: horario semanal por grado/sección
--   - Tabla materials: materiales de clase por curso
--   - Columnas extra en enrollments: docs (JSONB), tutor, classroom
--
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- =============================================================================
-- Tabla: schedule_entries (horario semanal por sección)
-- =============================================================================
-- Una fila = un período de un día para una sección (grado + sección).
-- El horario del padre se obtiene por grade/section del hijo;
-- el del docente filtrando por el nombre del docente (columna teacher).
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade TEXT NOT NULL,              -- "1ro"..."5to"
  section TEXT NOT NULL,            -- "A", "B", ...
  -- Sin CHECK de valores: 'Miércoles' puede llegar en distinta normalización
  -- Unicode (NFC/NFD) según el editor y rompería la comparación del CHECK.
  day TEXT NOT NULL,              -- 'Lunes'..'Viernes'
  period INT NOT NULL CHECK (period BETWEEN 1 AND 7),
  time TEXT NOT NULL,               -- "7:45 - 8:30"
  subject TEXT NOT NULL,
  teacher TEXT,                     -- nombre visible del docente
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grade, section, day, period)
);

CREATE INDEX IF NOT EXISTS idx_schedule_grade_section ON schedule_entries(grade, section);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule_entries(teacher);

-- =============================================================================
-- Tabla: materials (materiales de clase por curso)
-- =============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','pptx','docx','xlsx','img')),
  size TEXT,
  topic TEXT,
  uploaded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);

-- =============================================================================
-- Columnas extra en enrollments (detalle de documentos, tutor y aula)
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'docs'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN docs JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'tutor'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN tutor TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'classroom'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN classroom TEXT;
  END IF;
END $$;

-- =============================================================================
-- Row Level Security (mismo patrón permisivo que el resto del esquema)
-- =============================================================================
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Nota: el rol 'authenticated' solo existe en Supabase Cloud; en el Postgres
-- local (Docker) no existe, así que solo creamos las políticas si el rol está.
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOR t IN SELECT unnest(ARRAY['schedule_entries','materials']) LOOP
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
COMMENT ON TABLE schedule_entries IS 'Horario semanal por grado/sección (un período por fila)';
COMMENT ON TABLE materials IS 'Materiales de clase publicados por los docentes';
COMMENT ON COLUMN enrollments.docs IS 'Checklist de documentos: [{label, submitted}]';
