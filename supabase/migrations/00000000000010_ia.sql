-- =============================================================================
-- IJFK - Migración 010: módulo de IA (conclusiones, importador, asistente,
-- asignación inteligente de cursos)
-- =============================================================================
-- 100% aditiva: no toca ninguna tabla existente. Siete tablas nuevas:
--
--   ai_usage_log          auditoría + freno de gasto de cada llamada al
--                         proveedor de IA (tokens, latencia, feature, éxito).
--   uploaded_files        un registro por archivo guardado en disco
--                         (UPLOADS_DIR), separado del proceso que lo usa.
--   import_jobs           cabecera de una importación de notas (Excel/CSV/
--                         foto): el scope de permisos queda CONGELADO aquí
--                         para poder re-verificarlo en cada paso posterior.
--   import_rows           una fila del archivo = un alumno candidato; aquí
--                         vive el resultado del matching (DNI/orden/nombre/
--                         fuzzy/IA).
--   import_cells           una celda = (fila, competencia); aquí viven los
--                         valores editables por la UI de revisión.
--   ai_conversations /
--   ai_messages            historial persistente del asistente conversacional
--                         (continuidad + auditoría de qué se le dijo a un
--                         padre sobre un menor).
--   course_assignment_runs propuestas de asignación docente↔curso generadas
--                         por el motor determinista, y qué subconjunto aplicó
--                         el admin.
--
-- Deliberadamente NO hay una tabla de "sugerencias de conclusión": el
-- borrador vive en el estado del cliente hasta que el docente pulsa
-- Guardar, y la escritura real sigue pasando por
-- competency_grades/saveGradeEntries de siempre. La trazabilidad la da
-- ai_usage_log (feature='conclusions').
--
-- Invariante importante (NO instalar un shim para esto): las migraciones
-- 000-009 hacen referencia a la tabla `grades`, que la 009 renombró a
-- `grades_legacy`. Sobre un volumen fresco no hay problema (corren en
-- orden). Pero 000/004 NO son reejecutables sobre una base que ya pasó por
-- la 009 — es el propio ledger de scripts/migrate-apply.mjs
-- (schema_migrations, con auto-baseline) el que garantiza que eso nunca
-- ocurra. No añadir guardas de compatibilidad aquí para un escenario que el
-- ledger ya hace imposible.
--
-- Idempotente: CREATE TABLE/INDEX IF NOT EXISTS, triggers con DROP+CREATE,
-- políticas RLS envueltas en el mismo guard auth.uid() que
-- 00000000000008_competencias.sql (sin él, `CREATE POLICY ... TO
-- authenticated` aborta TODO el initdb en un volumen local sin Supabase
-- Auth).
-- =============================================================================

-- ─── 1. Auditoría y gasto de IA ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature           TEXT NOT NULL CHECK (feature IN (
                       'conclusions', 'import_vision', 'import_match',
                       'assistant', 'assignment'
                     )),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INT,
  completion_tokens INT,
  total_tokens      INT,
  latency_ms        INT,
  ok                BOOLEAN NOT NULL,
  error_kind        TEXT,
  ref_type          TEXT,
  ref_id            UUID,
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE ai_usage_log IS 'Una fila por llamada al proveedor de IA. Alimenta el freno de gasto (AI_DAILY_TOKEN_BUDGET) y el panel /admin/ai.';

CREATE INDEX IF NOT EXISTS idx_ai_usage_created     ON ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature      ON ai_usage_log(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user         ON ai_usage_log(user_id, created_at DESC);

-- ─── 2. Archivos subidos (Excel/CSV/foto) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature       TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path   TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size_bytes    INT NOT NULL,
  sha256        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'almacenado' CHECK (status IN ('almacenado', 'eliminado')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
COMMENT ON TABLE uploaded_files IS 'Registro de archivos en UPLOADS_DIR (volumen Docker). El nombre original del cliente nunca forma parte de stored_path (evita path traversal); solo se guarda como metadato aquí.';
COMMENT ON COLUMN uploaded_files.sha256 IS 'Integridad + deduplicación best-effort.';

CREATE INDEX IF NOT EXISTS idx_uploaded_files_owner ON uploaded_files(owner_id, created_at DESC);

-- ─── 3. Importación de notas: cabecera del job ────────────────────────────────
CREATE TABLE IF NOT EXISTS import_jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id      UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('excel', 'csv', 'foto')),
  -- Scope congelado al momento de subir: se vuelve a resolver/verificar con
  -- resolveGradeScope() en /parse, GET y /commit, no solo aquí.
  course_id    UUID REFERENCES courses(id) ON DELETE SET NULL,
  grade        TEXT NOT NULL,
  section      TEXT NOT NULL,
  transversal  BOOLEAN NOT NULL DEFAULT false,
  bimester     SMALLINT NOT NULL CHECK (bimester BETWEEN 1 AND 4),
  year         SMALLINT NOT NULL DEFAULT 2026,
  status       TEXT NOT NULL DEFAULT 'subido' CHECK (status IN (
                 'subido', 'analizando', 'revision', 'aplicado', 'descartado', 'error'
               )),
  source_meta  JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE import_jobs IS 'Un job por archivo subido. course_id/grade/section/transversal/bimester son el scope congelado que resolveGradeScope() vuelve a verificar en cada paso.';

CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status     ON import_jobs(status);

DROP TRIGGER IF EXISTS trg_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER trg_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. Importación de notas: filas (alumnos candidatos) ──────────────────────
CREATE TABLE IF NOT EXISTS import_rows (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_index           INT NOT NULL,
  raw                 JSONB NOT NULL,
  raw_order           INT,
  raw_dni             TEXT,
  raw_name            TEXT,
  matched_student_id  UUID REFERENCES students(id) ON DELETE SET NULL,
  match_method        TEXT CHECK (match_method IN (
                         'dni', 'orden', 'nombre_exacto', 'nombre_normalizado',
                         'fuzzy', 'ia', 'manual'
                       )),
  match_score         NUMERIC(4,3),
  status              TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'ambiguo', 'sin_match', 'omitido')),
  issues              JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_index)
);
COMMENT ON TABLE import_rows IS 'Una fila del archivo original = un alumno candidato. match_method="ia" siempre queda con status="ambiguo": la IA sugiere, un humano confirma con un clic.';

CREATE INDEX IF NOT EXISTS idx_import_rows_job ON import_rows(job_id);

DROP TRIGGER IF EXISTS trg_import_rows_updated_at ON import_rows;
CREATE TRIGGER trg_import_rows_updated_at
  BEFORE UPDATE ON import_rows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 5. Importación de notas: celdas (fila × competencia) ─────────────────────
CREATE TABLE IF NOT EXISTS import_cells (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id         UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_id         UUID NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE,
  competency_id  SMALLINT REFERENCES competencies(id) ON DELETE RESTRICT,
  column_label   TEXT,
  raw_value      TEXT,
  score          NUMERIC(4,2) CHECK (score BETWEEN 0 AND 20),
  conclusion     TEXT,
  status         TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'invalido', 'vacio', 'sin_mapear')),
  issue          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (row_id, competency_id)
);
COMMENT ON TABLE import_cells IS 'Un JSONB por fila obligaría a leer-modificar-escribir toda la fila en cada PATCH de la UI de revisión; celdas separadas evitan esa carrera. IMPORTANTE: score NULL nunca debe llegar a saveGradeEntries() como entrada de commit (ese caso significa DELETE ahí) — el commit filtra status=''ok'' AND score IS NOT NULL antes de construir SaveEntryInput[].';

CREATE INDEX IF NOT EXISTS idx_import_cells_job ON import_cells(job_id);
CREATE INDEX IF NOT EXISTS idx_import_cells_row ON import_cells(row_id);

DROP TRIGGER IF EXISTS trg_import_cells_updated_at ON import_cells;
CREATE TRIGGER trg_import_cells_updated_at
  BEFORE UPDATE ON import_cells
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. Asistente conversacional ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT,
  role_at_creation user_role NOT NULL,
  message_count    INT NOT NULL DEFAULT 0,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, last_message_at DESC);

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  seq             INT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content         TEXT,
  tool_name       TEXT,
  tool_calls      JSONB,
  tool_result     JSONB,
  total_tokens    INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, seq)
);
COMMENT ON TABLE ai_messages IS 'Auditoría de qué le dijo la IA a un padre/docente/admin sobre datos de un menor. Retención: cleanup_old_ai_conversations() borra conversaciones con last_message_at < 90 días, invocada perezosamente al crear una conversación nueva.';

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, seq);

-- Retención de 90 días — mismo patrón que cleanup_expired_pending_registrations()
-- de 00000000000001_registration.sql. No hay pg_cron en esta imagen; se invoca
-- de forma perezosa (best-effort, fire-and-forget) al crear una conversación.
CREATE OR REPLACE FUNCTION cleanup_old_ai_conversations()
RETURNS void
LANGUAGE sql AS $$
  DELETE FROM ai_conversations
  WHERE last_message_at IS NOT NULL AND last_message_at < now() - interval '90 days';
$$;

-- ─── 7. Asignación inteligente de cursos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_assignment_runs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope          JSONB NOT NULL,
  proposals      JSONB NOT NULL,
  applied_count  INT NOT NULL DEFAULT 0,
  applied_at     TIMESTAMPTZ,
  explanation    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE course_assignment_runs IS 'Qué propuso el motor determinista frente a qué aplicó el admin — evidencia auditable de que la IA solo explica, no decide (ver lib/courses/assignment.ts).';

CREATE INDEX IF NOT EXISTS idx_assignment_runs_created_by ON course_assignment_runs(created_by, created_at DESC);

DROP TRIGGER IF EXISTS trg_assignment_runs_updated_at ON course_assignment_runs;
CREATE TRIGGER trg_assignment_runs_updated_at
  BEFORE UPDATE ON course_assignment_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 8. RLS ────────────────────────────────────────────────────────────────────
-- Mismo guard que 00000000000008_competencias.sql: localmente no existen los
-- roles authenticated/anon ni auth.uid() (no hay Supabase Auth local), así que
-- sin este guard CREATE POLICY ... TO authenticated aborta TODO el initdb.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    RAISE NOTICE 'auth.uid() no disponible: saltando políticas RLS del módulo de IA.';
    RETURN;
  END IF;

  ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "uploaded_files_owner_or_admin" ON uploaded_files;
  CREATE POLICY "uploaded_files_owner_or_admin" ON uploaded_files
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "import_jobs_owner_or_admin" ON import_jobs;
  CREATE POLICY "import_jobs_owner_or_admin" ON import_jobs
    FOR ALL TO authenticated
    USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "import_rows_via_job" ON import_rows;
  CREATE POLICY "import_rows_via_job" ON import_rows
    FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM import_jobs j
      WHERE j.id = import_rows.job_id
        AND (j.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    ));

  ALTER TABLE import_cells ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "import_cells_via_job" ON import_cells;
  CREATE POLICY "import_cells_via_job" ON import_cells
    FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM import_jobs j
      WHERE j.id = import_cells.job_id
        AND (j.created_by = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    ));

  ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "ai_conversations_owner" ON ai_conversations;
  CREATE POLICY "ai_conversations_owner" ON ai_conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

  ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "ai_messages_via_conversation" ON ai_messages;
  CREATE POLICY "ai_messages_via_conversation" ON ai_messages
    FOR ALL TO authenticated
    USING (EXISTS (
      SELECT 1 FROM ai_conversations c WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
    ));

  ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "ai_usage_log_admin_only" ON ai_usage_log;
  CREATE POLICY "ai_usage_log_admin_only" ON ai_usage_log
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

  ALTER TABLE course_assignment_runs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "course_assignment_runs_admin_only" ON course_assignment_runs;
  CREATE POLICY "course_assignment_runs_admin_only" ON course_assignment_runs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
END $$;
