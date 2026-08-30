/**
 * Helper de imagen para el path de foto del importador de notas — IJFK.
 *
 * Sin `sharp` ni ninguna librería de imagen: la foto va tal cual, como
 * data-URL base64, al modelo de visión. El modelo hace SOLO OCR (transcribe
 * la tabla); todo el mapeo de columnas, matching de alumnos y validación
 * pasan por el mismo código determinista que el path de Excel/CSV
 * (lib/imports/*) — ver fase P4 del plan.
 */

export type ImageMime = "image/jpeg" | "image/png";

/** Construye el content-part `image_url` con data-URL, para meter en un mensaje `user` con visión. */
export function imagePart(buffer: Buffer, mime: ImageMime): { type: "image_url"; image_url: { url: string } } {
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${buffer.toString("base64")}` },
  };
}
