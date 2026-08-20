"use client";

export type ScopeOption = { value: string; label: string; group?: string };

/**
 * Selector genérico de "en qué me paro a calificar": un curso, o las
 * competencias transversales de una sección. Genérico a propósito — el
 * docente arma sus opciones desde `useTeacherCourses()` (solo sus cursos +
 * las secciones donde es tutor); el admin arma las suyas desde
 * `/api/admin/courses` (todos). Los values vienen codificados con
 * `lib/grades/scopeValue.ts::encodeScope`.
 */
export default function ScopeSelector({
  options,
  value,
  onChange,
  className = "",
}: {
  options: ScopeOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const grouped = new Map<string | undefined, ScopeOption[]>();
  for (const opt of options) {
    const list = grouped.get(opt.group) ?? [];
    list.push(opt);
    grouped.set(opt.group, list);
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium ${className}`}
    >
      {[...grouped.entries()].map(([group, opts]) =>
        group ? (
          <optgroup key={group} label={group}>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ) : (
          opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        ),
      )}
    </select>
  );
}
