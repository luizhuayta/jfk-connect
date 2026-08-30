"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import ImportWizard from "@/components/imports/ImportWizard";
import { type ScopeOption } from "@/components/grades/ScopeSelector";
import { encodeScope } from "@/lib/grades/scopeValue";

type AdminCourseOption = { id: string; subject: string; grade: string; section: string };
type SectionOption = { grade: string; section: string };

/**
 * Importar notas — vista del admin. Mismo componente que /teacher/imports
 * (ImportWizard); a diferencia del docente, el admin puede elegir
 * cualquier curso/sección (mismo criterio que /admin/grades).
 */
export default function AdminImportsPage() {
  const [courses, setCourses] = useState<AdminCourseOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/courses");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCourses(data.courses);
        setSections(data.sections ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando cursos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options: ScopeOption[] = useMemo(
    () => [
      ...courses.map((c) => ({
        value: encodeScope({ type: "course", courseId: c.id }),
        label: `${c.subject} · ${c.grade} "${c.section}"`,
      })),
      ...sections.map((s) => ({
        value: encodeScope({ type: "transversal", grade: s.grade, section: s.section }),
        label: `${s.grade} "${s.section}"`,
        group: "Competencias transversales",
      })),
    ],
    [courses, sections],
  );

  if (loading) return <LoadingState label="Cargando cursos..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Importar notas</h1>
        <p className="text-muted-foreground mt-1">
          Sube un Excel, CSV, o una foto de un acta de notas — revisa las coincidencias antes de aplicarlas.
        </p>
      </div>

      <ImportWizard scopeOptions={options} />
    </div>
  );
}
