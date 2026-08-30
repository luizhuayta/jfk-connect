/**
 * Herramientas del rol `padre` — IJFK.
 *
 * Núcleo de seguridad: NINGUNA herramienta de aquí acepta un `studentId`.
 * Todas reciben `hijo: número` — un ÍNDICE dentro de `ctx.allowedStudentIds`,
 * que el servidor resolvió con `SELECT id FROM students WHERE parent_id=$1`
 * ANTES de invocar al modelo (ver app/api/assistant/messages/route.ts). El
 * modelo literalmente no tiene vocabulario para pedir el alumno de otro
 * padre — no hay una política que pueda fallar, es estructuralmente
 * imposible con este esquema de parámetros.
 *
 * Las lecturas pasan por `lib/father/queries.ts` y `buildLibreta`, las
 * mismas que el panel REST, para no divergir en filtros (turno, año).
 */

import { z } from "zod";
import { defineTool } from "@/lib/ai/tools/registry";
import { LEVEL_LABEL } from "@/lib/grades/scale";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import { SCHOOL_YEAR, BIMESTER_RANGES } from "@/lib/school-year";
import { wrapUserText } from "@/lib/ai/tools/sanitize";
import { firstNameOnly } from "@/lib/ai/redact";
import { MAX_CHILDREN } from "@/lib/father/limits";
import { resolveStudentId } from "@/lib/ai/tools/resolve-student";
import { ATTENDANCE_STATUS_LABEL, isoDateParam } from "@/lib/ai/tools/common";
import { buildLibreta } from "@/lib/grades/libreta";
import {
  getAttendance,
  getEnrollment,
  getMaterials,
  getSchedule,
  listChildren,
  resolveAttendanceRange,
} from "@/lib/father/queries";

const hijoParam = z.object({ hijo: z.number().int().min(1).max(MAX_CHILDREN) });

const NO_CHILD = { error: "No tienes un hijo con ese índice." };

export const listarMisHijos = defineTool({
  name: "listar_mis_hijos",
  description: "Lista los hijos vinculados a la cuenta del padre, con un índice numérico para usar en las demás herramientas.",
  params: z.object({}),
  roles: ["padre"],
  run: async (_args, ctx) => {
    if (ctx.allowedStudentIds.length === 0) return { hijos: [] };
    const hijos = await listChildren(ctx.user.id);
    const byId = new Map(hijos.map((s) => [s.id, s]));
    return {
      hijos: ctx.allowedStudentIds.map((id, i) => {
        const s = byId.get(id);
        return {
          indice: i + 1,
          nombre: s ? wrapUserText(firstNameOnly(s.name)) : "?",
          grado: s?.grade,
          seccion: s?.section,
        };
      }),
    };
  },
});

const CONCLUSION_MAX = 120;
const PAYLOAD_SOFT_LIMIT = 3500;

export const notasDeHijo = defineTool({
  name: "notas_de_hijo",
  description:
    "Notas SIAGIE (nivel de logro AD/A/B/C por competencia, sin puntaje 0-20) de un hijo. Si omites bimestre, se usa el bimestre lectivo actual.",
  params: hijoParam.extend({
    bimestre: z.number().int().min(1).max(4).optional(),
  }),
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return NO_CHILD;

    const bimester = (args.bimestre ?? CURRENT_BIMESTER) as 1 | 2 | 3 | 4;
    const libreta = await buildLibreta(studentId, SCHOOL_YEAR);
    if (!libreta) return { error: "Alumno no encontrado." };

    const areas = libreta.areas.map((area) => ({
      area: area.name,
      completo: area.competencies.every((c) => c.bimesters[bimester].level !== null),
      competencias: area.competencies.map((c) => {
        const cell = c.bimesters[bimester];
        const entry: { competencia: string; nivel: string; conclusion?: string } = {
          competencia: c.name,
          nivel: cell.level && LEVEL_LABEL[cell.level] ? LEVEL_LABEL[cell.level] : "Sin calificar",
        };
        if (cell.conclusion?.trim()) {
          entry.conclusion = wrapUserText(cell.conclusion.trim().slice(0, CONCLUSION_MAX));
        }
        return entry;
      }),
    }));

    const anyGraded = areas.some((a) => a.competencias.some((c) => c.nivel !== "Sin calificar"));
    if (!anyGraded) {
      return { mensaje: "Aún no hay notas registradas para ese bimestre.", bimestre: bimester, anio: SCHOOL_YEAR };
    }

    let payload: unknown = { bimestre: bimester, anio: SCHOOL_YEAR, areas };
    if (JSON.stringify(payload).length > PAYLOAD_SOFT_LIMIT) {
      payload = {
        bimestre: bimester,
        anio: SCHOOL_YEAR,
        areas: areas.map((a) => ({
          area: a.area,
          completo: a.completo,
          competencias: a.competencias.map(({ competencia, nivel }) => ({ competencia, nivel })),
        })),
      };
    }
    return payload;
  },
});

export const asistenciaDeHijo = defineTool({
  name: "asistencia_de_hijo",
  description:
    "Resumen de asistencia (asistió/faltó/tardanza/justificado) de un hijo. Si omites fechas, se usa el rango del bimestre lectivo actual.",
  params: hijoParam.extend({
    desde: isoDateParam.optional(),
    hasta: isoDateParam.optional(),
  }),
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return NO_CHILD;

    const range = BIMESTER_RANGES[CURRENT_BIMESTER];
    const { records, counts } = await getAttendance(
      studentId,
      resolveAttendanceRange({
        from: args.desde ?? range.start,
        to: args.hasta ?? range.end,
      }),
    );
    const labels = ATTENDANCE_STATUS_LABEL;
    return {
      desde: args.desde ?? range.start,
      hasta: args.hasta ?? range.end,
      resumen: (Object.keys(counts) as Array<keyof typeof counts>)
        .filter((status) => counts[status] > 0)
        .map((status) => ({ estado: labels[status] ?? status, dias: counts[status] })),
      registros: records.length,
    };
  },
});

export const horarioDeHijo = defineTool({
  name: "horario_de_hijo",
  description: "Horario semanal de clases de un hijo, opcionalmente filtrado por día.",
  params: hijoParam.extend({
    dia: z.enum(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]).optional(),
  }),
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return NO_CHILD;

    const data = await getSchedule(studentId);
    if (!data) return { error: "Alumno no encontrado." };

    const days = args.dia ? [args.dia] : data.days;
    const clases: { dia: string; hora: string; curso: string }[] = [];
    for (const day of days) {
      const slots = data.schedule[day] ?? [];
      for (const slot of slots) {
        if (slot) clases.push({ dia: day, hora: slot.time, curso: slot.subject });
      }
    }
    return { clases };
  },
});

export const materialesDeHijo = defineTool({
  name: "materiales_de_hijo",
  description: "Materiales de estudio recientes registrados por los docentes de un hijo.",
  params: hijoParam,
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return NO_CHILD;

    const courses = await getMaterials(studentId);
    const materiales = courses
      .flatMap((c) => c.materials.map((m) => ({ ...m, curso: c.subject })))
      .slice(0, 10)
      .map((m) => ({
        titulo: wrapUserText(m.title),
        tipo: m.type,
        tema: m.topic ? wrapUserText(m.topic) : null,
        fecha: m.uploadedAt,
        curso: m.curso,
      }));
    return { materiales };
  },
});

export const estadoMatricula = defineTool({
  name: "estado_matricula",
  description: "Estado de matrícula (regular/condicional/pendiente) y pagos de un hijo.",
  params: hijoParam,
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return NO_CHILD;

    const enrollment = await getEnrollment(studentId);
    if (!enrollment) return { mensaje: "No hay matrícula registrada para este año." };
    return {
      estado: enrollment.status,
      documentosEntregados: `${enrollment.docsSubmitted}/${enrollment.docsTotal}`,
      tutor: enrollment.tutor,
      grado: enrollment.grade,
      seccion: enrollment.section,
    };
  },
});

export const PADRE_TOOLS = [listarMisHijos, notasDeHijo, asistenciaDeHijo, horarioDeHijo, materialesDeHijo, estadoMatricula];
