/**
 * GET  /api/announcements  -> Avisos visibles para el usuario autenticado
 * POST /api/announcements  -> Crear aviso (solo admin)
 *
 * Filtrado por audiencia según rol:
 *   - padre:   'todos', 'padres' y los grados de sus hijos (p. ej. '5to')
 *   - docente: 'todos'
 *   - admin:   todos los avisos
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { createAnnouncementSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

interface AnnouncementRow {
  id: string;
  category: "urgente" | "importante" | "general" | "informativo";
  title: string;
  body: string;
  sender: string;
  audience: string;
  is_read: boolean;
  published_at: string;
}

const CATEGORIES = ["urgente", "importante", "general", "informativo"] as const;

export async function GET(request: NextRequest) {
  const [user, denied] = await requireUser(request);
  if (denied) return denied;

  try {
    const params: unknown[] = [];
    let where = "";

    if (user.role === "padre") {
      // Audiencias: todos, padres y los grados de sus hijos
      params.push(user.id);
      where = `WHERE audience IN ('todos', 'padres')
        OR audience IN (SELECT DISTINCT grade FROM students WHERE parent_id = $1)`;
    } else if (user.role === "docente") {
      where = `WHERE audience IN ('todos', 'docentes')`;
    }
    // admin: sin filtro

    const r = await query<AnnouncementRow>(
      `SELECT id,
              category::text AS category,
              title,
              body,
              sender,
              audience,
              is_read,
              to_char(published_at, 'YYYY-MM-DD') AS published_at
       FROM announcements
       ${where}
       ORDER BY published_at DESC`,
      params,
    );

    const announcements = r.rows.map((a) => ({
      id: a.id,
      category: a.category,
      title: a.title,
      body: a.body,
      sender: a.sender,
      date: a.published_at,
      read: a.is_read,
      audience: a.audience,
    }));

    return NextResponse.json({ ok: true, announcements });
  } catch (err) {
    console.error("[announcements GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const [parsed, validationError] = await parseBody(request, createAnnouncementSchema);
    if (validationError) return validationError;
    const category = parsed.category ?? "general";
    const title = parsed.title;
    const bodyText = parsed.body;
    const sender = parsed.sender?.trim() || "Dirección";
    const audience = parsed.audience?.trim() || "todos";

    const r = await query<AnnouncementRow>(
      `INSERT INTO announcements (category, title, body, sender, audience)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id,
                 category::text AS category,
                 title,
                 body,
                 sender,
                 audience,
                 is_read,
                 to_char(published_at, 'YYYY-MM-DD') AS published_at`,
      [category, title, bodyText, sender, audience],
    );

    const a = r.rows[0];
    return NextResponse.json({
      ok: true,
      announcement: {
        id: a.id,
        category: a.category,
        title: a.title,
        body: a.body,
        sender: a.sender,
        date: a.published_at,
        read: a.is_read,
        audience: a.audience,
      },
    });
  } catch (err) {
    console.error("[announcements POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
