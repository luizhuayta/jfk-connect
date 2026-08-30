/**
 * GET  /api/admin/users        -> Listar todos los usuarios (con filtros)
 * POST /api/admin/users        -> Crear un nuevo usuario (con password temporal)
 *
 * Seguridad:
 *  - Ambos endpoints requieren sesión de admin (requireRole).
 *  - Usa scrypt (lib/password.ts) para hashear contraseñas.
 *  - La contraseña temporal se genera aleatoriamente (no hardcodeada).
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { parseBody } from "@/lib/validate";
import { createUserSchema } from "@/lib/schemas";
import crypto from "node:crypto";
import { recordAdminAction } from "@/lib/admin/audit";
import { parseQuery, usersListQuerySchema } from "@/lib/admin/params";
import {
  guardAdmin,
  guardAdminMutation,
  internalError,
  uniqueConflict,
} from "@/lib/api/admin-route";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "docente" | "padre";
  phone: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
  subject: string | null;
  shift_preference: string | null;
  sections?: { grade: string; section: string; shift: string }[];
}

interface SectionRow {
  teacher_id: string;
  grade: string;
  section: string;
  shift: string;
}

interface CountRow {
  total: number;
}

interface KpiRow {
  total: number;
  admin: number;
  docente: number;
  padre: number;
  activo: number;
  inactivo: number;
}

function generateTempPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export async function GET(request: NextRequest) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  const [filters, invalid] = parseQuery(request, usersListQuerySchema);
  if (invalid) return invalid;

  try {
    const { role, status, q, page, limit } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (role !== "all") {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    if (status !== "all") {
      params.push(status === "activo");
      where.push(`is_active = $${params.length}`);
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const i = params.length;
      where.push(`(LOWER(full_name) LIKE $${i} OR LOWER(email) LIKE $${i})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const dataParams = [...params, limit, offset];
    const limitIdx = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const [countR, kpiR, r] = await Promise.all([
      query<CountRow>(
        `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
        params,
      ),
      query<KpiRow>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE role = 'admin')::int AS admin,
           COUNT(*) FILTER (WHERE role = 'docente')::int AS docente,
           COUNT(*) FILTER (WHERE role = 'padre')::int AS padre,
           COUNT(*) FILTER (WHERE is_active)::int AS activo,
           COUNT(*) FILTER (WHERE NOT is_active)::int AS inactivo
         FROM users`,
      ),
      query<UserRow>(
        `SELECT id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url, subject, shift_preference
         FROM users
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        dataParams,
      ),
    ]);

    const total = countR.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const kpi = kpiR.rows[0] ?? {
      total: 0, admin: 0, docente: 0, padre: 0, activo: 0, inactivo: 0,
    };

    const teacherIds = r.rows.filter((u) => u.role === "docente").map((u) => u.id);
    const sectionsByTeacher = new Map<string, { grade: string; section: string; shift: string }[]>();
    if (teacherIds.length > 0) {
      const sr = await query<SectionRow>(
        `SELECT DISTINCT teacher_id, grade, section, shift::text AS shift
         FROM courses
         WHERE teacher_id = ANY($1::uuid[])
         ORDER BY grade, section`,
        [teacherIds],
      );
      for (const row of sr.rows) {
        const list = sectionsByTeacher.get(row.teacher_id) ?? [];
        list.push({ grade: row.grade, section: row.section, shift: row.shift });
        sectionsByTeacher.set(row.teacher_id, list);
      }
    }
    const users = r.rows.map((u) =>
      u.role === "docente" ? { ...u, sections: sectionsByTeacher.get(u.id) ?? [] } : u,
    );

    return NextResponse.json({
      ok: true,
      users,
      counts: kpi,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    return internalError(err, "admin/users GET");
  }
}

export async function POST(request: NextRequest) {
  const [admin, denied] = await guardAdminMutation(request);
  if (denied) return denied;

  try {
    const [parsed, validationError] = await parseBody(request, createUserSchema);
    if (validationError) return validationError;
    const email = parsed.email;
    const fullName = parsed.fullName;
    const role = parsed.role;
    const phone = parsed.phone ?? null;
    const subject = parsed.subject ?? null;
    const shiftPreference = parsed.shiftPreference ?? "Ambos";

    const password: string =
      typeof parsed.password === "string" && parsed.password.length >= 8
        ? parsed.password
        : generateTempPassword();

    if (role === "docente" && !subject) {
      return NextResponse.json(
        { ok: false, error: "La asignatura es obligatoria para docentes." },
        { status: 400 },
      );
    }

    const exists = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Ya existe un usuario con ese email." },
        { status: 409 },
      );
    }

    const mustChange = role === "docente" || role === "admin";
    const passwordHash = await hashPassword(password);

    const r = await query<UserRow>(
      `INSERT INTO users (email, full_name, role, phone, is_active, password_hash, email_verified_at, must_change_password, subject, shift_preference)
       VALUES ($1, $2, $3, $4, true, $5, now(), $6, $7, $8)
       RETURNING id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url`,
      [email, fullName, role, phone, passwordHash, mustChange, subject, shiftPreference],
    );

    const created = r.rows[0];
    await recordAdminAction({
      actorId: admin.id,
      action: "user.create",
      entityType: "user",
      entityId: created.id,
      summary: `Creó al usuario ${email} (${role}).`,
      meta: { email, role },
    });

    return NextResponse.json(
      { ok: true, user: created, tempPassword: password },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const conflict = uniqueConflict(err, "Ya existe un usuario con ese email.");
    if (conflict) return conflict;
    return internalError(err, "admin/users POST");
  }
}
