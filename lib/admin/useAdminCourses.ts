"use client";

import { useMemo } from "react";
import type { ScopeOption } from "@/components/grades/ScopeSelector";
import { encodeScope } from "@/lib/grades/scopeValue";
import { useAdminResource } from "@/lib/admin/useAdminList";

type CourseOption = { id: string; subject: string; grade: string; section: string };
type SectionOption = { grade: string; section: string };

/** Cursos + secciones del admin para el selector de alcance de notas/importación. */
export function useAdminCourseScopes() {
  const { data, loading, error, reload } = useAdminResource(
    "/api/admin/courses",
    (d) => ({
      courses: (d.courses ?? []) as CourseOption[],
      sections: (d.sections ?? []) as SectionOption[],
    }),
  );

  const options: ScopeOption[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.courses.map((c) => ({
        value: encodeScope({ type: "course", courseId: c.id }),
        label: `${c.subject} · ${c.grade} "${c.section}"`,
      })),
      ...data.sections.map((s) => ({
        value: encodeScope({ type: "transversal", grade: s.grade, section: s.section }),
        label: `${s.grade} "${s.section}"`,
        group: "Competencias transversales",
      })),
    ];
  }, [data]);

  return { options, loading, error, reload };
}
