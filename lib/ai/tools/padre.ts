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
 */

import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { defineTool, type ToolContext } from "@/lib/ai/tools/registry";
import { LEVEL_LABEL, type Level } from "@/lib/grades/scale";
import { sectionShift } from "@/lib/section-shift";
import { wrapUserText } from "@/lib/ai/tools/sanitize";

const hijoParam = z.object({ hijo: z.number().int().min(1).max(10) });

function resolveStudentId(ctx: ToolContext, hijo: number): string | null {
  return ctx.allowedStudentIds[hijo - 1] ?? null;
}

export const listarMisHijos = defineTool({
  name: "listar_mis_hijos",
  description: "Lista los hijos vinculados a la cuenta del padre, con un índice numérico para usar en las demás herramientas.",
  params: z.object({}),
  roles: ["padre"],
  run: async (_args, ctx) => {
    if (ctx.allowedStudentIds.length === 0) return { hijos: [] };
    const r = await query<{ id: string; full_name: string; grade: string; section: string }>(
      `SELECT id, full_name, grade, section FROM students WHERE id = ANY($1::uuid[])`,
      [ctx.allowedStudentIds],
    );
    const byId = new Map(r.rows.map((s) => [s.id, s]));
    return {
      hijos: ctx.allowedStudentIds.map((id, i) => {
        const s = byId.get(id);
        return { indice: i + 1, nombre: s ? wrapUserText(s.full_name.split(" ")[0]) : "?", grado: s?.grade, seccion: s?.section };
      }),
    };
  },
});

export const notasDeHijo = defineTool({
  name: "notas_de_hijo",
  description: "Notas por área curricular (nivel de logro AD/A/B/C) de un hijo en un bimestre.",
  params: hijoParam.extend({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return { error: "No tienes un hijo con ese índice." };

    const r = await query<{ area_name: string; level: Level | null; graded: number; expected: number }>(
      `SELECT ca.name AS area_name, v.level, v.graded, v.expected
       FROM v_area_grades v
       JOIN curricular_areas ca ON ca.id = v.area_id
       WHERE v.student_id = $1 AND v.bimester = $2
       ORDER BY ca.display_order`,
      [studentId, args.bimestre],
    );
    if (r.rows.length === 0) return { mensaje: "Aún no hay notas registradas para ese bimestre." };
    return {
      areas: r.rows.map((a) => ({
        area: a.area_name,
        nivel: a.level ? LEVEL_LABEL[a.level] : "Sin calificar",
        completo: a.graded >= a.expected,
      })),
    };
  },
});

export const asistenciaDeHijo = defineTool({
  name: "asistencia_de_hijo",
  description: "Resumen de asistencia (asistió/faltó/tardanza/justificado) de un hijo en un rango de fechas.",
  params: hijoParam.extend({
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return { error: "No tienes un hijo con ese índice." };

    const r = await query<{ status: string; count: string }>(
      `SELECT status::text AS status, count(*) AS count
       FROM attendance WHERE student_id = $1 AND date BETWEEN $2 AND $3
       GROUP BY status`,
      [studentId, args.desde, args.hasta],
    );
    const labels: Record<string, string> = { A: "asistió", F: "faltó", T: "tardanza", J: "justificado" };
    return { resumen: r.rows.map((row) => ({ estado: labels[row.status] ?? row.status, dias: Number(row.count) })) };
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
    if (!studentId) return { error: "No tienes un hijo con ese índice." };

    const student = await queryOne<{ grade: string; section: string }>(`SELECT grade, section FROM students WHERE id = $1`, [studentId]);
    if (!student) return { error: "Alumno no encontrado." };

    const where = args.dia ? `AND day = $3` : "";
    const params = args.dia ? [student.grade, student.section, args.dia] : [student.grade, student.section];
    const r = await query<{ day: string; period: number; time: string; subject: string }>(
      `SELECT day, period, time, subject FROM schedule_entries
       WHERE grade = $1 AND section = $2 ${where}
       ORDER BY day, period`,
      params,
    );
    return { turno: sectionShift(student.section), clases: r.rows.map((c) => ({ dia: c.day, hora: c.time, curso: c.subject })) };
  },
});

export const materialesDeHijo = defineTool({
  name: "materiales_de_hijo",
  description: "Materiales de estudio recientes registrados por los docentes de un hijo.",
  params: hijoParam,
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return { error: "No tienes un hijo con ese índice." };

    const student = await queryOne<{ grade: string; section: string }>(`SELECT grade, section FROM students WHERE id = $1`, [studentId]);
    if (!student) return { error: "Alumno no encontrado." };

    const r = await query<{ title: string; type: string; topic: string | null; uploaded_at: string }>(
      `SELECT m.title, m.type, m.topic, to_char(m.uploaded_at, 'YYYY-MM-DD') AS uploaded_at
       FROM materials m JOIN courses c ON c.id = m.course_id
       WHERE c.grade = $1 AND c.section = $2
       ORDER BY m.uploaded_at DESC LIMIT 10`,
      [student.grade, student.section],
    );
    return { materiales: r.rows.map((m) => ({ titulo: wrapUserText(m.title), tipo: m.type, tema: m.topic ? wrapUserText(m.topic) : null, fecha: m.uploaded_at })) };
  },
});

export const estadoMatricula = defineTool({
  name: "estado_matricula",
  description: "Estado de matrícula (regular/condicional/pendiente) y pagos de un hijo.",
  params: hijoParam,
  roles: ["padre"],
  run: async (args, ctx) => {
    const studentId = resolveStudentId(ctx, args.hijo);
    if (!studentId) return { error: "No tienes un hijo con ese índice." };

    const r = await queryOne<{
      status: string;
      docs_submitted: number;
      docs_total: number;
      apafa_paid: boolean;
      actividades_paid: boolean;
    }>(
      `SELECT status::text AS status, docs_submitted, docs_total, apafa_paid, actividades_paid
       FROM enrollments WHERE student_id = $1 ORDER BY year DESC LIMIT 1`,
      [studentId],
    );
    if (!r) return { mensaje: "No hay matrícula registrada para este año." };
    return {
      estado: r.status,
      documentosEntregados: `${r.docs_submitted}/${r.docs_total}`,
      apafaPagado: r.apafa_paid,
      actividadesPagado: r.actividades_paid,
    };
  },
});

export const PADRE_TOOLS = [listarMisHijos, notasDeHijo, asistenciaDeHijo, horarioDeHijo, materialesDeHijo, estadoMatricula];
