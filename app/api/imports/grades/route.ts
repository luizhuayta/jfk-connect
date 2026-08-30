/**
 * POST /api/imports/grades  — sube un archivo (xlsx/csv/foto) y crea el job
 * GET  /api/imports/grades  — lista los jobs del usuario actual
 *
 * Solo sube y registra el archivo — el parseo real ocurre en un paso
 * aparte (POST /api/imports/grades/[jobId]/parse), para poder reintentarlo
 * sin volver a subir. El guard de scope es `resolveGradeScope`, el mismo
 * que usa la grilla de notas: docente dueño del curso/tutor de la sección,
 * o admin. Solo se puede subir si el bimestre está abierto para registro.
 *
 * Seguridad: docente o admin. Rate limit propio (no es una llamada de IA
 * — el path xlsx/csv nunca toca el proveedor de IA).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { parseFormData } from "@/lib/validate";
import { importUploadFieldsSchema } from "@/lib/schemas";
import { resolveGradeScope } from "@/lib/grades/scope";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/storage/files";
import { createImportJob, listImportJobs } from "@/lib/imports/jobs";
import type { ImportKind } from "@/lib/imports/jobs";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const UPLOAD_LIMIT = { maxAttempts: 10, windowMs: 60 * 60 * 1000 };
const ALLOWED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
] as const;

function kindFromSniff(sniffed: string): ImportKind | null {
  if (sniffed === "xlsx") return "excel";
  if (sniffed === "csv") return "csv";
  if (sniffed === "jpeg" || sniffed === "png") return "foto";
  return null;
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const ip = getClientIp(request);
  const ipLimit = ip
    ? rateLimit(`imports:upload:ip:${ip}`, UPLOAD_LIMIT)
    : { ok: true as const };
  const userLimit = rateLimit(`imports:upload:user:${user.id}`, UPLOAD_LIMIT);
  if (!ipLimit.ok || !userLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas subidas. Espera unos minutos y vuelve a intentar." },
      { status: 429 },
    );
  }

  const maxBytes = Number(process.env.MAX_UPLOAD_MB ?? "8") * 1024 * 1024;
  const [parsed, validationError] = await parseFormData(request, {
    fileField: "file",
    fieldsSchema: importUploadFieldsSchema,
    maxBytes,
    allowedMime: ALLOWED_MIME,
  });
  if (validationError) return validationError;

  const [ctx, scopeDenied] = await resolveGradeScope(request, {
    courseId: parsed.fields.courseId,
    grade: parsed.fields.grade,
    section: parsed.fields.section,
    transversal: parsed.fields.transversal,
    bimester: parsed.fields.bimester,
  });
  if (scopeDenied) return scopeDenied;
  const { scope } = ctx;

  if (!scope.editable) {
    return NextResponse.json(
      { ok: false, error: "Este bimestre aún no está disponible para registro." },
      { status: 403 },
    );
  }

  const kind = kindFromSniff(parsed.file.sniffedKind);
  if (!kind) {
    return NextResponse.json(
      { ok: false, error: "Formato no admitido. Sube un archivo .xlsx, .csv o una foto JPG/PNG." },
      { status: 400 },
    );
  }

  try {
    const upload = await saveUpload({
      buffer: parsed.file.buffer,
      originalName: parsed.file.name,
      mime: parsed.file.mime,
      sniffed: parsed.file.sniffedKind,
      feature: "import_grades",
      ownerId: user.id,
    });

    const jobId = await createImportJob({
      createdBy: user.id,
      fileId: upload.fileId,
      kind,
      courseId: scope.courseId,
      grade: scope.grade,
      section: scope.section,
      transversal: scope.kind === "transversal",
      bimester: scope.bimester,
      year: SCHOOL_YEAR,
    });

    return NextResponse.json({ ok: true, jobId, kind });
  } catch (err) {
    logger.error({ err, route: "imports/grades POST" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  try {
    const jobs = await listImportJobs(user.id);
    return NextResponse.json({ ok: true, jobs });
  } catch (err) {
    logger.error({ err, route: "imports/grades GET" }, "error inesperado");
    return NextResponse.json({ ok: false, error: "Error interno del servidor." }, { status: 500 });
  }
}
