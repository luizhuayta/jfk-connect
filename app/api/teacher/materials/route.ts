/**
 * GET /api/teacher/materials
 *
 * Materiales de TODOS los cursos del docente en una sola consulta.
 * Reemplaza el N+1 de GET /api/teacher/courses/{id}/materials por curso
 * que hacía la página de materiales. El endpoint por curso se mantiene
 * para no romper consumidores puntuales.
 *
 * Seguridad: solo rol 'docente'; el JOIN filtra por teacher_id.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface MaterialRow {
  id: string;
  course_id: string;
  title: string;
  type: "pdf" | "pptx" | "docx" | "xlsx" | "img";
  size: string | null;
  topic: string | null;
  uploaded_at: string;
}

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  try {
    const r = await query<MaterialRow>(
      `SELECT m.id, m.course_id, m.title, m.type, m.size, m.topic,
              to_char(m.uploaded_at, 'YYYY-MM-DD') AS uploaded_at
       FROM materials m
       JOIN courses c ON c.id = m.course_id
       WHERE c.teacher_id = $1
       ORDER BY m.uploaded_at DESC`,
      [user.id],
    );

    return NextResponse.json({
      ok: true,
      materials: r.rows.map((m) => ({
        id: m.id,
        courseId: m.course_id,
        title: m.title,
        type: m.type,
        size: m.size ?? "",
        topic: m.topic ?? "",
        uploadedAt: m.uploaded_at,
      })),
    });
  } catch (err) {
    logger.error({ err, route: "teacher/materials GET" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
