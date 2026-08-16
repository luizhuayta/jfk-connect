/**
 * Helpers de formato compartidos por los 3 paneles (admin, teacher, father).
 * Antes estaban duplicados en FatherSidebar/TeacherSidebar/Navbar y en varias
 * páginas; aquí es la única fuente.
 */

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function getRoleLabel(role: string): string {
  if (role === "docente") return "Docente";
  if (role === "admin") return "Administrador";
  if (role === "padre") return "Padre/Apoderado";
  return role;
}

/**
 * El API devuelve fechas como "YYYY-MM-DDT12:00:00" (mediodía local) para
 * evitar desfases de zona horaria. Si llega una fecha pelada, se normaliza a
 * mediodía local para que `toLocaleDateString` no la muestre el día anterior.
 */
function parseSafe(iso: string): Date {
  return new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseSafe(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseSafe(iso).toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Fecha en formato "YYYY-MM-DD" según la zona horaria **local**.
 * `toISOString()` convierte a UTC: en Perú (UTC-5) después de las 19:00 devuelve
 * el día siguiente, así que el calendario marcaba "hoy" en el día equivocado.
 */
export function toLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Últimos `count` días hábiles (lun-vie) hasta `from`, más recientes primero.
 * Usado por los selectores de "sesiones recientes" de asistencia (admin y docente).
 */
export function recentWeekdays(count: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (dates.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) dates.push(toLocalISODate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

export function daysSince(iso: string): string {
  const diff = Math.max(
    0,
    Math.floor((Date.now() - parseSafe(iso).getTime()) / 86400000),
  );
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return `Hace ${diff} días`;
}
