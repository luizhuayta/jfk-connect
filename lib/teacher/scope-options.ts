import type { TeacherCourse, TutoredSection } from "@/components/teacher/useTeacherCourses";
import type { ScopeOption } from "@/components/grades/ScopeSelector";
import { encodeScope } from "@/lib/grades/scopeValue";

/** Opciones del selector de notas/importación: cursos propios + transversales de tutor. */
export function buildTeacherScopeOptions(
  courses: TeacherCourse[],
  tutoredSections: TutoredSection[],
): ScopeOption[] {
  return [
    ...courses.map((c) => ({
      value: encodeScope({ type: "course", courseId: c.id }),
      label: `${c.subject} · ${c.grade} "${c.section}"`,
    })),
    ...tutoredSections.map((t) => ({
      value: encodeScope({ type: "transversal", grade: t.grade, section: t.section }),
      label: `${t.grade} "${t.section}"`,
      group: "Competencias transversales",
    })),
  ];
}
