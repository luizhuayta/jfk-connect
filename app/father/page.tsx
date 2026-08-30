"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Megaphone, Bell, ChevronRight } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import LevelBadge from "@/components/grades/LevelBadge";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import {
  useAnnouncements,
  type AnnouncementCategory,
} from "@/components/father/AnnouncementsProvider";
import { cn } from "@/lib/utils";
import { toLocalISODate } from "@/lib/format";
import { useIsClient } from "@/lib/useIsClient";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";
import { type AttendanceStatus } from "@/lib/attendance/labels";
import { jornadaHeading, weekdayCapitalized } from "@/lib/attendance/jornada";
import WeekStrip from "@/components/father/WeekStrip";
import { honorLinkClass, paperShadow } from "@/components/father/chrome";

type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
};

const MAX_CHILDREN = 5;

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
  urgente: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-200" },
  importante: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-200" },
  general: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-200" },
  informativo: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" },
};


export default function FatherDashboard() {
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
  const [libretaLoading, setLibretaLoading] = useState(false);
  const [libretaCache, setLibretaCache] = useState<Record<string, LibretaData>>({});
  const loadedIds = useRef(new Set<string>());
  const [showClaimModal, setShowClaimModal] = useState(false);

  const [weeklyAttendance, setWeeklyAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const loadedAttendanceFor = useRef<string | null>(null);

  const loadGrades = useCallback(async (studentId: string) => {
    setLibretaLoading(true);
    try {
      const r = await fetch(`/api/libreta?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setLibretaCache((prev) => ({ ...prev, [studentId]: data.libreta as LibretaData }));
      setDataError(null);
    } catch {
      setDataError("No se pudieron cargar las notas. Intente de nuevo.");
    } finally {
      setLibretaLoading(false);
    }
  }, []);

  const loadAttendance = useCallback(async (studentId: string) => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const r = await fetch(`/api/father/attendance?studentId=${studentId}`);
      const data = await r.json();
      if (!data.ok || !Array.isArray(data.records)) {
        throw new Error("bad");
      }
      setWeeklyAttendance(data.records as AttendanceRecord[]);
    } catch {
      setAttendanceError("No se pudo cargar la asistencia. Intente de nuevo.");
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStudentId && !loadedIds.current.has(activeStudentId)) {
      loadedIds.current.add(activeStudentId);
      loadGrades(activeStudentId);
    }
  }, [activeStudentId, loadGrades]);

  useEffect(() => {
    if (activeStudentId && loadedAttendanceFor.current !== activeStudentId) {
      loadedAttendanceFor.current = activeStudentId;
      setWeeklyAttendance([]);
      loadAttendance(activeStudentId);
    }
  }, [activeStudentId, loadAttendance]);

  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  const weekdayCap = now ? weekdayCapitalized(now) : "";
  const isSchoolDay = now ? now.getDay() >= 1 && now.getDay() <= 5 : false;

  const handleRetry = () => {
    setDataError(null);
    setAttendanceError(null);
    loadedIds.current.clear();
    loadedAttendanceFor.current = null;
    if (studentsError) {
      reload();
    } else if (activeStudentId) {
      loadedIds.current.add(activeStudentId);
      loadGrades(activeStudentId);
      loadedAttendanceFor.current = activeStudentId;
      loadAttendance(activeStudentId);
    }
  };

  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
  };

  const canAddMore = students.length < MAX_CHILDREN;

  const activeLibreta = activeStudentId ? libretaCache[activeStudentId] : null;
  const bimesterNum = CURRENT_BIMESTER as BimesterKey;
  const currentCompetencies = (activeLibreta?.areas ?? []).flatMap((area) =>
    area.competencies
      .map((c) => ({ area: area.name, competency: c.name, ...c.bimesters[bimesterNum] }))
      .filter((c) => c.level !== null),
  );
  const previewSeals = currentCompetencies.slice(0, 4);
  const extraSeals = Math.max(0, currentCompetencies.length - 4);
  const latestAnnouncement = announcements[0] ?? null;

  const childFirst = selectedStudent?.name.split(" ")[0] ?? "su hijo";

  const todayISO = toLocalISODate();
  const todayStatus = weeklyAttendance.find((r) => r.date === todayISO)?.status ?? null;
  const honorToday = todayStatus === "A" || todayStatus === "J";

  const jornadaTitle = jornadaHeading({
    isClient,
    isSchoolDay,
    weekdayCap,
    loading: attendanceLoading,
    error: Boolean(attendanceError),
    status: todayStatus,
  });

  if (loading) return <LoadingState label="Cargando a sus hijos..." className="py-24" />;

  if (studentsError) {
    return <ErrorState message={studentsError} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">
            {students.length === 0
              ? "Vincule a su hijo para ver la jornada"
              : jornadaTitle}
          </h1>
          {students.length > 0 && selectedStudent && (
            <p className="mt-1.5 text-sm text-on-surface-variant">
              {childFirst} · {selectedStudent.grade} &quot;{selectedStudent.section}&quot;
              {selectedStudent.shift ? ` · ${selectedStudent.shift}` : ""}
            </p>
          )}
        </div>
        {students.length > 0 && isSchoolDay && honorToday && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
            ● HOY
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <NoChildrenState onAddChild={() => setShowClaimModal(true)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ChildSelector />
            {canAddMore ? (
              <button
                type="button"
                onClick={() => setShowClaimModal(true)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Vincular a otro hijo
              </button>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Máximo de {MAX_CHILDREN} hijos vinculados.
              </p>
            )}
          </div>

          <section
            className={cn(
              "rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 lg:p-6",
              paperShadow,
            )}
          >
            {attendanceError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                <p>{attendanceError}</p>
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => activeStudentId && loadAttendance(activeStudentId)}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {dataError && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                <p>{dataError}</p>
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => activeStudentId && loadGrades(activeStudentId)}
                >
                  Reintentar notas
                </Button>
              </div>
            )}

            {previewSeals.length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {previewSeals.map((row, idx) => (
                  <li
                    key={`${row.competency}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low/70 px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-on-surface">
                      {row.competency}
                    </span>
                    <LevelBadge level={row.level} showLabel />
                  </li>
                ))}
              </ul>
            )}
            {extraSeals > 0 && (
              <p className="mt-2 text-xs text-on-surface-variant">
                Y {extraSeals} competencia{extraSeals === 1 ? "" : "s"} más en el
                bimestre {CURRENT_BIMESTER} (actual).
              </p>
            )}
            {!libretaLoading && !dataError && previewSeals.length === 0 && (
              <p className="mt-4 text-sm text-on-surface-variant">
                Aún no hay notas en el bimestre {CURRENT_BIMESTER} (actual).
              </p>
            )}
            {libretaLoading && (
              <p className="mt-4 text-sm text-on-surface-variant">Cargando la libreta…</p>
            )}

            {latestAnnouncement && (
              <Link
                href="/father/announcements"
                onClick={() => requestOpen(latestAnnouncement.id)}
                className="mt-5 flex items-start gap-3 rounded-xl bg-surface-container-low/70 p-3 transition-colors hover:bg-surface-container-low"
              >
                {(() => {
                  const Icon = CATEGORY_ICON[latestAnnouncement.category];
                  const tint = CATEGORY_TINT[latestAnnouncement.category];
                  return (
                    <>
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
                        <p className="text-xs font-semibold text-on-surface-variant">
                          Aviso de dirección o tutoría
                        </p>
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {latestAnnouncement.title}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
                    </>
                  );
                })()}
              </Link>
            )}
          </section>

          <section
            className={cn(
              "rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 lg:p-6",
              paperShadow,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold tracking-tight text-on-surface">
                Esta semana
              </h2>
              <Link
                href="/father/attendance"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Ver asistencia <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="mt-4">
              <WeekStrip
                records={weeklyAttendance}
                loading={attendanceLoading}
                todayISO={todayISO}
              />
            </div>
          </section>

          <Link href={`/father/grades?b=${CURRENT_BIMESTER}`} className={honorLinkClass}>
            Ver la libreta completa
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </>
      )}

      <ClaimChildModal
        open={showClaimModal}
        onClose={handleCloseClaimModal}
        onClaimed={(student) => {
          selectStudent(student.id);
          reload();
        }}
        canAddMore={canAddMore}
      />
    </div>
  );
}
