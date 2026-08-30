"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";
import ChildSelector from "@/components/father/ChildSelector";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { CURRENT_BIMESTER } from "@/lib/grades/bimesters";
import LevelBadge from "@/components/grades/LevelBadge";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import { useCachedFatherResource } from "@/components/father/useCachedFatherResource";
import { useAnnouncements } from "@/components/father/AnnouncementsProvider";
import { cn } from "@/lib/utils";
import { toLocalISODate } from "@/lib/format";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";
import { jornadaHeading } from "@/lib/attendance/jornada";
import { useJornadaHoy } from "@/lib/attendance/useJornadaHoy";
import WeekStrip from "@/components/father/WeekStrip";
import { honorLinkClass, paperShadow } from "@/components/father/chrome";
import { ANNOUNCEMENT_CATEGORY_VISUAL } from "@/lib/announcements/categories";
import { MAX_CHILDREN } from "@/lib/father/claim-student";
import { SCHOOL_YEAR } from "@/lib/school-year";
import type { AttendanceRecord } from "@/lib/father/types";

const EMPTY_LIBRETA: LibretaData | null = null;
const EMPTY_RECORDS: AttendanceRecord[] = [];

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
  const [showClaimModal, setShowClaimModal] = useState(false);

  const {
    data: activeLibreta,
    error: dataError,
    handleRetry: retryGrades,
    loading: libretaLoading,
  } = useCachedFatherResource<LibretaData | null>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/libreta",
    field: "libreta",
    fallback: EMPTY_LIBRETA,
    errorMessage: "No se pudieron cargar las notas. Intente de nuevo.",
  });

  const {
    data: weeklyAttendance,
    error: attendanceError,
    handleRetry: retryAttendance,
    loading: attendanceLoading,
  } = useCachedFatherResource<AttendanceRecord[]>({
    activeStudentId,
    studentsError,
    reload,
    endpoint: "/api/father/attendance",
    field: "records",
    fallback: EMPTY_RECORDS,
    errorMessage: "No se pudo cargar la asistencia. Intente de nuevo.",
    extraParams: { year: String(SCHOOL_YEAR) },
  });

  const { isClient, weekdayCap, isSchoolDay } = useJornadaHoy();

  const handleRetry = () => {
    retryGrades();
    retryAttendance();
  };

  const canAddMore = students.length < MAX_CHILDREN;

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
                <Button variant="outline" className="h-8" onClick={retryAttendance}>
                  Reintentar
                </Button>
              </div>
            )}

            {dataError && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                <p>{dataError}</p>
                <Button variant="outline" className="h-8" onClick={retryGrades}>
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
                  const visual = ANNOUNCEMENT_CATEGORY_VISUAL[latestAnnouncement.category];
                  const Icon = visual.icon;
                  return (
                    <>
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                          visual.bg,
                          visual.text,
                          visual.ring,
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
        onClose={() => setShowClaimModal(false)}
        onClaimed={(student) => {
          selectStudent(student.id);
          reload();
        }}
        canAddMore={canAddMore}
      />
    </div>
  );
}
