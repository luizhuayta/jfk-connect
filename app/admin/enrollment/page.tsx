"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle2, AlertTriangle, XCircle, Search, Plus, MoreHorizontal, CalendarDays, Loader2, Eye, Wallet, X, Hash, Copy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Enrollment = {
  id: string; studentId: string; studentName: string; initials: string; dni: string;
  grade: string; section: string; code: string; year: number; enrolledAt: string;
  enrollmentStatus: "regular" | "condicional" | "pendiente";
  docsTotal: number; docsSubmitted: number;
  apafaPaid: boolean; apafaAmount: number;
  actividadesPaid: boolean; actividadesAmount: number;
  lastPaymentDate: string | null;
};

type StatusFilter = "all" | "regular" | "condicional" | "pendiente";
type PayFilter = "all" | "completo" | "parcial" | "pendiente";

const STATUS_META = {
  regular: { label: "Regular", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  condicional: { label: "Condicional", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  pendiente: { label: "Pendiente", cls: "bg-red-100 text-red-600 border-red-200" },
};

function payStatus(e: Enrollment): "completo" | "parcial" | "pendiente" {
  if (e.apafaPaid && e.actividadesPaid) return "completo";
  if (e.apafaPaid || e.actividadesPaid) return "parcial";
  return "pendiente";
}
function fmtDate(iso: string) { return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }

type StudentHit = { id: string; name: string; dni: string; grade: string; section: string };
type EditDraft = { status: "regular" | "condicional" | "pendiente"; docsSubmitted: number; apafaPaid: boolean; actividadesPaid: boolean };

export default function AdminEnrollmentPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // ─── Sprint 7: nueva matrícula + acciones por fila ─────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<StudentHit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ code: string; studentName: string } | null>(null);
  const [detail, setDetail] = useState<Enrollment | null>(null);
  const [editTarget, setEditTarget] = useState<Enrollment | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadEnrollments = async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "50");
      if (query) params.set("q", query);
      const r = await fetch(`/api/admin/enrollments?${params}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setItems(data.enrollments);
      setPagination(data.pagination);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEnrollments(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    const t = setTimeout(() => loadEnrollments(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Buscar alumnos activos para el modal de nueva matrícula (debounce)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!showNew || searchQ.trim().length < 2) { setHits([]); return; }
      setSearching(true);
      try {
        const r = await fetch(`/api/admin/students?status=activo&limit=8&q=${encodeURIComponent(searchQ.trim())}`);
        const data = await r.json();
        if (data.ok) setHits(data.students.map((s: { id: string; name: string; dni: string; grade: string; section: string }) => ({ id: s.id, name: s.name, dni: s.dni, grade: s.grade, section: s.section })));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, showNew]);

  function openNew() {
    setSearchQ("");
    setHits([]);
    setSelected(null);
    setFormError("");
    setCreated(null);
    setShowNew(true);
  }

  async function handleCreateEnrollment() {
    if (!selected) { setFormError("Selecciona un alumno de la lista."); return; }
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected.id }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setCreated({ code: data.enrollment.code, studentName: data.enrollment.studentName });
      await loadEnrollments(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al generar la matrícula");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(e: Enrollment) {
    setEditTarget(e);
    setEditDraft({ status: e.enrollmentStatus, docsSubmitted: e.docsSubmitted, apafaPaid: e.apafaPaid, actividadesPaid: e.actividadesPaid });
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editTarget || !editDraft) return;
    setEditSaving(true);
    setEditError("");
    try {
      const r = await fetch(`/api/admin/enrollments/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setEditTarget(null);
      setEditDraft(null);
      setActionMsg(`Matrícula ${editTarget.code} actualizada.`);
      await loadEnrollments(page);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setEditSaving(false);
    }
  }

  const counts = useMemo(() => ({
    regular: items.filter((e) => e.enrollmentStatus === "regular").length,
    condicional: items.filter((e) => e.enrollmentStatus === "condicional").length,
    pendiente: items.filter((e) => e.enrollmentStatus === "pendiente").length,
    completo: items.filter((e) => payStatus(e) === "completo").length,
    parcial: items.filter((e) => payStatus(e) === "parcial").length,
    payPendiente: items.filter((e) => payStatus(e) === "pendiente").length,
    totalApafa: items.filter((e) => e.apafaPaid).length * 50,
    totalActividades: items.filter((e) => e.actividadesPaid).length * 30,
  }), [items]);

  const filtered = useMemo(() => items.filter((e) => {
    if (statusFilter !== "all" && e.enrollmentStatus !== statusFilter) return false;
    if (payFilter !== "all" && payStatus(e) !== payFilter) return false;
    return true;
  }), [items, statusFilter, payFilter]);

  if (loading) { return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" /><p className="text-sm text-muted-foreground mt-2">Cargando matrículas...</p></div>; }
  if (error) { return <div className="py-16 text-center text-red-600 text-sm">{error}</div>; }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Matrículas y Pagos</h1>
          <p className="text-muted-foreground mt-1">Estado de matrícula y contribuciones APAFA · Año Lectivo 2026</p>
        </div>
        <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"><Plus className="h-4 w-4" />Nueva matrícula</Button>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {actionMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Matrículas regulares", value: counts.regular, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Condicionales", value: counts.condicional, icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-600" },
          { label: "Pendientes", value: counts.pendiente, icon: XCircle, bg: "bg-red-50", text: "text-red-600" },
          { label: "Pagos al día", value: counts.completo, icon: FileText, bg: "bg-blue-50", text: "text-[#2563EB]" },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}><s.icon className={`h-5 w-5 ${s.text}`} /></div>
              <div><p className="text-2xl font-bold text-[#0F172A]">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl bg-[#1E2A5E] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Recaudación acumulada</p>
          <p className="text-2xl font-bold text-[#F4C15C] mt-0.5">S/ {(counts.totalApafa + counts.totalActividades).toLocaleString("es-PE")}</p>
        </div>
        <div className="flex gap-6">
          <div className="text-center"><p className="text-white text-lg font-bold">S/ {counts.totalApafa.toLocaleString("es-PE")}</p><p className="text-white/60 text-xs">APAFA (S/ 50 c/u)</p></div>
          <div className="text-center"><p className="text-white text-lg font-bold">S/ {counts.totalActividades.toLocaleString("es-PE")}</p><p className="text-white/60 text-xs">Actividades (S/ 30 c/u)</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "regular", "condicional", "pendiente"] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{s === "all" ? "Todos" : s}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "completo", "parcial", "pendiente"] as PayFilter[]).map((p) => (
            <button key={p} onClick={() => setPayFilter(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${payFilter === p ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{p === "all" ? "Todos los pagos" : p}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Nombre o DNI..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-56 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]" />
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-[#0F172A] font-semibold text-sm pl-5">Alumno</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Grado</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm hidden md:table-cell">Código</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Matrícula</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden sm:table-cell">Docs</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">APAFA</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Actividades</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Últ. pago</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm pr-5">Acc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const smeta = STATUS_META[e.enrollmentStatus];
                const docPct = e.docsTotal ? Math.round((e.docsSubmitted / e.docsTotal) * 100) : 0;
                const isAtRisk = e.enrollmentStatus !== "regular" || !e.apafaPaid;
                return (
                  <TableRow key={e.id} className={`hover:bg-gray-50/50 transition-colors ${isAtRisk ? "bg-amber-50/20" : ""}`}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-[#1E2A5E] text-white text-[10px] font-bold">{e.initials}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-semibold text-[#0F172A]">{e.studentName}</p><p className="text-[10px] text-muted-foreground">DNI {e.dni}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className="text-[10px] font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10">{e.grade} &quot;{e.section}&quot;</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono hidden md:table-cell">{e.code}</TableCell>
                    <TableCell className="text-center"><span className={`text-[11px] font-bold border rounded-full px-2.5 py-0.5 ${smeta.cls}`}>{smeta.label}</span></TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-bold ${docPct === 100 ? "text-emerald-600" : "text-amber-600"}`}>{e.docsSubmitted}/{e.docsTotal}</span>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${docPct === 100 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${docPct}%` }} /></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {e.apafaPaid ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />S/ 50</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500"><XCircle className="h-3.5 w-3.5" />Debe</span>}
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      {e.actividadesPaid ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />S/ 30</span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Debe</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground hidden lg:table-cell">
                      {e.lastPaymentDate ? <span className="flex items-center gap-1 justify-center"><CalendarDays className="h-3 w-3" />{fmtDate(e.lastPaymentDate)}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-center pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors outline-none">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem onClick={() => openEdit(e)} className="gap-2 cursor-pointer">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600" /> Editar pagos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDetail(e)} className="gap-2 cursor-pointer">
                            <Eye className="h-3.5 w-3.5 text-[#2563EB]" /> Ver detalle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No se encontraron registros con ese criterio</div>}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {pagination.total} matrículas</p>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => loadEnrollments(page - 1)} className="h-8 px-3">← Anterior</Button>
                <span className="text-xs text-muted-foreground font-medium">Página {page} de {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages || loading} onClick={() => loadEnrollments(page + 1)} className="h-8 px-3">Siguiente →</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Nueva matrícula */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Nueva matrícula</h2>
              <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            {created ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Matrícula generada para</p>
                  <p className="text-base font-bold text-[#0F172A] mt-0.5">{created.studentName}</p>
                </div>
                <div className="rounded-xl bg-[#1E2A5E]/5 border border-[#1E2A5E]/15 p-4 text-center">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide flex items-center justify-center gap-1"><Hash className="h-3 w-3" /> Código de matrícula</p>
                  <p className="text-xl font-bold font-mono text-[#1E2A5E] mt-1">{created.code}</p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(created.code)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copiar código
                  </button>
                </div>
                <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Entrega este código al apoderado: lo usará para vincular a su hijo desde la app.
                </p>
                <Button onClick={() => setShowNew(false)} className="w-full bg-[#1E2A5E] text-white hover:bg-[#162043]">Listo</Button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Buscar alumno (nombre o DNI)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQ}
                      onChange={(e) => { setSearchQ(e.target.value); setSelected(null); setFormError(""); }}
                      placeholder="Escribe al menos 2 caracteres..."
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A]"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="min-h-28">
                  {searching ? (
                    <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1E2A5E]" /></div>
                  ) : hits.length > 0 ? (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {hits.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => { setSelected(h); setFormError(""); }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-left transition-all ${selected?.id === h.id ? "border-[#2563EB] bg-[#2563EB]/5" : "border-gray-100 hover:border-[#2563EB]/30"}`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{h.name}</p>
                            <p className="text-[11px] text-muted-foreground">DNI {h.dni}</p>
                          </div>
                          <Badge className="text-[10px] font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10">{h.grade} &quot;{h.section}&quot;</Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {searchQ.trim().length < 2 ? "Los resultados aparecerán aquí." : "Sin resultados con ese criterio."}
                    </p>
                  )}
                </div>

                {formError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setShowNew(false)} disabled={saving} className="flex-1">Cancelar</Button>
                  <Button onClick={handleCreateEnrollment} disabled={saving || !selected} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar matrícula"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Editar pagos */}
      {editTarget && editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A5E]">Editar pagos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{editTarget.studentName} · <span className="font-mono">{editTarget.code}</span></p>
              </div>
              <button onClick={() => { setEditTarget(null); setEditDraft(null); }} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-3">
              {([
                { key: "apafaPaid" as const, label: "APAFA", amount: editTarget.apafaAmount },
                { key: "actividadesPaid" as const, label: "Actividades", amount: editTarget.actividadesAmount },
              ]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => setEditDraft((d) => d && { ...d, [p.key]: !d[p.key] })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${editDraft[p.key] ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <span className="text-sm font-semibold text-[#0F172A]">{p.label} <span className="text-muted-foreground font-normal">· S/ {p.amount}</span></span>
                  {editDraft[p.key]
                    ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Pagado</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500"><XCircle className="h-4 w-4" /> Pendiente</span>}
                </button>
              ))}

              <div className="flex items-center justify-between px-1 pt-1">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Documentos entregados</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditDraft((d) => d && { ...d, docsSubmitted: Math.max(0, d.docsSubmitted - 1) })} className="h-7 w-7 rounded-lg border border-gray-200 text-sm font-bold text-[#64748B] hover:bg-gray-50">−</button>
                  <span className="text-sm font-bold text-[#0F172A] w-8 text-center">{editDraft.docsSubmitted}/7</span>
                  <button onClick={() => setEditDraft((d) => d && { ...d, docsSubmitted: Math.min(7, d.docsSubmitted + 1) })} className="h-7 w-7 rounded-lg border border-gray-200 text-sm font-bold text-[#64748B] hover:bg-gray-50">+</button>
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Estado de matrícula</p>
                <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
                  {(["regular", "condicional", "pendiente"] as const).map((s) => (
                    <button key={s} onClick={() => setEditDraft((d) => d && { ...d, status: s })} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${editDraft.status === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            {editError && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { setEditTarget(null); setEditDraft(null); }} disabled={editSaving} className="flex-1">Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
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
              <h2 className="text-xl font-bold text-[#1E2A5E]">Detalle de matrícula</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 shrink-0"><AvatarFallback className="bg-[#1E2A5E] text-white text-sm font-bold">{detail.initials}</AvatarFallback></Avatar>
              <div>
                <p className="text-base font-bold text-[#0F172A]">{detail.studentName}</p>
                <p className="text-xs text-muted-foreground">DNI {detail.dni} · {detail.grade} &quot;{detail.section}&quot;</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Código</p><p className="font-mono font-semibold text-[#0F172A] mt-0.5">{detail.code}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Año</p><p className="font-semibold text-[#0F172A] mt-0.5">{detail.year}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Estado</p><p className="font-semibold text-[#0F172A] mt-0.5 capitalize">{detail.enrollmentStatus}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Registrada</p><p className="font-semibold text-[#0F172A] mt-0.5">{fmtDate(detail.enrolledAt)}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Documentos</p><p className="font-semibold text-[#0F172A] mt-0.5">{detail.docsSubmitted}/{detail.docsTotal}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Último pago</p><p className="font-semibold text-[#0F172A] mt-0.5">{detail.lastPaymentDate ? fmtDate(detail.lastPaymentDate) : "—"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">APAFA (S/ {detail.apafaAmount})</p><p className={`font-semibold mt-0.5 ${detail.apafaPaid ? "text-emerald-600" : "text-red-500"}`}>{detail.apafaPaid ? "Pagado" : "Pendiente"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] font-semibold text-[#64748B] uppercase">Actividades (S/ {detail.actividadesAmount})</p><p className={`font-semibold mt-0.5 ${detail.actividadesPaid ? "text-emerald-600" : "text-red-500"}`}>{detail.actividadesPaid ? "Pagado" : "Pendiente"}</p></div>
            </div>
            <Button variant="outline" onClick={() => setDetail(null)} className="w-full">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}