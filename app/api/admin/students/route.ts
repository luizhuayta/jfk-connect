/**
 * GET  /api/admin/students
 *
 * Padrón de alumnos con datos del apoderado, promedio y asistencia
 * calculados en vivo. Soporta filtros + paginación:
 *   ?grade=1ro&section=A&status=activo&q=texto&page=1&limit=50
 *
 * POST /api/admin/students
 *
 * Crea un alumno nuevo (DNI, nombre, grado, sección, turno).
 * El código de matrícula (enrollment_code) se asigna cuando se genera
 * su matrícula desde /api/admin/enrollments.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { createStudentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { SCHOOL_YEAR } from "@/lib/school-year";

export const dynamic = "force-dynamic";

interface StudentRow {
  id: string;
  name: string;
  initials: string;
  dni: string;
  grade: string;
  grade_num: number;
  section: string;
  shift: string;
  parent_name: string | null;
  parent_phone: string | null;
  avg_grade: number | null;
  attendance_rate: number | null;
  status: string;
  enrolled_at: string;
}

interface CountRow {
  total: number;
}

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (grade && grade !== "all") {
      params.push(grade);
      where.push(`s.grade = $${params.length}`);
    }
    if (section && section !== "all") {
      params.push(section);
      where.push(`s.section = $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status);
      where.push(`s.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const i = params.length;
      where.push(`(
        LOWER(s.full_name) LIKE $${i}
        OR s.dni LIKE $${i}
        OR LOWER(COALESCE(p.full_name, '')) LIKE $${i}
      )`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    // Query de total (para paginación)
    const countParams = [...params];
    const countR = await query<CountRow>(
      `SELECT COUNT(*)::int AS total
       FROM students s
       LEFT JOIN users p ON p.id = s.parent_id
       ${whereClause}`,
      countParams,
    );
    const total = countR.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Query de datos con LIMIT/OFFSET
    const dataParams = [...params];
    dataParams.push(SCHOOL_YEAR);
    const yearIdx = dataParams.length;
    dataParams.push(limit);
    const limitIdx = dataParams.length;
    dataParams.push(offset);
    const offsetIdx = dataParams.length;

    const r = await query<StudentRow>(
      `SELECT
         s.id,
         s.full_name AS name,
         COALESCE(s.initials, UPPER(LEFT(s.full_name, 1))) AS initials,
         s.dni,
         s.grade,
         s.grade_num,
         s.section,
         s.shift::text AS shift,
         p.full_name AS parent_name,
         p.phone AS parent_phone,
         (
           SELECT ROUND(AVG(v.score)::numeric, 2)
           FROM v_area_grades v WHERE v.student_id = s.id AND v.graded = v.expected AND v.year = $${yearIdx}
         )::float AS avg_grade,
         (
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a WHERE a.student_id = s.id
         )::int AS attendance_rate,
         s.status,
         to_char(s.enrolled_at, 'YYYY-MM-DD') AS enrolled_at
       FROM students s
       LEFT JOIN users p ON p.id = s.parent_id
       ${whereClause}
       ORDER BY s.grade_num, s.section, s.full_name
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams,
    );

    return NextResponse.json({
      ok: true,
      students: r.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error({ err, route: "admin/students" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

// ─── POST: crear alumno ──────────────────────────────────────────────────────

const GRADE_NUM: Record<string, number> = {
  "1ro": 1,
  "2do": 2,
  "3ro": 3,
  "4to": 4,
  "5to": 5,
};

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createStudentSchema,
  );
  if (validationError) return validationError;

  const { dni, fullName, grade, section, shift } = parsed;

  try {
    // DNI duplicado → 409
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM students WHERE dni = $1",
      [dni],
    );
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un alumno con ese DNI." },
        { status: 409 },
      );
    }

    const r = await query<{
      id: string;
      full_name: string;
      dni: string;
      grade: string;
      section: string;
      shift: string;
      status: string;
    }>(
      `INSERT INTO students (dni, full_name, initials, grade, grade_num, section, shift, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo')
       RETURNING id, full_name, dni, grade, section, shift::text AS shift, status`,
      [dni, fullName.trim(), initialsOf(fullName), grade, GRADE_NUM[grade], section, shift],
    );

    const s = r.rows[0];
    return NextResponse.json(
      {
        ok: true,
        student: {
          id: s.id,
          name: s.full_name,
          dni: s.dni,
          grade: s.grade,
          section: s.section,
          shift: s.shift,
          status: s.status,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    logger.error({ err, route: "admin/students POST" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}