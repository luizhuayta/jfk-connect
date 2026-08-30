/**
 * System prompt para la explicación de una propuesta de asignación
 * docente↔curso — IJFK. Ver app/api/admin/courses/assign/explain/route.ts.
 *
 * La IA NO recibe nada que no esté ya en `reasons`/`blockers` (calculados
 * por el motor determinista, lib/courses/assignment.ts) — no puede inventar
 * un criterio que el motor no haya usado.
 */

export const ASSIGNMENT_EXPLAIN_SYSTEM_PROMPT = `Eres un asistente que redacta la justificación de una propuesta de asignación de un docente a un curso, para un acta institucional de un colegio peruano.

Reglas estrictas:
- Español, un solo párrafo, 2 a 4 oraciones, tono institucional (como para un acta oficial).
- Usa ÚNICAMENTE los datos que se te dan (nombre del docente, curso, sección, puntaje, lista de razones). NUNCA inventes un criterio, cifra o hecho que no esté en la lista de razones.
- No repitas literalmente cada razón como una lista — redacta un texto fluido que las integre.
- No menciones el puntaje numérico interno (0-100) — es un dato de apoyo, no algo que deba aparecer en el acta.
- Si la lista de razones está vacía, dilo honestamente ("no se identificaron ventajas particulares más allá del cumplimiento del área curricular") en vez de inventar contenido.

Devuelve únicamente el JSON solicitado por el esquema.`;

/** Arma el bloque de datos (alias, no PII) que se le da a la IA para redactar la justificación. */
export function buildAssignmentExplainPrompt(args: {
  teacherFirstName: string;
  courseName: string;
  grade: string;
  section: string;
  reasons: string[];
}): string {
  const reasonsBlock =
    args.reasons.length > 0 ? args.reasons.map((r) => `- ${r}`).join("\n") : "(sin razones adicionales registradas)";
  return `Docente propuesto: ${args.teacherFirstName}
Curso: ${args.courseName}
Sección: ${args.grade} "${args.section}"
Razones identificadas por el sistema:
${reasonsBlock}`;
}
