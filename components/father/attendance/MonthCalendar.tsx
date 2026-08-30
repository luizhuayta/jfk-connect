import AttendanceMark from "@/components/father/AttendanceMark";
import {
  ATTENDANCE_DAY_LABEL,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/attendance/labels";
import { calendarWeeks, isWeekend, longDate, DAY_NAMES } from "@/lib/attendance/calendar";
import type { AttendanceRecord } from "@/lib/father/types";
import { JUST_STATUS, STATUS_TONE } from "@/components/father/attendance/tones";
import { cn } from "@/lib/utils";

export default function MonthCalendar({
  year,
  month,
  recordByDate,
  todayISO,
  onJustify,
}: {
  year: number;
  month: number;
  recordByDate: Map<string, AttendanceRecord>;
  todayISO: string;
  onJustify: (rec: AttendanceRecord) => void;
}) {
  const weeks = calendarWeeks(year, month);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[364px] space-y-0.5">
        <div className="mb-0.5 grid grid-cols-7">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            >
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={`${year}-${month}-w${wi}`} className="grid grid-cols-7 gap-0.5">
            {week.map((day, di) => {
              if (!day) return <div key={`empty-${wi}-${di}`} />;
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const rec = recordByDate.get(dateStr);
              const status = rec?.status;
              const weekend = isWeekend(year, month, day) && !status;
              const isToday = dateStr === todayISO;
              const canJustify = status === "F" && !rec?.justification;
              const jDot = rec?.justification ? JUST_STATUS[rec.justification.status].dot : "";
              const honorCell = isToday && (status === "A" || status === "J");
              const faltaToday = isToday && status === "F";

              const cell = (
                <>
                  <span className={isToday ? "underline decoration-2" : undefined}>{day}</span>
                  {status && (
                    <span className="mt-0.5" aria-hidden>
                      <AttendanceMark status={status} className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {rec?.justification && (
                    <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", jDot)} aria-hidden />
                  )}
                </>
              );

              const label = status
                ? `${longDate(dateStr)}: ${ATTENDANCE_DAY_LABEL[status]}${
                    rec?.justification ? ` · ${JUST_STATUS[rec.justification.status].label}` : ""
                  }`
                : longDate(dateStr);

              const ring = honorCell
                ? "ring-2 ring-accent"
                : faltaToday
                  ? "ring-2 ring-red-400"
                  : isToday
                    ? "ring-2 ring-outline-variant"
                    : "";

              if (canJustify && rec) {
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => onJustify(rec)}
                    title={`${label} — toque para justificar`}
                    aria-label={`${label}. Justificar esta falta`}
                    className={cn(
                      "relative flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center rounded-md border text-xs font-bold transition-colors hover:ring-2 hover:ring-red-300 focus-visible:ring-2 focus-visible:ring-red-400",
                      STATUS_TONE.F.bg,
                      STATUS_TONE.F.text,
                      ring,
                    )}
                  >
                    {cell}
                  </button>
                );
              }

              return (
                <div
                  key={dateStr}
                  title={label}
                  className={cn(
                    "relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-md text-xs font-medium",
                    weekend
                      ? "bg-gray-50/50 text-gray-500"
                      : status
                        ? cn("border font-bold", STATUS_TONE[status as AttendanceStatus].bg, STATUS_TONE[status].text)
                        : "border border-dashed border-gray-200 text-gray-400",
                    ring,
                  )}
                >
                  {cell}
                  <span className="sr-only">{label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
