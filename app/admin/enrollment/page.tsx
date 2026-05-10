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
  FileText, CheckCircle2, AlertTriangle, XCircle,
  Search, Plus, MoreHorizontal, Phone, CalendarDays,
} from "lucide-react";
import {
  mockAdminStudents,
  mockAdminEnrollments,
} from "@/data/mock";

type StatusFilter = "all" | "regular" | "condicional" | "pendiente";
type PayFilter   = "all" | "completo" | "parcial" | "pendiente";

const STATUS_META = {
  regular:     { label: "Regular",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  condicional: { label: "Condicional", cls: "bg-amber-100 text-amber-700 border-amber-200"       },
  pendiente:   { label: "Pendiente",   cls: "bg-red-100 text-red-600 border-red-200"             },
};

function payStatus(e: (typeof mockAdminEnrollments)[0]): "completo" | "parcial" | "pendiente" {
  if (e.apafaPaid && e.actividadesPaid) return "completo";
  if (e.apafaPaid || e.actividadesPaid) return "parcial";
  return "pendiente";
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function AdminEnrollmentPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payFilter, setPayFilter]       = useState<PayFilter>("all");
  const [query, setQuery] = useState("");

  const enriched = useMemo(() =>
    mockAdminStudents.map((st) => {
      const enr = mockAdminEnrollments.find((e) => e.studentId === st.id);
      return { st, enr };
    }),
    []
  );

  const counts = useMemo(() => ({
    regular:     enriched.filter(({ enr }) => enr?.enrollmentStatus === "regular").length,
    condicional: enriched.filter(({ enr }) => enr?.enrollmentStatus === "condicional").length,
    pendiente:   enriched.filter(({ enr }) => enr?.enrollmentStatus === "pendiente" || !enr).length,
    completo:    enriched.filter(({ enr }) => enr && payStatus(enr) === "completo").length,
    parcial:     enriched.filter(({ enr }) => enr && payStatus(enr) === "parcial").length,
    payPendiente:enriched.filter(({ enr }) => !enr || payStatus(enr) === "pendiente").length,
    totalApafa:  enriched.filter(({ enr }) => enr?.apafaPaid).length * 50,
    totalActividades: enriched.filter(({ enr }) => enr?.actividadesPaid).length * 30,
  }), [enriched]);

  const filtered = useMemo(() =>
    enriched.filter(({ st, enr }) => {
      if (statusFilter !== "all") {
        const actual = enr?.enrollmentStatus ?? "pendiente";
        if (actual !== statusFilter) return false;
      }
      if (payFilter !== "all") {
        const actual = enr ? payStatus(enr) : "pendiente";
        if (actual !== payFilter) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        if (!st.name.toLowerCase().includes(q) && !st.dni.includes(q)) return false;
      }
      return true;
    }),
    [enriched, statusFilter, payFilter, query]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Matrículas y Pagos</h1>
          <p className="text-muted-foreground mt-1">
            Estado de matrícula y contribuciones APAFA · Año Lectivo 2026
          </p>
        </div>
        <Button className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Matrículas regulares", value: counts.regular,     icon: CheckCircle2,  bg: "bg-emerald-50", text: "text-emerald-600" },
          { label: "Condicionales",        value: counts.condicional, icon: AlertTriangle, bg: "bg-amber-50",   text: "text-amber-600"   },
          { label: "Pendientes",           value: counts.pendiente,   icon: XCircle,       bg: "bg-red-50",     text: "text-red-600"     },
          { label: "Pagos al día",         value: counts.completo,    icon: FileText,      bg: "bg-blue-50",    text: "text-[#2563EB]"   },
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

      {/* Recaudación banner */}
      <div className="rounded-xl bg-[#1E2A5E] px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Recaudación acumulada</p>
          <p className="text-2xl font-bold text-[#F4C15C] mt-0.5">
            S/ {(counts.totalApafa + counts.totalActividades).toLocaleString("es-PE")}
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-white text-lg font-bold">S/ {counts.totalApafa.toLocaleString("es-PE")}</p>
            <p className="text-white/60 text-xs">APAFA (S/ 50 c/u)</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-bold">S/ {counts.totalActividades.toLocaleString("es-PE")}</p>
            <p className="text-white/60 text-xs">Actividades (S/ 30 c/u)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Enrollment status */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "regular", "condicional", "pendiente"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>

        {/* Pay status */}
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
          {(["all", "completo", "parcial", "pendiente"] as PayFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPayFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                payFilter === p ? "bg-[#2563EB] text-white" : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {p === "all" ? "Todos los pagos" : p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Nombre o DNI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-56 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]"
          />
        </div>
      </div>

      {/* Table */}
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
              {filtered.map(({ st, enr }) => {
                const enrollment = enr?.enrollmentStatus ?? "pendiente";
                const smeta = STATUS_META[enrollment];
                const docPct = enr ? Math.round((enr.docsSubmitted / enr.docsTotal) * 100) : 0;
                const isAtRisk = enrollment !== "regular" || (enr && !enr.apafaPaid);
                return (
                  <TableRow
                    key={st.id}
                    className={`hover:bg-gray-50/50 transition-colors ${isAtRisk ? "bg-amber-50/20" : ""}`}
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-[#1E2A5E] text-white text-[10px] font-bold">
                            {st.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{st.name}</p>
                          <p className="text-[10px] text-muted-foreground">DNI {st.dni}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] font-bold border-0 bg-[#1E2A5E]/10 text-[#1E2A5E] hover:bg-[#1E2A5E]/10">
                        {st.grade} &quot;{st.section}&quot;
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono hidden md:table-cell">
                      {enr?.code ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-[11px] font-bold border rounded-full px-2.5 py-0.5 ${smeta.cls}`}>
                        {smeta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {enr ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-xs font-bold ${docPct === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                            {enr.docsSubmitted}/{enr.docsTotal}
                          </span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${docPct === 100 ? "bg-emerald-500" : "bg-amber-400"}`}
                              style={{ width: `${docPct}%` }}
                            />
                          </div>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {enr ? (
                        enr.apafaPaid
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />S/ 50</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500"><XCircle className="h-3.5 w-3.5" />Debe</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      {enr ? (
                        enr.actividadesPaid
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />S/ 30</span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />Debe</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground hidden lg:table-cell">
                      {enr ? (
                        <span className="flex items-center gap-1 justify-center">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDate(enr.lastPaymentDate)}
                        </span>
                      ) : "—"}
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
              No se encontraron registros con ese criterio
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {mockAdminStudents.length} alumnos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
