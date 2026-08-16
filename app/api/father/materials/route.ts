/**
 * GET /api/father/materials?studentId=<uuid>
 *
 * Materiales de clase publicados por los docentes, agrupados por curso del hijo.
 * Solo lectura de metadatos (título, tipo, tema, fecha); el teacher registra el
 * material sin subir archivo físico todavía.
 *
 * Respuesta:
 *   { ok, courses: [{ id, subject, materials: [{ id, title, type, size, topic, uploadedAt }] }] }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface CourseRow {
  id: string;
  subject: string;
}

interface MaterialRow {
  id: string;
  course_id: string;
  title: string;
  type: string;
  size: string | null;
  topic: string | null;
  uploaded_at: string;
}

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    // Cursos del grado/sección/turno del hijo en el año actual.
    const courseRes = await query<CourseRow>(
      `SELECT c.id, c.name AS subject
       FROM courses c
       JOIN students s ON c.grade = s.grade
         AND c.section = s.section
         AND c.shift = s.shift
       WHERE s.id = $1
         AND c.year = EXTRACT(YEAR FROM now())::int
       ORDER BY c.name`,
      [studentId],
    );
    const courses = courseRes.rows;
    const courseIds = courses.map((c) => c.id);

    const materials: MaterialRow[] = [];
    if (courseIds.length > 0) {
      const matRes = await query<MaterialRow>(
        `SELECT id, course_id, title, type::text AS type, size, topic,
                to_char(uploaded_at, 'YYYY-MM-DD') AS uploaded_at
         FROM materials
         WHERE course_id = ANY($1)
         ORDER BY uploaded_at DESC, title`,
        [courseIds],
      );
      materials.push(...matRes.rows);
    }

    const byCourse = courses.map((c) => ({
      id: c.id,
      subject: c.subject,
      materials: materials
        .filter((m) => m.course_id === c.id)
        .map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          size: m.size ?? "",
          topic: m.topic ?? "",
          uploadedAt: m.uploaded_at,
        })),
    }));

    return NextResponse.json({ ok: true, courses: byCourse });
  } catch (err) {
    logger.error({ err, route: "father/materials" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
