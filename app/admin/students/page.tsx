"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  GraduationCap, Users, TrendingUp, Search, Plus, MoreHorizontal, Phone, AlertTriangle, Loader2,
  Eye, UserX, X, CheckCircle2, RefreshCw,
} from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Student = {
  id: string; name: string; initials: string; dni: string;
  grade: string; section: string; shift: string;
  parent_name: string | null; parent_phone: string | null;
  avg_grade: number | null; attendance_rate: number | null; status: string;
};
type Section = { id: string; grade: string; section: string; studentsTotal: number; avgGrade: number | null; attendanceRate: number | null };

const GRADES = ["1ro", "2do", "3ro", "4to", "5to"];

function levelBadge(avg: number | null) {
  if (avg === null) return { label: "—", cls: "bg-gray-100 text-gray-500" };
  if (avg >= 18) return { label: "AD", cls: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A",  cls: "bg-blue-100 text-blue-700" };
  if (avg >= 11) return { label: "B",  cls: "bg-amber-100 text-amber-700" };
  return              { label: "C",  cls: "bg-red-100 text-red-600" };
}
function avgColor(avg: number | null) {
  if (avg === null) return "text-gray-400";
  if (avg >= 14) return "text-emerald-600 font-bold";
  if (avg >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}
function attendanceColor(pct: number | null) {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 75) return "text-amber-600";
  return "text-red-500";
}

type NewStudentDraft = { dni: string; fullName: string; grade: string; section: string; shift: "Mañana" | "Tarde" };
const EMPTY_DRAFT: NewStudentDraft = { dni: "", fullName: "", grade: "1ro", section: "", shift: "Mañana" };

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "retirado" | "trasladado">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // ─── Sprint 7: alta de alumno + acciones por fila ──────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<NewStudentDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState<Student | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const loadStudents = async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "50");
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (sectionFilter !== "all") params.set("section", sectionFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (query) params.set("q", query);

      const [stRes, secRes] = await Promise.all([
        fetch(`/api/admin/students?${params}`),
        fetch("/api/admin/sections"),
      ]);
      const st = await stRes.json();
      const sec = await secRes.json();
      if (!st.ok) throw new Error(st.error);
      if (sec.ok) setSections(sec.sections);
      setStudents(st.students);
      setPagination(st.pagination);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando alumnos");
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cuando cambien los filtros
  useEffect(() => { loadStudents(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [gradeFilter, sectionFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => loadStudents(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const totalStudents = pagination.total;
  const sectionsWithAvg = sections.filter((s): s is Section & { avgGrade: number } => s.avgGrade !== null);
  const globalAvg = sectionsWithAvg.length
    ? sectionsWithAvg.reduce((s, sec) => s + sec.avgGrade, 0) / sectionsWithAvg.length
    : 0;
  const sectionsWithAttendance = sections.filter((s): s is Section & { attendanceRate: number } => s.attendanceRate !== null);
  const globalAttendance = sectionsWithAttendance.length
    ? Math.round(sectionsWithAttendance.reduce((s, sec) => s + sec.attendanceRate, 0) / sectionsWithAttendance.length)
    : 0;
  const atRisk = students.filter((s) => (s.avg_grade !== null && s.avg_grade < 11) || (s.attendance_rate !== null && s.attendance_rate < 80)).length;

  const availableSections = useMemo(() => {
    return sections
      .filter((s) => gradeFilter === "all" || s.grade === gradeFilter)
      .map((s) => s.section)
      .sort();
  }, [gradeFilter, sections]);

  // Secciones disponibles para el grado elegido en el modal de alta
  const draftSections = useMemo(() => {
    return sections
      .filter((s) => s.grade === draft.grade)
      .map((s) => s.section)
      .sort();
  }, [sections, draft.grade]);

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setFormError("");
    setShowNew(true);
  }

  async function handleCreate() {
    if (!/^\d{8}$/.test(draft.dni.trim())) { setFormError("El DNI debe tener 8 dígitos."); return; }
    if (draft.fullName.trim().length < 3) { setFormError("El nombre completo es obligatorio."); return; }
    if (!draft.section) { setFormError("Selecciona una sección."); return; }
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: draft.dni.trim(), fullName: draft.fullName.trim(), grade: draft.grade, section: draft.section, shift: draft.shift }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowNew(false);
      setActionMsg(`Alumno ${data.student.name} creado correctamente.`);
      await loadStudents(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear el alumno");
    } finally {
      setSaving(false);
    }
  }

  async function handlePatch(id: string, body: Record<string, unknown>, doneMsg: string) {
    setRowBusy(id);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setActionMsg(doneMsg);
      await loadStudents(page);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setRowBusy(null);
    }
  }

  if (loading) {
    return <LoadingState label="Cargando alumnos..." />;
  }
  if (error) { return <ErrorState message={error} onRetry={() => loadStudents(page)} />; }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Alumnos</h1>
          <p className="text-muted-foreground mt-1">Padrón general de alumnos matriculados · Año Lectivo 2026</p>
        </div>
        <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"><Plus className="h-4 w-4" />Nuevo alumno</Button>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {actionMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total matriculados", value: students.length, icon: GraduationCap, bg: "bg-blue-50", text: "text-[#2563EB]" },
          { label: "Promedio general", value: globalAvg.toFixed(1), icon: TrendingUp, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "% Asistencia", value: `${globalAttendance}%`, icon: Users, bg: "bg-purple-50", text: "text-purple-600" },
          { label: "En riesgo", value: atRisk, icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}><s.icon className={`h-5 w-5 ${s.text}`} /></div>
              <div><p className="text-2xl font-bold text-[#0F172A]">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          <button onClick={() => { setGradeFilter("all"); setSectionFilter("all"); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${gradeFilter === "all" ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>Todos</button>
          {GRADES.map((g) => (
            <button key={g} onClick={() => { setGradeFilter(g); setSectionFilter("all"); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${gradeFilter === g ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{g}</button>
          ))}
        </div>
        {gradeFilter !== "all" && (
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            <button onClick={() => setSectionFilter("all")} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sectionFilter === "all" ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>Todas</button>
            {availableSections.map((sec) => (
              <button key={sec} onClick={() => setSectionFilter(sec)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sectionFilter === sec ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{sec}</button>
            ))}
          </div>
        )}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "activo", "retirado", "trasladado"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{s === "all" ? "Todos" : s}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Nombre, DNI o apoderado..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-60 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]" />
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-[#0F172A] font-semibold text-sm pl-5 w-10">N°</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Grado / Sección</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm hidden md:table-cell">Apoderado</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Promedio</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden sm:table-cell">Nivel</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Asistencia</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm pr-5">Acc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((st, idx) => {
                const level = levelBadge(st.avg_grade);
                const isAtRisk = (st.avg_grade !== null && st.avg_grade < 11) || (st.attendance_rate !== null && st.attendance_rate < 80);
                const rowNum = (page - 1) * 50 + idx + 1;
                return (
                  <TableRow key={st.id} className={`hover:bg-gray-50/50 transition-colors ${isAtRisk ? "bg-red-50/20" : ""}`}>
                    <TableCell className="pl-5 text-xs text-muted-foreground font-medium">{String(rowNum).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">{st.initials}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-semibold text-[#0F172A]">{st.name}</p><p className="text-[11px] text-muted-foreground">DNI {st.dni}</p></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[10px] font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10">{st.grade} &quot;{st.section}&quot;</Badge>
                        <span className="text-[10px] text-muted-foreground">{st.shift}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="text-xs font-medium text-[#0F172A]">{st.parent_name ?? "—"}</p>
                        {st.parent_phone && <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5"><Phone className="h-2.5 w-2.5" />{st.parent_phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><span className={`text-sm ${avgColor(st.avg_grade)}`}>{st.avg_grade !== null ? st.avg_grade.toFixed(1) : "—"}</span></TableCell>
                    <TableCell className="text-center hidden sm:table-cell"><Badge className={`text-[11px] font-bold border-0 ${level.cls} hover:opacity-90`}>{level.label}</Badge></TableCell>
                    <TableCell className="text-center hidden lg:table-cell"><span className={`text-sm font-semibold ${attendanceColor(st.attendance_rate)}`}>{st.attendance_rate !== null ? `${st.attendance_rate}%` : "—"}</span></TableCell>
                    <TableCell className="text-center">
                      {st.status === "activo" ? <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Activo</span>
                        : st.status === "retirado" ? <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Retirado</span>
                        : <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Trasladado</span>}
                    </TableCell>
                    <TableCell className="text-center pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors outline-none" aria-label="Acciones del alumno">
                          {rowBusy === st.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <MoreHorizontal className="h-4 w-4 text-muted-foreground" />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-48">
                          <DropdownMenuItem onClick={() => setDetail(st)} className="gap-2 cursor-pointer">
                            <Eye className="h-3.5 w-3.5 text-[#2563EB]" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                              <RefreshCw className="h-3.5 w-3.5 text-[#64748B]" /> Cambiar estado
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="min-w-36">
                              {(["activo", "retirado", "trasladado"] as const).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  disabled={st.status === s}
                                  onClick={() => handlePatch(st.id, { status: s }, `Estado de ${st.name} actualizado a "${s}".`)}
                                  className="capitalize cursor-pointer"
                                >
                                  {s}{st.status === s ? " (actual)" : ""}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!st.parent_name}
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`¿Desvincular al apoderado de ${st.name}?`)) {
                                handlePatch(st.id, { unlinkParent: true }, `Apoderado desvinculado de ${st.name}.`);
                              }
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <UserX className="h-3.5 w-3.5" /> Desvincular apoderado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {students.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No se encontraron alumnos con ese criterio</div>}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {students.length} de {pagination.total} alumnos
            </p>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => loadStudents(page - 1)}
                  className="h-8 px-3"
                >
                  ← Anterior
                </Button>
                <span className="text-xs text-muted-foreground font-medium">
                  Página {page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => loadStudents(page + 1)}
                  className="h-8 px-3"
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Nuevo alumno */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Nuevo alumno</h2>
              <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">DNI</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={draft.dni}
                  onChange={(e) => { setDraft((d) => ({ ...d, dni: e.target.value.replace(/\D/g, "") })); setFormError(""); }}
                  placeholder="8 dígitos"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Nombre completo</label>
                <input
                  type="text"
                  value={draft.fullName}
                  onChange={(e) => { setDraft((d) => ({ ...d, fullName: e.target.value })); setFormError(""); }}
                  placeholder="Apellidos y nombres"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Grado</label>
                  <select
                    value={draft.grade}
                    onChange={(e) => { setDraft((d) => ({ ...d, grade: e.target.value, section: "" })); setFormError(""); }}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sección</label>
                  <select
                    value={draft.section}
                    onChange={(e) => { setDraft((d) => ({ ...d, section: e.target.value })); setFormError(""); }}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                  >
                    <option value="">Elegir...</option>
                    {draftSections.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {draftSections.length === 0 && <p className="text-[11px] text-amber-600">No hay secciones creadas para este grado.</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Turno</label>
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {(["Mañana", "Tarde"] as const).map((t) => (
                    <button key={t} onClick={() => setDraft((d) => ({ ...d, shift: t }))} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${draft.shift === t ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            {formError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowNew(false)} disabled={saving} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear alumno"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Detalle del alumno</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 shrink-0"><AvatarFallback className="bg-[#2563EB] text-white text-sm font-bold">{detail.initials}</AvatarFallback></Avatar>
              <div>
                <p className="text-base font-bold text-[#0F172A]">{detail.name}</p>
                <p className="text-xs text-muted-foreground">DNI {detail.dni}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Grado / Sección</p><p className="font-semibold text-[#0F172A] mt-0.5">{detail.grade} &quot;{detail.section}&quot; · {detail.shift}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Estado</p><p className="font-semibold text-[#0F172A] mt-0.5 capitalize">{detail.status}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Promedio</p><p className={`mt-0.5 ${avgColor(detail.avg_grade)}`}>{detail.avg_grade !== null ? detail.avg_grade.toFixed(1) : "—"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Asistencia</p><p className={`mt-0.5 font-semibold ${attendanceColor(detail.attendance_rate)}`}>{detail.attendance_rate !== null ? `${detail.attendance_rate}%` : "—"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3 col-span-2"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Apoderado</p><p className="font-semibold text-[#0F172A] mt-0.5">{detail.parent_name ?? "Sin apoderado vinculado"}{detail.parent_phone ? ` · ${detail.parent_phone}` : ""}</p></div>
            </div>
            <Button variant="outline" onClick={() => setDetail(null)} className="w-full">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}