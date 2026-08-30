/**
 * GET /api/admin/enrollments
 *
 * Matrículas del año en curso con datos del alumno y estado de pagos.
 * Soporta filtros + paginación:
 *   ?status=regular&pay=completo&q=texto&page=1&limit=50
 *
 * POST /api/admin/enrollments
 *
 * Genera una matrícula para un alumno existente, con código único
 * formato <año>-<grado_num><sección>-<correlativo>. El mismo código
 * queda en students.enrollment_code (si el alumno aún no tenía) para
 * que el apoderado pueda reclamarlo.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { parseBody } from "@/lib/validate";
import { createEnrollmentSchema } from "@/lib/schemas";
import { parseQuery, enrollmentsListQuerySchema } from "@/lib/admin/params";
import {
  guardAdmin,
  guardAdminMutation,
  internalError,
  uniqueConflict,
} from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  student_id: string;
  code: string;
  year: number;
  status: "regular" | "condicional" | "pendiente";
  docs_total: number;
  docs_submitted: number;
  apafa_paid: boolean;
  apafa_amount: number;
  actividades_paid: boolean;
  actividades_amount: number;
  last_payment_date: string | null;
  student_name: string;
  initials: string;
  dni: string;
  grade: string;
  section: string;
  enrolled_at: string;
}

interface CountRow {
  total: number;
}

interface KpiRow {
  total: number;
  regular: number;
  condicional: number;
  pendiente: number;
  completo: number;
  parcial: number;
  pay_pendiente: number;
  total_apafa: number;
  total_actividades: number;
}

function mapEnrollment(row: EnrollmentRow) {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    initials: row.initials,
    dni: row.dni,
    grade: row.grade,
    section: row.section,
    code: row.code,
    year: row.year,
    enrolledAt: row.enrolled_at,
    enrollmentStatus: row.status,
    docsTotal: row.docs_total,
    docsSubmitted: row.docs_submitted,
    apafaPaid: row.apafa_paid,
    apafaAmount: row.apafa_amount,
    actividadesPaid: row.actividades_paid,
    actividadesAmount: row.actividades_amount,
    lastPaymentDate: row.last_payment_date,
  };
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  const [filters, invalid] = parseQuery(request, enrollmentsListQuerySchema);
  if (invalid) return invalid;

  try {
    const { q, status, pay, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const i = params.length;
      where.push(`(LOWER(s.full_name) LIKE $${i} OR s.dni LIKE $${i})`);
    }
    if (status !== "all") {
      params.push(status);
      where.push(`e.status = $${params.length}`);
    }
    if (pay === "completo") {
      where.push(`e.apafa_paid AND e.actividades_paid`);
    } else if (pay === "parcial") {
      where.push(`(e.apafa_paid OR e.actividades_paid) AND NOT (e.apafa_paid AND e.actividades_paid)`);
    } else if (pay === "pendiente") {
      where.push(`NOT e.apafa_paid AND NOT e.actividades_paid`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const dataParams = [...params, limit, offset];
    const limitIdx = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const [countR, kpiR, r] = await Promise.all([
      query<CountRow>(
        `SELECT COUNT(*)::int AS total
         FROM enrollments e JOIN students s ON s.id = e.student_id
         ${whereClause}`,
        params,
      ),
      query<KpiRow>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE e.status = 'regular')::int AS regular,
           COUNT(*) FILTER (WHERE e.status = 'condicional')::int AS condicional,
           COUNT(*) FILTER (WHERE e.status = 'pendiente')::int AS pendiente,
           COUNT(*) FILTER (WHERE e.apafa_paid AND e.actividades_paid)::int AS completo,
           COUNT(*) FILTER (
             WHERE (e.apafa_paid OR e.actividades_paid)
               AND NOT (e.apafa_paid AND e.actividades_paid)
           )::int AS parcial,
           COUNT(*) FILTER (WHERE NOT e.apafa_paid AND NOT e.actividades_paid)::int AS pay_pendiente,
           COALESCE(SUM(CASE WHEN e.apafa_paid THEN e.apafa_amount ELSE 0 END), 0)::float AS total_apafa,
           COALESCE(SUM(CASE WHEN e.actividades_paid THEN e.actividades_amount ELSE 0 END), 0)::float AS total_actividades
         FROM enrollments e`,
      ),
      query<EnrollmentRow>(
        `SELECT
           e.id,
           e.student_id,
           e.code,
           e.year,
           e.status::text AS status,
           e.docs_total,
           e.docs_submitted,
           e.apafa_paid,
           e.apafa_amount::float AS apafa_amount,
           e.actividades_paid,
           e.actividades_amount::float AS actividades_amount,
           to_char(e.last_payment_date, 'YYYY-MM-DD') AS last_payment_date,
           s.full_name AS student_name,
           COALESCE(s.initials, UPPER(LEFT(s.full_name, 1))) AS initials,
           s.dni,
           s.grade,
           s.section,
           to_char(e.created_at, 'YYYY-MM-DD') AS enrolled_at
         FROM enrollments e
         JOIN students s ON s.id = e.student_id
         ${whereClause}
         ORDER BY s.grade, s.section, s.full_name
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        dataParams,
      ),
    ]);

    const total = countR.rows[0]?.total ?? 0;
    const kpi = kpiR.rows[0] ?? {
      total: 0, regular: 0, condicional: 0, pendiente: 0,
      completo: 0, parcial: 0, pay_pendiente: 0,
      total_apafa: 0, total_actividades: 0,
    };

    return NextResponse.json({
      ok: true,
      enrollments: r.rows.map(mapEnrollment),
      counts: {
        total: kpi.total,
        regular: kpi.regular,
        condicional: kpi.condicional,
        pendiente: kpi.pendiente,
        completo: kpi.completo,
        parcial: kpi.parcial,
        payPendiente: kpi.pay_pendiente,
        totalApafa: kpi.total_apafa,
        totalActividades: kpi.total_actividades,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return internalError(err, "admin/enrollments");
  }
}

export async function POST(request: NextRequest) {
  const [, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createEnrollmentSchema,
  );
  if (validationError) return validationError;

  const { studentId } = parsed;

  try {
    const result = await withTransaction(async (client) => {
      const stR = await client.query<{
        id: string;
        full_name: string;
        grade_num: number;
        section: string;
        status: string;
        enrollment_code: string | null;
      }>(
        "SELECT id, full_name, grade_num, section, status, enrollment_code FROM students WHERE id = $1 FOR UPDATE",
        [studentId],
      );
      const student = stR.rows[0];
      if (!student) {
        return { error: "Alumno no encontrado.", status: 404 as const };
      }
      if (student.status !== "activo") {
        return {
          error: `El alumno está "${student.status}"; solo se puede matricular a alumnos activos.`,
          status: 400 as const,
        };
      }

      const yearR = await client.query<{ year: number }>(
        "SELECT EXTRACT(YEAR FROM now())::int AS year",
      );
      const year = yearR.rows[0].year;

      const dupR = await client.query<{ id: string; code: string }>(
        "SELECT id, code FROM enrollments WHERE student_id = $1 AND year = $2",
        [studentId, year],
      );
      if (dupR.rows[0]) {
        return {
          error: `El alumno ya tiene la matrícula ${dupR.rows[0].code} para este año.`,
          status: 409 as const,
        };
      }

      const seqR = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS next
         FROM (
           SELECT CAST(SPLIT_PART(code, '-', 3) AS INT) AS seq
           FROM enrollments
           WHERE year = $1 AND code LIKE $2
           UNION ALL
           SELECT CAST(SPLIT_PART(enrollment_code, '-', 3) AS INT) AS seq
           FROM students
           WHERE enrollment_code LIKE $2
         ) t`,
        [year, `${year}-%`],
      );
      const seq = seqR.rows[0].next;
      const code = `${year}-${student.grade_num}${student.section}-${String(seq).padStart(4, "0")}`;

      const insR = await client.query<{ id: string; code: string; year: number }>(
        `INSERT INTO enrollments (student_id, code, year, status, docs_total, docs_submitted)
         VALUES ($1, $2, $3, 'pendiente', 7, 0)
         RETURNING id, code, year`,
        [studentId, code, year],
      );

      if (!student.enrollment_code) {
        await client.query(
          "UPDATE students SET enrollment_code = $1, updated_at = now() WHERE id = $2",
          [code, studentId],
        );
      }

      return {
        enrollment: {
          id: insR.rows[0].id,
          code: insR.rows[0].code,
          year: insR.rows[0].year,
          studentName: student.full_name,
        },
        status: 201 as const,
      };
    });

    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { ok: true, enrollment: result.enrollment },
      { status: 201 },
    );
  } catch (err) {
    const conflict = uniqueConflict(
      err,
      "No se pudo generar la matrícula: el código o el alumno ya están registrados.",
    );
    if (conflict) return conflict;
    return internalError(err, "admin/enrollments POST");
  }
}
