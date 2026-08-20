export interface GridStats {
  registered: number;
  total: number;
  approved: number;
  failed: number;
  classAvg: number | null;
}

/**
 * Resumen de la grilla (tarjetas "Con notas / Aprobados / Desaprobados /
 * Promedio aula"): un alumno cuenta como "registrado" cuando tiene TODAS
 * las competencias del scope calificadas (no una nota parcial).
 */
export function computeGridStats(
  studentIds: string[],
  competencyIds: number[],
  getScore: (studentId: string, competencyId: number) => number | null,
): GridStats {
  let registered = 0;
  let approved = 0;
  let failed = 0;
  const avgs: number[] = [];

  for (const studentId of studentIds) {
    const scores = competencyIds
      .map((cid) => getScore(studentId, cid))
      .filter((v): v is number => v !== null);
    if (scores.length === 0 || scores.length < competencyIds.length) continue;

    registered++;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    avgs.push(avg);
    if (avg >= 11) approved++;
    else failed++;
  }

  return {
    registered,
    total: studentIds.length,
    approved,
    failed,
    classAvg: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
  };
}
