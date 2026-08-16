/**
 * Helper para calcular la letra de calificación (A/B/C/D) desde un promedio.
 * Mismo criterio que el trigger de la BD (lib/schemas → letter_grade):
 *   A: 18-20, B: 15-17, C: 10-14, D: 0-9
 *
 * Uso en componentes client:
 *   import { letterGrade, letterGradeColor } from "@/lib/letter-grade";
 *   <Badge className={letterGradeColor(letter)}>{letter}</Badge>
 */

export function letterGrade(avg: number | null | undefined): "A" | "B" | "C" | "D" | null {
  if (avg === null || avg === undefined || Number.isNaN(avg)) return null;
  if (avg >= 18) return "A";
  if (avg >= 15) return "B";
  if (avg >= 10) return "C";
  return "D";
}

export function letterGradeColor(letter: string | null): string {
  switch (letter) {
    case "A": return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    case "B": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "C": return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    case "D": return "bg-red-100 text-red-600 hover:bg-red-100";
    default: return "bg-gray-100 text-gray-500 hover:bg-gray-100";
  }
}

/**
 * Etiqueta de desempeño alineada con la letra canónica de la BD.
 * Mismo criterio que `letterGrade`/trigger: A=18-20, B=15-17, C=10-14, D=0-9.
 * Única fuente para los paneles (antes se duplicaba con umbrales distintos
 * en el dashboard y la página de notas).
 */
export function desempeñoLabel(avg: number | null | undefined): string {
  if (avg === null || avg === undefined || Number.isNaN(avg)) return "—";
  if (avg >= 18) return "Logro destacado";
  if (avg >= 15) return "Logro esperado";
  if (avg >= 10) return "En proceso";
  return "En inicio";
}