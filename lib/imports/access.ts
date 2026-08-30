/**
 * Autorización de un trabajo de importación: dueño (created_by) o admin.
 * Extraído de las 4 rutas hijas de /api/imports/grades/[jobId]/**.
 */

import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";
import { getImportJob, type ImportJobRow } from "@/lib/imports/jobs";

export async function requireOwnedImportJob(
  jobId: string,
  user: AuthUser,
): Promise<[ImportJobRow, null] | [null, NextResponse]> {
  const job = await getImportJob(jobId);
  if (!job) {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "Trabajo de importación no encontrado." },
        { status: 404 },
      ),
    ];
  }
  if (job.created_by !== user.id && user.role !== "admin") {
    return [
      null,
      NextResponse.json(
        { ok: false, error: "No tienes acceso a este trabajo de importación." },
        { status: 403 },
      ),
    ];
  }
  return [job, null];
}
