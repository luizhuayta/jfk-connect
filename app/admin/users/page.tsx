"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, GraduationCap, UserCog, ShieldCheck, Plus, CheckCircle2, XCircle, Edit, Trash2, Power, Loader2, Clock, CalendarDays } from "lucide-react";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { sectionShift } from "@/lib/section-shift";
import { useCurriculum } from "@/lib/curriculum/client";
import { getInitials } from "@/lib/format";
import { apiGet, apiSend } from "@/lib/client/api";
import { formatAdminDate } from "@/lib/admin/theme";
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

type Role = "admin" | "docente" | "padre";

interface TeacherSection {
  grade: string;
  section: string;
  shift: string;
}

interface UserRecord {
  id: string; email: string; full_name: string; role: Role;
  phone: string | null; is_active: boolean; created_at: string;
  last_login_at: string | null; avatar_url: string | null;
  subject: string | null; shift_preference: string | null;
  sections?: TeacherSection[];
}

interface ScheduleEntry {
  id: string;
  grade: string;
  section: string;
  day: string;
  period: number;
  time: string;
  subject: string;
  room: string | null;
}

interface UserCounts {
  total: number;
  admin: number;
  docente: number;
  padre: number;
  activo: number;
  inactivo: number;
}

const EMPTY_COUNTS: UserCounts = {
  total: 0, admin: 0, docente: 0, padre: 0, activo: 0, inactivo: 0,
};

const DAY_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const ROLE_META: Record<Role, { label: string; badge: string; icon: typeof Users }> = {
  admin:   { label: "Administrador",   badge: "bg-[#1E2A5E] text-white", icon: ShieldCheck },
  docente: { label: "Docente",         badge: "bg-blue-100 text-blue-700", icon: GraduationCap },
  padre:   { label: "Padre/Apoderado", badge: "bg-amber-100 text-amber-700", icon: UserCog },
};

function parseUsersPayload(d: Record<string, unknown> & { ok: true }) {
  return {
    users: (d.users ?? []) as UserRecord[],
    pagination: d.pagination as AdminPagination,
    counts: (d.counts as UserCounts | undefined) ?? EMPTY_COUNTS,
  };
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "inactivo">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "50");
  if (roleFilter !== "all") params.set("role", roleFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (debouncedQuery) params.set("q", debouncedQuery);

  const { data, loading, error, reload } = useAdminResource(
    `/api/admin/users?${params}`,
    parseUsersPayload,
  );
  const users = data?.users ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 };
  const counts = data?.counts ?? EMPTY_COUNTS;

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<UserRecord | null>(null);
  const [showDelete, setShowDelete] = useState<UserRecord | null>(null);
  const [pendingToggle, setPendingToggle] = useState<UserRecord | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", role: "docente" as Role, phone: "", subject: "", shiftPreference: "Ambos" as string });
  const [editForm, setEditForm] = useState({ fullName: "", role: "docente" as Role, phone: "", isActive: true, subject: "" as string, shiftPreference: "Ambos" as string });
  const [actionLoading, setActionLoading] = useState(false);
  const { areas } = useCurriculum();
  const subjects = areas.filter((a) => !a.isTransversal).map((a) => a.name);
  const [showSchedule, setShowSchedule] = useState<UserRecord | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      setShowCreate(true);
    }
  }, []);

  const handleCreate = async () => {
    if (!form.fullName || !form.email) { toast.error("Nombre y email son obligatorios"); return; }
    if (form.role === "docente" && !form.subject) { toast.error("La asignatura es obligatoria para docentes"); return; }
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { fullName: form.fullName, email: form.email, role: form.role, phone: form.phone || undefined };
      if (form.role === "docente") { body.subject = form.subject; body.shiftPreference = form.shiftPreference; }
      const data = await apiSend("/api/admin/users", "POST", body);
      setShowCreate(false);
      setForm({ fullName: "", email: "", role: "docente", phone: "", subject: "", shiftPreference: "Ambos" });
      setTempPwd(typeof data.tempPassword === "string" ? data.tempPassword : null);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  const openEdit = (u: UserRecord) => {
    setEditForm({
      fullName: u.full_name, role: u.role, phone: u.phone ?? "",
      isActive: u.is_active, subject: u.subject ?? "",
      shiftPreference: u.shift_preference ?? "Ambos",
    });
    setShowEdit(u);
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        fullName: editForm.fullName, role: editForm.role,
        phone: editForm.phone || undefined, isActive: editForm.isActive,
      };
      if (editForm.role === "docente") {
        body.subject = editForm.subject || undefined;
        body.shiftPreference = editForm.shiftPreference;
      }
      await apiSend(`/api/admin/users/${showEdit.id}`, "PATCH", body);
      setShowEdit(null);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  const handleToggleActive = async () => {
    if (!pendingToggle) return;
    setActionLoading(true);
    try {
      await apiSend(`/api/admin/users/${pendingToggle.id}`, "PATCH", { isActive: !pendingToggle.is_active });
      setPendingToggle(null);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  const openSchedule = async (u: UserRecord) => {
    setShowSchedule(u);
    setScheduleEntries([]);
    setScheduleError(null);
    setScheduleLoading(true);
    try {
      const data = await apiGet(`/api/admin/teachers/${u.id}/schedule`);
      setScheduleEntries((data.entries as ScheduleEntry[]) ?? []);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : "Error al cargar el horario");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setActionLoading(true);
    try {
      await apiSend(`/api/admin/users/${showDelete.id}`, "DELETE");
      setShowDelete(null);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Usuarios"
        subtitle="Gestión de cuentas del sistema"
        action={
          <Button onClick={() => setShowCreate(true)} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard label="Total usuarios" value={counts.total} icon={Users} bg="bg-[#1E2A5E]/5" text="text-[#1E2A5E]" />
        <StatCard label="Docentes" value={counts.docente} icon={GraduationCap} bg="bg-blue-50" text="text-blue-700" />
        <StatCard label="Padres/Apoderados" value={counts.padre} icon={UserCog} bg="bg-amber-50" text="text-amber-700" />
        <StatCard label="Activos" value={counts.activo} icon={CheckCircle2} bg="bg-emerald-50" text="text-emerald-700" />
      </StatCardGrid>

      <div className="flex items-center gap-3 flex-wrap">
        <FilterPills
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v); setPage(1); }}
          options={[
            { value: "all", label: "Todos", count: counts.total },
            { value: "admin", label: ROLE_META.admin.label, count: counts.admin },
            { value: "docente", label: ROLE_META.docente.label, count: counts.docente },
            { value: "padre", label: ROLE_META.padre.label, count: counts.padre },
          ]}
        />
        <FilterPills
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: "all", label: "Todos" },
            { value: "activo", label: "activo" },
            { value: "inactivo", label: "inactivo" },
          ]}
        />
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setPage(1); }}
          placeholder="Buscar..."
          label="Buscar usuarios"
        />
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <LoadingState label="Cargando usuarios..." className="py-12" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
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
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-xs font-medium text-[#0F172A]">{u.subject}</p>
                              {u.shift_preference && (
                                <p className="text-[11px] text-muted-foreground">{u.shift_preference}</p>
                              )}
                            </div>
                            {u.sections && u.sections.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {u.sections.slice(0, 3).map((s) => (
                                  <span
                                    key={`${s.grade}-${s.section}`}
                                    className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5"
                                  >
                                    {s.grade} &quot;{s.section}&quot;
                                  </span>
                                ))}
                                {u.sections.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    +{u.sections.length - 3} más
                                  </span>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => openSchedule(u)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E2A5E] hover:underline"
                            >
                              <Clock className="h-3 w-3" /> Ver horario
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{u.phone ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{formatAdminDate(u.last_login_at)}</TableCell>
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
                          <button onClick={() => setPendingToggle(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? "hover:bg-amber-50 text-amber-600" : "hover:bg-emerald-50 text-emerald-600"}`} title={u.is_active ? "Desactivar" : "Activar"} aria-label={u.is_active ? "Desactivar" : "Activar"}><Power className="h-4 w-4" /></button>
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
            <PaginationBar
              page={page}
              totalPages={pagination.totalPages}
              shown={users.length}
              total={pagination.total}
              loading={loading}
              onPage={setPage}
              noun={pagination.total !== 1 ? "usuarios" : "usuario"}
            />
          )}
        </CardContent>
      </Card>

      <Modal open={showCreate} onClose={() => !actionLoading && setShowCreate(false)} titleId="create-user-title" closable={!actionLoading}>
        <div className="flex items-center justify-between">
          <h2 id="create-user-title" className="text-xl font-bold text-[#1E2A5E]">Nuevo usuario</h2>
          <ModalCloseButton onClose={() => setShowCreate(false)} disabled={actionLoading} />
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
      </Modal>

      <Modal open={!!showEdit} onClose={() => !actionLoading && setShowEdit(null)} titleId="edit-user-title" closable={!actionLoading}>
        {showEdit && (
          <>
            <div className="flex items-center justify-between">
              <h2 id="edit-user-title" className="text-xl font-bold text-[#1E2A5E]">Editar usuario</h2>
              <ModalCloseButton onClose={() => setShowEdit(null)} disabled={actionLoading} />
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
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Eliminar usuario"
        description="Esta acción no se puede deshacer"
        confirmLabel="Sí, eliminar"
        loading={actionLoading}
        onConfirm={handleDelete}
      >
        {showDelete && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p><strong>{showDelete.full_name}</strong></p>
            <p className="text-muted-foreground text-xs">{showDelete.email}</p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        title={pendingToggle?.is_active ? "Desactivar usuario" : "Activar usuario"}
        description={
          pendingToggle?.is_active
            ? `¿Desactivar a ${pendingToggle.full_name}? No podrá iniciar sesión.`
            : `¿Activar a ${pendingToggle?.full_name}?`
        }
        confirmLabel={pendingToggle?.is_active ? "Desactivar" : "Activar"}
        tone={pendingToggle?.is_active ? "danger" : "primary"}
        loading={actionLoading}
        onConfirm={handleToggleActive}
      />

      <Modal open={!!tempPwd} onClose={() => setTempPwd(null)} titleId="temp-pwd-title">
        <div className="flex items-center justify-between">
          <h2 id="temp-pwd-title" className="text-xl font-bold text-emerald-600">¡Usuario creado!</h2>
          <ModalCloseButton onClose={() => setTempPwd(null)} />
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">Comparte esta contraseña temporal con el usuario:</p>
          <code className="block bg-white p-2 rounded text-lg font-mono text-center border border-amber-200">{tempPwd}</code>
          <p className="text-xs mt-2">El usuario podrá cambiarla al iniciar sesión.</p>
        </div>
        <Button onClick={() => setTempPwd(null)} className="w-full bg-[#1E2A5E] text-white hover:bg-[#162043]">Entendido</Button>
      </Modal>

      <Modal
        open={!!showSchedule}
        onClose={() => setShowSchedule(null)}
        titleId="schedule-title"
        className="max-w-2xl max-h-[85vh] flex flex-col p-0 space-y-0 overflow-hidden"
      >
        {showSchedule && (
          <>
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <h2 id="schedule-title" className="text-xl font-bold text-[#1E2A5E] flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" /> Horario
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{showSchedule.full_name} · {showSchedule.subject ?? "—"}</p>
              </div>
              <ModalCloseButton onClose={() => setShowSchedule(null)} />
            </div>
            <div className="overflow-y-auto p-6 pt-4">
              {scheduleLoading ? (
                <LoadingState label="Cargando horario..." className="py-10" />
              ) : scheduleError ? (
                <ErrorState message={scheduleError} onRetry={() => openSchedule(showSchedule)} />
              ) : scheduleEntries.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Este docente no tiene horas asignadas en el horario.
                </div>
              ) : (
                <div className="space-y-5">
                  {DAY_ORDER.filter((day) => scheduleEntries.some((e) => e.day === day)).map((day) => (
                    <div key={day}>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1E2A5E] mb-2">{day}</p>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="text-[11px] font-semibold text-[#0F172A]">Hora</TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#0F172A]">Sección</TableHead>
                            <TableHead className="text-[11px] font-semibold text-[#0F172A]">Aula</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scheduleEntries
                            .filter((e) => e.day === day)
                            .sort((a, b) => {
                              const shiftDiff = (sectionShift(a.section) === "Tarde" ? 1 : 0) - (sectionShift(b.section) === "Tarde" ? 1 : 0);
                              return shiftDiff !== 0 ? shiftDiff : a.period - b.period;
                            })
                            .map((e) => (
                              <TableRow key={e.id} className="hover:bg-gray-50/50">
                                <TableCell className="text-xs text-[#0F172A] font-medium py-2">{e.time}</TableCell>
                                <TableCell className="text-xs text-[#0F172A] py-2">{e.grade} &quot;{e.section}&quot;</TableCell>
                                <TableCell className="text-xs text-muted-foreground py-2">{e.room ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
