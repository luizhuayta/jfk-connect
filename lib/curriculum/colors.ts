/**
 * Única tabla de colores por área curricular. Antes había 5 copias de esto
 * (horarios de admin/docente/padre, cursos del docente, leyenda de notas
 * del admin), todas con las claves viejas ("Tutoría", "HGE", "Cívica") que
 * dejaron de existir en el catálogo.
 *
 * Se indexa por el NOMBRE del área (`curricular_areas.name`), no por id ni
 * por `code`: es lo único que traen ya resuelto los payloads de horario y
 * cursos (`schedule_entries.subject` / `courses.name` guardan el nombre
 * visible, no el id del área) — evita tener que ampliar 4 endpoints más
 * solo para viajar un `areaCode` adicional.
 */

export type AreaColorStyle = { bg: string; text: string; border: string; dot: string };

export const AREA_COLOR: Record<string, AreaColorStyle> = {
  "Desarrollo Personal, Ciudadanía y Cívica": {
    bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500",
  },
  "Ciencias Sociales": {
    bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500",
  },
  "Educación Religiosa": {
    bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", dot: "bg-violet-500",
  },
  "Educación para el Trabajo": {
    bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", dot: "bg-orange-500",
  },
  "Educación Física": {
    bg: "bg-lime-50", text: "text-lime-800", border: "border-lime-200", dot: "bg-lime-500",
  },
  "Comunicación": {
    bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500",
  },
  "Arte y Cultura": {
    bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-200", dot: "bg-fuchsia-500",
  },
  "Castellano como Segunda Lengua": {
    bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", dot: "bg-teal-500",
  },
  "Inglés": {
    bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500",
  },
  "Matemática": {
    bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500",
  },
  "Ciencia y Tecnología": {
    bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500",
  },
  "Competencias Transversales": {
    bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500",
  },
};

const FALLBACK: AreaColorStyle = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  border: "border-gray-200",
  dot: "bg-gray-400",
};

export function areaColor(name: string | null | undefined): AreaColorStyle {
  return (name && AREA_COLOR[name]) || FALLBACK;
}
