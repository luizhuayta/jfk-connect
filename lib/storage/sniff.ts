/**
 * Detección de tipo de archivo por contenido (magic bytes) — IJFK.
 *
 * El `Content-Type` que manda el navegador en un FormData es un dato que
 * controla quien sube el archivo, no una garantía. Antes de aceptar un
 * upload (Excel/CSV/foto para el importador de notas con IA) se verifica el
 * contenido real del buffer contra el MIME declarado, no solo el declarado.
 */

export type SniffedKind = "xlsx" | "jpeg" | "png" | "csv" | "unknown";

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04" — zip (xlsx es un zip)
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function matches(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

/** ¿El buffer es texto imprimible (o vacío)? Heurística para CSV/TSV. */
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (sample.length === 0) return true;
  let printable = 0;
  for (const byte of sample) {
    // Tab, LF, CR, o rango imprimible ASCII/Latin-1 (incluye tildes en UTF-8
    // multibyte, que aquí solo estamos contando byte a byte de forma laxa).
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte !== 0x7f)) {
      printable++;
    }
  }
  return printable / sample.length > 0.95;
}

/** Identifica el tipo real de un archivo por su contenido, no por su Content-Type declarado. */
export function sniffMime(buffer: Buffer): SniffedKind {
  if (matches(buffer, XLSX_MAGIC)) return "xlsx";
  if (matches(buffer, JPEG_MAGIC)) return "jpeg";
  if (matches(buffer, PNG_MAGIC)) return "png";
  if (looksLikeText(buffer)) return "csv";
  return "unknown";
}

const KIND_TO_MIME: Record<Exclude<SniffedKind, "unknown">, string[]> = {
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
};

/** ¿El MIME declarado por el cliente es compatible con lo que dice el contenido real? */
export function mimeMatchesSniff(declaredMime: string, sniffed: SniffedKind): boolean {
  if (sniffed === "unknown") return false;
  return KIND_TO_MIME[sniffed].some((m) => declaredMime.toLowerCase().startsWith(m));
}

const KIND_TO_EXT: Record<Exclude<SniffedKind, "unknown">, string> = {
  xlsx: ".xlsx",
  jpeg: ".jpg",
  png: ".png",
  csv: ".csv",
};

/** Extensión segura derivada del contenido REAL del archivo, nunca del nombre que mandó el cliente. */
export function extensionForSniff(sniffed: SniffedKind): string {
  return sniffed === "unknown" ? ".bin" : KIND_TO_EXT[sniffed];
}
