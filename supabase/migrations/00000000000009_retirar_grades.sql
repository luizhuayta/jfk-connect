-- =============================================================================
-- IJFK - Migración 009: retirar `grades` (modelo plano n1/n2/n3)
-- =============================================================================
-- La app ya no lee ni escribe `grades` en ningún camino: todo el registro
-- académico (captura docente/admin, panel del padre, PDF de la libreta,
-- dashboards) pasa por `competency_grades` + las vistas de rollup
-- `v_area_grades`/`v_course_bimester_stats` (migración 008). Esta migración
-- cierra la retirada:
--
--   1. Elimina el trigger/función que calculaba la letra vieja
--      (A 18-20/B 15-17/C 10-14/D 0-9, migración 005) — ya no tiene
--      consumidores y su escala contradice a `nivel_logro()` (008).
--   2. Renombra `grades` → `grades_legacy` en vez de borrarla: escotilla de
--      salida por si hace falta auditar o migrar datos históricos que el
--      seed no reconstruye (la tabla NO se dropea aquí).
--
-- Idempotente: los DROP/rename usan guards (IF EXISTS) para poder reaplicar
-- sin error sobre un volumen donde ya corrió.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_grades_letter ON grades;
DROP FUNCTION IF EXISTS compute_letter_grade();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades' AND relkind = 'r')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades_legacy' AND relkind = 'r') THEN
    ALTER TABLE grades RENAME TO grades_legacy;
    RAISE NOTICE 'grades renombrada a grades_legacy (retirada, no dropeada).';
  END IF;
END $$;

COMMENT ON TABLE grades_legacy IS 'Retirada en la migración 009 — modelo plano n1/n2/n3 reemplazado por competency_grades (008). Conservada solo como escotilla de salida / auditoría histórica; ningún camino de la app la lee.';
