/**
 * GET  /api/teacher/courses/[courseId]/materials  -> Materiales del curso
 * POST /api/teacher/courses/[courseId]/materials  -> Registrar material nuevo
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { createMaterialSchema } from "@/lib/schemas";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (user.role !== "admin" && !(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const r = await query<MaterialRow>(
      `SELECT id, course_id, title, type, size, topic,
              to_char(uploaded_at, 'YYYY-MM-DD') AS uploaded_at
       FROM materials
       WHERE course_id = $1
       ORDER BY uploaded_at DESC`,
      [courseId],
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
    console.error("[teacher/courses/[id]/materials GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (!(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const [parsed, validationError] = await parseBody(request, createMaterialSchema);
    if (validationError) return validationError;
    const title = parsed.title;
    const type = parsed.type;
    const size = parsed.size ?? null;
    const topic = parsed.topic ?? null;

    const r = await query<MaterialRow>(
      `INSERT INTO materials (course_id, title, type, size, topic)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_id, title, type, size, topic,
                 to_char(uploaded_at, 'YYYY-MM-DD') AS uploaded_at`,
      [courseId, title, type, size, topic],
    );

    const m = r.rows[0];
    return NextResponse.json({
      ok: true,
      material: {
        id: m.id,
        courseId: m.course_id,
        title: m.title,
        type: m.type,
        size: m.size ?? "",
        topic: m.topic ?? "",
        uploadedAt: m.uploaded_at,
      },
    });
  } catch (err) {
    console.error("[teacher/courses/[id]/materials POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
