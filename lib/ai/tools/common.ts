/**
 * Herramientas disponibles para los 3 roles — IJFK.
 */

import { z } from "zod";
import { query } from "@/lib/db";
import { defineTool } from "@/lib/ai/tools/registry";
import { wrapUserText } from "@/lib/ai/tools/sanitize";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const obtenerFechaActual = defineTool({
  name: "obtener_fecha_actual",
  description: "Devuelve la fecha y hora actual, y el día de la semana en español.",
  params: z.object({}),
  roles: ["padre", "docente", "admin"],
  run: async () => {
    const now = new Date();
    return {
      fechaISO: now.toISOString().slice(0, 10),
      diaSemana: DIAS[now.getDay()],
    };
  },
});

interface AnnouncementRow {
  category: string;
  title: string;
  body: string;
  sender: string;
  published_at: string;
}

export const listarAvisos = defineTool({
  name: "listar_avisos",
  description: "Lista los avisos/comunicados institucionales recientes visibles para el usuario actual.",
  params: z.object({}),
  roles: ["padre", "docente", "admin"],
  run: async (_args, ctx) => {
    let where = "";
    const params: unknown[] = [];
    if (ctx.user.role === "padre") {
      params.push(ctx.user.id);
      where = `WHERE audience IN ('todos', 'padres')
        OR audience IN (SELECT DISTINCT grade FROM students WHERE parent_id = $1)`;
    } else if (ctx.user.role === "docente") {
      where = `WHERE audience IN ('todos', 'docentes')`;
    }

    const r = await query<AnnouncementRow>(
      `SELECT category::text AS category, title, body, sender, to_char(published_at, 'YYYY-MM-DD') AS published_at
       FROM announcements ${where} ORDER BY published_at DESC LIMIT 10`,
      params,
    );

    return r.rows.map((a) => ({
      categoria: a.category,
      titulo: wrapUserText(a.title),
      resumen: wrapUserText(a.body.slice(0, 200)),
      remitente: a.sender,
      fecha: a.published_at,
    }));
  },
});

export const COMMON_TOOLS = [obtenerFechaActual, listarAvisos];
