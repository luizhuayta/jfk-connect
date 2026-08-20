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
import { requireRole } from "@/lib/auth";
import { parseBody } from "@/lib/validate";
import { assertSameOrigin } from "@/lib/csrf";
import { createUserSchema } from "@/lib/schemas";
import crypto from "node:crypto";

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

/**
 * Genera una contraseña temporal aleatoria de 10 caracteres alfanuméricos.
 */
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
  // Proteger: solo admin
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (role && role !== "all") {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status === "activo");
      where.push(`is_active = $${params.length}`);
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const i = params.length;
      where.push(`(LOWER(full_name) LIKE $${i} OR LOWER(email) LIKE $${i})`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const countR = await query<CountRow>(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      params,
    );
    const total = countR.rows[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataParams = [...params, limit, offset];
    const limitIdx = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const r = await query<UserRow>(
      `SELECT id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url, subject, shift_preference
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams,
    );

    // Secciones que dicta cada docente de esta página (para la columna
    // "Asignatura" de la tabla). Se resuelve vía `courses.teacher_id`, la
    // única relación confiable: varios docentes de seed comparten el mismo
    // full_name, así que no se puede inferir por nombre.
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
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("[admin/users GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Proteger: solo admin
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [, denied] = await requireRole(request, ["admin"]);
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

    // Si el admin envía una contraseña explícita, se usa; si no, se genera una
    // temporal aleatoria (antes era "ijfk2026" hardcodeada).
    const password: string =
      typeof parsed.password === "string" && parsed.password.length >= 8
        ? parsed.password
        : generateTempPassword();

    // Validar: si es docente, subject es obligatorio
    if (role === "docente" && !subject) {
      return NextResponse.json(
        { ok: false, error: "La asignatura es obligatoria para docentes." },
        { status: 400 },
      );
    }

    // Verificar que el email no exista
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

    // Solo docente y admin deben cambiar la contraseña al primer login.
    // Los padres se crean manualmente con su propia contraseña.
    const mustChange = role === "docente" || role === "admin";

    const passwordHash = await hashPassword(password);

    const r = await query<UserRow>(
      `INSERT INTO users (email, full_name, role, phone, is_active, password_hash, email_verified_at, must_change_password, subject, shift_preference)
       VALUES ($1, $2, $3, $4, true, $5, now(), $6, $7, $8)
       RETURNING id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url`,
      [email, fullName, role, phone, passwordHash, mustChange, subject, shiftPreference],
    );

    return NextResponse.json({
      ok: true,
      user: r.rows[0],
      tempPassword: password,
      message: `Usuario creado. Contraseña temporal: ${password}`,
    });
  } catch (err) {
    console.error("[admin/users POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}