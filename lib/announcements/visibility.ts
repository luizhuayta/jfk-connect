/**
 * Audiencia de avisos — misma regla que GET /api/announcements,
 * reutilizada por PATCH .../read para no marcar como leído un aviso
 * que el usuario no debería ver.
 */

import { queryOne } from "@/lib/db";
import type { AuthUser } from "@/lib/auth";

export async function isAnnouncementVisibleToUser(
  user: AuthUser,
  announcementId: string,
): Promise<boolean> {
  if (user.role === "admin") {
    const row = await queryOne<{ id: string }>(
      "SELECT id FROM announcements WHERE id = $1",
      [announcementId],
    );
    return row !== null;
  }

  if (user.role === "docente") {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM announcements
       WHERE id = $1 AND audience IN ('todos', 'docentes')`,
      [announcementId],
    );
    return row !== null;
  }

  const row = await queryOne<{ id: string }>(
    `SELECT id FROM announcements
     WHERE id = $1 AND (
       audience IN ('todos', 'padres')
       OR audience IN (SELECT DISTINCT grade FROM students WHERE parent_id = $2)
     )`,
    [announcementId, user.id],
  );
  return row !== null;
}
