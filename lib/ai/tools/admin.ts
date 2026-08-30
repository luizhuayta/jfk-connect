/**
 * Herramientas del rol `admin` — IJFK. Solo agregados y búsquedas
 * administrativas; `buscar_alumno` es la única que expone datos de un
 * alumno concreto (primer nombre + inicial, nunca DNI ni apellido completo),
 * y es exclusiva de este rol.
 */

import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { defineTool } from "@/lib/ai/tools/registry";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { wrapUserText } from "@/lib/ai/tools/sanitize";
import { firstNameAndLastInitial } from "@/lib/ai/redact";
import { ATTENDANCE_STATUS_LABEL, isoDateParam } from "@/lib/ai/tools/common";

export const estadisticasGenerales = defineTool({
  name: "estadisticas_generales",
  description: "Estadísticas generales del colegio: total de alumnos, docentes, secciones y cursos sin docente.",
  params: z.object({}),
  roles: ["admin"],
  run: async () => {
    const row = await queryOne<{
      alumnos: string;
      docentes: string;
      secciones: string;
      cursos_sin_docente: string;
    }>(
      `SELECT
         (SELECT count(*) FROM students WHERE status = 'activo') AS alumnos,
         (SELECT count(*) FROM users WHERE role = 'docente' AND is_active) AS docentes,
         (SELECT count(DISTINCT grade || section) FROM students WHERE status = 'activo') AS secciones,
         (SELECT count(*) FROM courses WHERE teacher_id IS NULL) AS cursos_sin_docente`,
    );
    if (!row) return { error: "No se pudo calcular." };
    return {
      alumnosActivos: Number(row.alumnos),
      docentesActivos: Number(row.docentes),
      secciones: Number(row.secciones),
      cursosSinDocente: Number(row.cursos_sin_docente),
    };
  },
});

export const cursosSinDocente = defineTool({
  name: "cursos_sin_docente",
  description: "Lista los cursos que todavía no tienen un docente asignado.",
  params: z.object({}),
  roles: ["admin"],
  run: async () => {
    const r = await query<{ name: string; grade: string; section: string }>(
      `SELECT name, grade, section FROM courses WHERE teacher_id IS NULL ORDER BY grade, section LIMIT 20`,
    );
    return { cursos: r.rows.map((c) => ({ curso: c.name, grado: c.grade, seccion: c.section })) };
  },
});

export const seccionesConNotasPendientes = defineTool({
  name: "secciones_con_notas_pendientes",
  description: "Lista secciones/cursos con notas incompletas (no todos los alumnos calificados) en un bimestre.",
  params: z.object({ bimestre: z.number().int().min(1).max(4) }),
  roles: ["admin"],
  run: async (args) => {
    const r = await query<{ name: string; grade: string; section: string; entries: number; complete: number }>(
      `SELECT c.name, c.grade, c.section, s.entries, s.complete
       FROM v_course_bimester_stats s JOIN courses c ON c.id = s.course_id
       WHERE s.bimester = $1 AND s.year = $2 AND s.complete < s.entries
       ORDER BY c.grade, c.section LIMIT 20`,
      [args.bimestre, SCHOOL_YEAR],
    );
    return {
      secciones: r.rows.map((row) => ({
        curso: row.name,
        seccion: `${row.grade} "${row.section}"`,
        completados: `${row.complete}/${row.entries}`,
      })),
    };
  },
});

export const buscarAlumno = defineTool({
  name: "buscar_alumno",
  description:
    "Busca un alumno por parte del nombre. Exclusivo de administración. No acepta DNI: si te pasan un número, pide el nombre.",
  params: z.object({ nombre: z.string().min(2).max(80) }),
  roles: ["admin"],
  run: async (args) => {
    if (/^\d{8}$/.test(args.nombre.trim())) {
      return { error: "Busca por nombre, no por DNI." };
    }
    const r = await query<{ full_name: string; grade: string; section: string; status: string }>(
      `SELECT full_name, grade, section, status FROM students WHERE full_name ILIKE $1 LIMIT 10`,
      [`%${args.nombre.trim()}%`],
    );
    return {
      alumnos: r.rows.map((s) => ({
        nombre: wrapUserText(firstNameAndLastInitial(s.full_name)),
        grado: s.grade,
        seccion: s.section,
        estado: s.status,
      })),
    };
  },
});

export const resumenAsistencia = defineTool({
  name: "resumen_asistencia",
  description: "Resumen de asistencia del colegio (o de un grado/sección) en un rango de fechas.",
  params: z.object({
    grade: z.string().optional(),
    section: z.string().optional(),
    desde: isoDateParam,
    hasta: isoDateParam,
  }),
  roles: ["admin"],
  run: async (args) => {
    const conditions = ["a.date BETWEEN $1 AND $2"];
    const params: unknown[] = [args.desde, args.hasta];
    if (args.grade) {
      params.push(args.grade);
      conditions.push(`s.grade = $${params.length}`);
    }
    if (args.section) {
      params.push(args.section);
      conditions.push(`s.section = $${params.length}`);
    }
    const r = await query<{ status: string; count: string }>(
      `SELECT a.status::text AS status, count(*) AS count
       FROM attendance a JOIN students s ON s.id = a.student_id
       WHERE ${conditions.join(" AND ")}
       GROUP BY a.status`,
      params,
    );
    return { resumen: r.rows.map((row) => ({ estado: ATTENDANCE_STATUS_LABEL[row.status] ?? row.status, registros: Number(row.count) })) };
  },
});

export const ADMIN_TOOLS = [
  estadisticasGenerales,
  cursosSinDocente,
  seccionesConNotasPendientes,
  buscarAlumno,
  resumenAsistencia,
];
