import { ATTENDANCE_DAY_LABEL, type AttendanceStatus } from "@/lib/attendance/labels";
import { toLocalISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import AttendanceMark from "@/components/father/AttendanceMark";

type DayRecord = { date: string; status: AttendanceStatus };

const DAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toneFor(status: AttendanceStatus | null) {
  if (status === "A" || status === "J") return "bg-success-container text-on-success-container";
  if (status === "T") return "bg-warning-container text-on-warning-container";
  if (status === "F") return "bg-error-container text-on-error-container";
  return "bg-slate-100 text-slate-600";
}

function buildWeek(records: DayRecord[]) {
  const today = new Date();
  const diffToMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);

  const byDate = new Map<string, DayRecord>();
  for (const r of records) byDate.set(r.date, r);

  const days: { label: string; isoDate: string; status: AttendanceStatus | null }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toLocalISODate(d);
    days.push({
      label: DAY_LABEL[d.getDay()],
      isoDate: iso,
      status: byDate.get(iso)?.status ?? null,
    });
  }
  return days;
}

export default function WeekStrip({
  records,
  loading = false,
  todayISO,
}: {
  records: DayRecord[];
  loading?: boolean;
  todayISO: string;
}) {
  const weekDays = buildWeek(records);

  return (
    <div className="grid grid-cols-5 gap-2">
      {loading ? (
        <p className="col-span-5 py-6 text-center text-sm text-on-surface-variant">
          Cargando asistencia…
        </p>
      ) : (
        weekDays.map((d) => {
          const isToday = d.isoDate === todayISO;
          const honorToday = isToday && (d.status === "A" || d.status === "J");
          const label = d.status ? ATTENDANCE_DAY_LABEL[d.status] : "Sin registro";
          return (
            <div
              key={d.isoDate}
              aria-label={`${d.label}: ${label}`}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center",
                toneFor(d.status),
                honorToday && "ring-2 ring-accent ring-offset-2 ring-offset-surface-container-lowest",
                isToday && d.status === "F" && "ring-2 ring-error ring-offset-2 ring-offset-surface-container-lowest",
                isToday && !d.status && "ring-2 ring-outline-variant ring-offset-2 ring-offset-surface-container-lowest",
              )}
            >
              <span className="text-xs font-semibold text-on-surface-variant">{d.label}</span>
              <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
                <AttendanceMark status={d.status} />
              </span>
              <span className="text-xs font-semibold leading-tight">
                {d.status === "J" ? "Just." : label}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
