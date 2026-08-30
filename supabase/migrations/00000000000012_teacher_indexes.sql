-- =============================================================================
-- IJFK - Migración 012: índices del panel de docentes
-- =============================================================================
--  - section_tutors(teacher_id, year) — listado de cursos + requireTutoredSection.
--  - students(grade, section) WHERE status = 'activo' — roster de la sección.
-- Idempotente.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_section_tutors_teacher_year
  ON section_tutors (teacher_id, year);

CREATE INDEX IF NOT EXISTS idx_students_grade_section_activo
  ON students (grade, section)
  WHERE status = 'activo';
