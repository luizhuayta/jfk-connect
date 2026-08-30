import { ATTENDANCE_DAY_LABEL, type AttendanceStatus } from "@/lib/attendance/labels";

export function weekdayCapitalized(date: Date): string {
  const label = date.toLocaleDateString("es-PE", { weekday: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function jornadaHeading({
  isClient,
  isSchoolDay,
  weekdayCap,
  loading,
  error,
  status,
}: {
  isClient: boolean;
  isSchoolDay: boolean;
  weekdayCap: string;
  loading?: boolean;
  error?: boolean;
  status: AttendanceStatus | null;
}): string {
  if (!isClient) return "Hoy";
  if (!isSchoolDay) return `Hoy, ${weekdayCap}: no hay clase`;
  if (loading || error) return `Hoy, ${weekdayCap}`;
  if (status) return `Hoy, ${weekdayCap}: ${ATTENDANCE_DAY_LABEL[status]}`;
  return `Hoy, ${weekdayCap}: el docente aún no registró la asistencia`;
}
