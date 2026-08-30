import { query, queryOne } from "@/lib/db";
import { fetchCatalog } from "@/lib/curriculum/server";
import { SCHOOL_YEAR, bimesterRangesForYear } from "@/lib/school-year";
import { LEVELS, LEVEL_RANGE, LEVEL_LABEL, type Level } from "@/lib/grades/scale";

export type BimesterKey = 1 | 2 | 3 | 4;

export interface LibretaCompetency {
  id: number;
  code: string;
  name: string;
  bimesters: Record<BimesterKey, { level: Level | null; conclusion: string | null }>;
}

export interface LibretaArea {
  id: number;
  code: string;
  name: string;
  isTransversal: boolean;
  competencies: LibretaCompetency[];
}

export interface LibretaData {
  student: {
    id: string;
    name: string;
    dni: string;
    grade: string;
    section: string;
    shift: string;
    code: string | null;
    tutor: string | null;
  };
  year: number;
  areas: LibretaArea[];
  attendance: Record<BimesterKey, { inasistencias: number; tardanzas: number }>;
  legend: { level: Level; range: string; label: string }[];
}

interface StudentRow {
  id: string;
  name: string;
  dni: string;
  grade: string;
  section: string;
  shift: string;
  code: string | null;
}

interface GradeRow {
  competency_id: number;
  bimester: number;
  level: Level | null;
  conclusion: string | null;
}

interface AttendanceRow {
  status: string;
  date: string;
}

interface BimesterAttendanceRow {
  bimester: number;
  inasistencias: number;
  tardanzas: number;
}

export function emptyAttendanceByBimester(): LibretaData["attendance"] {
  return {
    1: { inasistencias: 0, tardanzas: 0 },
    2: { inasistencias: 0, tardanzas: 0 },
    3: { inasistencias: 0, tardanzas: 0 },
    4: { inasistencias: 0, tardanzas: 0 },
  };
}

/** Mapea filas agregadas por bimestre al payload de la libreta. */
export function attendanceFromBimesterRows(
  rows: BimesterAttendanceRow[],
): LibretaData["attendance"] {
  const attendance = emptyAttendanceByBimester();
  for (const row of rows) {
    if (row.bimester === 1 || row.bimester === 2 || row.bimester === 3 || row.bimester === 4) {
      attendance[row.bimester] = {
        inasistencias: row.inasistencias,
        tardanzas: row.tardanzas,
      };
    }
  }
  return attendance;
}

/**
 * Payload único de la libreta: lo consumen tanto la pantalla del padre
 * (app/father/grades/page.tsx) como el generador de PDF (lib/report/) —
 * ninguno de los dos vuelve a tocar la BD por su cuenta, así que padre,
 * tutor y admin ven siempre exactamente los mismos datos.
 */
export async function buildLibreta(studentId: string, year: number = SCHOOL_YEAR): Promise<LibretaData | null> {
  const student = await queryOne<StudentRow>(
    `SELECT id, full_name AS name, dni, grade, section, shift::text AS shift, enrollment_code AS code
     FROM students WHERE id = $1`,
    [studentId],
  );
  if (!student) return null;

  const ranges = bimesterRangesForYear(year);
  const [tutorRow, { areas, competencies }, gradesR, attR] = await Promise.all([
    queryOne<{ full_name: string }>(
      `SELECT u.full_name FROM section_tutors t
       JOIN users u ON u.id = t.teacher_id
       WHERE t.grade = $1 AND t.section = $2 AND t.year = $3`,
      [student.grade, student.section, year],
    ),
    fetchCatalog(),
    query<GradeRow>(
      `SELECT competency_id, bimester, level::text AS level, conclusion
       FROM competency_grades WHERE student_id = $1 AND year = $2`,
      [studentId, year],
    ),
    query<BimesterAttendanceRow>(
      `SELECT
         CASE
           WHEN date BETWEEN $2 AND $3 THEN 1
           WHEN date BETWEEN $4 AND $5 THEN 2
           WHEN date BETWEEN $6 AND $7 THEN 3
           WHEN date BETWEEN $8 AND $9 THEN 4
         END AS bimester,
         COUNT(*) FILTER (WHERE status = 'F')::int AS inasistencias,
         COUNT(*) FILTER (WHERE status = 'T')::int AS tardanzas
       FROM attendance
       WHERE student_id = $1
         AND date BETWEEN $2 AND $9
       GROUP BY 1`,
      [
        studentId,
        ranges[1].start,
        ranges[1].end,
        ranges[2].start,
        ranges[2].end,
        ranges[3].start,
        ranges[3].end,
        ranges[4].start,
        ranges[4].end,
      ],
    ),
  ]);

  const gradeByKey = new Map<string, { level: Level | null; conclusion: string | null }>();
  for (const g of gradesR.rows) {
    gradeByKey.set(`${g.competency_id}:${g.bimester}`, { level: g.level, conclusion: g.conclusion });
  }

  const bimesterKeys: BimesterKey[] = [1, 2, 3, 4];
  const libretaAreas: LibretaArea[] = areas.map((area) => ({
    id: area.id,
    code: area.code,
    name: area.name,
    isTransversal: area.isTransversal,
    competencies: competencies
      .filter((c) => c.areaId === area.id)
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const bimesters = {} as LibretaCompetency["bimesters"];
        for (const b of bimesterKeys) {
          const g = gradeByKey.get(`${c.id}:${b}`);
          bimesters[b] = { level: g?.level ?? null, conclusion: g?.conclusion ?? null };
        }
        return { id: c.id, code: c.code, name: c.name, bimesters };
      }),
  }));

  const attendance = attendanceFromBimesterRows(attR.rows);
  const legend = LEVELS.map((level) => ({ level, range: LEVEL_RANGE[level], label: LEVEL_LABEL[level] }));

  return {
    student: {
      id: student.id,
      name: student.name,
      dni: student.dni,
      grade: student.grade,
      section: student.section,
      shift: student.shift,
      code: student.code,
      tutor: tutorRow?.full_name ?? null,
    },
    year,
    areas: libretaAreas,
    attendance,
    legend,
  };
}
