/**
 * Almacenamiento de archivos subidos (Excel/CSV/foto del importador de
 * notas) — IJFK.
 *
 * El repo no tenía storage de archivos reales antes de esto (la tabla
 * `materials` solo guarda metadatos). Se guarda en disco, en un volumen
 * Docker nombrado (`UPLOADS_DIR`, ver docker-compose.yml), con un registro
 * en la tabla `uploaded_files` (migración 010).
 *
 * Reglas de seguridad:
 *  - El nombre original del cliente NUNCA forma parte de la ruta en disco
 *    (evita path traversal); se guarda solo como metadato en `original_name`.
 *  - La extensión en disco sale del sniff del contenido real
 *    (lib/storage/sniff.ts), no de lo que declaró el cliente.
 */

import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, unlink, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { query, queryOne } from "@/lib/db";
import type { SniffedKind } from "@/lib/storage/sniff";
import { extensionForSniff } from "@/lib/storage/sniff";

function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? "./uploads";
}

export interface SaveUploadInput {
  buffer: Buffer;
  originalName: string;
  mime: string;
  sniffed: SniffedKind;
  feature: string;
  ownerId: string;
}

export interface SavedUpload {
  fileId: string;
  storedPath: string;
  sha256: string;
}

interface UploadedFileRow {
  id: string;
  owner_id: string;
  stored_path: string;
  status: string;
}

/** Guarda el buffer en disco y registra el archivo en `uploaded_files`. */
export async function saveUpload(input: SaveUploadInput): Promise<SavedUpload> {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionForSniff(input.sniffed);
  const relativeDir = path.join("imports", yyyy, mm);
  const fileName = `${randomUUID()}${ext}`;
  const absoluteDir = path.join(uploadsDir(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, fileName);
  const storedPath = path.join(relativeDir, fileName);

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");

  await writeFile(absolutePath, input.buffer, { mode: 0o600 });

  const row = await queryOne<{ id: string }>(
    `INSERT INTO uploaded_files (owner_id, feature, original_name, stored_path, mime, size_bytes, sha256)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [input.ownerId, input.feature, input.originalName, storedPath, input.mime, input.buffer.length, sha256],
  );
  if (!row) throw new Error("No se pudo registrar el archivo subido.");

  return { fileId: row.id, storedPath, sha256 };
}

/**
 * Lee un archivo del disco, verificando que pertenezca al dueño (o que
 * `allowAdmin` esté activo y el llamador sea admin — la verificación de rol
 * es responsabilidad de quien llama, aquí solo se compara `owner_id`).
 */
export async function readUpload(
  fileId: string,
  ownerId: string,
  opts: { allowAdmin?: boolean } = {},
): Promise<Buffer> {
  const row = await queryOne<UploadedFileRow>(
    `SELECT id, owner_id, stored_path, status FROM uploaded_files WHERE id = $1`,
    [fileId],
  );
  if (!row || row.status === "eliminado") {
    throw new Error("Archivo no encontrado.");
  }
  if (row.owner_id !== ownerId && !opts.allowAdmin) {
    throw new Error("No tienes acceso a este archivo.");
  }
  const absolutePath = path.join(uploadsDir(), row.stored_path);
  return readFile(absolutePath);
}

/** Borra el archivo del disco (best-effort) y lo marca `eliminado` en la BD. */
export async function deleteUpload(fileId: string): Promise<void> {
  const row = await queryOne<UploadedFileRow>(
    `SELECT id, stored_path, status FROM uploaded_files WHERE id = $1`,
    [fileId],
  );
  if (!row || row.status === "eliminado") return;

  const absolutePath = path.join(uploadsDir(), row.stored_path);
  try {
    await unlink(absolutePath);
  } catch {
    // Best-effort: si el archivo ya no está en disco, igual se marca eliminado.
  }
  await query(`UPDATE uploaded_files SET status = 'eliminado', deleted_at = now() WHERE id = $1`, [fileId]);
}

/**
 * Purga (best-effort) archivos con más de `days` días de antigüedad que
 * sigan `almacenado`. Se invoca de forma perezosa desde la ruta de upload,
 * no hay cron en esta imagen.
 */
export async function purgeOldUploads(days = 7): Promise<number> {
  const rows = await query<{ id: string; stored_path: string }>(
    `SELECT id, stored_path FROM uploaded_files
     WHERE status = 'almacenado' AND created_at < now() - ($1 || ' days')::interval`,
    [days],
  );
  let purged = 0;
  for (const row of rows.rows) {
    const absolutePath = path.join(uploadsDir(), row.stored_path);
    try {
      await stat(absolutePath);
      await unlink(absolutePath);
    } catch {
      // Ya no existe en disco; igual se marca eliminado abajo.
    }
    await query(`UPDATE uploaded_files SET status = 'eliminado', deleted_at = now() WHERE id = $1`, [row.id]);
    purged++;
  }
  return purged;
}
