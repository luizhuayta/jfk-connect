/**
 * IJFK - Hashear contraseñas de usuarios seed con scrypt
 * =============================================================================
 * Garantiza que TODOS los usuarios de la BD tengan un `password_hash` válido
 * con el formato seguro `scrypt$<salt>$<hash>` (lib/password.ts), en lugar de
 * hashes legacy (SHA-256 con salt estático) o NULL.
 *
 * Reglas:
 *   - Usuarios con `password_hash IS NULL`            → se les asigna la
 *     contraseña por defecto y se hashea con scrypt.
 *   - Usuarios con hash legacy (no empieza con "scrypt$") → se re-hashea su
 *     contraseña por defecto (no podemos derivarla del hash viejo, así que se
 *     resetea a la contraseña por defecto y se marca `must_change_password`).
 *   - Usuarios que ya tienen hash scrypt → se omiten (idempotente).
 *
 * Uso:
 *   DATABASE_URL=postgresql://... node --import tsx scripts/hash-seed-passwords.ts
 *   npm run hash-passwords
 *
 * Variables de entorno:
 *   SEED_PASSWORD  contraseña por defecto para usuarios sin hash (default:
 *                  "Demo2026!"). En producción usa un valor aleatorio y
 *                  rota con `change-password` en el primer login.
 *   ONLY_EMAILS    (opcional) lista de emails separados por coma para limitar
 *                  el alcance del script (p. ej. "admin@ijfk.edu.pe").
 *
 * Importa lib/password.ts y lib/db.ts directamente (los mismos módulos que
 * usan las API routes en runtime), de modo que el hashing es idéntico al de
 * la aplicación.
 */

import { hashPassword, isLegacyHash } from "../lib/password";
import { query, closeDb } from "../lib/db";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Demo2026!";
const ONLY_EMAILS = process.env.ONLY_EMAILS
  ? process.env.ONLY_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : null;

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password_hash: string | null;
  must_change_password: boolean;
}

async function main() {
  const where: string[] = [];
  const params: unknown[] = [];

  // Usuarios sin hash o con hash legacy
  where.push(
    `(password_hash IS NULL OR password_hash NOT LIKE 'scrypt$%')`,
  );
  if (ONLY_EMAILS) {
    params.push(ONLY_EMAILS);
    where.push(`LOWER(email) = ANY($1::text[])`);
  }

  const sql = `
    SELECT id, email, full_name, role, password_hash, must_change_password
    FROM users
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at
  `;

  const r = await query<UserRow>(sql, params);
  console.log(
    `[hash-passwords] ${r.rows.length} usuario(s) sin hash scrypt (${ONLY_EMAILS ? "filtrado por email" : "todos"}).`,
  );

  if (r.rows.length === 0) {
    console.log("[hash-passwords] ✔ Nada que hacer. Todos los usuarios ya tienen hash scrypt.");
    await closeDb();
    return;
  }

  const hash = await hashPassword(DEFAULT_PASSWORD);
  let updated = 0;
  let legacy = 0;

  for (const u of r.rows) {
    const wasLegacy = u.password_hash !== null && isLegacyHash(u.password_hash);
    // Si era legacy, forzamos cambio de contraseña en el próximo login.
    const mustChange = u.must_change_password || wasLegacy;

    await query(
      `UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3`,
      [hash, mustChange, u.id],
    );
    updated++;
    if (wasLegacy) legacy++;
    console.log(
      `  • ${u.email}  (${u.role}) — ${wasLegacy ? "hash legacy re-hasheado + must_change" : "hash NULL → scrypt"}`,
    );
  }

  console.log("");
  console.log(`[hash-passwords] ✔ ${updated} usuario(s) actualizado(s) (${legacy} legacy re-hasheados).`);
  console.log(`[hash-passwords] Contraseña asignada: "${DEFAULT_PASSWORD}"`);
  console.log(`[hash-passwords] Recuerda cambiarla con change-password en el primer login.`);

  await closeDb();
}

main().catch((err) => {
  console.error("[hash-passwords] ✘ Error:", err);
  closeDb().finally(() => process.exit(1));
});