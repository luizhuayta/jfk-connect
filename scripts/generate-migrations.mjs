// Regenera lib/migrations.generated.ts a partir de supabase/migrations/*.sql.
// Next.js solo empaqueta en el build standalone lo que se importa como módulo,
// no lecturas de filesystem arbitrarias, así que las migraciones se embeben
// como strings TS para que viajen dentro del bundle y se puedan aplicar en
// runtime (ver instrumentation.ts) en plataformas sin docker-entrypoint-initdb.d
// (p. ej. Seenode).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let out = "// GENERADO desde supabase/migrations/*.sql. No editar a mano.\n";
out += "// Regenerar con: node scripts/generate-migrations.mjs\n\n";
out += "export const migrations: { name: string; sql: string }[] = [\n";
for (const file of files) {
  const sql = readFileSync(join(dir, file), "utf8");
  out += `  { name: ${JSON.stringify(file)}, sql: ${JSON.stringify(sql)} },\n`;
}
out += "];\n";

writeFileSync(join(process.cwd(), "lib", "migrations.generated.ts"), out);
console.log(`[generate-migrations] ${files.length} migraciones embebidas en lib/migrations.generated.ts`);
