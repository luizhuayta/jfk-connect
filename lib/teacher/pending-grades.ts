import type { TeacherCourse } from "@/components/teacher/useTeacherCourses";

/** Cursos del bimestre en curso que todavía no tienen notas cerradas. */
export function isPendingGrades(course: TeacherCourse): boolean {
  const b = course.bimesters?.[String(course.currentBimester)];
  return Boolean(b?.inProgress && !b?.hasData);
}

export function pendingGradesCount(courses: TeacherCourse[]): number {
  return courses.filter(isPendingGrades).length;
}

export function coursesWithPendingGrades(courses: TeacherCourse[]): TeacherCourse[] {
  return courses.filter(isPendingGrades);
}
