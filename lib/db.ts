/**
 * Cliente de PostgreSQL directo usando node-postgres (pg).
 *
 * Esto se usa en lugar de Supabase REST para conexiones server-side
 * a la base de datos local (la imagen supabase/postgres en Docker no
 * incluye PostgREST por defecto).
 *
 * Para Supabase Cloud, cambia DATABASE_URL por la connection string
 * de tu proyecto (Transaction mode).
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://supabase_admin:ijfk_dev_password@db:5432/ijfk";

// Postgres administrados (Seenode, Supabase Cloud, etc.) requieren TLS con
// certificado autofirmado. El Postgres de docker-compose (host "db"/"localhost")
// no soporta TLS, así que solo activamos ssl cuando el host es remoto.
function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "db" || host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

declare global {
  var __ijfkPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__ijfkPool) {
    global.__ijfkPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocalHost(DATABASE_URL) ? undefined : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    global.__ijfkPool.on("error", (err) => {
      console.error("[db] Error inesperado en el pool:", err);
    });
  }
  return global.__ijfkPool;
}

export type { PoolClient, QueryResult, QueryResultRow };

/**
 * Ejecuta una consulta parametrizada.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

/**
 * Ejecuta una consulta y devuelve solo la primera fila (o null).
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const r = await query<T>(text, params);
  return r.rows[0] ?? null;
}

/**
 * Ejecuta múltiples operaciones dentro de una transacción.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cierra el pool (solo en scripts o tests).
 */
export async function closeDb(): Promise<void> {
  if (global.__ijfkPool) {
    await global.__ijfkPool.end();
    global.__ijfkPool = undefined;
  }
}

/**
 * Devuelve true si el error es una violación de UNIQUE (SQLSTATE 23505).
 * Útil para responder 409 en lugar de 500 cuando dos peticiones compiten
 * (p. ej. dos justificaciones simultáneas para la misma falta).
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

/**
 * Devuelve true si el error es una violación de FOREIGN KEY (SQLSTATE 23503).
 * Útil para responder 404 cuando se referencia un recurso inexistente.
 */
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23503"
  );
}

// Lock de advisory arbitrario (namespace propio de IJFK) para que, si varias
// instancias arrancan a la vez (scale > 1), solo una aplique migraciones.
const MIGRATIONS_ADVISORY_LOCK_ID = 7934559;

/**
 * Aplica supabase/migrations/*.sql (embebidas en lib/migrations.generated.ts)
 * contra DATABASE_URL, en orden, una sola vez cada una. Necesario en
 * plataformas sin docker-entrypoint-initdb.d (p. ej. Seenode), donde el
 * Postgres administrado arranca vacío y nadie más ejecuta el esquema inicial.
 * Se llama desde instrumentation.ts al iniciar el proceso del servidor.
 */
export async function applyMigrations(): Promise<void> {
  const { migrations } = await import("./migrations.generated");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`SELECT pg_advisory_lock(${MIGRATIONS_ADVISORY_LOCK_ID})`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    const { rows } = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations",
    );
    const applied = new Set(rows.map((r) => r.name));

    for (const migration of migrations) {
      if (applied.has(migration.name)) continue;
      console.log(`[migrate] aplicando ${migration.name}...`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          migration.name,
        ]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.query(`SELECT pg_advisory_unlock(${MIGRATIONS_ADVISORY_LOCK_ID})`);
    client.release();
  }
}
