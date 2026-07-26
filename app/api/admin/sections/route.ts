/**
 * GET /api/admin/sections
 *
 * Secciones (grado + sección) derivadas del padrón de alumnos y de los
 * cursos existentes (una sección recién creada sin alumnos también
 * aparece), con totales, promedio y asistencia calculados en vivo,
 * tutor y aula (tomados de los cursos de la sección si existen).
 *
 * POST /api/admin/sections
 *
 * Crea la relación grado/sección: inserta el set de cursos del año en
 * curso para esa sección (sin docente asignado), con aula y turno.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { createSectionSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface SectionRow {
  grade: string;
  grade_num: number;
  section: string;
  shift: string;
  students_total: number;
  avg_grade: number;
  attendance_rate: number;
  tutor: string | null;
  room: string | null;
}

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const r = await query<SectionRow>(
      `WITH keys AS (
         SELECT s.grade, s.grade_num, s.section, s.shift::text AS shift
         FROM students s
         UNION
         SELECT c.grade,
                CAST(SUBSTRING(c.grade FROM 1 FOR 1) AS INT) AS grade_num,
                c.section,
                c.shift::text AS shift
         FROM courses c
       )
       SELECT
         k.grade,
         k.grade_num,
         k.section,
         k.shift,
         COALESCE((
           SELECT COUNT(*) FROM students s
           WHERE s.grade = k.grade AND s.section = k.section AND s.status = 'activo'
         ), 0)::int AS students_total,
         COALESCE((
           SELECT ROUND(AVG(g.average)::numeric, 2)
           FROM grades g
           JOIN students s2 ON s2.id = g.student_id
           WHERE s2.grade = k.grade AND s2.section = k.section AND g.n3 IS NOT NULL
         ), 0)::float AS avg_grade,
         COALESCE((
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a
           JOIN students s3 ON s3.id = a.student_id
           WHERE s3.grade = k.grade AND s3.section = k.section
         ), 100)::int AS attendance_rate,
         (
           SELECT u.full_name FROM courses c
           JOIN users u ON u.id = c.teacher_id
           WHERE c.grade = k.grade AND c.section = k.section
           LIMIT 1
         ) AS tutor,
         (
           SELECT c.classroom FROM courses c
           WHERE c.grade = k.grade AND c.section = k.section AND c.classroom IS NOT NULL
           LIMIT 1
         ) AS room
        FROM keys k
        ORDER BY k.grade_num, k.section`,
    );

    return NextResponse.json({
      ok: true,
      sections: r.rows.map((row) => ({
        id: `sec-${row.grade_num}${row.section}`,
        grade: row.grade,
        gradeNum: row.grade_num,
        section: row.section,
        shift: row.shift,
        room: row.room ?? "—",
        tutor: row.tutor ?? "Por asignar",
        studentsTotal: row.students_total,
        avgGrade: row.avg_grade,
        attendanceRate: row.attendance_rate,
      })),
    });
  } catch (err) {
    console.error("[admin/sections GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

// ─── POST: crear sección (grado + sección + aula + turno) ────────────────────

// Mismo set de materias por sección que usa el padrón de la institución.
const SUBJECTS: { name: string; hours: number }[] = [
  { name: "Matemáticas", hours: 5 },
  { name: "Comunicación", hours: 5 },
  { name: "Ciencia y Tecnología", hours: 4 },
  { name: "Inglés", hours: 3 },
  { name: "HGE", hours: 3 },
  { name: "Tutoría", hours: 3 },
  { name: "Cívica", hours: 2 },
  { name: "Religión", hours: 2 },
  { name: "Arte", hours: 2 },
  { name: "Educación Física", hours: 2 },
  { name: "EPT", hours: 2 },
  { name: "DPCC", hours: 2 },
];

export async function POST(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createSectionSchema,
  );
  if (validationError) return validationError;

  const { grade, section, shift, room } = parsed;

  try {
    // Ya existe la sección (con alumnos o con cursos) → 409
    const existing = await queryOne<{ found: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM students WHERE grade = $1 AND section = $2
         UNION ALL
         SELECT 1 FROM courses WHERE grade = $1 AND section = $2
         LIMIT 1
       ) AS found`,
      [grade, section],
    );
    if (existing?.found) {
      return NextResponse.json(
        { ok: false, error: `La sección ${grade} "${section}" ya existe.` },
        { status: 409 },
      );
    }

    // Año lectivo y bimester actuales (mismo criterio que los cursos existentes)
    const yearRow = await queryOne<{ year: number; bimester: number | null }>(
      `SELECT EXTRACT(YEAR FROM now())::int AS year,
              (SELECT c.bimester FROM courses c
               WHERE c.year = EXTRACT(YEAR FROM now())::int
               ORDER BY c.created_at DESC LIMIT 1) AS bimester`,
    );
    const year = yearRow?.year ?? new Date().getFullYear();
    const bimester = yearRow?.bimester ?? 1;
    const classroom = room?.trim() || `Aula ${grade}-${section}`;

    const values: string[] = [];
    const params: unknown[] = [];
    for (const s of SUBJECTS) {
      params.push(s.name, grade, section, year, shift, classroom, bimester, s.hours);
      const b = params.length;
      values.push(`($${b - 7}, $${b - 6}, $${b - 5}, $${b - 4}, $${b - 3}, $${b - 2}, $${b - 1}, $${b})`);
    }

    await query(
      `INSERT INTO courses (name, grade, section, year, shift, classroom, bimester, hours_per_week)
       VALUES ${values.join(", ")}
       ON CONFLICT (name, grade, section, year) DO NOTHING`,
      params,
    );

    return NextResponse.json(
      {
        ok: true,
        section: { grade, section, shift, room: classroom, year },
        message: `Sección ${grade} "${section}" creada con ${SUBJECTS.length} cursos.`,
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error({ err, route: "admin/sections POST" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
