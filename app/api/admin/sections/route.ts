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
import { query, withTransaction } from "@/lib/db";
import { parseBody } from "@/lib/validate";
import { createSectionSchema } from "@/lib/schemas";
import { fetchCatalog } from "@/lib/curriculum/server";
import { SCHOOL_YEAR } from "@/lib/school-year";
import {
  guardAdmin,
  guardAdminMutation,
  internalError,
} from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface SectionRow {
  grade: string;
  grade_num: number;
  section: string;
  shift: string;
  students_total: number;
  avg_grade: number | null;
  attendance_rate: number | null;
  tutor: string | null;
  room: string | null;
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
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
       ),
       section_totals AS (
         SELECT grade, section, COUNT(*)::int AS total
         FROM students WHERE status = 'activo'
         GROUP BY grade, section
       ),
       section_avg AS (
         SELECT s.grade, s.section, ROUND(AVG(v.score)::numeric, 2) AS avg_grade
         FROM v_area_grades v
         JOIN students s ON s.id = v.student_id
         WHERE v.graded = v.expected AND v.year = $1
         GROUP BY s.grade, s.section
       ),
       section_attendance AS (
         SELECT s.grade, s.section,
           ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0)) AS attendance_rate
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         GROUP BY s.grade, s.section
       ),
       section_tutor AS (
         SELECT t.grade, t.section, u.full_name AS tutor
         FROM section_tutors t
         JOIN users u ON u.id = t.teacher_id
         WHERE t.year = $1
       ),
       section_fallback_teacher AS (
         SELECT DISTINCT ON (c.grade, c.section) c.grade, c.section, u.full_name AS teacher
         FROM courses c
         JOIN users u ON u.id = c.teacher_id
         ORDER BY c.grade, c.section, c.id
       ),
       section_room AS (
         SELECT DISTINCT ON (grade, section) grade, section, classroom AS room
         FROM courses WHERE classroom IS NOT NULL
         ORDER BY grade, section
       )
       SELECT
         k.grade,
         k.grade_num,
         k.section,
         k.shift,
         COALESCE(st.total, 0) AS students_total,
         sa.avg_grade::float AS avg_grade,
         sat.attendance_rate::int AS attendance_rate,
         COALESCE(stu.tutor, sft.teacher) AS tutor,
         sr.room AS room
        FROM keys k
        LEFT JOIN section_totals st ON st.grade = k.grade AND st.section = k.section
        LEFT JOIN section_avg sa ON sa.grade = k.grade AND sa.section = k.section
        LEFT JOIN section_attendance sat ON sat.grade = k.grade AND sat.section = k.section
        LEFT JOIN section_tutor stu ON stu.grade = k.grade AND stu.section = k.section
        LEFT JOIN section_fallback_teacher sft ON sft.grade = k.grade AND sft.section = k.section
        LEFT JOIN section_room sr ON sr.grade = k.grade AND sr.section = k.section
        ORDER BY k.grade_num, k.section`,
      [SCHOOL_YEAR],
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
    return internalError(err, "admin/sections GET");
  }
}

export async function POST(request: NextRequest) {
  const [, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createSectionSchema,
  );
  if (validationError) return validationError;

  const { grade, section, shift, room } = parsed;

  try {
    const { areas } = await fetchCatalog();
    const courseAreas = areas.filter((a) => !a.isTransversal);
    if (courseAreas.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay áreas curriculares activas para crear cursos." },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      const existing = await client.query<{ found: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM students WHERE grade = $1 AND section = $2
           UNION ALL
           SELECT 1 FROM courses WHERE grade = $1 AND section = $2
           LIMIT 1
         ) AS found`,
        [grade, section],
      );
      if (existing.rows[0]?.found) {
        return { conflict: true as const };
      }

      const yearRow = await client.query<{ year: number; bimester: number | null }>(
        `SELECT EXTRACT(YEAR FROM now())::int AS year,
                (SELECT c.bimester FROM courses c
                 WHERE c.year = EXTRACT(YEAR FROM now())::int
                 ORDER BY c.created_at DESC LIMIT 1) AS bimester`,
      );
      const year = yearRow.rows[0]?.year ?? new Date().getFullYear();
      const bimester = yearRow.rows[0]?.bimester ?? 1;
      const classroom = room?.trim() || `Aula ${grade}-${section}`;

      const values: string[] = [];
      const params: unknown[] = [];
      for (const a of courseAreas) {
        params.push(a.name, grade, section, year, shift, classroom, bimester, a.hoursPerWeek, a.id);
        const b = params.length;
        values.push(`($${b - 8}, $${b - 7}, $${b - 6}, $${b - 5}, $${b - 4}, $${b - 3}, $${b - 2}, $${b - 1}, $${b})`);
      }

      const ins = await client.query(
        `INSERT INTO courses (name, grade, section, year, shift, classroom, bimester, hours_per_week, area_id)
         VALUES ${values.join(", ")}
         ON CONFLICT (name, grade, section, year) DO NOTHING
         RETURNING id`,
        params,
      );

      return {
        conflict: false as const,
        inserted: ins.rowCount ?? 0,
        year,
        classroom,
      };
    });

    if (result.conflict || result.inserted === 0) {
      return NextResponse.json(
        { ok: false, error: `La sección ${grade} "${section}" ya existe.` },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        section: { grade, section, shift, room: result.classroom, year: result.year },
        message: `Sección ${grade} "${section}" creada con ${result.inserted} cursos.`,
      },
      { status: 201 },
    );
  } catch (err) {
    return internalError(err, "admin/sections POST");
  }
}
