"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Sun, Moon, ChevronDown, ChevronUp, Plus,
  UserRound, Loader2, CheckCircle2, AlertCircle, X,
} from "lucide-react";

type AdminSection = {
  id: string; grade: string; gradeNum: number; section: string;
  shift: "Mañana" | "Tarde"; room: string; tutor: string;
  studentsTotal: number; avgGrade: number; attendanceRate: number;
};

type Course = {
  id: string; subject: string; grade: string; section: string;
  teacherName: string | null; teacherId: string | null;
  studentsTotal: number;
};

type Teacher = {
  id: string; full_name: string; subject: string | null;
  shift_preference: string | null; is_active: boolean; courses_count: number;
};

const GRADES = ["1ro", "2do", "3ro", "4to", "5to"];

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "1ro": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  "2do": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  "3ro": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "4to": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  "5to": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
};

function avgColor(avg: number) {
  if (avg >= 15) return "text-emerald-600 font-bold";
  if (avg >= 13) return "text-[#0F172A] font-semibold";
  return "text-amber-600 font-semibold";
}
function attendanceBadge(pct: number) {
  if (pct >= 95) return "bg-emerald-100 text-emerald-700";
  if (pct >= 85) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

export default function AdminCoursesPage() {
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set(["1ro"]));
  const [selectedSection, setSelectedSection] = useState<AdminSection | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  // ─── Sprint 7: alta de sección ─────────────────────────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [newGrade, setNewGrade] = useState("1ro");
  const [newSection, setNewSection] = useState("");
  const [newShift, setNewShift] = useState<"Mañana" | "Tarde">("Mañana");
  const [newRoom, setNewRoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageMsg, setPageMsg] = useState<string | null>(null);

  const loadSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/sections");
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => { void loadSections(); }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Letras A-M aún no usadas para el grado elegido
  const availableLetters = useMemo(() => {
    const used = new Set(sections.filter((s) => s.grade === newGrade).map((s) => s.section));
    return "ABCDEFGHIJKLM".split("").filter((l) => !used.has(l));
  }, [sections, newGrade]);

  function openNew() {
    setNewGrade("1ro");
    setNewSection("");
    setNewShift("Mañana");
    setNewRoom("");
    setFormError("");
    setShowNew(true);
  }

  async function handleCreateSection() {
    if (!newSection) { setFormError("Selecciona la letra de la sección."); return; }
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: newGrade, section: newSection, shift: newShift, room: newRoom.trim() || undefined }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowNew(false);
      setPageMsg(data.message ?? `Sección ${newGrade} "${newSection}" creada.`);
      await loadSections();
      // Dejar visible la nueva sección en la lista
      setExpandedGrades((prev) => new Set(prev).add(newGrade));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear la sección");
    } finally {
      setSaving(false);
    }
  }

  const loadCourses = async (sec: AdminSection) => {
    setSelectedSection(sec);
    setLoadingCourses(true);
    setAssignMsg(null);
    try {
      const r = await fetch(`/api/admin/courses?grade=${sec.grade}&section=${sec.section}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setCourses(data.courses);
    } catch {
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadTeachers = async (subject: string) => {
    try {
      const r = await fetch(`/api/admin/teachers?subject=${encodeURIComponent(subject)}`);
      const data = await r.json();
      if (data.ok) setTeachers(data.teachers);
    } catch {
      setTeachers([]);
    }
  };

  function toggleGrade(g: string) {
    setExpandedGrades((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  }

  async function handleAssign(courseId: string, teacherId: string) {
    if (!teacherId) return;
    setAssigning(courseId);
    setAssignMsg(null);
    try {
      const r = await fetch("/api/admin/courses/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, teacherId }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setAssignMsg(data.message);
      // Actualizar el curso en la lista
      setCourses((prev) => prev.map((c) =>
        c.id === courseId
          ? { ...c, teacherId, teacherName: teachers.find((t) => t.id === teacherId)?.full_name ?? null }
          : c
      ));
    } catch (err) {
      setAssignMsg(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setAssigning(null);
    }
  }

  const totalSections = sections.length;
  const totalStudents = sections.reduce((s, sec) => s + sec.studentsTotal, 0);
  const morning = sections.filter((s) => s.shift === "Mañana").length;
  const afternoon = sections.filter((s) => s.shift === "Tarde").length;

  if (loading) { return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" /><p className="text-sm text-muted-foreground mt-2">Cargando secciones...</p></div>; }
  if (error) { return <div className="py-16 text-center text-red-600 text-sm">{error}</div>; }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Cursos y Secciones</h1>
          <p className="text-muted-foreground mt-1">Gestión de asignación de docentes · {totalSections} secciones · Año Lectivo 2026</p>
        </div>
        <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"><Plus className="h-4 w-4" />Nueva sección</Button>
      </div>

      {pageMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {pageMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Secciones", value: totalSections, icon: BookOpen, bg: "bg-[#1E2A5E]/5", text: "text-[#1E2A5E]" },
          { label: "Alumnos totales", value: totalStudents, icon: Users, bg: "bg-blue-50", text: "text-[#2563EB]" },
          { label: "Turno mañana", value: morning, icon: Sun, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "Turno tarde", value: afternoon, icon: Moon, bg: "bg-purple-50", text: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}><s.icon className={`h-5 w-5 ${s.text}`} /></div>
              <div><p className="text-2xl font-bold text-[#0F172A]">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda: lista de secciones */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Secciones</p>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {GRADES.map((grade) => {
              const secs = sections.filter((s) => s.grade === grade);
              if (secs.length === 0) return null;
              const color = GRADE_COLORS[grade];
              const isExpanded = expandedGrades.has(grade);
              return (
                <div key={grade}>
                  <button onClick={() => toggleGrade(grade)} className="w-full text-left mb-2">
                    <span className={`text-sm font-bold ${color.text}`}>{grade} Secundaria</span>
                    <span className="text-xs text-muted-foreground ml-2">({secs.length})</span>
                    {isExpanded ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-1.5 mb-3">
                      {secs.map((sec) => {
                        const isActive = selectedSection?.id === sec.id;
                        return (
                          <button
                            key={sec.id}
                            onClick={() => loadCourses(sec)}
                            className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-all ${
                              isActive ? "border-[#2563EB] bg-[#2563EB]/5" : "border-gray-100 bg-white hover:border-[#2563EB]/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                                {sec.grade} &quot;{sec.section}&quot;
                              </span>
                              <Badge className={`text-[9px] ${sec.shift === "Mañana" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                                {sec.shift === "Mañana" ? <Sun className="h-2 w-2 inline" /> : <Moon className="h-2 w-2 inline" />} {sec.shift}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{sec.studentsTotal} alumnos · {sec.tutor}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: cursos de la sección seleccionada */}
        <div className="lg:col-span-2">
          {!selectedSection ? (
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm text-muted-foreground">Selecciona una sección para ver y asignar docentes a sus cursos.</p>
              </CardContent>
            </Card>
          ) : loadingCourses ? (
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
                <p className="text-sm text-muted-foreground mt-2">Cargando cursos...</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      {selectedSection.grade} &quot;{selectedSection.section}&quot; — {selectedSection.shift}
                    </h2>
                    <p className="text-xs text-muted-foreground">{selectedSection.studentsTotal} alumnos · {selectedSection.room}</p>
                  </div>
                  <Badge className="bg-[#1E2A5E]/10 text-[#1E2A5E] text-xs">{courses.length} cursos</Badge>
                </div>

                {assignMsg && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4" /> {assignMsg}
                  </div>
                )}

                <div className="space-y-2">
                  {courses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E2A5E]/10 shrink-0">
                          <BookOpen className="h-4 w-4 text-[#1E2A5E]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A] truncate">{course.subject}</p>
                          {course.teacherName ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserRound className="h-3 w-3" /> {course.teacherName}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Sin docente asignado
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {assigning === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#1E2A5E]" />
                        ) : (
                          <select
                            value={course.teacherId ?? ""}
                            onChange={(e) => {
                              handleAssign(course.id, e.target.value);
                              loadTeachers(course.subject);
                            }}
                            onClick={() => loadTeachers(course.subject)}
                            className="h-8 px-2 text-xs rounded-md border border-gray-200 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 min-w-[160px]"
                          >
                            <option value="">{course.teacherName ?? "Asignar docente..."}</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name} ({t.courses_count} cursos)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Nueva sección */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Nueva sección</h2>
              <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Grado</label>
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {GRADES.map((g) => (
                    <button key={g} onClick={() => { setNewGrade(g); setNewSection(""); setFormError(""); }} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${newGrade === g ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sección (letra disponible)</label>
                {availableLetters.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {availableLetters.map((l) => (
                      <button key={l} onClick={() => { setNewSection(l); setFormError(""); }} className={`h-9 w-9 rounded-lg text-xs font-bold border-2 transition-all ${newSection === l ? "border-[#1E2A5E] bg-[#1E2A5E] text-white" : "border-gray-200 text-[#64748B] hover:border-[#1E2A5E]/40"}`}>{l}</button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Ya existen todas las secciones (A–M) para este grado.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Aula</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder={`Ej: Aula ${newGrade}-${newSection || "X"}`}
                  maxLength={50}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Turno</label>
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {(["Mañana", "Tarde"] as const).map((t) => (
                    <button key={t} onClick={() => setNewShift(t)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${newShift === t ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Se crearán los 12 cursos de la sección para el año lectivo en curso, sin docente asignado.
            </p>

            {formError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowNew(false)} disabled={saving} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreateSection} disabled={saving || !newSection} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear sección"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}