-- =============================================================================
-- IJFK - Migración 005: refinamiento del esquema
-- =============================================================================
-- Añade:
--   - users.subject: asignatura del docente
--   - users.shift_preference: Mañana / Tarde / Ambos (docentes)
--   - users.default_grade/section/shift: datos del hijo que el padre declaró
--   - students.grade_num: CHECK 1-5 (solo secundaria, antes 1-6)
--   - students.parent_claimed_at: auditoría de reclamo
--   - grades.letter_grade: letra A/B/C/D generada desde average
--
-- Idempotente. No rompe datos existentes (columnas opcionales, NULL default).
-- =============================================================================

-- 1. users: columnas nuevas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subject') THEN
    ALTER TABLE users ADD COLUMN subject TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='shift_preference') THEN
    ALTER TABLE users ADD COLUMN shift_preference TEXT DEFAULT 'Ambos';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='default_grade') THEN
    ALTER TABLE users ADD COLUMN default_grade TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='default_section') THEN
    ALTER TABLE users ADD COLUMN default_section TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='default_shift') THEN
    ALTER TABLE users ADD COLUMN default_shift TEXT;
  END IF;
END $$;

-- 2. students: ajustar CHECK de grade_num a 1-5 (solo secundaria)
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_num_check;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='students' AND constraint_name='students_grade_num_check'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_grade_num_check
      CHECK (grade_num BETWEEN 1 AND 5);
  END IF;
END $$;

-- 3. students: auditoría de reclamo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='parent_claimed_at') THEN
    ALTER TABLE students ADD COLUMN parent_claimed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. grades: letra generada desde average (A/B/C/D)
-- Nota: no podemos usar GENERATED ALWAYS AS (...) porque `average` ya es una
-- columna GENERATED de Postgres, y una columna generada no puede referenciar
-- a otra generada. Usamos una columna normal + trigger BEFORE INSERT/UPDATE.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grades' AND column_name='letter_grade') THEN
    ALTER TABLE grades ADD COLUMN letter_grade TEXT;
  END IF;
END $$;

-- Función que calcula la letra desde n1/n2/n3 (replica la lógica de `average`)
CREATE OR REPLACE FUNCTION compute_letter_grade()
RETURNS TRIGGER AS $$
DECLARE
  calc_avg NUMERIC(4,2);
BEGIN
  IF NEW.n3 IS NOT NULL AND NEW.n3 > 0 THEN
    calc_avg := (COALESCE(NEW.n1, 0) + COALESCE(NEW.n2, 0) + COALESCE(NEW.n3, 0)) / 3;
  ELSE
    calc_avg := (COALESCE(NEW.n1, 0) + COALESCE(NEW.n2, 0)) / 2;
  END IF;

  IF NEW.n1 IS NULL AND NEW.n2 IS NULL AND NEW.n3 IS NULL THEN
    NEW.letter_grade := NULL;
  ELSIF calc_avg >= 18 THEN
    NEW.letter_grade := 'A';
  ELSIF calc_avg >= 15 THEN
    NEW.letter_grade := 'B';
  ELSIF calc_avg >= 10 THEN
    NEW.letter_grade := 'C';
  ELSE
    NEW.letter_grade := 'D';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grades_letter ON grades;
CREATE TRIGGER trg_grades_letter
  BEFORE INSERT OR UPDATE OF n1, n2, n3 ON grades
  FOR EACH ROW EXECUTE FUNCTION compute_letter_grade();

-- 5. Índice útil para courses por (grade, section, year)
CREATE INDEX IF NOT EXISTS idx_courses_grade_section_year
  ON courses(grade, section, year);

-- 6. Comentarios
COMMENT ON COLUMN users.subject IS 'Asignatura del docente (NULL si no es docente)';
COMMENT ON COLUMN users.shift_preference IS 'Mañana, Tarde o Ambos (docentes)';
COMMENT ON COLUMN users.default_grade IS 'Grado del hijo declarado al registrarse (padres)';
COMMENT ON COLUMN users.default_section IS 'Sección del hijo declarado al registrarse (padres)';
COMMENT ON COLUMN users.default_shift IS 'Turno del hijo declarado al registrarse (padres)';
COMMENT ON COLUMN students.parent_claimed_at IS 'Fecha en que el apoderado reclamó al hijo via enrollment_code';
COMMENT ON COLUMN grades.letter_grade IS 'A(18-20) B(15-17) C(10-14) D(0-9). NULL si average es NULL.';
