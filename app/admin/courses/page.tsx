"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Sun, Moon, ChevronDown, ChevronUp, Plus,
  UserRound, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import AssignSuggestions from "@/components/admin/courses/AssignSuggestions";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { apiGet, apiSend } from "@/lib/client/api";
import { ADMIN_GRADES } from "@/lib/admin/theme";
import { useAdminResource } from "@/lib/admin/useAdminList";
import {
  AdminPageHeader,
  FilterPills,
  StatCard,
  StatCardGrid,
} from "@/components/admin/shared";

type AdminSection = {
  id: string; grade: string; gradeNum: number; section: string;
  shift: "Mañana" | "Tarde"; room: string; tutor: string;
  studentsTotal: number; avgGrade: number | null; attendanceRate: number | null;
};

type Course = {
  id: string; subject: string; grade: string; section: string;
  teacherName: string | null; teacherId: string | null;
  studentsTotal: number;
};

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "1ro": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  "2do": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  "3ro": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "4to": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
  "5to": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
};

export default function AdminCoursesPage() {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set(["1ro"]));
  const [selectedSection, setSelectedSection] = useState<AdminSection | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  const { data: sections, loading, error, reload } = useAdminResource(
    "/api/admin/sections",
    (d) => (d.sections ?? []) as AdminSection[],
  );
  const sectionList = sections ?? [];

  useEffect(() => {
    apiGet("/api/ai/health")
      .then((d) => setAiAvailable(Boolean(d.enabled)))
      .catch(() => setAiAvailable(false));
  }, []);

  const [showNew, setShowNew] = useState(false);
  const [newGrade, setNewGrade] = useState("1ro");
  const [newSection, setNewSection] = useState("");
  const [newShift, setNewShift] = useState<"Mañana" | "Tarde">("Mañana");
  const [newRoom, setNewRoom] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageMsg, setPageMsg] = useState<string | null>(null);

  const availableLetters = useMemo(() => {
    const used = new Set(sectionList.filter((s) => s.grade === newGrade).map((s) => s.section));
    return "ABCDEFGHIJKLM".split("").filter((l) => !used.has(l));
  }, [sectionList, newGrade]);

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
      const data = await apiSend("/api/admin/sections", "POST", {
        grade: newGrade, section: newSection, shift: newShift, room: newRoom.trim() || undefined,
      });
      setShowNew(false);
      setPageMsg(typeof data.message === "string" ? data.message : `Sección ${newGrade} "${newSection}" creada.`);
      reload();
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
    setCoursesError(null);
    try {
      const data = await apiGet(`/api/admin/courses?grade=${encodeURIComponent(sec.grade)}&section=${encodeURIComponent(sec.section)}`);
      setCourses((data.courses as Course[]) ?? []);
    } catch (err) {
      setCourses([]);
      setCoursesError(err instanceof Error ? err.message : "Error cargando cursos");
    } finally {
      setLoadingCourses(false);
    }
  };

  function toggleGrade(g: string) {
    setExpandedGrades((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  }

  function handleAssigned(courseId: string, teacherId: string, teacherName: string) {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, teacherId, teacherName } : c)));
  }

  const totalSections = sectionList.length;
  const totalStudents = sectionList.reduce((s, sec) => s + sec.studentsTotal, 0);
  const morning = sectionList.filter((s) => s.shift === "Mañana").length;
  const afternoon = sectionList.filter((s) => s.shift === "Tarde").length;

  if (loading) { return <LoadingState label="Cargando secciones..." />; }
  if (error) { return <ErrorState message={error} onRetry={reload} />; }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Cursos y Secciones"
        subtitle={`Gestión de asignación de docentes · ${totalSections} secciones · ${SCHOOL_YEAR_LABEL}`}
        action={
          <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
            <Plus className="h-4 w-4" />Nueva sección
          </Button>
        }
      />

      {pageMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {pageMsg}
        </div>
      )}

      <StatCardGrid>
        <StatCard label="Secciones" value={totalSections} icon={BookOpen} bg="bg-[#1E2A5E]/5" text="text-[#1E2A5E]" />
        <StatCard label="Alumnos totales" value={totalStudents} icon={Users} bg="bg-blue-50" text="text-[#2563EB]" />
        <StatCard label="Turno mañana" value={morning} icon={Sun} bg="bg-amber-50" text="text-amber-600" />
        <StatCard label="Turno tarde" value={afternoon} icon={Moon} bg="bg-purple-50" text="text-purple-600" />
      </StatCardGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Secciones</p>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {ADMIN_GRADES.map((grade) => {
              const secs = sectionList.filter((s) => s.grade === grade);
              if (secs.length === 0) return null;
              const color = GRADE_COLORS[grade];
              const isExpanded = expandedGrades.has(grade);
              return (
                <div key={grade}>
                  <button type="button" onClick={() => toggleGrade(grade)} className="w-full text-left mb-2" aria-expanded={isExpanded}>
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
                            type="button"
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
              <CardContent className="p-12">
                <LoadingState label="Cargando cursos..." className="py-0" />
              </CardContent>
            </Card>
          ) : coursesError ? (
            <Card className="border-none shadow-sm rounded-xl">
              <CardContent className="p-6">
                <ErrorState message={coursesError} onRetry={() => loadCourses(selectedSection)} />
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
                        <AssignSuggestions
                          courseId={course.id}
                          courseName={course.subject}
                          currentTeacherName={course.teacherName}
                          aiAvailable={aiAvailable}
                          onAssigned={(teacherId, teacherName) => handleAssigned(course.id, teacherId, teacherName)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showNew} onClose={() => !saving && setShowNew(false)} titleId="new-section-title" closable={!saving}>
        <div className="flex items-center justify-between">
          <h2 id="new-section-title" className="text-xl font-bold text-[#1E2A5E]">Nueva sección</h2>
          <ModalCloseButton onClose={() => setShowNew(false)} disabled={saving} />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Grado</p>
            <FilterPills
              value={newGrade}
              onChange={(g) => { setNewGrade(g); setNewSection(""); setFormError(""); }}
              options={ADMIN_GRADES.map((g) => ({ value: g, label: g }))}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sección (letra disponible)</p>
            {availableLetters.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {availableLetters.map((l) => (
                  <button key={l} type="button" onClick={() => { setNewSection(l); setFormError(""); }} className={`h-9 w-9 rounded-lg text-xs font-bold border-2 transition-all ${newSection === l ? "border-[#1E2A5E] bg-[#1E2A5E] text-white" : "border-gray-200 text-[#64748B] hover:border-[#1E2A5E]/40"}`}>{l}</button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Ya existen todas las secciones (A–M) para este grado.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-room" className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Aula</label>
            <input
              id="new-room"
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder={`Ej: Aula ${newGrade}-${newSection || "X"}`}
              maxLength={50}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Turno</p>
            <FilterPills
              value={newShift}
              onChange={setNewShift}
              options={[
                { value: "Mañana", label: "Mañana" },
                { value: "Tarde", label: "Tarde" },
              ]}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Se crearán los cursos de la sección para el año lectivo en curso, sin docente asignado.
        </p>
        {formError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={() => setShowNew(false)} disabled={saving} className="flex-1">Cancelar</Button>
          <Button onClick={handleCreateSection} disabled={saving || !newSection} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear sección"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
