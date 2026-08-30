"use client";

import { CalendarDays } from "lucide-react";
import { toLocalISODate } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useAttendanceSession } from "@/components/teacher/attendance/useAttendanceSession";
import AttendanceGrid from "@/components/teacher/attendance/AttendanceGrid";
import JustificationQueue from "@/components/teacher/attendance/JustificationQueue";
import SessionHistory from "@/components/teacher/attendance/SessionHistory";
import { fmtDate } from "@/components/teacher/attendance/tones";

export default function AttendancePage() {
  const session = useAttendanceSession();

  if (session.loading) {
    return <LoadingState label="Cargando cursos..." />;
  }

  if (session.error || session.coursesError) {
    return <ErrorState message={session.error ?? session.coursesError ?? ""} onRetry={session.retry} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Asistencia</h1>
        <p className="text-muted-foreground mt-1">Registro de asistencia por sesión de clase</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {session.courses.map((c) => {
          const isActive = session.activeCourseId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => session.handleCourse(c.id)}
              className={`px-5 py-3 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? "border-[#2563EB] bg-[#2563EB]/5"
                  : "border-gray-200 bg-white hover:border-[#2563EB]/30"
              }`}
            >
              <p className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                {c.subject}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos
              </p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> Sesiones recientes
          </p>
          <input
            type="date"
            value={session.activeDate}
            max={toLocalISODate()}
            onChange={(e) => e.target.value && session.handleDate(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-gray-200 text-xs text-[#0F172A]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {session.recentDates.map((d) => {
            const hasRecord = session.datesWithRecords.has(d);
            return (
              <button
                key={d}
                onClick={() => session.handleDate(d)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                  session.activeDate === d
                    ? "bg-[#1E2A5E] text-white border-[#1E2A5E] shadow-sm"
                    : hasRecord
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-white text-[#64748B] border-gray-200 hover:border-[#1E2A5E]/40"
                }`}
              >
                {fmtDate(d)}
              </button>
            );
          })}
        </div>
      </div>

      <AttendanceGrid
        course={session.course}
        activeDate={session.activeDate}
        students={session.students}
        records={session.records}
        counts={session.counts}
        pct={session.pct}
        loadingGrid={session.loadingGrid}
        saving={session.saving}
        saved={session.saved}
        onSetAll={session.setAll}
        onSetStatus={session.setStudentStatus}
        onSave={session.handleSave}
      />

      <JustificationQueue
        course={session.course}
        justifications={session.justifications}
        justResponse={session.justResponse}
        justBusy={session.justBusy}
        onResponseChange={(id, value) =>
          session.setJustResponse((prev) => ({ ...prev, [id]: value }))
        }
        onReview={session.handleReview}
      />

      <SessionHistory
        course={session.course}
        history={session.history}
        onSelectDate={session.handleDate}
      />
    </div>
  );
}
