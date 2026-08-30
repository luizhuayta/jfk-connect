/**
 * POST /api/auth/logout
 *
 * Cierra la sesión eliminando la cookie httpOnly del JWT.
 */

import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({
    ok: true,
    message: "Sesión cerrada.",
  });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}