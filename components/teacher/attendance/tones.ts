import { CheckCircle2, XCircle, Clock, FileQuestion } from "lucide-react";

export type AttendanceStatus = "A" | "F" | "T" | "J";

export type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number;
};

export type SessionSummary = {
  date: string;
  a: number;
  f: number;
  t: number;
  j: number;
  total: number;
};

export type JustificationItem = {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  date: string;
  reason: string;
  status: "pendiente" | "aprobada" | "rechazada";
  adminResponse: string | null;
};

export const STATUS = {
  A: {
    label: "Presente",
    short: "A",
    btn: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    text: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    rowBg: "bg-emerald-50/30",
    rowBorder: "border-l-emerald-400",
    icon: CheckCircle2,
  },
  F: {
    label: "Falta",
    short: "F",
    btn: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    text: "text-red-600",
    bg: "bg-red-50 border-red-200",
    rowBg: "bg-red-50/40",
    rowBorder: "border-l-red-500",
    icon: XCircle,
  },
  T: {
    label: "Tardanza",
    short: "T",
    btn: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    text: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    rowBg: "bg-amber-50/40",
    rowBorder: "border-l-amber-500",
    icon: Clock,
  },
  J: {
    label: "Justificada",
    short: "J",
    btn: "bg-blue-500 text-white hover:bg-blue-600 shadow-sm",
    text: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    rowBg: "bg-blue-50/40",
    rowBorder: "border-l-blue-400",
    icon: FileQuestion,
  },
} as const;

export function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtDateLong(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
