/**
 * PATCH /api/imports/grades/[jobId]/rows/[rowId]
 *
 * Corrección manual en la UI de revisión: mapear una fila ambigua a un
 * alumno del roster, editar una celda de nota, u omitir la fila. No toca
 * `competency_grades` — solo el staging (import_rows/import_cells). El
 * commit (POST .../commit) es el único paso que escribe en la libreta real.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody } from "@/lib/validate";
import { patchImportRowSchema } from "@/lib/schemas";
import { resolveGradeScope } from "@/lib/grades/scope";
import { getImportJob, updateStagedRow } from "@/lib/imports/jobs";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; rowId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { jobId, rowId } = await params;

  const [parsed, validationError] = await parseBody(request, patchImportRowSchema);
  if (validationError) return validationError;

  try {
    const job = await getImportJob(jobId);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Trabajo de importación no encontrado." }, { status: 404 });
    }
    if (job.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "No tienes acceso a este trabajo de importación." }, { status: 403 });
    }

    const [, scopeDenied] = await resolveGradeScope(request, {
      courseId: job.course_id,
      grade: job.grade,
      section: job.section,
      transversal: job.transversal,
      bimester: job.bimester,
    });
    if (scopeDenied) return scopeDenied;

    await updateStagedRow(jobId, rowId, parsed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "imports/grades/[jobId]/rows/[rowId] PATCH" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
