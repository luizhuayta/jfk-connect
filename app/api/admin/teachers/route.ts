/**
 * GET /api/admin/teachers
 *
 * Lista docentes, opcionalmente filtrados por asignatura.
 *   ?subject=Matemáticas → solo docentes de esa asignatura (legacy, TEXT libre).
 *   ?areaId=10 → solo docentes de esa área curricular (clave semántica
 *     post-migración 008; ver lib/courses/assignment.ts::areaMatches).
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { guardAdmin, internalError } from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface TeacherRow {
  id: string;
  full_name: string;
  email: string;
  subject: string | null;
  area_id: number | null;
  shift_preference: string | null;
  is_active: boolean;
  courses_count: number;
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const areaIdRaw = searchParams.get("areaId");
    const areaId = areaIdRaw !== null && Number.isInteger(Number(areaIdRaw)) ? Number(areaIdRaw) : null;

    const where: string[] = [`u.role = 'docente'`];
    const params: unknown[] = [];

    if (subject) {
      params.push(subject);
      where.push(`u.subject = $${params.length}`);
    }
    if (areaId !== null) {
      params.push(areaId);
      where.push(`u.area_id = $${params.length}`);
    }

    const r = await query<TeacherRow>(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.subject,
         u.area_id,
         u.shift_preference,
         u.is_active,
         COALESCE(cc.courses_count, 0)::int AS courses_count
       FROM users u
       LEFT JOIN (
         SELECT teacher_id, COUNT(*)::int AS courses_count
         FROM courses
         GROUP BY teacher_id
       ) cc ON cc.teacher_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY u.subject, u.full_name`,
      params,
    );

    return NextResponse.json({ ok: true, teachers: r.rows });
  } catch (err) {
    return internalError(err, "admin/teachers GET");
  }
}
