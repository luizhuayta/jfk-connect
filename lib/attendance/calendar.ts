/** Abreviaturas de día empezando en domingo (calendario mensual). */
export const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

/** Semanas de un mes (celdas null = huecos del mes anterior/siguiente). */
export function calendarWeeks(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  return weeks;
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const wd = new Date(year, month - 1, day).getDay();
  return wd === 0 || wd === 6;
}

export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
