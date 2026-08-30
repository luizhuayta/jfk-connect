/**
 * Parseo de CSV para el importador de notas — IJFK.
 *
 * Usa `csv-parse` (ya estaba instalado, huérfano — el importador por fin lo
 * justifica). Config obligatoria: Excel en español exporta CSV delimitado
 * por `;`, no por `,` — sin autodetección el archivo llega como una sola
 * columna gigante. `bom: true` porque Excel para Windows agrega BOM UTF-8.
 */

import { parse } from "csv-parse/sync";
import type { ParsedSheet } from "@/lib/imports/types";

function detectDelimiter(sample: string): "," | ";" | "\t" {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<"," | ";" | "\t", number> = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const best = (Object.entries(counts) as ["," | ";" | "\t", number][]).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

export function parseCsv(buffer: Buffer): ParsedSheet {
  const text = buffer.toString("utf8");
  const delimiter = detectDelimiter(text);
  const rows = parse(text, {
    bom: true,
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  return { sheetName: "CSV", rows };
}
