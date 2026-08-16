/**
 * PATCH /api/announcements/[id]/read
 *
 * Marca un aviso como leído para el usuario autenticado (upsert en
 * `announcement_reads`). No toca la columna global `is_read`.
 *
 * El sidebar y la página de avisos llaman a este endpoint al abrir un aviso,
 * de modo que el estado persiste entre recargas.
 *
 * Seguridad: cualquier usuario autenticado puede marcar sus propios avisos.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, isForeignKeyViolation } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    // Upsert idempotente: marcar de nuevo no duplica filas.
    try {
      await query(
        `INSERT INTO announcement_reads (user_id, announcement_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, announcement_id) DO NOTHING`,
        [user.id, id],
      );
    } catch (err) {
      // Aviso inexistente → 404 en lugar de un 500 por violación de FK.
      if (isForeignKeyViolation(err)) {
        return NextResponse.json(
          { ok: false, error: "Aviso no encontrado." },
          { status: 404 },
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "announcements/[id]/read PATCH", userId: user.id }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
