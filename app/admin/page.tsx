"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Users,
  UserCog,
  TrendingUp,
  Plus,
  Bell,
  Loader2,
} from "lucide-react";
import AttendanceChart from "@/components/dashboard/admin/AttendanceChart";
import GradeDistributionChart from "@/components/dashboard/admin/GradeDistributionChart";

type StatsData = {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalParents: number;
    attendanceRate: number | null;
  };
  attendanceByDay: { name: string; value: number }[];
  gradeDistribution: { name: string; value: number }[];
  latestNotes: { student: string; subject: string; grade: number; date: string }[];
  pendingAnnouncements: { title: string; date: string; priority: string }[];
};

const upcomingEvents = [
  { title: "Día del Logro", date: "2026-05-28" },
  { title: "Dia del maestro", date: "2026-07-06" },
  { title: "Ceremonia de graduacion", date: "2026-12-15" },
];

const quickActions = [
  { label: "Nueva Matricula", href: "/admin/enrollment", open: "nueva=1", icon: Plus, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { label: "Registrar Usuario", href: "/admin/users", open: "nuevo=1", icon: Plus, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Generar Reporte", href: "/admin/reports", icon: Plus, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "Enviar Aviso", href: "/admin/announcements", open: "nuevo=1", icon: Plus, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("notas");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/stats");
        const d = await r.json();
        if (!d.ok) throw new Error(d.error);
        setData(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = data
    ? [
        {
          label: "Total Alumnos",
          value: String(data.stats.totalStudents),
          icon: GraduationCap,
          iconBg: "bg-blue-50",
          iconColor: "text-blue-500",
          borderColor: "border-l-blue-500",
        },
        {
          label: "Total Profesores",
          value: String(data.stats.totalTeachers),
          icon: Users,
          iconBg: "bg-purple-50",
          iconColor: "text-purple-500",
          borderColor: "border-l-purple-500",
        },
        {
          label: "Padres Registrados",
          value: String(data.stats.totalParents),
          icon: UserCog,
          iconBg: "bg-orange-50",
          iconColor: "text-orange-500",
          borderColor: "border-l-orange-500",
        },
        {
          label: "Tasa de Asistencia",
          value: data.stats.attendanceRate !== null ? `${data.stats.attendanceRate}%` : "—",
          icon: TrendingUp,
          iconBg: "bg-emerald-50",
          iconColor: "text-emerald-500",
          borderColor: "border-l-emerald-500",
          showProgress: true,
          progressValue: data.stats.attendanceRate ?? 0,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">
          Bienvenido al Panel Administrativo
        </h1>
        <p className="text-muted-foreground mt-2 capitalize">
          {today}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-full py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
          </div>
        ) : (
          stats.map((stat) => (
            <Card
              key={stat.label}
              className={`border-none shadow-sm rounded-xl border-l-4 ${stat.borderColor}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-[#0F172A]">{stat.value}</p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                {stat.showProgress && (
                  <div className="mt-3">
                    <Progress value={stat.progressValue} className="h-1.5" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Section */}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm rounded-xl">
            <CardContent className="p-6">
              <h2 className="text-base font-bold text-[#0F172A] mb-4">
                Asistencia del Mes
              </h2>
              <AttendanceChart data={data.attendanceByDay} />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-xl">
            <CardContent className="p-6">
              <h2 className="text-base font-bold text-[#0F172A] mb-4">
                Distribucion de Calificaciones
              </h2>
              <GradeDistributionChart data={data.gradeDistribution} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Section */}
      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6">
          <div className="bg-gray-50 rounded-lg p-1 mb-6">
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "notas", label: "Ultimas Notas" },
                { id: "avisos", label: "Avisos Pendientes" },
                { id: "eventos", label: "Proximos Eventos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "notas" && (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-[#0F172A] font-semibold text-sm">
                      Estudiante
                    </TableHead>
                    <TableHead className="text-[#0F172A] font-semibold text-sm">
                      Asignatura
                    </TableHead>
                    <TableHead className="text-[#0F172A] font-semibold text-sm text-center">
                      Calificacion
                    </TableHead>
                    <TableHead className="text-right text-[#0F172A] font-semibold text-sm">
                      Fecha
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.latestNotes ?? []).map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50/50">
                      <TableCell className="text-sm font-medium text-[#0F172A]">
                        {row.student}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.subject}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-medium text-xs">
                          {row.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {row.date}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "avisos" && (
            <div className="space-y-3">
              {(data?.pendingAnnouncements ?? []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge
                    className={`text-xs ${
                      item.priority === "Alta"
                        ? "bg-red-50 text-red-600 hover:bg-red-50"
                        : item.priority === "Media"
                        ? "bg-amber-50 text-amber-600 hover:bg-amber-50"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {activeTab === "eventos" && (
            <div className="space-y-3">
              {upcomingEvents.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-blue-200 text-blue-600 bg-blue-50"
                  >
                    Proximo
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rapidas */}
      <section>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">
          Acciones Rapidas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.label}
              onClick={() => router.push(action.open ? `${action.href}?${action.open}` : action.href)}
              className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer rounded-xl"
            >
              <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.iconBg}`}
                >
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <p className="text-xs font-semibold text-[#0F172A]">
                  {action.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
