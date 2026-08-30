/**
 * GET    /api/imports/grades/[jobId] — detalle del job + filas en staging (revisión)
 * DELETE /api/imports/grades/[jobId] — descarta el job (y borra el archivo del disco)
 *
 * Seguridad: dueño del job (created_by) o admin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { getImportJob, fetchStagedRows, deleteImportJob } from "@/lib/imports/jobs";
import { fetchRoster } from "@/lib/imports/roster";
import { deleteUpload } from "@/lib/storage/files";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { jobId } = await params;

  try {
    const job = await getImportJob(jobId);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Trabajo de importación no encontrado." }, { status: 404 });
    }
    if (job.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "No tienes acceso a este trabajo de importación." }, { status: 403 });
    }

    const [rows, roster] = await Promise.all([fetchStagedRows(jobId), fetchRoster(job.grade, job.section)]);

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        kind: job.kind,
        courseId: job.course_id,
        grade: job.grade,
        section: job.section,
        transversal: job.transversal,
        bimester: job.bimester,
        status: job.status,
        sourceMeta: job.source_meta,
        summary: job.summary,
        error: job.error,
      },
      rows,
      roster: roster.map((s) => ({ id: s.id, name: s.fullName, order: s.order })),
    });
  } catch (err) {
    logger.error({ err, route: "imports/grades/[jobId] GET" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { jobId } = await params;

  try {
    const job = await getImportJob(jobId);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Trabajo de importación no encontrado." }, { status: 404 });
    }
    if (job.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "No tienes acceso a este trabajo de importación." }, { status: 403 });
    }

    if (job.file_id) await deleteUpload(job.file_id);
    await deleteImportJob(jobId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "imports/grades/[jobId] DELETE" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
