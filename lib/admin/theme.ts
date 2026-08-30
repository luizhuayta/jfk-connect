/**
 * Tokens y helpers visuales del panel de administración.
 * Espejo de lib/teacher/theme.ts: umbrales alineados con las pantallas
 * actuales del admin (promedio ≥14 verde, asistencia ≥90).
 */

export const ADMIN_GRADES = ["1ro", "2do", "3ro", "4to", "5to"] as const;
export type AdminGrade = (typeof ADMIN_GRADES)[number];

export const ADMIN_NAVY = "#1E2A5E";
export const ADMIN_GOLD = "#F4C15C";
export const ADMIN_INK = "#0F172A";

export function avgColor(avg: number | null): string {
  if (avg === null) return "text-gray-400";
  if (avg >= 14) return "text-emerald-600 font-bold";
  if (avg >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}

export function attendanceColor(pct: number | null): string {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 75) return "text-amber-600";
  return "text-red-500";
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const value = iso.includes("T") ? iso : `${iso}T12:00:00`;
  return new Date(value).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
