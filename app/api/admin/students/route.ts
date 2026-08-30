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
import { parseBody } from "@/lib/validate";
import { createStudentSchema } from "@/lib/schemas";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { parseQuery, studentsListQuerySchema } from "@/lib/admin/params";
import {
  guardAdmin,
  guardAdminMutation,
  internalError,
  uniqueConflict,
} from "@/lib/api/admin-route";

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
  status: string;
  enrolled_at: string;
}

interface CountRow {
  total: number;
}

interface KpiRow {
  total: number;
  activo: number;
  retirado: number;
  trasladado: number;
  at_risk: number;
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  const [filters, invalid] = parseQuery(request, studentsListQuerySchema);
  if (invalid) return invalid;

  try {
    const { grade, section, status, q, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (grade !== "all") {
      params.push(grade);
      where.push(`s.grade = $${params.length}`);
    }
    if (section !== "ALL") {
      params.push(section);
      where.push(`s.section = $${params.length}`);
    }
    if (status !== "all") {
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

    const dataParams = [...params, limit, offset];
    const limitIdx = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const [countR, kpiR, list] = await Promise.all([
      query<CountRow>(
        `SELECT COUNT(*)::int AS total
         FROM students s
         LEFT JOIN users p ON p.id = s.parent_id
         ${whereClause}`,
        params,
      ),
      query<KpiRow>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'activo')::int AS activo,
           COUNT(*) FILTER (WHERE status = 'retirado')::int AS retirado,
           COUNT(*) FILTER (WHERE status = 'trasladado')::int AS trasladado,
           COUNT(*) FILTER (
             WHERE status = 'activo'
               AND (COALESCE(avg_grade, 99) < 11 OR COALESCE(attendance_rate, 100) < 80)
           )::int AS at_risk
         FROM students`,
      ),
      query<StudentRow>(
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
           s.status,
           to_char(s.enrolled_at, 'YYYY-MM-DD') AS enrolled_at
         FROM students s
         LEFT JOIN users p ON p.id = s.parent_id
         ${whereClause}
         ORDER BY s.grade_num, s.section, s.full_name
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        dataParams,
      ),
    ]);

    const ids = list.rows.map((s) => s.id);
    const avgBy = new Map<string, number>();
    const attBy = new Map<string, number>();
    if (ids.length > 0) {
      const [avgs, atts] = await Promise.all([
        query<{ student_id: string; avg_grade: number }>(
          `SELECT student_id, ROUND(AVG(score)::numeric, 2)::float AS avg_grade
           FROM v_area_grades
           WHERE student_id = ANY($1::uuid[]) AND graded = expected AND year = $2
           GROUP BY student_id`,
          [ids, SCHOOL_YEAR],
        ),
        query<{ student_id: string; attendance_rate: number }>(
          `SELECT student_id,
                  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('A','T','J')) / NULLIF(COUNT(*), 0))::int AS attendance_rate
           FROM attendance
           WHERE student_id = ANY($1::uuid[])
           GROUP BY student_id`,
          [ids],
        ),
      ]);
      for (const row of avgs.rows) avgBy.set(row.student_id, row.avg_grade);
      for (const row of atts.rows) attBy.set(row.student_id, row.attendance_rate);
    }

    const students = list.rows.map((s) => ({
      ...s,
      avg_grade: avgBy.get(s.id) ?? null,
      attendance_rate: attBy.get(s.id) ?? null,
    }));

    const total = countR.rows[0]?.total ?? 0;
    const kpi = kpiR.rows[0] ?? {
      total: 0, activo: 0, retirado: 0, trasladado: 0, at_risk: 0,
    };

    return NextResponse.json({
      ok: true,
      students,
      counts: {
        total: kpi.total,
        activo: kpi.activo,
        retirado: kpi.retirado,
        trasladado: kpi.trasladado,
        atRisk: kpi.at_risk,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return internalError(err, "admin/students");
  }
}

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
  const [, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createStudentSchema,
  );
  if (validationError) return validationError;

  const { dni, fullName, grade, section, shift } = parsed;

  try {
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
    const conflict = uniqueConflict(err, "Ya existe un alumno con ese DNI.");
    if (conflict) return conflict;
    return internalError(err, "admin/students POST");
  }
}
