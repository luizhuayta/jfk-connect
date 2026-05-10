"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, GraduationCap, UserCog, ShieldCheck,
  Search, Plus, MoreHorizontal, CheckCircle2, XCircle,
} from "lucide-react";
import { mockAdminUsers, type AdminUserRole, type AdminUserRecord } from "@/data/mock";

const ROLE_META: Record<AdminUserRole, { label: string; badge: string; icon: typeof Users }> = {
  admin:   { label: "Administrador", badge: "bg-[#1E2A5E] text-white",          icon: ShieldCheck  },
  docente: { label: "Docente",       badge: "bg-blue-100 text-blue-700",         icon: GraduationCap},
  padre:   { label: "Padre/Apoderado",badge: "bg-amber-100 text-amber-700",     icon: UserCog      },
};

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "inactivo">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    all:     mockAdminUsers.length,
    admin:   mockAdminUsers.filter((u) => u.role === "admin").length,
    docente: mockAdminUsers.filter((u) => u.role === "docente").length,
    padre:   mockAdminUsers.filter((u) => u.role === "padre").length,
    activo:  mockAdminUsers.filter((u) => u.status === "activo").length,
    inactivo:mockAdminUsers.filter((u) => u.status === "inactivo").length,
  }), []);

  const filtered = useMemo(() => {
    return mockAdminUsers.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (query && !u.name.toLowerCase().includes(query.toLowerCase()) &&
          !u.email.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [roleFilter, statusFilter, query]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de cuentas del sistema — docentes, padres y administradores
          </p>
        </div>
        <Button className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total usuarios",   value: counts.all,     bg: "bg-[#1E2A5E]/5",  text: "text-[#1E2A5E]",   icon: Users        },
          { label: "Docentes",         value: counts.docente, bg: "bg-blue-50",       text: "text-blue-700",    icon: GraduationCap},
          { label: "Padres/Apoderados",value: counts.padre,   bg: "bg-amber-50",      text: "text-amber-700",   icon: UserCog      },
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Role */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "admin", "docente", "padre"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roleFilter === r
                  ? "bg-[#1E2A5E] text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {r === "all" ? "Todos" : ROLE_META[r].label}
              <span className="ml-1.5 opacity-70">
                {r === "all" ? counts.all : counts[r]}
              </span>
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "activo", "inactivo"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                statusFilter === s
                  ? "bg-[#1E2A5E] text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-64 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-[#0F172A] font-semibold text-sm pl-5">Usuario</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm">Rol</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm hidden md:table-cell">Cargo / Vinculación</TableHead>
                <TableHead className="text-[#0F172A] font-semibold text-sm hidden lg:table-cell">Último acceso</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const meta = ROLE_META[u.role];
                const RoleIcon = meta.icon;
                return (
                  <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-[#1E2A5E] text-white text-[10px] font-bold">
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[11px] font-bold border-0 gap-1 ${meta.badge} hover:opacity-90`}>
                        <RoleIcon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {u.extra ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {fmtDate(u.lastLogin)}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.status === "activo" ? (
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
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No se encontraron usuarios
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {mockAdminUsers.length} usuarios
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
