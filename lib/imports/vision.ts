/**
 * Extracción de tabla desde una foto (OCR vía IA de visión) — IJFK.
 *
 * Devuelve texto crudo, celda por celda — el mismo `ParsedSheet` que
 * produce el path de Excel/CSV. A partir de aquí el pipeline es idéntico
 * (lib/imports/detect.ts + match.ts + score.ts): la IA solo transcribió,
 * nunca decidió a qué alumno/competencia corresponde cada valor.
 */

import { z } from "zod";
import { requestJson } from "@/lib/ai/json";
import { getAiConfig } from "@/lib/ai/config";
import type { ImageMime } from "@/lib/ai/vision";
import { imagePart } from "@/lib/ai/vision";
import { VISION_GRADES_SYSTEM_PROMPT } from "@/lib/ai/prompts/vision-grades";
import type { ParsedSheet } from "@/lib/imports/types";

/**
 * SIN `.max()` en los arrays a propósito — verificado empíricamente que
 * `maxItems` en un array ANIDADO (rows[].cells) hace que Gemini (vía
 * OpenRouter, structured output estricto) rechace la petición con 400
 * "schema produces a constraint that has too many states for serving": su
 * generación restringida no puede acotar el espacio combinatorio de dos
 * límites de longitud anidados. El límite de tamaño se aplica en código
 * DESPUÉS de recibir la respuesta (ver MAX_ROWS/MAX_COLS abajo), no en el
 * schema — mismo resultado práctico, sin el 400.
 */
const visionGridSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.object({ cells: z.array(z.string()) })),
});

const MAX_ROWS = 80;
const MAX_COLS = 30;

export interface ExtractedSheet {
  sheet: ParsedSheet;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
}

export async function extractGridFromImage(buffer: Buffer, mime: ImageMime): Promise<ExtractedSheet> {
  const cfg = getAiConfig();
  const result = await requestJson({
    schema: visionGridSchema,
    schemaName: "tabla_notas_foto",
    model: cfg.modelVision,
    messages: [
      { role: "system", content: VISION_GRADES_SYSTEM_PROMPT },
      {
        role: "user",
        content: [imagePart(buffer, mime), { type: "text", text: "Transcribe la tabla de esta foto celda por celda." }],
      },
    ],
  });

  const rows: string[][] = [
    result.data.headers.slice(0, MAX_COLS),
    ...result.data.rows.slice(0, MAX_ROWS).map((r) => r.cells.slice(0, MAX_COLS)),
  ];
  return {
    sheet: { sheetName: "Foto (OCR)", rows },
    usage: result.usage,
    model: result.model,
  };
}
