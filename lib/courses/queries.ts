/**
 * Consultas compartidas del motor de asignación — IJFK.
 *
 * `fetchCourseCandidates` es la única fuente de verdad de "quién puede
 * dictar este curso y con qué puntaje": la usan tanto
 * GET /api/admin/courses/assign/suggestions (sin IA) como
 * POST /api/admin/courses/assign/explain (con IA, pero re-derivando el
 * ranking en el servidor en vez de confiar en lo que mande el cliente —
 * un admin no puede manipular las `reasons`/`blockers` que ve la IA vía
 * devtools).
 */

import { query, queryOne } from "@/lib/db";
import { SCHOOL_YEAR } from "@/lib/school-year";
import { sectionShift } from "@/lib/section-shift";
import type { ScheduleSlotRef } from "@/lib/scheduleConflicts";
import {
  rankCandidatesForCourse,
  type CandidateTeacher,
  type CandidateCourse,
  type CandidateScore,
  type TeacherLoad,
} from "@/lib/courses/assignment";

interface CourseRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  area_id: number | null;
  hours_per_week: number;
}

interface TeacherRow {
  id: string;
  full_name: string;
  subject: string | null;
  area_id: number | null;
  shift_preference: string | null;
  is_active: boolean;
  role: string;
}

export interface CourseCandidatesResult {
  course: { id: string; name: string; grade: string; section: string };
  candidates: CandidateScore[];
}

export async function fetchCourseCandidates(courseId: string): Promise<CourseCandidatesResult | null> {
  const course = await queryOne<CourseRow>(
    "SELECT id, name, grade, section, area_id, hours_per_week FROM courses WHERE id = $1",
    [courseId],
  );
  if (!course) return null;

  const [teachersR, scheduleR, tutorR, gradesR] = await Promise.all([
    query<TeacherRow>(
      `SELECT id, full_name, subject, area_id, shift_preference, is_active, role
       FROM users WHERE role = 'docente' AND is_active ORDER BY full_name`,
    ),
    query<{ grade: string; section: string; day: string; period: number; subject: string; teacher_id: string | null }>(
      `SELECT grade, section, day, period, subject, teacher_id FROM schedule_entries`,
    ),
    query<{ teacher_id: string }>(
      `SELECT teacher_id FROM section_tutors WHERE grade = $1 AND section = $2 AND year = $3 AND teacher_id IS NOT NULL`,
      [course.grade, course.section, SCHOOL_YEAR],
    ),
    query<{ teacher_id: string; grade: string }>(
      `SELECT teacher_id, grade FROM courses WHERE teacher_id IS NOT NULL GROUP BY teacher_id, grade`,
    ),
  ]);

  const weeklyHoursByTeacher = new Map<string, number>();
  for (const e of scheduleR.rows) {
    if (!e.teacher_id) continue;
    weeklyHoursByTeacher.set(e.teacher_id, (weeklyHoursByTeacher.get(e.teacher_id) ?? 0) + 1);
  }
  const courseCountByTeacher = new Map<string, number>();
  const gradesByTeacher = new Map<string, Set<string>>();
  for (const row of gradesR.rows) {
    courseCountByTeacher.set(row.teacher_id, (courseCountByTeacher.get(row.teacher_id) ?? 0) + 1);
    if (!gradesByTeacher.has(row.teacher_id)) gradesByTeacher.set(row.teacher_id, new Set());
    gradesByTeacher.get(row.teacher_id)!.add(row.grade);
  }
  const tutorSet = new Set(tutorR.rows.map((r) => r.teacher_id));

  const loadByTeacher = new Map<string, TeacherLoad>();
  for (const t of teachersR.rows) {
    loadByTeacher.set(t.id, {
      courseCount: courseCountByTeacher.get(t.id) ?? 0,
      weeklyHours: weeklyHoursByTeacher.get(t.id) ?? 0,
      gradesTaught: gradesByTeacher.get(t.id) ?? new Set(),
      isTutorOfSection: tutorSet.has(t.id),
    });
  }

  const teachersInArea = teachersR.rows.filter((t) => t.area_id === course.area_id);
  const avgWeeklyHoursInArea =
    teachersInArea.length > 0
      ? teachersInArea.reduce((sum, t) => sum + (weeklyHoursByTeacher.get(t.id) ?? 0), 0) / teachersInArea.length
      : 0;

  const courseCandidate: CandidateCourse = {
    id: course.id,
    name: course.name,
    grade: course.grade,
    section: course.section,
    areaId: course.area_id,
    hoursPerWeek: course.hours_per_week,
  };
  const teacherCandidates: CandidateTeacher[] = teachersR.rows.map((t) => ({
    id: t.id,
    fullName: t.full_name,
    areaId: t.area_id,
    subject: t.subject,
    shiftPreference: t.shift_preference,
    isActive: t.is_active,
    role: t.role,
  }));
  const scheduleSlots: (ScheduleSlotRef & { teacherId: string | null })[] = scheduleR.rows.map((e) => ({
    grade: e.grade,
    section: e.section,
    day: e.day,
    period: e.period,
    subject: e.subject,
    shift: sectionShift(e.section),
    teacherId: e.teacher_id,
  }));

  const candidates = rankCandidatesForCourse({
    course: courseCandidate,
    teachers: teacherCandidates,
    loadByTeacher,
    avgWeeklyHoursInArea,
    scheduleEntries: scheduleSlots,
  });

  return {
    course: { id: course.id, name: course.name, grade: course.grade, section: course.section },
    candidates,
  };
}
