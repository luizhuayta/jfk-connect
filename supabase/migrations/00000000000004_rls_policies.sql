-- =============================================================================
-- IJFK - Migración: políticas RLS reales por rol (DEFENSA EN PROFUNDIDAD)
-- =============================================================================
-- Refuerza seguridad a nivel de base de datos (no solo en la app).
--
-- Las API routes de IJFK se conectan con `supabase_admin` (superuser que
-- ignora RLS), así que estas políticas NO afectan al funcionamiento de la
-- app en desarrollo: son una segunda línea de defensa para despliegues que
-- usen clientes con roles `authenticated`/`anon` (típicamente Supabase Cloud
-- con auth integrada y conexiones directas desde el navegador o un client
-- server con service-role key limitada).
--
-- Modelo (compatible con el esquema actual):
--   * users         → lectura: el propio usuario o admin. Escritura: admin.
--   * students      → padre ve solo sus hijos (parent_id = auth.uid());
--                    docente/admin ven todos. Escritura: admin.
--   * courses       → docente ve los suyos (teacher_id = auth.uid());
--                    admin/padre (lectura) ven los asociados a sus hijos.
--   * grades        → padre ve notas de sus hijos; docente las de sus cursos;
--                    admin ve todo. Escritura: docente que posee el curso o admin.
--   * attendance    → igual que grades.
--   * enrollments   → padre las de sus hijos; docente/admin ven todo.
--   * schedule_entries → lectura por padres cuyos hijos están en la sección;
--                    docente dueño de la sección (vía courses) y admin.
--   * materials     → docente dueño del curso; admin; padre (lectura) si tiene
--                    hijo en esa sección.
--   * announcements → lectura: todos los autenticados; escritura: admin.
--
-- IMPORTANTE: como en este entorno local no existen los roles `authenticated`
-- ni las funciones `auth.uid()` / `auth.jwt()`, todas las policies se crean
-- solo si esas infraestructuras están presentes. En un entorno sin auth de
-- Supabase esto queda como no-op (la app ya filtra en sus queries), y en
-- Supabase Cloud sí aplica.
-- =============================================================================

-- Helper: ¿está presente auth.uid()?
-- (En Supabase Cloud existe la función auth.uid(); localmente no.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    -- Sin auth.uid(): salir sin tocar policies. La app ya hace cumplir el rol.
    RAISE NOTICE 'auth.uid() no disponible: saltando políticas RLS.';
    RETURN;
  END IF;

  -- Activar RLS en todas las tablas (revocar acceso público implícito)
  ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE grades        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE enrollments   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE materials     ENABLE ROW LEVEL SECURITY;

  -- -------------------------------------------------------------------------
  -- users
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "users_select_self_or_admin" ON users;
  CREATE POLICY "users_select_self_or_admin" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    ));

  DROP POLICY IF EXISTS "users_modify_admin" ON users;
  CREATE POLICY "users_modify_admin" ON users
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- students
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "students_select_role" ON students;
  CREATE POLICY "students_select_role" ON students
    FOR SELECT TO authenticated
    USING (
      parent_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','docente'))
    );

  DROP POLICY IF EXISTS "students_write_admin" ON students;
  CREATE POLICY "students_write_admin" ON students
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- courses
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "courses_select_role" ON courses;
  CREATE POLICY "courses_select_role" ON courses
    FOR SELECT TO authenticated
    USING (
      teacher_id = auth.uid()
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      -- padre: si tiene un hijo en esa sección
      OR EXISTS (
        SELECT 1 FROM students s
        WHERE s.parent_id = auth.uid()
          AND s.grade = courses.grade AND s.section = courses.section
      )
    );

  DROP POLICY IF EXISTS "courses_write_admin" ON courses;
  CREATE POLICY "courses_write_admin" ON courses
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- grades
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "grades_select_role" ON grades;
  CREATE POLICY "grades_select_role" ON grades
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM students s WHERE s.id = grades.student_id AND s.parent_id = auth.uid())
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

  DROP POLICY IF EXISTS "grades_write_teacher_or_admin" ON grades;
  CREATE POLICY "grades_write_teacher_or_admin" ON grades
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = grades.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

  -- -------------------------------------------------------------------------
  -- attendance
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "attendance_select_role" ON attendance;
  CREATE POLICY "attendance_select_role" ON attendance
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM students s WHERE s.id = attendance.student_id AND s.parent_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM students s, courses c
        WHERE s.id = attendance.student_id AND c.teacher_id = auth.uid()
          AND s.grade = c.grade AND s.section = c.section
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

  DROP POLICY IF EXISTS "attendance_write_teacher_or_admin" ON attendance;
  CREATE POLICY "attendance_write_teacher_or_admin" ON attendance
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM students s, courses c
        WHERE s.id = attendance.student_id AND c.teacher_id = auth.uid()
          AND s.grade = c.grade AND s.section = c.section
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM students s, courses c
        WHERE s.id = attendance.student_id AND c.teacher_id = auth.uid()
          AND s.grade = c.grade AND s.section = c.section
      )
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );

  -- -------------------------------------------------------------------------
  -- enrollments
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "enrollments_select_role" ON enrollments;
  CREATE POLICY "enrollments_select_role" ON enrollments
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM students s WHERE s.id = enrollments.student_id AND s.parent_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin','docente'))
    );

  DROP POLICY IF EXISTS "enrollments_write_admin" ON enrollments;
  CREATE POLICY "enrollments_write_admin" ON enrollments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- announcements
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "announcements_select_any_authenticated" ON announcements;
  CREATE POLICY "announcements_select_any_authenticated" ON announcements
    FOR SELECT TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "announcements_write_admin" ON announcements;
  CREATE POLICY "announcements_write_admin" ON announcements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- schedule_entries
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "schedule_select_role" ON schedule_entries;
  CREATE POLICY "schedule_select_role" ON schedule_entries
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      -- padre con hijo en esa sección
      OR EXISTS (
        SELECT 1 FROM students s
        WHERE s.parent_id = auth.uid()
          AND s.grade = schedule_entries.grade AND s.section = schedule_entries.section
      )
      -- docente: si tiene un curso en esa sección
      OR EXISTS (
        SELECT 1 FROM courses c
        WHERE c.teacher_id = auth.uid()
          AND c.grade = schedule_entries.grade AND c.section = schedule_entries.section
      )
    );

  DROP POLICY IF EXISTS "schedule_write_admin" ON schedule_entries;
  CREATE POLICY "schedule_write_admin" ON schedule_entries
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  -- -------------------------------------------------------------------------
  -- materials
  -- -------------------------------------------------------------------------
  DROP POLICY IF EXISTS "materials_select_role" ON materials;
  CREATE POLICY "materials_select_role" ON materials
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
      -- padre con hijo en la sección del curso
      OR EXISTS (
        SELECT 1 FROM courses c, students s
        WHERE c.id = materials.course_id
          AND s.parent_id = auth.uid()
          AND s.grade = c.grade AND s.section = c.section
      )
    );

  DROP POLICY IF EXISTS "materials_write_teacher_or_admin" ON materials;
  CREATE POLICY "materials_write_teacher_or_admin" ON materials
    FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    );
END $$;