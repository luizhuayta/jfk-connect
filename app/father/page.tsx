"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Plus,
  AlertTriangle,
  Info,
  Megaphone,
  Bell,
  ChevronRight,
} from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { levelFromScore, levelBadgeClass, LEVEL_LABEL, dominantLevel } from "@/lib/grades/scale";
import LevelBadge from "@/components/grades/LevelBadge";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import {
  useAnnouncements,
  type AnnouncementCategory,
} from "@/components/father/AnnouncementsProvider";
import { useSessionUser } from "@/lib/useSessionUser";
import { cn } from "@/lib/utils";
import { getInitials, toLocalISODate } from "@/lib/format";
import { useIsClient } from "@/lib/useIsClient";
import { BIMESTERS } from "@/lib/grades/bimesters";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";

/* ─── Tipos ──────────────────────────────────────────────────────── */
type AttendanceRecord = {
  id: string;
  date: string;
  status: "A" | "F" | "T" | "J";
};

/** Máximo de hijos que un padre puede vincular (límite del claim). */
const MAX_CHILDREN = 5;

const DAY_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const cardShadow =
  "shadow-[0_1px_2px_rgba(17,28,44,0.04),0_8px_24px_-16px_rgba(17,28,44,0.12)]";

const CATEGORY_ICON: Record<AnnouncementCategory, React.ElementType> = {
  urgente: AlertTriangle,
  importante: Bell,
  general: Megaphone,
  informativo: Info,
};

const CATEGORY_TINT: Record<
  AnnouncementCategory,
  { bg: string; text: string; ring: string }
> = {
  urgente:     { bg: "bg-red-100",   text: "text-red-700",    ring: "ring-red-200" },
  importante:  { bg: "bg-amber-100", text: "text-amber-700",  ring: "ring-amber-200" },
  general:     { bg: "bg-blue-100",  text: "text-blue-700",   ring: "ring-blue-200" },
  informativo: { bg: "bg-slate-100", text: "text-slate-600",  ring: "ring-slate-200" },
};

const STATUS_LABEL: Record<AttendanceRecord["status"], string> = {
  A: "Asistió",
  F: "Falta",
  T: "Tardanza",
  J: "Justificado",
};

/**
 * Calcula los 5 días laborables de la semana actual (Lun–Vie) y devuelve la
 * información de asistencia en un mapa fecha→registro. Usa fechas **locales**:
 * con `toISOString()` (UTC) el "hoy" se desplazaba un día en Perú por la noche.
 */
function buildWeekAttendance(records: AttendanceRecord[]) {
  const today = new Date();
  const day = today.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const diffToMonday = (day + 6) % 7; // días a restar para llegar al lunes
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);

  const byDate = new Map<string, AttendanceRecord>();
  for (const r of records) byDate.set(r.date, r);

  const days: { label: string; isoDate: string; record: AttendanceRecord | null }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toLocalISODate(d);
    days.push({
      label: DAY_LABEL[d.getDay()],
      isoDate: iso,
      record: byDate.get(iso) ?? null,
    });
  }
  return days;
}

export default function FatherDashboard() {
  const { user } = useSessionUser();
  const {
    students,
    loading,
    error: studentsError,
    reload,
    activeStudentId,
    activeStudent: selectedStudent,
    selectStudent,
  } = useFatherStudents();
  const { announcements, requestOpen } = useAnnouncements();

  const [dataError, setDataError] = useState<string | null>(null);
  const [activeBimester, setActiveBimester] = useState("1");
  const [libretaCache, setLibretaCache] = useState<Record<string, LibretaData>>({});
  const loadedIds = useRef(new Set<string>());
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [dismissedClaim, setDismissedClaim] = useState(false);

  /* Asistencia semanal del hijo activo. */
  const [weeklyAttendance, setWeeklyAttendance] = useState<AttendanceRecord[]>([]);
  const loadedAttendanceFor = useRef<string | null>(null);

  const loadGrades = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/libreta?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setLibretaCache((prev) => ({ ...prev, [studentId]: data.libreta as LibretaData }));
      setDataError(null);
    } catch {
      setDataError("No pudimos cargar las notas. Intenta de nuevo.");
    }
  }, []);

  const loadAttendance = useCallback(async (studentId: string) => {
    try {
      const r = await fetch(`/api/father/attendance?studentId=${studentId}`);
      const data = await r.json();
      if (data.ok && Array.isArray(data.records)) {
        setWeeklyAttendance(data.records as AttendanceRecord[]);
      }
    } catch {
      /* sin toast: la falla de la consulta no debe romper el panel */
    }
  }, []);

  useEffect(() => {
    if (activeStudentId && !loadedIds.current.has(activeStudentId)) {
      loadedIds.current.add(activeStudentId);
      loadGrades(activeStudentId);
    }
  }, [activeStudentId, loadGrades]);

  /* Cargar asistencia semanal solo del hijo activo (para no duplicar
     fetches cuando cambia la selección del usuario). */
  useEffect(() => {
    if (activeStudentId && loadedAttendanceFor.current !== activeStudentId) {
      loadedAttendanceFor.current = activeStudentId;
      loadAttendance(activeStudentId);
    }
  }, [activeStudentId, loadAttendance]);

  /* La fecha solo se pinta tras hidratar para que el HTML del servidor y el del
     cliente coincidan (antes se tapaba con `suppressHydrationWarning`). */
  const isClient = useIsClient();
  const todayFormatted = isClient
    ? (() => {
        const label = new Date().toLocaleDateString("es-PE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return label.charAt(0).toUpperCase() + label.slice(1);
      })()
    : "";

  const handleRetry = () => {
    setDataError(null);
    loadedIds.current.clear();
    if (studentsError) {
      reload();
    } else if (activeStudentId) {
      loadedIds.current.add(activeStudentId);
      loadGrades(activeStudentId);
    }
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    setDismissedClaim(true);
  };

  const canAddMore = students.length < MAX_CHILDREN;
  const claimModalOpen = showClaimModal || (!dismissedClaim && students.length === 0);
  const error = dataError ?? studentsError;

  // Competencias calificadas del bimestre activo, aplanadas de todas las
  // áreas — el padre nunca ve la nota 0-20 aquí, solo el nivel (igual que en
  // la libreta oficial, lib/grades/libreta.ts).
  const activeLibreta = activeStudentId ? libretaCache[activeStudentId] : null;
  const bimesterNum = Number(activeBimester) as BimesterKey;
  const currentCompetencies = (activeLibreta?.areas ?? []).flatMap((area) =>
    area.competencies
      .map((c) => ({ area: area.name, competency: c.name, ...c.bimesters[bimesterNum] }))
      .filter((c) => c.level !== null),
  );
  const bimesterLevel = dominantLevel(currentCompetencies.map((c) => c.level));
  const levelLabel = bimesterLevel ? LEVEL_LABEL[bimesterLevel] : "Sin notas registradas";
  const recentAnnouncements = announcements.slice(0, 3);

  const firstName = (user?.full_name ?? "").split(" ")[0] || "Padre";

  const weekDays = buildWeekAttendance(weeklyAttendance);
  const todayISO = toLocalISODate();

  if (loading) return <LoadingState label="Cargando tus hijos..." className="py-24" />;

  if (error) return <ErrorState message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-on-surface-variant min-h-5">
            {todayFormatted}
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-bold tracking-tight text-on-surface">
            Hola, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Así va el avance de tus hijos hoy.
          </p>
        </div>
        {students.length > 0 && (
          canAddMore ? (
            <Button
              onClick={() => setShowClaimModal(true)}
              className="h-10 rounded-lg bg-primary text-white font-semibold gap-1.5 hover:bg-primary-hover shadow-sm"
            >
              <Plus className="h-4 w-4" aria-hidden /> Agregar hijo
            </Button>
          ) : (
            <p className="text-xs text-on-surface-variant max-w-[200px] text-right">
              Llegaste al máximo de {MAX_CHILDREN} hijos vinculados.
            </p>
          )
        )}
      </div>

      {/* ── Mis hijos ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-bold tracking-tight text-on-surface">Mis hijos</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Toca una tarjeta para ver sus notas: la selección se mantiene en el
            resto del panel.
          </p>
        </div>

        {students.length === 0 ? (
          <NoChildrenState onAddChild={() => setShowClaimModal(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {students.map((child) => {
              const active = child.id === activeStudentId;
              const avg = child.avg_grade != null ? child.avg_grade.toFixed(1) : "—";
              const ltr = child.avg_grade != null ? levelFromScore(child.avg_grade) : null;
              const attendanceRate = child.attendance_rate;
              const attendance = attendanceRate != null ? `${attendanceRate}%` : "—";
              const attendanceTint =
                attendanceRate == null
                  ? "bg-surface-container-high text-on-surface-variant"
                  : attendanceRate >= 90
                  ? "bg-success-container text-on-success-container"
                  : "bg-warning-container text-on-warning-container";
              return (
                <button
                  key={child.id}
                  onClick={() => selectStudent(child.id)}
                  aria-pressed={active}
                  className={cn(
                    "group relative text-left rounded-2xl p-4 border transition-all duration-200",
                    "bg-surface-container-lowest",
                    active
                      ? "border-primary ring-1 ring-primary/30 shadow-sm"
                      : "border-outline-variant hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-14px_rgba(17,28,44,0.2)]",
                    cardShadow,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0 rounded-full ring-1 ring-outline-variant">
                      <AvatarFallback className="bg-surface-container-low text-primary text-sm font-bold rounded-full">
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 pr-16">
                      <p className="truncate text-sm font-bold text-on-surface">{child.name}</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {child.grade} &quot;{child.section}&quot;
                        {child.shift ? ` · ${child.shift}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Badge "En vista" superpuesto en la esquina superior derecha. */}
                  {active && (
                    <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white">
                      En vista
                    </span>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-success-container/60 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        Promedio
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-base font-bold text-on-surface">{avg}</span>
                        {ltr && (
                          <Badge className={cn("text-[10px] font-bold", levelBadgeClass(ltr))}>
                            {ltr}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className={cn("rounded-xl px-3 py-2", attendanceTint)}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        Asistencia
                      </p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="text-base font-bold">{attendance}</span>
                        <CalendarIcon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Fila inferior: Notas | Asistencia + Avisos ─────────────── */}
      {students.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Notas recientes (2/3 ancho) ───────────────────────────── */}
          <Card
            className={cn(
              "lg:col-span-2 overflow-hidden rounded-2xl border-outline-variant bg-surface-container-lowest",
              cardShadow,
            )}
          >
            <CardContent className="space-y-5 p-5 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-on-surface">
                    Notas recientes
                  </h2>
                  {selectedStudent && (
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {selectedStudent.name} · {selectedStudent.grade} &quot;
                      {selectedStudent.section}&quot;
                    </p>
                  )}
                </div>

                {/* Selector de bimestre (segmentado) */}
                <div className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1">
                  {BIMESTERS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setActiveBimester(b)}
                      aria-pressed={activeBimester === b}
                      aria-label={`Bimestre ${b}`}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                        activeBimester === b
                          ? "bg-surface-container-lowest text-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      B{b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla — el padre ve el nivel de logro por competencia, nunca
                  la nota 0-20 (misma regla que la libreta oficial). */}
              <div className="overflow-hidden rounded-xl border border-outline-variant">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Área / Competencia
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Nivel
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Conclusión
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCompetencies.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-sm text-on-surface-variant"
                        >
                          Aún no hay notas registradas para este bimestre.
                        </TableCell>
                      </TableRow>
                    )}
                    {currentCompetencies.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className="border-outline-variant hover:bg-surface-container-low/70 even:bg-surface-container-low/60"
                      >
                        <TableCell className="py-3 text-sm font-medium text-on-surface">
                          <p>{row.competency}</p>
                          <p className="text-xs text-on-surface-variant">{row.area}</p>
                        </TableCell>
                        <TableCell className="py-3">
                          <LevelBadge level={row.level} />
                        </TableCell>
                        <TableCell className="py-3 text-sm font-medium text-on-surface whitespace-normal break-words max-w-[220px]">
                          {row.conclusion || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Acción: el boletín PDF vive en la página de Notas para no
                  duplicar la misma descarga en dos sitios. */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/father/grades">
                  <Button className="h-10 gap-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover">
                    Ver todas las notas y descargar boletín
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              </div>

              {/* Nivel predominante del bimestre (compacto al pie). */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    Nivel predominante del Bimestre
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {bimesterLevel ? (
                      <Badge className={cn("text-sm font-bold", levelBadgeClass(bimesterLevel))}>
                        {bimesterLevel}
                      </Badge>
                    ) : (
                      <p className="text-xl font-bold tracking-tight text-on-surface">—</p>
                    )}
                  </div>
                </div>
                <Badge className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                  {levelLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ── Columna derecha: Asistencia + Avisos (1/3 ancho) ────── */}
          <div className="space-y-6">
            {/* Asistencia de la semana */}
            <Card
              className={cn(
                "overflow-hidden rounded-2xl border-outline-variant bg-surface-container-lowest",
                cardShadow,
              )}
            >
              <CardContent className="p-5 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold tracking-tight text-on-surface">
                    Asistencia de la semana
                  </h2>
                  <Link
                    href="/father/attendance"
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Ver detalle <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>

                <div className="mt-5 flex items-end justify-between gap-2">
                  {weekDays.map((d) => {
                    const status = d.record?.status ?? null;
                    let bg = "bg-slate-100";
                    let text = "text-slate-500";
                    if (status === "A" || status === "J") {
                      bg = "bg-success-container";
                      text = "text-on-success-container";
                    } else if (status === "T") {
                      bg = "bg-warning-container";
                      text = "text-on-warning-container";
                    } else if (status === "F") {
                      bg = "bg-error-container";
                      text = "text-on-error-container";
                    }
                    const isToday = d.isoDate === todayISO;
                    return (
                      <div key={d.isoDate} className="flex flex-1 flex-col items-center gap-1.5">
                        <div
                          title={status ? STATUS_LABEL[status] : "Sin registro"}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-colors",
                            bg,
                            text,
                            isToday &&
                              "ring-2 ring-accent ring-offset-2 ring-offset-surface-container-lowest",
                          )}
                        >
                          {status ?? "—"}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            isToday ? "text-primary" : "text-on-surface-variant",
                          )}
                        >
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Avisos */}
            <Card
              className={cn(
                "overflow-hidden rounded-2xl border-outline-variant bg-surface-container-lowest",
                cardShadow,
              )}
            >
              <CardContent className="p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold tracking-tight text-on-surface">Avisos</h2>
                  <Link
                    href="/father/announcements"
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Ver todos <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {recentAnnouncements.length === 0 && (
                    <p className="text-xs text-on-surface-variant">No hay avisos recientes.</p>
                  )}
                  {recentAnnouncements.map((a) => {
                    const Icon = CATEGORY_ICON[a.category];
                    const tint = CATEGORY_TINT[a.category];
                    return (
                      <Link
                        key={a.id}
                        href="/father/announcements"
                        /* El aviso llega abierto y marcado como leído en la lista. */
                        onClick={() => requestOpen(a.id)}
                        className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3 transition-colors hover:bg-surface-container-low"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                            tint.bg,
                            tint.text,
                            tint.ring,
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-semibold",
                              !a.read ? "text-on-surface" : "text-on-surface-variant",
                            )}
                          >
                            {a.title}
                          </p>
                          {a.body && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-on-surface-variant">
                              {a.body}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal de reclamo de hijo */}
      <ClaimChildModal
        open={claimModalOpen}
        onClose={handleCloseClaimModal}
        onClaimed={() => reload()}
        canAddMore={canAddMore}
      />
    </div>
  );
}
