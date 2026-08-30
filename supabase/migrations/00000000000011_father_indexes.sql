-- =============================================================================
-- IJFK - Migración 011: índices del panel de padres
-- =============================================================================
--  - Índice funcional lower(enrollment_code) para el claim (WHERE lower(...)).
--  - Índice de courses (grade, section, shift, year) para materiales.
-- Idempotente.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_students_enrollment_code_lower
  ON students (lower(enrollment_code));

CREATE INDEX IF NOT EXISTS idx_courses_grade_section_shift_year
  ON courses (grade, section, shift, year);
