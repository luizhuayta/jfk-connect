/**
 * POST /api/imports/grades/[jobId]/commit
 *
 * Aplica el staging revisado a la libreta real, vía `saveGradeEntries` —
 * exactamente el mismo camino de escritura que PUT /api/grades. Re-verifica
 * el scope y el bimestre (no confía en lo que se guardó al subir): si algo
 * cambió entre el upload y el commit, esto falla aquí en vez de escribir
 * notas fuera de lugar.
 *
 * `overwriteExisting=false` (el default) NO pisa notas que el docente ya
 * haya registrado a mano — se reportan como omitidas. Rechaza igual que
 * PUT /api/grades cualquier competencia fuera de `scope.competencyIds`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { parseBody, parseUuidParam } from "@/lib/validate";
import { commitImportSchema } from "@/lib/schemas";
import { resolveGradeScope } from "@/lib/grades/scope";
import { commitStagedRows, setJobStatus } from "@/lib/imports/jobs";
import { requireOwnedImportJob } from "@/lib/imports/access";
import { deleteUpload } from "@/lib/storage/files";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { jobId: jobIdRaw } = await params;
  const [jobId, jobIdErr] = parseUuidParam(jobIdRaw);
  if (jobIdErr) return jobIdErr;

  const [parsed, validationError] = await parseBody(request, commitImportSchema);
  if (validationError) return validationError;

  try {
    const [job, jobDenied] = await requireOwnedImportJob(jobId, user);
    if (jobDenied) return jobDenied;
    if (job.status !== "revision") {
      return NextResponse.json(
        { ok: false, error: "Este trabajo no está en estado de revisión — analízalo antes de aplicarlo." },
        { status: 409 },
      );
    }

    const [ctx, scopeDenied] = await resolveGradeScope(request, {
      courseId: job.course_id,
      grade: job.grade,
      section: job.section,
      transversal: job.transversal,
      bimester: job.bimester,
    });
    if (scopeDenied) return scopeDenied;
    const { scope, user: scopeUser } = ctx;

    if (!scope.editable) {
      return NextResponse.json(
        { ok: false, error: "Este bimestre aún no está disponible para registro." },
        { status: 403 },
      );
    }

    const result = await commitStagedRows({
      jobId,
      scope,
      registeredBy: scopeUser.id,
      overwriteExisting: parsed.overwriteExisting,
      ignoreUnmatched: parsed.ignoreUnmatched,
    });

    await setJobStatus(jobId, "aplicado", { summary: { ...job.summary, ...result } });
    if (job.file_id) await deleteUpload(job.file_id);

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    logger.error({ err, route: "imports/grades/[jobId]/commit" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
