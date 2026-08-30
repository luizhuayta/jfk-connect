/** Paleta de íconos del panel docente (dashboard y cursos). */
export const ICON_COLORS = {
  academic: { bg: "bg-[#1E2A5E]/10", text: "text-[#1E2A5E]" },
  people: { bg: "bg-purple-50", text: "text-purple-600" },
  progress: { bg: "bg-emerald-50", text: "text-emerald-600" },
  gold: { bg: "bg-amber-50", text: "text-amber-600" },
  info: { bg: "bg-blue-50", text: "text-blue-600" },
} as const;

export function rateBorderColor(rate: number | null): string {
  if (rate === null) return "border-l-gray-300";
  if (rate >= 90) return "border-l-emerald-500";
  if (rate >= 75) return "border-l-amber-500";
  return "border-l-red-500";
}

export function gradeBorderColor(grade: number | null): string {
  if (grade === null) return "border-l-gray-300";
  if (grade >= 15) return "border-l-emerald-500";
  if (grade >= 11) return "border-l-amber-500";
  return "border-l-red-500";
}

export function avgColor(avg: number | null): string {
  if (avg === null) return "text-gray-400";
  if (avg >= 15) return "text-emerald-600";
  if (avg >= 11) return "text-amber-600";
  return "text-red-500";
}

export function rateColor(rate: number | null): string {
  if (rate === null) return "text-gray-400";
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 75) return "text-amber-600";
  return "text-red-500";
}

/** Promedio de valores no nulos; null si ninguno tiene dato. */
export function avgOf(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n !== null);
  return vals.length ? vals.reduce((s, n) => s + n, 0) / vals.length : null;
}
