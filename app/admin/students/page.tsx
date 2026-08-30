"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  GraduationCap, Users, TrendingUp, Plus, MoreHorizontal, Phone, AlertTriangle, Loader2,
  Eye, UserX, CheckCircle2, RefreshCw, Download,
} from "lucide-react";
import { toast } from "sonner";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { levelFromScore, levelBadgeClass } from "@/lib/grades/scale";
import { downloadLibreta } from "@/lib/report";
import { SCHOOL_YEAR_LABEL } from "@/lib/school-year";
import { apiSend } from "@/lib/client/api";
import { ADMIN_GRADES, avgColor, attendanceColor } from "@/lib/admin/theme";
import { useAdminResource, useDebouncedValue, type AdminPagination } from "@/lib/admin/useAdminList";
import {
  AdminPageHeader,
  ConfirmDialog,
  FilterPills,
  PaginationBar,
  SearchInput,
  StatCard,
  StatCardGrid,
} from "@/components/admin/shared";

type Student = {
  id: string; name: string; initials: string; dni: string;
  grade: string; section: string; shift: string;
  parent_name: string | null; parent_phone: string | null;
  avg_grade: number | null; attendance_rate: number | null; status: string;
};
type Section = { id: string; grade: string; section: string; studentsTotal: number; avgGrade: number | null; attendanceRate: number | null };

type StudentCounts = {
  total: number; activo: number; retirado: number; trasladado: number; atRisk: number;
};
const EMPTY_COUNTS: StudentCounts = { total: 0, activo: 0, retirado: 0, trasladado: 0, atRisk: 0 };

type NewStudentDraft = { dni: string; fullName: string; grade: string; section: string; shift: "Mañana" | "Tarde" };
const EMPTY_DRAFT: NewStudentDraft = { dni: "", fullName: "", grade: "1ro", section: "", shift: "Mañana" };

function parseStudents(d: Record<string, unknown> & { ok: true }) {
  return {
    students: (d.students ?? []) as Student[],
    pagination: d.pagination as AdminPagination,
    counts: (d.counts as StudentCounts | undefined) ?? EMPTY_COUNTS,
  };
}

export default function AdminStudentsPage() {
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "retirado" | "trasladado">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "50");
  if (gradeFilter !== "all") params.set("grade", gradeFilter);
  if (sectionFilter !== "all") params.set("section", sectionFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (debouncedQuery) params.set("q", debouncedQuery);

  const { data, loading, error, reload } = useAdminResource(
    `/api/admin/students?${params}`,
    parseStudents,
  );
  const { data: sections } = useAdminResource(
    "/api/admin/sections",
    (d) => (d.sections ?? []) as Section[],
  );
  const students = data?.students ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 };
  const counts = data?.counts ?? EMPTY_COUNTS;
  const sectionList = sections ?? [];

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<NewStudentDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [detail, setDetail] = useState<Student | null>(null);
  const [downloadingLibreta, setDownloadingLibreta] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<Student | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ student: Student; status: "activo" | "retirado" | "trasladado" } | null>(null);

  const handleDownloadLibreta = async (studentId: string) => {
    setDownloadingLibreta(true);
    try {
      await downloadLibreta(studentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar la libreta");
    } finally {
      setDownloadingLibreta(false);
    }
  };

  const sectionsWithAvg = sectionList.filter((s): s is Section & { avgGrade: number } => s.avgGrade !== null);
  const globalAvg = sectionsWithAvg.length
    ? sectionsWithAvg.reduce((s, sec) => s + sec.avgGrade, 0) / sectionsWithAvg.length
    : 0;
  const sectionsWithAttendance = sectionList.filter((s): s is Section & { attendanceRate: number } => s.attendanceRate !== null);
  const globalAttendance = sectionsWithAttendance.length
    ? Math.round(sectionsWithAttendance.reduce((s, sec) => s + sec.attendanceRate, 0) / sectionsWithAttendance.length)
    : 0;

  const availableSections = useMemo(() => {
    return sectionList
      .filter((s) => gradeFilter === "all" || s.grade === gradeFilter)
      .map((s) => s.section)
      .sort();
  }, [gradeFilter, sectionList]);

  const draftSections = useMemo(() => {
    return sectionList
      .filter((s) => s.grade === draft.grade)
      .map((s) => s.section)
      .sort();
  }, [sectionList, draft.grade]);

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
      const data = await apiSend("/api/admin/students", "POST", {
        dni: draft.dni.trim(), fullName: draft.fullName.trim(),
        grade: draft.grade, section: draft.section, shift: draft.shift,
      });
      setShowNew(false);
      const name = (data.student as { name?: string } | undefined)?.name ?? draft.fullName;
      setActionMsg(`Alumno ${name} creado correctamente.`);
      reload();
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
      await apiSend(`/api/admin/students/${id}`, "PATCH", body);
      setActionMsg(doneMsg);
      reload();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Alumnos"
        subtitle={`Padrón general de alumnos matriculados · ${SCHOOL_YEAR_LABEL}`}
        action={
          <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
            <Plus className="h-4 w-4" />Nuevo alumno
          </Button>
        }
      />

      {actionMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {actionMsg}
        </div>
      )}

      <StatCardGrid>
        <StatCard label="Total matriculados" value={counts.activo} icon={GraduationCap} bg="bg-blue-50" text="text-[#2563EB]" />
        <StatCard label="Promedio general" value={globalAvg.toFixed(1)} icon={TrendingUp} bg="bg-emerald-50" text="text-emerald-600" />
        <StatCard label="% Asistencia" value={`${globalAttendance}%`} icon={Users} bg="bg-purple-50" text="text-purple-600" />
        <StatCard label="En riesgo" value={counts.atRisk} icon={AlertTriangle} bg="bg-red-50" text="text-red-600" />
      </StatCardGrid>

      <div className="flex flex-wrap gap-3 items-center">
        <FilterPills
          value={gradeFilter}
          onChange={(g) => { setGradeFilter(g); setSectionFilter("all"); setPage(1); }}
          options={[
            { value: "all", label: "Todos" },
            ...ADMIN_GRADES.map((g) => ({ value: g, label: g })),
          ]}
        />
        {gradeFilter !== "all" && (
          <FilterPills
            value={sectionFilter}
            onChange={(s) => { setSectionFilter(s); setPage(1); }}
            activeClass="bg-[#2563EB] text-white"
            options={[
              { value: "all", label: "Todas" },
              ...availableSections.map((sec) => ({ value: sec, label: sec })),
            ]}
          />
        )}
        <FilterPills
          value={statusFilter}
          onChange={(s) => { setStatusFilter(s); setPage(1); }}
          options={[
            { value: "all", label: "Todos" },
            { value: "activo", label: "activo" },
            { value: "retirado", label: "retirado" },
            { value: "trasladado", label: "trasladado" },
          ]}
        />
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Nombre, DNI o apoderado..."
          label="Buscar alumnos"
        />
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState label="Cargando alumnos..." className="py-12" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
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
                const level = levelFromScore(st.avg_grade);
                const isAtRisk = (st.avg_grade !== null && st.avg_grade < 11) || (st.attendance_rate !== null && st.attendance_rate < 80);
                const rowNum = (page - 1) * 50 + idx + 1;
                return (
                  <TableRow key={st.id} className={`hover:bg-gray-50/50 transition-colors ${isAtRisk ? "bg-red-50/20" : ""}`}>
                    <TableCell className="pl-5 text-xs text-muted-foreground font-medium">{String(rowNum).padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">{st.initials}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{st.name}</p>
                          <p className="text-[11px] text-muted-foreground">DNI {st.dni}</p>
                          {isAtRisk && <span className="sr-only">Alumno en riesgo académico o de asistencia</span>}
                        </div>
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
                    <TableCell className="text-center hidden sm:table-cell"><Badge className={`text-[11px] font-bold border-0 ${levelBadgeClass(level)} hover:opacity-90`}>{level ?? "—"}</Badge></TableCell>
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
                                  onClick={() => setPendingStatus({ student: st, status: s })}
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
                            onClick={() => setPendingUnlink(st)}
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
          <PaginationBar
            page={page}
            totalPages={pagination.totalPages}
            shown={students.length}
            total={pagination.total}
            loading={loading}
            onPage={setPage}
            noun="alumnos"
          />
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={showNew} onClose={() => !saving && setShowNew(false)} titleId="new-student-title" closable={!saving}>
        <div className="flex items-center justify-between">
          <h2 id="new-student-title" className="text-xl font-bold text-[#1E2A5E]">Nuevo alumno</h2>
          <ModalCloseButton onClose={() => setShowNew(false)} disabled={saving} />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="draft-dni" className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">DNI</label>
            <input
              id="draft-dni"
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
            <label htmlFor="draft-name" className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Nombre completo</label>
            <input
              id="draft-name"
              type="text"
              value={draft.fullName}
              onChange={(e) => { setDraft((d) => ({ ...d, fullName: e.target.value })); setFormError(""); }}
              placeholder="Apellidos y nombres"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="draft-grade" className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Grado</label>
              <select
                id="draft-grade"
                value={draft.grade}
                onChange={(e) => { setDraft((d) => ({ ...d, grade: e.target.value, section: "" })); setFormError(""); }}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
              >
                {ADMIN_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="draft-section" className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sección</label>
              <select
                id="draft-section"
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
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Turno</p>
            <FilterPills
              value={draft.shift}
              onChange={(t) => setDraft((d) => ({ ...d, shift: t }))}
              options={[
                { value: "Mañana", label: "Mañana" },
                { value: "Tarde", label: "Tarde" },
              ]}
            />
          </div>
        </div>
        {formError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={() => setShowNew(false)} disabled={saving} className="flex-1">Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear alumno"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} titleId="student-detail-title">
        {detail && (
          <>
            <div className="flex items-center justify-between">
              <h2 id="student-detail-title" className="text-xl font-bold text-[#1E2A5E]">Detalle del alumno</h2>
              <ModalCloseButton onClose={() => setDetail(null)} />
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleDownloadLibreta(detail.id)} disabled={downloadingLibreta} className="flex-1 gap-2">
                {downloadingLibreta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar libreta
              </Button>
              <Button variant="outline" onClick={() => setDetail(null)} className="flex-1">Cerrar</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingUnlink}
        onClose={() => setPendingUnlink(null)}
        title="Desvincular apoderado"
        description={pendingUnlink ? `¿Desvincular al apoderado de ${pendingUnlink.name}?` : undefined}
        confirmLabel="Desvincular"
        loading={rowBusy === pendingUnlink?.id}
        onConfirm={() => {
          if (!pendingUnlink) return;
          const st = pendingUnlink;
          setPendingUnlink(null);
          handlePatch(st.id, { unlinkParent: true }, `Apoderado desvinculado de ${st.name}.`);
        }}
      />

      <ConfirmDialog
        open={!!pendingStatus}
        onClose={() => setPendingStatus(null)}
        title="Cambiar estado"
        description={
          pendingStatus
            ? `¿Cambiar el estado de ${pendingStatus.student.name} a "${pendingStatus.status}"?`
            : undefined
        }
        confirmLabel="Cambiar"
        tone="primary"
        loading={rowBusy === pendingStatus?.student.id}
        onConfirm={() => {
          if (!pendingStatus) return;
          const { student, status } = pendingStatus;
          setPendingStatus(null);
          handlePatch(student.id, { status }, `Estado de ${student.name} actualizado a "${status}".`);
        }}
      />
    </div>
  );
}
