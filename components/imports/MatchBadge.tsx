import { Badge } from "@/components/ui/badge";

const LABEL: Record<string, string> = {
  dni: "DNI",
  orden: "N° de orden",
  nombre_exacto: "Nombre exacto",
  nombre_normalizado: "Nombre",
  fuzzy: "Aproximado",
  ia: "Sugerido por IA",
  manual: "Manual",
};

const COLOR: Record<string, string> = {
  dni: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  nombre_exacto: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  orden: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  nombre_normalizado: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  fuzzy: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  ia: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  manual: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

/** Color/etiqueta del método de matching de alumno — ver lib/imports/match.ts. Sin método (sin_match) = rojo. */
export default function MatchBadge({ method }: { method: string | null }) {
  if (!method) {
    return <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-[10px]">Sin coincidencia</Badge>;
  }
  return <Badge className={`${COLOR[method] ?? "bg-gray-100 text-gray-600"} text-[10px]`}>{LABEL[method] ?? method}</Badge>;
}
