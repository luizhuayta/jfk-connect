/**
 * POST /api/imports/grades/[jobId]/parse
 *
 * Lee el archivo subido, lo convierte a una tabla común (xlsx/csv:
 * deterministas; foto: IA de visión SOLO como OCR) y corre el pipeline
 * determinista de detección de columnas + matching de alumnos (mismo
 * código sin importar el origen — ver lib/imports/process.ts). Reemplaza
 * cualquier staging previo del job (si el docente vuelve a analizar).
 *
 * Re-verifica el scope (no solo confía en lo que se guardó al subir): si
 * al docente le quitan el curso o el bimestre se cierra entre el upload y
 * el parse, esto falla aquí en vez de dejarlo avanzar.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { parseUuidParam } from "@/lib/validate";
import { resolveGradeScope } from "@/lib/grades/scope";
import { fetchCatalog } from "@/lib/curriculum/server";
import { readUpload } from "@/lib/storage/files";
import { replaceStagedRows, setJobStatus } from "@/lib/imports/jobs";
import { requireOwnedImportJob } from "@/lib/imports/access";
import { fetchRoster } from "@/lib/imports/roster";
import { parseCsv } from "@/lib/imports/csv";
import { parseXlsx } from "@/lib/imports/xlsx";
import { extractGridFromImage } from "@/lib/imports/vision";
import { processSheet } from "@/lib/imports/process";
import { AI_LIMITS } from "@/lib/ai/limits";
import { runAi } from "@/lib/ai/run";
import { aiErrorResponse, AiError } from "@/lib/ai/errors";
import type { ParsedSheet } from "@/lib/imports/types";
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

  try {
    const [job, jobDenied] = await requireOwnedImportJob(jobId, user);
    if (jobDenied) return jobDenied;
    if (!job.file_id) {
      return NextResponse.json({ ok: false, error: "Este trabajo no tiene un archivo asociado." }, { status: 409 });
    }

    const [ctx, scopeDenied] = await resolveGradeScope(request, {
      courseId: job.course_id,
      grade: job.grade,
      section: job.section,
      transversal: job.transversal,
      bimester: job.bimester,
    });
    if (scopeDenied) return scopeDenied;
    const { scope } = ctx;

    if (!scope.editable) {
      await setJobStatus(jobId, "error", { error: "El bimestre se cerró antes de poder analizar el archivo." });
      return NextResponse.json(
        { ok: false, error: "Este bimestre aún no está disponible para registro." },
        { status: 403 },
      );
    }

    await setJobStatus(jobId, "analizando");

    const buffer = await readUpload(job.file_id, job.created_by, { allowAdmin: true });

    let sheet: ParsedSheet;
    let visionMeta: Record<string, unknown> = {};

    if (job.kind === "excel") {
      sheet = await parseXlsx(buffer);
    } else if (job.kind === "csv") {
      sheet = parseCsv(buffer);
    } else {
      const mime = buffer.subarray(0, 4).toString("hex").startsWith("89504e47") ? "image/png" : "image/jpeg";
      try {
        const extracted = await runAi({
          usageFeature: "import_vision",
          userId: user.id,
          rateLimitKey: `ai:import_vision:user:${user.id}`,
          rateLimitConfig: AI_LIMITS.import_vision,
          refType: "import_job",
          refId: jobId,
          fn: async () => {
            const res = await extractGridFromImage(buffer, mime);
            return { data: res, usage: res.usage, model: res.model };
          },
        });
        sheet = extracted.sheet;
        visionMeta = { model: extracted.model };
      } catch (err) {
        await setJobStatus(jobId, "error", { error: "No se pudo leer la foto con IA de visión." });
        if (err instanceof AiError) return aiErrorResponse(err, "imports/grades/parse");
        throw err;
      }
    }

    const { areas, competencies } = await fetchCatalog();
    const competenciesInScope = competencies.filter((c) => scope.competencyIds.includes(c.id));
    const roster = await fetchRoster(scope.grade, scope.section);

    const { columnMap, rows } = processSheet(sheet, competenciesInScope, roster);
    await replaceStagedRows(jobId, rows);

    const summary = {
      totalRows: rows.length,
      ok: rows.filter((r) => r.status === "ok").length,
      ambiguo: rows.filter((r) => r.status === "ambiguo").length,
      sinMatch: rows.filter((r) => r.status === "sin_match").length,
    };
    const areaName = areas.find((a) => a.id === scope.areaId)?.name ?? "";

    await setJobStatus(jobId, "revision", {
      sourceMeta: {
        sheetName: sheet.sheetName,
        headerRowIndex: columnMap.headerRowIndex,
        unmapped: columnMap.unmapped,
        mappedCompetencies: columnMap.competencyCols.size,
        areaName,
        ...visionMeta,
      },
      summary,
    });

    return NextResponse.json({
      ok: true,
      summary,
      unmapped: columnMap.unmapped,
      mappedCompetencies: columnMap.competencyCols.size,
    });
  } catch (err) {
    logger.error({ err, route: "imports/grades/[jobId]/parse" }, "error inesperado");
    try {
      await setJobStatus(jobId, "error", { error: "Error interno al analizar el archivo." });
    } catch (statusErr) {
      logger.error({ err: statusErr, route: "imports/grades/[jobId]/parse", jobId }, "no se pudo marcar el job como error");
    }
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
