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
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { createEnrollmentSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

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

export async function GET(request: NextRequest) {
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const i = params.length;
      where.push(`(LOWER(s.full_name) LIKE $${i} OR s.dni LIKE $${i})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    // Total
    const countR = await query<CountRow>(
      `SELECT COUNT(*)::int AS total
       FROM enrollments e JOIN students s ON s.id = e.student_id
       ${whereClause}`,
      params,
    );
    const total = countR.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Datos paginados
    const dataParams = [...params];
    dataParams.push(limit);
    const limitIdx = dataParams.length;
    dataParams.push(offset);
    const offsetIdx = dataParams.length;

    const r = await query<EnrollmentRow>(
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
    );

    return NextResponse.json({
      ok: true,
      enrollments: r.rows.map((row) => ({
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error({ err, route: "admin/enrollments" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

// ─── POST: generar matrícula para un alumno existente ────────────────────────

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  const [parsed, validationError] = await parseBody(
    request,
    createEnrollmentSchema,
  );
  if (validationError) return validationError;

  const { studentId } = parsed;

  try {
    const result = await withTransaction(async (client) => {
      // 1. Alumno existe y está activo
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

      // 2. ¿Ya tiene matrícula este año?
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

      // 3. Siguiente correlativo del año (máximo entre matrículas y códigos
      //    ya asignados a alumnos, ambos comparten el formato <año>-...-<seq>)
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

      // 4. Crear la matrícula
      const insR = await client.query<{ id: string; code: string; year: number }>(
        `INSERT INTO enrollments (student_id, code, year, status, docs_total, docs_submitted)
         VALUES ($1, $2, $3, 'pendiente', 7, 0)
         RETURNING id, code, year`,
        [studentId, code, year],
      );

      // 5. Asignar el código al alumno si aún no tenía (para reclamo del apoderado)
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
    logger.error({ err, route: "admin/enrollments POST" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}