/**
 * Lectura de respuestas `{ ok, error? }` del API en el cliente.
 * Comprueba HTTP status y JSON para no tragar 500 con cuerpo no-JSON.
 */

export async function readApiJson(response: Response): Promise<Record<string, unknown> & { ok: true }> {
  let data: { ok?: boolean; error?: string } | null = null;
  try {
    data = (await response.json()) as { ok?: boolean; error?: string };
  } catch {
    throw new Error("Respuesta inválida del servidor.");
  }
  if (!response.ok || !data?.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Error de red.");
  }
  return data as Record<string, unknown> & { ok: true };
}

export async function apiGet(
  url: string,
  init?: RequestInit,
): Promise<Record<string, unknown> & { ok: true }> {
  const r = await fetch(url, init);
  return readApiJson(r);
}

export async function apiSend(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  init?: RequestInit,
): Promise<Record<string, unknown> & { ok: true }> {
  const headers = new Headers(init?.headers);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const r = await fetch(url, {
    ...init,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : init?.body,
  });
  return readApiJson(r);
}
