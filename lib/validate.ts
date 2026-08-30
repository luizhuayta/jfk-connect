/**
 * Helper de validación para API routes — IJFK.
 *
 * Uso:
 *   const [data, errorResponse] = await parseBody(request, loginSchema);
 *   if (errorResponse) return errorResponse;
 *   // `data` ahora está tipado según el schema dado.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { ZodType, infer as zInfer } from "zod";
import { sniffMime, mimeMatchesSniff } from "@/lib/storage/sniff";

/** Par [éxito] | [null, respuesta 400 lista para devolver]. */
export type ParseResult<T> = [T, null] | [null, NextResponse];

/**
 * Lee el body JSON de la request y lo valida contra el schema Zod.
 * En caso de fallo devuelve una NextResponse 400 con el primer mensaje
 * de error legible.
 */
export async function parseBody<T extends ZodType>(
  request: NextRequest,
  schema: T,
): Promise<ParseResult<zInfer<T>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "El cuerpo de la petición no es JSON válido." },
        { status: 400 },
      ),
    ];
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues?.[0]?.message ?? "Datos no válidos.";
    return [
      null,
      NextResponse.json({ ok: false, error: first }, { status: 400 }),
    ];
  }

  return [result.data, null];
}

/** Un archivo ya leído en memoria, con su tipo verificado por contenido (no por el Content-Type declarado). */
export type UploadedPart = {
  buffer: Buffer;
  name: string;
  mime: string;
  size: number;
  sniffedKind: ReturnType<typeof sniffMime>;
};

/**
 * Lee un `multipart/form-data` (usado por el importador de notas: Excel/CSV/
 * foto). Mismo estilo de tupla que `parseBody`. A diferencia de `parseBody`
 * (que solo lee JSON), esta función:
 *   1. valida el tamaño ANTES de materializar el buffer completo en memoria,
 *   2. exige que el MIME declarado por el cliente coincida con lo que dice
 *      el contenido real del archivo (magic bytes, ver lib/storage/sniff.ts)
 *      — el Content-Type de un FormData lo controla quien sube el archivo,
 *      no es una garantía,
 *   3. valida el resto de campos del formulario (llegan como strings) con
 *      el schema Zod dado.
 */
export async function parseFormData<T extends ZodType>(
  request: NextRequest,
  opts: {
    fileField: string;
    fieldsSchema: T;
    maxBytes: number;
    allowedMime: readonly string[];
  },
): Promise<ParseResult<{ file: UploadedPart; fields: zInfer<T> }>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "El cuerpo de la petición no es un formulario válido." },
        { status: 400 },
      ),
    ];
  }

  const fileEntry = form.get(opts.fileField);
  if (!(fileEntry instanceof File)) {
    return [
      null,
      NextResponse.json({ ok: false, error: "Falta el archivo a subir." }, { status: 400 }),
    ];
  }

  if (fileEntry.size > opts.maxBytes) {
    const maxMb = Math.round(opts.maxBytes / (1024 * 1024));
    return [
      null,
      NextResponse.json(
        { ok: false, error: `El archivo supera el tamaño máximo de ${maxMb} MB.` },
        { status: 400 },
      ),
    ];
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const sniffedKind = sniffMime(buffer);
  const declaredMime = fileEntry.type || "application/octet-stream";
  const declaredOk = opts.allowedMime.some((m) => declaredMime.toLowerCase().startsWith(m));

  if (!declaredOk || !mimeMatchesSniff(declaredMime, sniffedKind)) {
    return [
      null,
      NextResponse.json(
        {
          ok: false,
          error: "Formato no admitido. Sube un archivo .xlsx, .csv o una foto JPG/PNG.",
        },
        { status: 400 },
      ),
    ];
  }

  const rawFields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key === opts.fileField) continue;
    if (typeof value === "string") rawFields[key] = value;
  }

  const parsedFields = opts.fieldsSchema.safeParse(rawFields);
  if (!parsedFields.success) {
    const first = parsedFields.error.issues?.[0]?.message ?? "Datos no válidos.";
    return [null, NextResponse.json({ ok: false, error: first }, { status: 400 })];
  }

  return [
    {
      file: { buffer, name: fileEntry.name, mime: declaredMime, size: fileEntry.size, sniffedKind },
      fields: parsedFields.data,
    },
    null,
  ];
}