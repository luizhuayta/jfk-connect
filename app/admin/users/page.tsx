"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, GraduationCap, UserCog, ShieldCheck, Search, Plus, CheckCircle2, XCircle, Edit, Trash2, Power, Loader2, X } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "admin" | "docente" | "padre";

interface UserRecord {
  id: string; email: string; full_name: string; role: Role;
  phone: string | null; is_active: boolean; created_at: string;
  last_login_at: string | null; avatar_url: string | null;
  subject: string | null; shift_preference: string | null;
}

const ROLE_META: Record<Role, { label: string; badge: string; icon: typeof Users }> = {
  admin:   { label: "Administrador",   badge: "bg-[#1E2A5E] text-white", icon: ShieldCheck },
  docente: { label: "Docente",         badge: "bg-blue-100 text-blue-700", icon: GraduationCap },
  padre:   { label: "Padre/Apoderado", badge: "bg-amber-100 text-amber-700", icon: UserCog },
};

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "inactivo">("all");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<UserRecord | null>(null);
  const [showDelete, setShowDelete] = useState<UserRecord | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", role: "docente" as Role, phone: "", subject: "", shiftPreference: "Ambos" as string });
  const [editForm, setEditForm] = useState({ fullName: "", role: "docente" as Role, phone: "", isActive: true, subject: "" as string, shiftPreference: "Ambos" as string });
  const [actionLoading, setActionLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);

  // Cargar lista de asignaturas para el dropdown
  useEffect(() => {
    fetch("/api/admin/subjects").then(r => r.json()).then(d => { if (d.ok) setSubjects(d.subjects); }).catch(() => {});
  }, []);

  const loadUsers = async (targetPage: number) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (query) params.set("q", query);
      params.set("page", String(targetPage));
      params.set("limit", "50");
      const r = await fetch(`/api/admin/users?${params}`);
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setUsers(data.users);
      setPagination(data.pagination);
      setPage(targetPage);
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [roleFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => loadUsers(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  useEffect(() => {
    // El query se lee en el cliente (window): usar useSearchParams rompería el
    // prerender estático de la build (missing-suspense-with-csr-bailout).
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      setShowCreate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => ({
    all: users.length, admin: users.filter((u) => u.role === "admin").length,
    docente: users.filter((u) => u.role === "docente").length,
    padre: users.filter((u) => u.role === "padre").length,
    activo: users.filter((u) => u.is_active).length,
    inactivo: users.filter((u) => !u.is_active).length,
  }), [users]);

  const handleCreate = async () => {
    if (!form.fullName || !form.email) { toast.error("Nombre y email son obligatorios"); return; }
    if (form.role === "docente" && !form.subject) { toast.error("La asignatura es obligatoria para docentes"); return; }
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { fullName: form.fullName, email: form.email, role: form.role, phone: form.phone || undefined };
      if (form.role === "docente") { body.subject = form.subject; body.shiftPreference = form.shiftPreference; }
      const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowCreate(false);
      setForm({ fullName: "", email: "", role: "docente", phone: "", subject: "", shiftPreference: "Ambos" });
      setTempPwd(data.tempPassword);
      await loadUsers(page);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  const openEdit = (u: UserRecord) => {
    setEditForm({ fullName: u.full_name, role: u.role, phone: u.phone ?? "", isActive: u.is_active, subject: (u as UserRecord & { subject?: string }).subject ?? "", shiftPreference: (u as UserRecord & { shift_preference?: string }).shift_preference ?? "Ambos" });
    setShowEdit(u);
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { fullName: editForm.fullName, role: editForm.role, phone: editForm.phone || undefined, isActive: editForm.isActive };
      if (editForm.role === "docente") { body.subject = editForm.subject || undefined; body.shiftPreference = editForm.shiftPreference; }
      const r = await fetch(`/api/admin/users/${showEdit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowEdit(null);
      await loadUsers(page);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  const handleToggleActive = async (u: UserRecord) => {
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.is_active }) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      await loadUsers(page);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${showDelete.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowDelete(null);
      await loadUsers(page);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Gestión de cuentas del sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total usuarios",   value: counts.all,     bg: "bg-[#1E2A5E]/5",  text: "text-[#1E2A5E]",   icon: Users },
          { label: "Docentes",         value: counts.docente, bg: "bg-blue-50",       text: "text-blue-700",    icon: GraduationCap },
          { label: "Padres/Apoderados",value: counts.padre,   bg: "bg-amber-50",      text: "text-amber-700",   icon: UserCog },
          { label: "Activos",          value: counts.activo,  bg: "bg-emerald-50",    text: "text-emerald-700", icon: CheckCircle2 },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.bg} shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "admin", "docente", "padre"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${roleFilter === r ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>
              {r === "all" ? "Todos" : ROLE_META[r].label}
              <span className="ml-1.5 opacity-70">{r === "all" ? counts.all : counts[r]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "activo", "inactivo"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${statusFilter === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-64 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]" />
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState label="Cargando usuarios..." className="py-12" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadUsers(page)} />
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No se encontraron usuarios</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm pl-5">Usuario</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Rol</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm hidden sm:table-cell">Asignatura</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Último acceso</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm pr-5">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const meta = ROLE_META[u.role];
                  const RoleIcon = meta.icon;
                  return (
                    <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-[#1E2A5E] text-white text-[10px] font-bold">{getInitials(u.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{u.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[11px] font-bold border-0 gap-1 ${meta.badge} hover:opacity-90`}>
                          <RoleIcon className="h-3 w-3" />{meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {u.role === "docente" && u.subject ? (
                          <div>
                            <p className="text-xs font-medium text-[#0F172A]">{u.subject}</p>
                            {u.shift_preference && (
                              <p className="text-[11px] text-muted-foreground">{u.shift_preference}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{u.phone ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{fmtDate(u.last_login_at)}</TableCell>
                      <TableCell className="text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                            <XCircle className="h-3 w-3" /> Inactivo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Editar" aria-label="Editar"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? "hover:bg-amber-50 text-amber-600" : "hover:bg-emerald-50 text-emerald-600"}`} title={u.is_active ? "Desactivar" : "Activar"} aria-label={u.is_active ? "Desactivar" : "Activar"}><Power className="h-4 w-4" /></button>
                          <button onClick={() => setShowDelete(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Eliminar" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && users.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {users.length} de {pagination.total} usuario{pagination.total !== 1 ? "s" : ""}
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => loadUsers(page - 1)}
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
                    onClick={() => loadUsers(page + 1)}
                    className="h-8 px-3"
                  >
                    Siguiente →
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Crear */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Nuevo usuario</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">La contraseña temporal se genera aleatoriamente y se mostrará tras crear el usuario.</p>
            <div className="space-y-3">
              <div><Label className="text-[#1E2A5E]">Nombre completo *</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Ej: María González" /></div>
              <div><Label className="text-[#1E2A5E]">Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@ijfk.edu.pe" /></div>
              <div><Label className="text-[#1E2A5E]">Rol</Label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="docente">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Los padres se registran independientemente desde la página de registro.</p>
              </div>
              {form.role === "docente" && (
                <>
                  <div><Label className="text-[#1E2A5E]">Asignatura *</Label>
                    <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Selecciona una asignatura...</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  <div><Label className="text-[#1E2A5E]">Turno preferido</Label>
                    <select value={form.shiftPreference} onChange={(e) => setForm({ ...form, shiftPreference: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="Ambos">Ambos turnos</option>
                      <option value="Mañana">Solo mañana</option>
                      <option value="Tarde">Solo tarde</option>
                    </select></div>
                </>
              )}
              <div><Label className="text-[#1E2A5E]">Teléfono (opcional)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="987 654 321" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={actionLoading} className="flex-1">Cancelar</Button>
              <Button onClick={handleCreate} disabled={actionLoading} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setShowEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Editar usuario</h2>
              <button onClick={() => setShowEdit(null)} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{showEdit.email}</p>
            <div className="space-y-3">
              <div><Label className="text-[#1E2A5E]">Nombre completo</Label>
                <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
              <div><Label className="text-[#1E2A5E]">Rol</Label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="admin">Administrador</option>
                  <option value="docente">Docente</option>
                  <option value="padre">Padre/Apoderado</option>
                </select></div>
              {editForm.role === "docente" && (
                <>
                  <div><Label className="text-[#1E2A5E]">Asignatura</Label>
                    <select value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Sin asignatura</option>
                      {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  <div><Label className="text-[#1E2A5E]">Turno preferido</Label>
                    <select value={editForm.shiftPreference} onChange={(e) => setEditForm({ ...editForm, shiftPreference: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="Ambos">Ambos turnos</option>
                      <option value="Mañana">Solo mañana</option>
                      <option value="Tarde">Solo tarde</option>
                    </select></div>
                </>
              )}
              <div><Label className="text-[#1E2A5E]">Teléfono</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="987 654 321" /></div>
              <div className="flex items-center gap-2">
                <input id="isActive" type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="isActive" className="text-[#1E2A5E]">Usuario activo</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEdit(null)} disabled={actionLoading} className="flex-1">Cancelar</Button>
              <Button onClick={handleEdit} disabled={actionLoading} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setShowDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="h-6 w-6 text-red-600" /></div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Eliminar usuario</h2>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p><strong>{showDelete.full_name}</strong></p>
              <p className="text-muted-foreground text-xs">{showDelete.email}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDelete(null)} disabled={actionLoading} className="flex-1">Cancelar</Button>
              <Button onClick={handleDelete} disabled={actionLoading} className="flex-1 bg-red-600 text-white hover:bg-red-700">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Contraseña temporal */}
      {tempPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setTempPwd(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-emerald-600">¡Usuario creado!</h2>
              <button onClick={() => setTempPwd(null)} className="p-1 rounded hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Comparte esta contraseña temporal con el usuario:</p>
              <code className="block bg-white p-2 rounded text-lg font-mono text-center border border-amber-200">{tempPwd}</code>
              <p className="text-xs mt-2">El usuario podrá cambiarla al iniciar sesión.</p>
            </div>
            <Button onClick={() => setTempPwd(null)} className="w-full bg-[#1E2A5E] text-white hover:bg-[#162043]">Entendido</Button>
          </div>
        </div>
      )}
    </div>
  );
}
