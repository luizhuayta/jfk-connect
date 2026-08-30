/**
 * Herramientas del rol `docente` — IJFK.
 *
 * A diferencia de las de `padre` (que usan un índice), estas sí aceptan un
 * `courseId` — pero cada una lo valida contra `courseBelongsToTeacher`
 * (lib/guards.ts, predicado booleano puro, mismo guard que usan las rutas
 * REST de cursos) antes de tocar ningún dato. Si el curso no es del
 * docente que pregunta, la herramienta devuelve un error de acceso, nunca
 * los datos.
 */

import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { defineTool } from "@/lib/ai/tools/registry";
import { courseBelongsToTeacher } from "@/lib/guards";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { LEVEL_LABEL, type Level } from "@/lib/grades/scale";
import { wrapUserText } from "@/lib/ai/tools/sanitize";

const courseParam = z.object({ courseId: z.string().min(1) });
const ACCESS_DENIED = { error: "No tienes acceso a ese curso." };

export const listarMisCursos = defineTool({
  name: "listar_mis_cursos",
  description: "Lista los cursos/secciones asignados al docente.",
  params: z.object({}),
  roles: ["docente"],
  run: async (_args, ctx) => {
    if (ctx.allowedCourseIds.length === 0) return { cursos: [] };
    const r = await query<{ id: string; name: string; grade: string; section: string }>(
      `SELECT id, name, grade, section FROM courses WHERE id = ANY($1::uuid[]) ORDER BY grade, section`,
      [ctx.allowedCourseIds],
    );
    return { cursos: r.rows.map((c) => ({ courseId: c.id, curso: c.name, grado: c.grade, seccion: c.section })) };
  },
});

export const resumenNotasCurso = defineTool({
  name: "resumen_notas_curso",
  description: "Resumen de notas de un curso en un bimestre: promedio, aprobados y desaprobados.",
  params: courseParam.extend({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["docente"],
  run: async (args, ctx) => {
    if (!(await courseBelongsToTeacher(args.courseId, ctx.user.id))) return ACCESS_DENIED;

    const stats = await queryOne<{ entries: number; complete: number; avg: number | null; approved: number; failed: number }>(
      `SELECT entries, complete, avg, approved, failed FROM v_course_bimester_stats WHERE course_id = $1 AND bimester = $2 AND year = $3`,
      [args.courseId, args.bimestre, SCHOOL_YEAR],
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
  params: courseParam.extend({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["docente"],
  run: async (args, ctx) => {
    if (!(await courseBelongsToTeacher(args.courseId, ctx.user.id))) return ACCESS_DENIED;

    const r = await query<{ full_name: string; level: Level }>(
      `SELECT s.full_name, v.level
       FROM v_area_grades v JOIN students s ON s.id = v.student_id
       WHERE v.course_id = $1 AND v.bimester = $2 AND v.level = 'C'
       ORDER BY s.full_name LIMIT 20`,
      [args.courseId, args.bimestre],
    );
    return { alumnos: r.rows.map((s) => ({ nombre: wrapUserText(s.full_name.split(" ")[0]), nivel: LEVEL_LABEL[s.level] })) };
  },
});

export const asistenciaSeccion = defineTool({
  name: "asistencia_seccion",
  description: "Resumen de asistencia de la sección de un curso en un rango de fechas.",
  params: courseParam.extend({
    desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  roles: ["docente"],
  run: async (args, ctx) => {
    if (!(await courseBelongsToTeacher(args.courseId, ctx.user.id))) return ACCESS_DENIED;

    const course = await queryOne<{ grade: string; section: string }>(`SELECT grade, section FROM courses WHERE id = $1`, [args.courseId]);
    if (!course) return { error: "Curso no encontrado." };

    const r = await query<{ status: string; count: string }>(
      `SELECT a.status::text AS status, count(*) AS count
       FROM attendance a JOIN students s ON s.id = a.student_id
       WHERE s.grade = $1 AND s.section = $2 AND a.date BETWEEN $3 AND $4
       GROUP BY a.status`,
      [course.grade, course.section, args.desde, args.hasta],
    );
    const labels: Record<string, string> = { A: "asistió", F: "faltó", T: "tardanza", J: "justificado" };
    return { resumen: r.rows.map((row) => ({ estado: labels[row.status] ?? row.status, registros: Number(row.count) })) };
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
