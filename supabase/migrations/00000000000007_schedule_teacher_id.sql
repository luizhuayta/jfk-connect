-- =============================================================================
-- IJFK - Migración: schedule_entries.teacher_id (FK a users)
-- =============================================================================
-- schedule_entries.teacher era texto libre (nombre visible) comparado contra
-- users.full_name para resolver el horario del docente autenticado
-- (app/api/teacher/schedule/route.ts) y para detectar choques de horario en
-- el editor drag-and-drop del admin (app/admin/schedule/page.tsx). Eso rompe
-- en dos casos: dos docentes con el mismo nombre completo verían/chocarían
-- con el horario del otro, y si un admin edita el full_name de un docente,
-- su horario deja de coincidir silenciosamente.
--
-- Se agrega teacher_id (FK real) y se hace el backfill contra `courses`
-- (grade+section+subject=name), que sí tiene un teacher_id real y unívoco
-- por curso; `teacher` se conserva como nombre visible para no romper el
-- texto ya mostrado en el grid del admin.
--
-- Nota: el backfill NO se hace por nombre — el seed de datos demo reutiliza
-- el mismo full_name ("Prof. Luis Ramos", etc.) en varias cuentas docente
-- distintas, así que un match por nombre asigna filas a una cuenta
-- arbitraria entre las que calzan. El join contra courses es unívoco
-- (UNIQUE(grade, section, subject=name) verificado contra los datos reales).
--
-- Idempotente: ADD COLUMN IF NOT EXISTS; el UPDATE recalcula siempre desde
-- courses (no es un backfill de una sola vez condicionado a IS NULL), así
-- que reaplicar esta migración corrige teacher_id si courses cambió.
-- =============================================================================

ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id);

UPDATE schedule_entries se
SET teacher_id = c.teacher_id
FROM courses c
WHERE c.grade = se.grade
  AND c.section = se.section
  AND c.name = se.subject
  AND se.teacher_id IS DISTINCT FROM c.teacher_id;

CREATE INDEX IF NOT EXISTS idx_schedule_teacher_id ON schedule_entries(teacher_id);

COMMENT ON COLUMN schedule_entries.teacher_id IS 'Docente dueño del período (FK real); teacher sigue siendo el nombre visible para el grid';
