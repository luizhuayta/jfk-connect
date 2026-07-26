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

    const sql = `
      SELECT id, email, full_name, role, phone, is_active, created_at, last_login_at, avatar_url
      FROM users
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
    `;

    const r = await query<UserRow>(sql, params);
    return NextResponse.json({ ok: true, users: r.rows });
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