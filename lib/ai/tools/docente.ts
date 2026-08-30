/**
 * Herramientas del rol `docente` — IJFK.
 *
 * Núcleo de seguridad: NINGUNA herramienta de aquí acepta un `courseId`.
 * Reciben `curso: número` — un ÍNDICE dentro de `ctx.allowedCourseIds`,
 * resuelto en el servidor ANTES de invocar al modelo (ver
 * app/api/assistant/messages/route.ts). `courseBelongsToTeacher` queda como
 * defensa en profundidad sobre el UUID ya resuelto.
 */

import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { defineTool } from "@/lib/ai/tools/registry";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { LEVEL_LABEL, type Level } from "@/lib/grades/scale";
import { wrapUserText } from "@/lib/ai/tools/sanitize";
import { firstNameOnly } from "@/lib/ai/redact";
import { resolveOwnedCourse } from "@/lib/ai/tools/resolve-course";
import { ATTENDANCE_STATUS_LABEL, isoDateParam } from "@/lib/ai/tools/common";

const cursoParam = z.object({ curso: z.number().int().min(1).max(50) });

const MAX_ASISTENCIA_DAYS = 120;

export const listarMisCursos = defineTool({
  name: "listar_mis_cursos",
  description: "Lista los cursos/secciones asignados al docente, con un índice numérico para usar en las demás herramientas.",
  params: z.object({}),
  roles: ["docente"],
  run: async (_args, ctx) => {
    if (ctx.allowedCourseIds.length === 0) return { cursos: [] };
    const r = await query<{ id: string; name: string; grade: string; section: string }>(
      `SELECT id, name, grade, section FROM courses WHERE id = ANY($1::uuid[])`,
      [ctx.allowedCourseIds],
    );
    const byId = new Map(r.rows.map((c) => [c.id, c]));
    return {
      cursos: ctx.allowedCourseIds.map((id, i) => {
        const c = byId.get(id);
        return { indice: i + 1, curso: c?.name, grado: c?.grade, seccion: c?.section };
      }),
    };
  },
});

export const resumenNotasCurso = defineTool({
  name: "resumen_notas_curso",
  description: "Resumen de notas de un curso en un bimestre: promedio, aprobados y desaprobados. Usa el índice de listar_mis_cursos.",
  params: cursoParam.extend({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["docente"],
  run: async (args, ctx) => {
    const resolved = await resolveOwnedCourse(ctx, args.curso);
    if (typeof resolved !== "string") return resolved;

    const stats = await queryOne<{ entries: number; complete: number; avg: number | null; approved: number; failed: number }>(
      `SELECT entries, complete, avg, approved, failed FROM v_course_bimester_stats WHERE course_id = $1 AND bimester = $2 AND year = $3`,
      [resolved, args.bimestre, SCHOOL_YEAR],
    );
    if (!stats) return { mensaje: "Aún no hay notas registradas para este curso en ese bimestre." };
    return {
      promedio: stats.avg,
      aprobados: stats.approved,
      desaprobados: stats.failed,
      alumnosCompletos: stats.complete,
      totalAlumnos: stats.entries,
    };
  },
});

export const alumnosEnRiesgo = defineTool({
  name: "alumnos_en_riesgo",
  description: "Lista alumnos con nivel de logro C (en inicio) en un curso y bimestre — candidatos a reforzamiento.",
  params: cursoParam.extend({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["docente"],
  run: async (args, ctx) => {
    const resolved = await resolveOwnedCourse(ctx, args.curso);
    if (typeof resolved !== "string") return resolved;

    const r = await query<{ full_name: string; level: Level }>(
      `SELECT s.full_name, v.level
       FROM v_area_grades v JOIN students s ON s.id = v.student_id
       WHERE v.course_id = $1 AND v.bimester = $2 AND v.year = $3 AND v.level = 'C'
       ORDER BY s.full_name LIMIT 20`,
      [resolved, args.bimestre, SCHOOL_YEAR],
    );
    return { alumnos: r.rows.map((s) => ({ nombre: wrapUserText(firstNameOnly(s.full_name)), nivel: LEVEL_LABEL[s.level] })) };
  },
});

export const asistenciaSeccion = defineTool({
  name: "asistencia_seccion",
  description: "Resumen de asistencia de la sección de un curso en un rango de fechas (máximo 120 días, dentro del año lectivo).",
  params: cursoParam.extend({
    desde: isoDateParam,
    hasta: isoDateParam,
  }),
  roles: ["docente"],
  run: async (args, ctx) => {
    if (args.desde > args.hasta) {
      return { error: "desde debe ser anterior o igual a hasta." };
    }
    const days = (Date.parse(args.hasta) - Date.parse(args.desde)) / 86_400_000;
    if (days > MAX_ASISTENCIA_DAYS) {
      return { error: `El rango no puede superar ${MAX_ASISTENCIA_DAYS} días.` };
    }

    const resolved = await resolveOwnedCourse(ctx, args.curso);
    if (typeof resolved !== "string") return resolved;

    const course = await queryOne<{ grade: string; section: string }>(`SELECT grade, section FROM courses WHERE id = $1`, [resolved]);
    if (!course) return { error: "Curso no encontrado." };

    const r = await query<{ status: string; count: string }>(
      `SELECT a.status::text AS status, count(*) AS count
       FROM attendance a JOIN students s ON s.id = a.student_id
       WHERE s.grade = $1 AND s.section = $2
         AND a.date BETWEEN $3 AND $4
         AND a.date BETWEEN make_date($5, 1, 1) AND make_date($5, 12, 31)
       GROUP BY a.status`,
      [course.grade, course.section, args.desde, args.hasta, SCHOOL_YEAR],
    );
    return {
      resumen: r.rows.map((row) => ({
        estado: ATTENDANCE_STATUS_LABEL[row.status] ?? row.status,
        registros: Number(row.count),
      })),
    };
  },
});

export const miHorario = defineTool({
  name: "mi_horario",
  description: "Horario semanal de clases del docente.",
  params: z.object({ dia: z.enum(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]).optional() }),
  roles: ["docente"],
  run: async (args, ctx) => {
    const where = args.dia ? "AND day = $2" : "";
    const params = args.dia ? [ctx.user.id, args.dia] : [ctx.user.id];
    const r = await query<{ day: string; period: number; time: string; subject: string; grade: string; section: string }>(
      `SELECT day, period, time, subject, grade, section FROM schedule_entries WHERE teacher_id = $1 ${where} ORDER BY day, period`,
      params,
    );
    return { clases: r.rows.map((c) => ({ dia: c.day, hora: c.time, curso: c.subject, seccion: `${c.grade} "${c.section}"` })) };
  },
});

export const DOCENTE_TOOLS = [listarMisCursos, resumenNotasCurso, alumnosEnRiesgo, asistenciaSeccion, miHorario];
