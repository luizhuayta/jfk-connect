/**
 * Codifica/decodifica el scope elegido en el selector (un curso, o
 * competencias transversales de una sección) como un string plano — así el
 * <select> nativo puede usarlo directo como `value` sin un objeto por
 * `<option>`. Puro, sin dependencias de servidor: lo usan tanto el
 * selector (cliente) como quien arma la query a /api/grades.
 */
export type ScopeValue =
  | { type: "course"; courseId: string }
  | { type: "transversal"; grade: string; section: string };

export function encodeScope(v: ScopeValue): string {
  return v.type === "course" ? `course:${v.courseId}` : `transversal:${v.grade}:${v.section}`;
}

export function decodeScope(raw: string): ScopeValue | null {
  const [type, a, b] = raw.split(":");
  if (type === "course" && a) return { type: "course", courseId: a };
  if (type === "transversal" && a && b) return { type: "transversal", grade: a, section: b };
  return null;
}
