"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { recentWeekdays } from "@/lib/format";
import { apiGet, apiSend } from "@/lib/client/api";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";
import type {
  AttendanceStatus,
  CourseStudent,
  JustificationItem,
  SessionSummary,
} from "./tones";

export function useAttendanceSession() {
  const recentDates = useMemo(() => recentWeekdays(9), []);
  const { courses, loading, error: coursesError, reload } = useTeacherCourses();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(recentDates[0]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justifications, setJustifications] = useState<JustificationItem[]>([]);
  const [justResponse, setJustResponse] = useState<Record<string, string>>({});
  const [justBusy, setJustBusy] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadContext = useCallback(async (courseId: string, date: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoadingGrid(true);
    setError(null);
    try {
      const [st, at, sum, just] = await Promise.all([
        apiGet(`/api/teacher/courses/${courseId}/students`, { signal: ac.signal }),
        apiGet(`/api/teacher/courses/${courseId}/attendance?date=${date}`, { signal: ac.signal }),
        apiGet(`/api/teacher/courses/${courseId}/attendance`, { signal: ac.signal }),
        apiGet(`/api/teacher/courses/${courseId}/justifications`, { signal: ac.signal }),
      ]);
      if (ac.signal.aborted) return;
      const list = (st.students ?? []) as CourseStudent[];
      setStudents(list);
      setSessions((sum.sessions ?? []) as SessionSummary[]);
      setJustifications((just.justifications ?? []) as JustificationItem[]);
      const byStudent: Record<string, AttendanceStatus> = {};
      for (const s of list) byStudent[s.id] = "A";
      for (const rec of (at.records ?? []) as { studentId: string; status: AttendanceStatus }[]) {
        byStudent[rec.studentId] = rec.status;
      }
      setRecords(byStudent);
      setSaved(false);
    } catch (err) {
      if (ac.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error cargando asistencia");
    } finally {
      if (!ac.signal.aborted) setLoadingGrid(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (initializedRef.current || courses.length === 0) return;
    initializedRef.current = true;
    const firstId = courses[0].id;
    setActiveCourseId(firstId);
    void loadContext(firstId, recentDates[0]);
  }, [courses, loadContext, recentDates]);

  const retry = useCallback(async () => {
    setError(null);
    await reload();
    if (activeCourseId) await loadContext(activeCourseId, activeDate);
  }, [reload, activeCourseId, activeDate, loadContext]);

  function handleCourse(id: string) {
    setActiveCourseId(id);
    void loadContext(id, activeDate);
  }

  function handleDate(d: string) {
    setActiveDate(d);
    if (activeCourseId) void loadContext(activeCourseId, d);
  }

  function setAll(status: AttendanceStatus) {
    setRecords((prev) =>
      Object.fromEntries(students.map((s) => [s.id, prev[s.id] === "J" ? "J" : status])),
    );
    setSaved(false);
  }

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  async function handleSave() {
    if (!activeCourseId) return;
    setSaving(true);
    try {
      await apiSend(`/api/teacher/courses/${activeCourseId}/attendance`, "POST", {
        date: activeDate,
        records: Object.entries(records).map(([studentId, status]) => ({ studentId, status })),
      });
      setSaved(true);
      const sum = await apiGet(`/api/teacher/courses/${activeCourseId}/attendance`);
      setSessions((sum.sessions ?? []) as SessionSummary[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(j: JustificationItem, decision: "aprobar" | "rechazar") {
    if (!activeCourseId) return;
    setJustBusy(j.id);
    try {
      await apiSend(
        `/api/teacher/courses/${activeCourseId}/justifications/${j.id}`,
        "PATCH",
        { decision, response: justResponse[j.id] || null },
      );
      setJustResponse((prev) => {
        const next = { ...prev };
        delete next[j.id];
        return next;
      });
      await loadContext(activeCourseId, activeDate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al revisar la justificación");
    } finally {
      setJustBusy(null);
    }
  }

  const course = courses.find((c) => c.id === activeCourseId);

  const counts = useMemo(() => {
    const vals = Object.values(records);
    return {
      A: vals.filter((v) => v === "A").length,
      F: vals.filter((v) => v === "F").length,
      T: vals.filter((v) => v === "T").length,
      J: vals.filter((v) => v === "J").length,
      total: vals.length,
    };
  }, [records]);

  const pct = counts.total ? Math.round(((counts.A + counts.T + counts.J) / counts.total) * 100) : 0;
  const datesWithRecords = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const history = sessions
    .filter((s) => s.date !== activeDate)
    .map((s) => ({
      date: s.date,
      A: s.a,
      F: s.f,
      T: s.t,
      J: s.j,
      pct: s.total ? Math.round(((s.a + s.t + s.j) / s.total) * 100) : 0,
    }))
    .slice(0, 5);

  return {
    courses,
    loading,
    coursesError,
    error,
    retry,
    recentDates,
    activeCourseId,
    activeDate,
    handleCourse,
    handleDate,
    course,
    students,
    records,
    setAll,
    setStudentStatus,
    saved,
    saving,
    loadingGrid,
    handleSave,
    counts,
    pct,
    datesWithRecords,
    justifications,
    justResponse,
    setJustResponse,
    justBusy,
    handleReview,
    history,
  };
}
