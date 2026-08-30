/**
 * IJFK - Aplicador de migraciones sobre una BD ya sembrada
 * =============================================================================
 * Uso:
 *   node scripts/migrate-apply.mjs                → aplica pendientes
 *   node scripts/migrate-apply.mjs --status        → lista aplicadas/pendientes
 *   node scripts/migrate-apply.mjs --dry-run       → lista qué se aplicaría, sin tocar la BD
 *   node scripts/migrate-apply.mjs --baseline-only → solo crea el ledger + baseline, no aplica nada
 *
 * Por qué existe: supabase/migrations/*.sql se ejecutan automáticamente vía
 * docker-entrypoint-initdb.d SOLO en un volumen Postgres nuevo. Este proyecto
 * ya tiene una BD sembrada con ~2,000 alumnos y ~127,000 notas
 * (npm run seed:full) — correr `docker:reset` para aplicar una migración
 * nueva borraría todo eso. Este script aplica solo lo pendiente sobre la BD
 * viva, usando una tabla `schema_migrations` como ledger.
 *
 * Auto-baseline: si el ledger está vacío pero la tabla `competency_grades` ya
 * existe (o sea, esta BD la construyó docker-entrypoint-initdb.d corriendo
 * 000-009 en un volumen nuevo), las migraciones 000-009 se marcan como
 * aplicadas SIN ejecutarlas. Sin este paso, el script reejecutaría la 000
 * (`ALTER TABLE grades ...`, tabla que la 009 renombró a `grades_legacy`) y
 * fallaría — o peor, tocaría datos que no debía tocar. Ver la nota de
 * invariante en la cabecera de supabase/migrations/00000000000010_ia.sql.
 *
 * Conexión: MIGRATE_DATABASE_URL tiene prioridad sobre DATABASE_URL porque
 * .env trae DATABASE_URL=...@db:5432/... (el host interno de Docker); si se
 * exporta el .env tal cual en una shell de host, DATABASE_URL apuntaría a un
 * host inexistente fuera del contenedor. Mismo default de host que
 * scripts/seed-full.mjs (localhost:54322, puerto publicado en
 * docker-compose.yml).
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

const DATABASE_URL =
  process.env.MIGRATE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://supabase_admin:ijfk_dev_password@localhost:54322/ijfk";

const STATUS_ONLY = process.argv.includes("--status");
const DRY_RUN = process.argv.includes("--dry-run");
const BASELINE_ONLY = process.argv.includes("--baseline-only");

// Migraciones ya asumidas como "aplicadas" cuando se detecta el escenario de
// auto-baseline (BD construida por docker-entrypoint-initdb.d, es decir, un
// volumen que corrió 000-009 en orden al crearse).
const BASELINE_VERSIONS_HINT = "00000000000000".length; // longitud del prefijo numérico

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedVersions(client) {
  const r = await client.query("SELECT version, checksum FROM schema_migrations");
  return new Map(r.rows.map((row) => [row.version, row.checksum]));
}

async function tableExists(client, tableName) {
  const r = await client.query(
    `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
    [tableName],
  );
  return r.rowCount > 0;
}

/**
 * Si el ledger está vacío y la BD ya tiene competency_grades (prueba de que
 * docker-entrypoint-initdb.d corrió las migraciones 000-009 al crear el
 * volumen), inserta esas 10 versiones en el ledger SIN ejecutar su SQL.
 */
async function autoBaseline(client, files, applied) {
  if (applied.size > 0) return false;

  const hasCompetencyGrades = await tableExists(client, "competency_grades");
  if (!hasCompetencyGrades) return false;

  const baselineFiles = files.filter((f) => {
    const version = f.slice(0, BASELINE_VERSIONS_HINT);
    return version <= "00000000000009";
  });

  console.log(
    `⚠ Baseline: se marcaron ${baselineFiles.length} migraciones como ya aplicadas ` +
      `(BD creada por initdb). No se ejecutó ninguna.`,
  );

  for (const file of baselineFiles) {
    const version = file.replace(/\.sql$/, "");
    const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await client.query(
      `INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)
       ON CONFLICT (version) DO NOTHING`,
      [version, sha256(text)],
    );
    applied.set(version, sha256(text));
  }
  return true;
}

async function applyMigration(client, file) {
  const version = file.replace(/\.sql$/, "");
  const filePath = path.join(MIGRATIONS_DIR, file);
  const text = fs.readFileSync(filePath, "utf8");
  const checksum = sha256(text);

  console.log(`→ Aplicando ${file} ...`);
  await client.query("BEGIN");
  try {
    // pg acepta múltiples sentencias en query() sin parámetros (protocolo
    // simple) — necesario para los bloques DO $$ ... $$ de estas migraciones.
    await client.query(text);
    await client.query(
      `INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)`,
      [version, checksum],
    );
    await client.query("COMMIT");
    console.log(`  ✓ ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`  ✗ ${file} falló, se revirtió la transacción.`);
    throw err;
  }
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await ensureLedger(client);
    const files = listMigrationFiles();
    const applied = await getAppliedVersions(client);

    const didBaseline = await autoBaseline(client, files, applied);
    if (BASELINE_ONLY) {
      console.log(didBaseline ? "Baseline aplicado." : "Nada que baselinear (ledger ya tenía datos, o BD vacía).");
      return;
    }

    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, "")));

    // Advertir (no fallar) si un archivo ya aplicado cambió de contenido —
    // las migraciones viejas son idempotentes, no queremos bloquear al
    // usuario por un checksum distinto en un comentario editado, por ejemplo.
    for (const f of files) {
      const version = f.replace(/\.sql$/, "");
      if (!applied.has(version)) continue;
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
      if (sha256(text) !== applied.get(version)) {
        console.warn(`⚠ ${f} ya está aplicada pero su contenido cambió desde entonces.`);
      }
    }

    if (STATUS_ONLY) {
      console.log("\nAplicadas:");
      for (const f of files) {
        const version = f.replace(/\.sql$/, "");
        if (applied.has(version)) console.log(`  ✓ ${f}`);
      }
      console.log("\nPendientes:");
      if (pending.length === 0) console.log("  (ninguna)");
      for (const f of pending) console.log(`  · ${f}`);
      return;
    }

    if (pending.length === 0) {
      console.log("Nada pendiente. La BD ya tiene todas las migraciones.");
      return;
    }

    if (DRY_RUN) {
      console.log("Se aplicarían (--dry-run, no se ejecuta nada):");
      for (const f of pending) console.log(`  · ${f}`);
      return;
    }

    for (const file of pending) {
      await applyMigration(client, file);
    }
    console.log(`\n${pending.length} migración(es) aplicada(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
