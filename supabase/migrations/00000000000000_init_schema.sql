-- =============================================================================
-- IJFK - Migración inicial del esquema de base de datos
-- =============================================================================
-- Esta migración se ejecuta automáticamente al levantar el contenedor de
-- Postgres por primera vez (carpeta /docker-entrypoint-initdb.d).
--
-- Idempotente: usa IF NOT EXISTS para permitir re-ejecución segura.
-- =============================================================================

-- Extensiones típicas de Supabase ---------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'docente', 'padre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('Mañana', 'Tarde');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('regular', 'condicional', 'pendiente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('A', 'F', 'T', 'J');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE announcement_category AS ENUM ('urgente', 'importante', 'general', 'informativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grade_level AS ENUM ('AD', 'A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Tabla: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- =============================================================================
-- Tabla: students
-- =============================================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dni TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  initials TEXT,
  grade TEXT NOT NULL,
  grade_num INT NOT NULL CHECK (grade_num BETWEEN 1 AND 6),
  section TEXT NOT NULL,
  shift shift_type NOT NULL DEFAULT 'Mañana',
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  enrollment_code TEXT UNIQUE,
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','retirado','trasladado')),
  avg_grade NUMERIC(4,2) DEFAULT 0,
  attendance_rate INT DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);

-- =============================================================================
-- Tabla: courses
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  shift shift_type NOT NULL DEFAULT 'Mañana',
  classroom TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bimester INT NOT NULL DEFAULT 1 CHECK (bimester BETWEEN 1 AND 4),
  hours_per_week INT DEFAULT 4,
  students_total INT DEFAULT 0,
  avg_grade NUMERIC(4,2) DEFAULT 0,
  attendance_rate INT DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, grade, section, year)
);

CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_grade_section ON courses(grade, section);

-- =============================================================================
-- Tabla: grades (notas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  bimester INT NOT NULL CHECK (bimester BETWEEN 1 AND 4),
  n1 NUMERIC(4,2) CHECK (n1 BETWEEN 0 AND 20),
  n2 NUMERIC(4,2) CHECK (n2 BETWEEN 0 AND 20),
  n3 NUMERIC(4,2) CHECK (n3 BETWEEN 0 AND 20),
  average NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN n3 IS NOT NULL AND n3 > 0 THEN (COALESCE(n1,0) + COALESCE(n2,0) + COALESCE(n3,0)) / 3
      ELSE (COALESCE(n1,0) + COALESCE(n2,0)) / 2
    END
  ) STORED,
  level grade_level,
  observation TEXT,
  registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, bimester)
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_course ON grades(course_id);

-- =============================================================================
-- Tabla: attendance
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'A',
  observation TEXT,
  registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- =============================================================================
-- Tabla: enrollments (matrículas y pagos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  year INT NOT NULL,
  status enrollment_status NOT NULL DEFAULT 'pendiente',
  docs_total INT DEFAULT 7,
  docs_submitted INT DEFAULT 0,
  apafa_paid BOOLEAN DEFAULT false,
  apafa_amount NUMERIC(8,2) DEFAULT 50,
  actividades_paid BOOLEAN DEFAULT false,
  actividades_amount NUMERIC(8,2) DEFAULT 30,
  last_payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, year)
);

-- =============================================================================
-- Tabla: announcements (avisos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category announcement_category NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sender TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'todos',
  is_read BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);

-- =============================================================================
-- Triggers para updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','students','courses','grades','enrollments']) LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
      CREATE TRIGGER trg_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- =============================================================================
-- Row Level Security (RLS) - Opcional pero recomendado
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Política permisiva para usuarios autenticados (ajustar según necesidad).
-- OJO: el rol 'authenticated' solo existe en Supabase Cloud; en el Postgres
-- local (Docker) no existe, así que solo se crean las políticas si el rol está.
-- Sin este guard, `initdb.d` aborta aquí y no aplica las migraciones 001-006.
DO $$
DECLARE t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOR t IN SELECT unnest(ARRAY['users','students','courses','grades','attendance','enrollments','announcements']) LOOP
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
-- Datos de ejemplo (mock inicial) - solo si las tablas están vacías
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users) THEN
    -- Admin por defecto
    INSERT INTO users (email, full_name, role, is_active) VALUES
      ('admin@ijfk.edu.pe', 'Administrador', 'admin', true),
      ('director@ijfk.edu.pe', 'Prof. Rosa Quispe Tantavilca', 'admin', true);
  END IF;
END $$;

-- =============================================================================
-- Comentarios de tabla
-- =============================================================================
COMMENT ON TABLE users IS 'Usuarios del sistema (admin, docentes, padres)';
COMMENT ON TABLE students IS 'Estudiantes matriculados';
COMMENT ON TABLE courses IS 'Cursos / secciones por año académico';
COMMENT ON TABLE grades IS 'Calificaciones por bimestre';
COMMENT ON TABLE attendance IS 'Registro de asistencia diaria';
COMMENT ON TABLE enrollments IS 'Matrículas anuales y pagos';
COMMENT ON TABLE announcements IS 'Avisos y comunicados institucionales';
