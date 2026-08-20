-- =============================================================================
-- IJFK - Migración 008: notas por competencia (libreta SIAGIE)
-- =============================================================================
-- El sistema pasa de un modelo PLANO (una nota por curso, columnas n1/n2/n3
-- en `grades`) a un modelo POR COMPETENCIA, calcado de la libreta oficial
-- ("INFORME DE PROGRESO DE LAS COMPETENCIAS DEL ESTUDIANTE"): cada área
-- curricular tiene varias competencias, y cada competencia recibe un nivel
-- de logro (AD/A/B/C) por bimestre + una conclusión descriptiva.
--
-- Esta migración es 100% ADITIVA: `grades`, su trigger de letra y sus 7
-- lectores actuales siguen funcionando exactamente igual. La retirada de
-- `grades` (rename a grades_legacy) es una migración futura aparte, una vez
-- que el resto de la app ya lea de aquí.
--
-- Escala nueva (reemplaza la vieja A 18-20/B 15-17/C 10-14/D 0-9 del
-- trigger de la migración 005): C 0-10, B 11-15, A 16-17, AD 18-20.
-- Reutiliza el enum `grade_level` ('AD','A','B','C') ya existente
-- (init_schema.sql) — hoy es una columna muerta en `grades.level`, nadie la
-- escribe; aquí pasa a ser la letra real de cada nota.
--
-- Catálogo (11 áreas + 1 bloque transversal, 31 competencias): Tutoría,
-- Cívica y HGE desaparecen como áreas — Cívica se absorbe en Desarrollo
-- Personal/Ciudadanía y HGE en Ciencias Sociales — y entra Castellano como
-- Segunda Lengua. Las horas semanales sí suman 35 (5 días × 7 períodos),
-- el invariante que usa el generador de horarios de scripts/seed-full.mjs.
--
-- Las competencias transversales no pertenecen a ningún curso/área: las
-- califica el tutor de la sección (tabla `section_tutors`, nueva) o el
-- admin. `section_tutors` también reemplaza la dependencia que tenía
-- `enrollments.tutor` del curso "Tutoría", que desaparece.
--
-- Idempotente: catálogo con ON CONFLICT DO UPDATE (reaplicar corrige
-- textos/horas); tablas y columnas con IF NOT EXISTS.
-- =============================================================================

-- ─── 1. Escala de nivel de logro ─────────────────────────────────────────────
-- Fuente de verdad SQL; espejo de lib/grades/scale.ts (levelFromScore).
CREATE OR REPLACE FUNCTION nivel_logro(score NUMERIC)
RETURNS grade_level
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN score IS NULL THEN NULL
    WHEN score >= 18 THEN 'AD'
    WHEN score >= 16 THEN 'A'
    WHEN score >= 11 THEN 'B'
    ELSE 'C'
  END::grade_level
$$;
COMMENT ON FUNCTION nivel_logro IS 'Escala oficial: C 0-10, B 11-15, A 16-17, AD 18-20. Espejo TS en lib/grades/scale.ts';

-- ─── 2. Catálogo: áreas curriculares ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curricular_areas (
  id             SMALLINT PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  is_transversal BOOLEAN NOT NULL DEFAULT false,
  hours_per_week SMALLINT NOT NULL DEFAULT 0,
  color_key      TEXT NOT NULL DEFAULT 'slate',
  display_order  SMALLINT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO curricular_areas (id, code, name, short_name, is_transversal, hours_per_week, color_key, display_order) VALUES
  (1,  'DPCC',  'Desarrollo Personal, Ciudadanía y Cívica', 'DPCC',        false, 3, 'rose',     1),
  (2,  'CCSS',  'Ciencias Sociales',                        'C. Sociales', false, 3, 'amber',    2),
  (3,  'REL',   'Educación Religiosa',                      'Religión',    false, 2, 'violet',   3),
  (4,  'EPT',   'Educación para el Trabajo',                'EPT',         false, 2, 'orange',   4),
  (5,  'EDF',   'Educación Física',                         'Ed. Física',  false, 2, 'lime',     5),
  (6,  'COM',   'Comunicación',                              'Comunicación', false, 6, 'purple',  6),
  (7,  'ART',   'Arte y Cultura',                            'Arte',        false, 2, 'fuchsia',  7),
  (8,  'CSL',   'Castellano como Segunda Lengua',            'Castellano 2L', false, 2, 'teal',    8),
  (9,  'ING',   'Inglés',                                    'Inglés',      false, 3, 'cyan',     9),
  (10, 'MAT',   'Matemática',                                'Matemática',  false, 6, 'blue',    10),
  (11, 'CYT',   'Ciencia y Tecnología',                      'CyT',         false, 4, 'emerald', 11),
  (12, 'TRANS', 'Competencias Transversales',                'Transversal', true,  0, 'slate',   12)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, short_name = EXCLUDED.short_name,
  is_transversal = EXCLUDED.is_transversal, hours_per_week = EXCLUDED.hours_per_week,
  color_key = EXCLUDED.color_key, display_order = EXCLUDED.display_order, active = true;

-- Invariante del generador de horarios: 5 días × 7 períodos = 35.
DO $$ BEGIN
  IF (SELECT sum(hours_per_week) FROM curricular_areas WHERE active) <> 35 THEN
    RAISE EXCEPTION 'curricular_areas.hours_per_week debe sumar 35 (suma actual: %)',
      (SELECT sum(hours_per_week) FROM curricular_areas WHERE active);
  END IF;
END $$;

-- ─── 3. Catálogo: competencias ────────────────────────────────────────────────
-- id = area_id*100 + n (natural, legible, sin necesidad de resolver UUIDs
-- en el seed). Texto oficial íntegro de la libreta (sin abreviar).
CREATE TABLE IF NOT EXISTS competencies (
  id            SMALLINT PRIMARY KEY,
  area_id       SMALLINT NOT NULL REFERENCES curricular_areas(id) ON DELETE RESTRICT,
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  display_order SMALLINT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (area_id, display_order)
);

INSERT INTO competencies (id, area_id, code, name, display_order) VALUES
  -- 1. Desarrollo Personal, Ciudadanía y Cívica
  (101, 1, 'DPCC-1', 'Construye su identidad.', 1),
  (102, 1, 'DPCC-2', 'Convive y participa democráticamente en la búsqueda del bien común.', 2),
  -- 2. Ciencias Sociales
  (201, 2, 'CCSS-1', 'Construye interpretaciones históricas.', 1),
  (202, 2, 'CCSS-2', 'Gestiona responsablemente el espacio y el ambiente.', 2),
  (203, 2, 'CCSS-3', 'Gestiona responsablemente los recursos económicos.', 3),
  -- 3. Educación Religiosa
  (301, 3, 'REL-1', 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas.', 1),
  (302, 3, 'REL-2', 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa.', 2),
  -- 4. Educación para el Trabajo
  (401, 4, 'EPT-1', 'Gestiona proyectos de emprendimiento económico o social.', 1),
  -- 5. Educación Física
  (501, 5, 'EDF-1', 'Se desenvuelve de manera autónoma a través de su motricidad.', 1),
  (502, 5, 'EDF-2', 'Asume una vida saludable.', 2),
  (503, 5, 'EDF-3', 'Interactúa a través de sus habilidades sociomotrices.', 3),
  -- 6. Comunicación
  (601, 6, 'COM-1', 'Se comunica oralmente en su lengua materna.', 1),
  (602, 6, 'COM-2', 'Lee diversos tipos de textos escritos en su lengua materna.', 2),
  (603, 6, 'COM-3', 'Escribe diversos tipos de textos en su lengua materna.', 3),
  -- 7. Arte y Cultura
  (701, 7, 'ART-1', 'Aprecia de manera crítica manifestaciones artístico-culturales.', 1),
  (702, 7, 'ART-2', 'Crea proyectos desde los lenguajes artísticos.', 2),
  -- 8. Castellano como Segunda Lengua
  (801, 8, 'CSL-1', 'Se comunica oralmente.', 1),
  (802, 8, 'CSL-2', 'Lee diversos tipos de textos.', 2),
  (803, 8, 'CSL-3', 'Escribe diversos tipos de textos.', 3),
  -- 9. Inglés
  (901, 9, 'ING-1', 'Se comunica oralmente.', 1),
  (902, 9, 'ING-2', 'Lee diversos tipos de textos.', 2),
  (903, 9, 'ING-3', 'Escribe diversos tipos de textos.', 3),
  -- 10. Matemática
  (1001, 10, 'MAT-1', 'Resuelve problemas de cantidad.', 1),
  (1002, 10, 'MAT-2', 'Resuelve problemas de regularidad, equivalencia y cambio.', 2),
  (1003, 10, 'MAT-3', 'Resuelve problemas de forma, movimiento y localización.', 3),
  (1004, 10, 'MAT-4', 'Resuelve problemas de gestión de datos e incertidumbre.', 4),
  -- 11. Ciencia y Tecnología
  (1101, 11, 'CYT-1', 'Indaga mediante métodos científicos para construir sus conocimientos.', 1),
  (1102, 11, 'CYT-2', 'Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo.', 2),
  (1103, 11, 'CYT-3', 'Diseña y construye soluciones tecnológicas para resolver problemas de su entorno.', 3),
  -- 12. Competencias Transversales (no asociadas a un área)
  (1201, 12, 'TRANS-1', 'Se desenvuelve en entornos virtuales generados por las TIC.', 1),
  (1202, 12, 'TRANS-2', 'Gestiona su aprendizaje de manera autónoma.', 2)
ON CONFLICT (id) DO UPDATE SET
  area_id = EXCLUDED.area_id, code = EXCLUDED.code, name = EXCLUDED.name,
  display_order = EXCLUDED.display_order, active = true;

DO $$ BEGIN
  IF (SELECT count(*) FROM competencies WHERE active) <> 31 THEN
    RAISE EXCEPTION 'competencies debe tener 31 filas activas (actual: %)',
      (SELECT count(*) FROM competencies WHERE active);
  END IF;
END $$;

-- ─── 4. courses.area_id / users.area_id ───────────────────────────────────────
-- courses.name se conserva como nombre visible (lo usa el join
-- `c.name = se.subject` de la migración 007 y la leyenda de horario del
-- padre); area_id es la clave semántica nueva.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS area_id SMALLINT REFERENCES curricular_areas(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_area_section
  ON courses(grade, section, area_id, year) WHERE area_id IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id SMALLINT REFERENCES curricular_areas(id);
COMMENT ON COLUMN users.area_id IS 'Área curricular que dicta el docente (reemplaza gradualmente a users.subject, que sigue existiendo para no romper lecturas viejas)';

-- Backfill best-effort por nombre viejo → area_id, solo aplica a un volumen
-- ya sembrado con el catálogo anterior (en initdb sobre volumen nuevo esto
-- es un no-op porque courses/users todavía no tienen filas). Cívica y HGE
-- no tienen equivalente 1:1 nuevo (se repartieron entre DPCC/CCSS) y
-- Tutoría desaparece, así que esas tres quedan sin backfill (area_id NULL).
UPDATE courses SET area_id = m.area_id
FROM (VALUES
  ('Matemáticas', 10), ('Comunicación', 6), ('Ciencia y Tecnología', 11),
  ('Religión', 3), ('Arte', 7), ('Educación Física', 5), ('EPT', 4),
  ('Inglés', 9)
) AS m(name, area_id)
WHERE courses.name = m.name AND courses.area_id IS NULL;

UPDATE users SET area_id = m.area_id
FROM (VALUES
  ('Matemáticas', 10), ('Comunicación', 6), ('Ciencia y Tecnología', 11),
  ('Religión', 3), ('Arte', 7), ('Educación Física', 5), ('EPT', 4),
  ('Inglés', 9)
) AS m(subject, area_id)
WHERE users.subject = m.subject AND users.area_id IS NULL;

-- ─── 5. Tutores de sección ────────────────────────────────────────────────────
-- Quién califica las competencias transversales (no tienen curso propio) y
-- de dónde sale enrollments.tutor ahora que el curso "Tutoría" desaparece.
CREATE TABLE IF NOT EXISTS section_tutors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade      TEXT NOT NULL,
  section    TEXT NOT NULL,
  year       SMALLINT NOT NULL DEFAULT 2026,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (grade, section, year)
);

-- ─── 6. Notas por competencia ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competency_grades (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  competency_id SMALLINT NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  course_id     UUID REFERENCES courses(id) ON DELETE SET NULL,  -- NULL en transversales
  bimester      SMALLINT NOT NULL CHECK (bimester BETWEEN 1 AND 4),
  year          SMALLINT NOT NULL DEFAULT 2026,
  score         NUMERIC(4,2) CHECK (score BETWEEN 0 AND 20),
  -- Columna generada (no trigger, a diferencia de grades.letter_grade en la
  -- migración 005): aquí `score` es una columna normal, no otra generada,
  -- así que Postgres sí permite generada→función. Si la escala cambiara,
  -- hay que DROP+ADD COLUMN en una migración nueva (los valores existentes
  -- no se recalculan solos con un CREATE OR REPLACE de nivel_logro).
  level         grade_level GENERATED ALWAYS AS (nivel_logro(score)) STORED,
  conclusion    TEXT,
  registered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, competency_id, bimester, year)
);
COMMENT ON COLUMN competency_grades.level IS 'AD 18-20, A 16-17, B 11-15, C 0-10. Generada desde score vía nivel_logro().';
COMMENT ON COLUMN competency_grades.course_id IS 'Procedencia (qué curso/docente la registró); NULL en competencias transversales. No forma parte de la UNIQUE: si el curso se reasigna, la nota no se duplica.';

CREATE INDEX IF NOT EXISTS idx_cg_student_year   ON competency_grades(student_id, year);
CREATE INDEX IF NOT EXISTS idx_cg_course_bim     ON competency_grades(course_id, bimester);
CREATE INDEX IF NOT EXISTS idx_cg_competency_bim ON competency_grades(competency_id, bimester);

DROP TRIGGER IF EXISTS trg_competency_grades_updated_at ON competency_grades;
CREATE TRIGGER trg_competency_grades_updated_at
  BEFORE UPDATE ON competency_grades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 7. RLS (paridad con grades; la app conecta como supabase_admin y no la
--        aplica en runtime, pero dejar la tabla sin RLS mientras sus
--        hermanas la tienen es una inconsistencia que alguien "arreglará" mal
--        después) ────────────────────────────────────────────────────────────
-- Mismo guard que 00000000000004_rls_policies.sql: localmente no existen
-- los roles `authenticated`/`anon` ni auth.uid() (no hay Supabase Auth), así
-- que sin este guard `CREATE POLICY ... TO authenticated` revienta con
-- "role authenticated does not exist" y aborta TODO el initdb (fatal para
-- las migraciones siguientes). En Supabase Cloud sí aplica.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    RAISE NOTICE 'auth.uid() no disponible: saltando políticas RLS de competency_grades.';
    RETURN;
  END IF;

  ALTER TABLE competency_grades ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "competency_grades_select_role" ON competency_grades;
  CREATE POLICY "competency_grades_select_role" ON competency_grades
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM students s WHERE s.id = competency_grades.student_id AND s.parent_id = auth.uid())
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = competency_grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM students s
        JOIN section_tutors t ON t.grade = s.grade AND t.section = s.section AND t.year = competency_grades.year
        WHERE s.id = competency_grades.student_id AND t.teacher_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

  DROP POLICY IF EXISTS "competency_grades_write_teacher_or_admin" ON competency_grades;
  CREATE POLICY "competency_grades_write_teacher_or_admin" ON competency_grades
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = competency_grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM students s
        JOIN section_tutors t ON t.grade = s.grade AND t.section = s.section AND t.year = competency_grades.year
        WHERE s.id = competency_grades.student_id AND t.teacher_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = competency_grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM students s
        JOIN section_tutors t ON t.grade = s.grade AND t.section = s.section AND t.year = competency_grades.year
        WHERE s.id = competency_grades.student_id AND t.teacher_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );
END $$;

-- ─── 8. Vistas de rollup ───────────────────────────────────────────────────────
-- v_area_grades: promedio de las competencias de un área por (alumno, curso,
-- bimestre) — uso INTERNO para dashboards (promedio de aula, distribución,
-- "en riesgo"). SIAGIE no promedia competencias para dar una nota de área;
-- esta vista NO debe imprimirse en la libreta, que muestra letra por
-- competencia.
CREATE OR REPLACE VIEW v_area_grades AS
SELECT cg.student_id,
       cg.course_id,
       c.area_id,
       cg.bimester,
       cg.year,
       ROUND(AVG(cg.score)::numeric, 2)                  AS score,
       nivel_logro(ROUND(AVG(cg.score)::numeric, 2))     AS level,
       COUNT(cg.score)::int                              AS graded,
       (SELECT COUNT(*) FROM competencies c2
         WHERE c2.area_id = c.area_id AND c2.active)::int AS expected
FROM competency_grades cg
JOIN competencies c ON c.id = cg.competency_id
WHERE cg.score IS NOT NULL
GROUP BY cg.student_id, cg.course_id, c.area_id, cg.bimester, cg.year;
COMMENT ON VIEW v_area_grades IS 'Agregado interno para dashboards (promedio de aula, distribución, alumnos en riesgo). SIAGIE no promedia competencias: la libreta imprime la letra por competencia, no esto.';

-- v_course_bimester_stats: reemplaza el bloque de subconsultas repetido en
-- app/api/teacher/courses/route.ts y app/api/admin/courses/route.ts.
-- graded = expected conserva la semántica de "bimestre cerrado" que antes
-- daba `n3 IS NOT NULL`.
CREATE OR REPLACE VIEW v_course_bimester_stats AS
SELECT course_id, bimester, year,
       COUNT(*)::int                                                        AS entries,
       COUNT(*) FILTER (WHERE graded = expected)::int                       AS complete,
       ROUND(AVG(score) FILTER (WHERE graded = expected)::numeric, 2)::float AS avg,
       COUNT(*) FILTER (WHERE graded = expected AND score >= 11)::int       AS approved,
       COUNT(*) FILTER (WHERE graded = expected AND score <  11)::int       AS failed
FROM v_area_grades
WHERE course_id IS NOT NULL
GROUP BY course_id, bimester, year;
