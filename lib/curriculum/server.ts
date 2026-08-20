import { query } from "@/lib/db";
import type { Area, Competency, Curriculum } from "./types";

interface AreaRow {
  id: number;
  code: string;
  name: string;
  short_name: string;
  is_transversal: boolean;
  hours_per_week: number;
  color_key: string;
  display_order: number;
}

interface CompetencyRow {
  id: number;
  area_id: number;
  code: string;
  name: string;
  display_order: number;
}

// El catálogo (11 áreas + transversales, 31 competencias) es estructural:
// vive en la BD (supabase/migrations/00000000000008_competencias.sql) y no
// tiene un CRUD en la app, así que cambia casi nunca. Se cachea en memoria
// del proceso para no repetir 2 SELECTs pequeños en cada request; el caché
// se pierde en cada redeploy/restart, que es cuando de verdad podría haber
// cambiado (una migración nueva).
let cached: Curriculum | null = null;

export async function fetchCatalog(): Promise<Curriculum> {
  if (cached) return cached;

  const [areasR, compsR] = await Promise.all([
    query<AreaRow>(
      `SELECT id, code, name, short_name, is_transversal, hours_per_week, color_key, display_order
       FROM curricular_areas WHERE active ORDER BY display_order`,
    ),
    query<CompetencyRow>(
      `SELECT id, area_id, code, name, display_order
       FROM competencies WHERE active ORDER BY area_id, display_order`,
    ),
  ]);

  const areas: Area[] = areasR.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.short_name,
    isTransversal: r.is_transversal,
    hoursPerWeek: r.hours_per_week,
    colorKey: r.color_key,
    order: r.display_order,
  }));

  const competencies: Competency[] = compsR.rows.map((r) => ({
    id: r.id,
    areaId: r.area_id,
    code: r.code,
    name: r.name,
    order: r.display_order,
  }));

  cached = { areas, competencies };
  return cached;
}

/** Solo para tests/scripts que necesiten forzar una relectura. */
export function invalidateCatalogCache(): void {
  cached = null;
}
