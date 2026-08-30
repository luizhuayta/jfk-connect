/**
 * Lecturas canónicas del Panel de Padres — IJFK.
 *
 * Las route handlers de `app/api/father/**` y las herramientas del asistente
 * (`lib/ai/tools/padre.ts`) consumen estas funciones. Autorización (quién
 * puede pedir qué alumno) queda FUERA: el llamador ya resolvió el
 * `studentId` / `parentId` con guards o con `allowedStudentIds`.
 */

import { query, queryOne } from "@/lib/db";
import { SCHOOL_YEAR, calendarYearRange } from "@/lib/school-year";
import { SCHEDULE_DAYS, PERIODS } from "@/lib/schedule/periods";
import type { AttendanceStatus } from "@/lib/attendance/labels";
import type {
  AttendanceCounts,
  AttendanceRecord,
  AttendanceResult,
  CourseMaterials,
  DateRange,
  Enrollment,
  FatherStudent,
  ScheduleData,
  ScheduleSlot,
} from "@/lib/father/types";

const EMPTY_COUNTS: AttendanceCounts = { A: 0, F: 0, T: 0, J: 0 };

export function emptyAttendanceCounts(): AttendanceCounts {
  return { ...EMPTY_COUNTS };
}

export function resolveAttendanceRange(opts: {
  year?: number;
  from?: string;
  to?: string;
}): DateRange {
  if (opts.from && opts.to) return { from: opts.from, to: opts.to };
  return calendarYearRange(opts.year ?? SCHOOL_YEAR);
}

interface AttendanceRow {
  id: string;
  date: string;
  status: AttendanceStatus;
  j_status: "pendiente" | "aprobada" | "rechazada" | null;
  j_reason: string | null;
  j_response: string | null;
}

export async function getAttendance(
  studentId: string,
  range: DateRange,
): Promise<AttendanceResult> {
  const r = await query<AttendanceRow>(
    `SELECT a.id,
            to_char(a.date, 'YYYY-MM-DD') AS date,
            a.status::text AS status,
            aj.status::text AS j_status,
            aj.reason AS j_reason,
            aj.admin_response AS j_response
     FROM attendance a
     LEFT JOIN attendance_justifications aj ON aj.attendance_id = a.id
     WHERE a.student_id = $1
       AND a.date BETWEEN $2 AND $3
     ORDER BY a.date`,
    [studentId, range.from, range.to],
  );

  const counts = emptyAttendanceCounts();
  const records: AttendanceRecord[] = r.rows.map((row) => {
    counts[row.status]++;
    return {
      id: row.id,
      date: row.date,
      status: row.status,
      justification: row.j_status
        ? {
            status: row.j_status,
            reason: row.j_reason ?? "",
            adminResponse: row.j_response,
          }
        : null,
    };
  });

  return { records, counts };
}

export async function listChildren(parentId: string, year: number = SCHOOL_YEAR): Promise<FatherStudent[]> {
  const r = await query<FatherStudent>(
    `SELECT
       s.id,
       s.full_name AS name,
       s.grade,
       s.section,
       s.shift::text AS shift,
       s.status,
       COALESCE((
         SELECT COUNT(*) FROM courses c
         WHERE c.grade = s.grade AND c.section = s.section
           AND c.year = $2
       ), 0)::int AS courses_count
     FROM students s
     WHERE s.parent_id = $1
     ORDER BY s.full_name`,
    [parentId, year],
  );
  return r.rows;
}

interface SlotRow {
  day: string;
  period: number;
  time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
}

export async function getSchedule(studentId: string): Promise<ScheduleData | null> {
  const student = await queryOne<{ grade: string; section: string }>(
    "SELECT grade, section FROM students WHERE id = $1",
    [studentId],
  );
  if (!student) return null;

  const r = await query<SlotRow>(
    `SELECT day, period, time, subject, teacher, room
     FROM schedule_entries
     WHERE grade = $1 AND section = $2
     ORDER BY day, period`,
    [student.grade, student.section],
  );

  const schedule: Record<string, (ScheduleSlot | null)[]> = {};
  for (const day of SCHEDULE_DAYS) schedule[day] = Array(7).fill(null);
  for (const row of r.rows) {
    schedule[row.day][row.period - 1] = {
      time: row.time,
      subject: row.subject,
      teacher: row.teacher ?? "",
      room: row.room ?? "",
    };
  }

  return { days: [...SCHEDULE_DAYS], periods: [...PERIODS], schedule };
}

interface CourseRow {
  id: string;
  subject: string;
}

interface MaterialRow {
  id: string;
  course_id: string;
  title: string;
  type: string;
  size: string | null;
  topic: string | null;
  uploaded_at: string;
}

export async function getMaterials(
  studentId: string,
  year: number = SCHOOL_YEAR,
): Promise<CourseMaterials[]> {
  const courseRes = await query<CourseRow>(
    `SELECT c.id, c.name AS subject
     FROM courses c
     JOIN students s ON c.grade = s.grade
       AND c.section = s.section
       AND c.shift = s.shift
     WHERE s.id = $1
       AND c.year = $2
     ORDER BY c.name`,
    [studentId, year],
  );
  const courses = courseRes.rows;
  const courseIds = courses.map((c) => c.id);

  const materials: MaterialRow[] = [];
  if (courseIds.length > 0) {
    const matRes = await query<MaterialRow>(
      `SELECT id, course_id, title, type::text AS type, size, topic,
              to_char(uploaded_at, 'YYYY-MM-DD') AS uploaded_at
       FROM materials
       WHERE course_id = ANY($1)
       ORDER BY uploaded_at DESC, title`,
      [courseIds],
    );
    materials.push(...matRes.rows);
  }

  return courses.map((c) => ({
    id: c.id,
    subject: c.subject,
    materials: materials
      .filter((m) => m.course_id === c.id)
      .map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        size: m.size ?? "",
        topic: m.topic ?? "",
        uploadedAt: m.uploaded_at,
      })),
  }));
}

interface EnrollmentRow {
  student_id: string;
  code: string;
  year: number;
  status: Enrollment["status"];
  docs: Enrollment["docs"];
  docs_total: number;
  docs_submitted: number;
  tutor: string | null;
  classroom: string | null;
  enrolled_at: string;
  grade: string;
  section: string;
  shift: string;
}

export async function getEnrollment(studentId: string): Promise<Enrollment | null> {
  const row = await queryOne<EnrollmentRow>(
    `SELECT e.student_id,
            e.code,
            e.year,
            e.status::text AS status,
            e.docs,
            e.docs_total,
            e.docs_submitted,
            e.tutor,
            e.classroom,
            to_char(e.created_at, 'YYYY-MM-DD') AS enrolled_at,
            s.grade,
            s.section,
            s.shift::text AS shift
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     WHERE e.student_id = $1
     ORDER BY e.year DESC
     LIMIT 1`,
    [studentId],
  );

  if (!row) return null;

  return {
    studentId: row.student_id,
    code: row.code,
    year: row.year,
    grade: row.grade,
    section: row.section,
    shift:
      row.shift === "Mañana"
        ? "Mañana (7:45 – 13:20)"
        : row.shift === "Tarde"
          ? "Tarde (13:45 – 18:20)"
          : row.shift,
    classroom: row.classroom ? `Aula ${row.classroom.replace(/^Aula\s+/i, "")}` : "—",
    enrolledAt: row.enrolled_at,
    status: row.status,
    docs: row.docs ?? [],
    docsTotal: row.docs_total,
    docsSubmitted: row.docs_submitted,
    tutor: row.tutor ?? "Por asignar",
  };
}
