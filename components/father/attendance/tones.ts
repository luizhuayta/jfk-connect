import type { AttendanceStatus } from "@/lib/attendance/labels";
import type { AttendanceJustification } from "@/lib/father/types";

export const STATUS_TONE: Record<AttendanceStatus, { text: string; bg: string }> = {
  A: { text: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" },
  F: { text: "text-red-800", bg: "bg-red-50 border-red-200" },
  T: { text: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
  J: { text: "text-blue-800", bg: "bg-blue-50 border-blue-200" },
};

export const JUST_STATUS: Record<
  AttendanceJustification["status"],
  { label: string; chip: string; dot: string }
> = {
  pendiente: { label: "En revisión", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  aprobada: { label: "Justificado", chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  rechazada: { label: "Rechazado", chip: "bg-red-100 text-red-800", dot: "bg-red-500" },
};
