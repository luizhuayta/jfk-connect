-- =============================================================================
-- IJFK - Datos de ejemplo (opcional)
-- =============================================================================
-- Inserta algunos datos de muestra para probar la app.
-- Ejecutar con: docker compose exec db psql -U postgres -d ijfk -f /docker-entrypoint-initdb.d/seed.sql
-- (sólo si la tabla está vacía)
-- =============================================================================

-- Usuarios de ejemplo
INSERT INTO users (email, full_name, role, phone, is_active) VALUES
  ('carlos.perez@gmail.com', 'Carlos Pérez Huamán', 'padre', '987654321', true),
  ('rosa.vega@gmail.com', 'Rosa Vega de Castillo', 'padre', '945111222', true),
  ('maria.gonzalez@ijfk.edu.pe', 'Prof. María González Flores', 'docente', '945100101', true),
  ('carlos.caceres@ijfk.edu.pe', 'Prof. Carlos Cáceres Vásquez', 'docente', '945100102', true)
ON CONFLICT (email) DO NOTHING;

-- Estudiantes de ejemplo
INSERT INTO students (dni, full_name, initials, grade, grade_num, section, shift, avg_grade, attendance_rate, status)
VALUES
  ('74512301', 'Adriana Castillo Vega', 'AC', '1ro', 1, 'A', 'Mañana', 16.0, 95, 'activo'),
  ('74512302', 'Bruno Espinoza Ríos', 'BE', '1ro', 1, 'A', 'Mañana', 14.0, 91, 'activo'),
  ('74512303', 'Camila Herrera Ponce', 'CH', '1ro', 1, 'A', 'Mañana', 18.0, 98, 'activo'),
  ('74512304', 'Alessandra Fuentes Quiroz', 'AF', '2do', 2, 'B', 'Mañana', 15.2, 93, 'activo'),
  ('74512305', 'Brayan Condori Torres', 'BC', '2do', 2, 'B', 'Mañana', 13.1, 88, 'activo'),
  ('74512306', 'Antonella Miranda Pino', 'AM', '3ro', 3, 'C', 'Mañana', 14.7, 92, 'activo')
ON CONFLICT (dni) DO NOTHING;

-- Cursos de ejemplo
INSERT INTO courses (name, grade, section, year, classroom, bimester, hours_per_week, students_total, avg_grade, attendance_rate)
VALUES
  ('Matemáticas', '1ro', 'A', EXTRACT(YEAR FROM now())::INT, 'Aula A-101', 2, 6, 32, 14.6, 94),
  ('Lengua Castellana', '2do', 'B', EXTRACT(YEAR FROM now())::INT, 'Aula B-203', 2, 5, 30, 15.3, 96),
  ('Historia', '3ro', 'C', EXTRACT(YEAR FROM now())::INT, 'Aula C-305', 2, 4, 28, 14.2, 91)
ON CONFLICT (name, grade, section, year) DO NOTHING;

-- Avisos de ejemplo
INSERT INTO announcements (category, title, body, sender, audience, is_read)
VALUES
  ('urgente', 'Simulacro de sismo - Jueves 14 de mayo',
   'Se realizará un simulacro de evacuación ante sismo el día jueves 14 de mayo a las 10:00 a.m. Los alumnos no deberán traer mochilas voluminosas.',
   'Dirección', 'todos', false),
  ('importante', 'Reunión de padres de familia - 5to grado',
   'Se convoca a los padres y/o apoderados de los alumnos de 5to grado a la reunión del lunes 18 de mayo a las 17:00 hrs.',
   'Coordinación Académica', 'padres', false),
  ('general', 'Día del Logro - Exposición de proyectos',
   'El próximo 28 de mayo se realizará el Día del Logro donde los alumnos presentarán sus proyectos de aprendizaje.',
   'Dirección', 'todos', true);

-- Mensaje de confirmación
DO $$ BEGIN
  RAISE NOTICE 'Datos de ejemplo insertados correctamente';
END $$;
