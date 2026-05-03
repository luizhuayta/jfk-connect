"use client";

import { useState } from "react";
import Link from "next/link";
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
  FileText,
  Bell,
  BarChart3,
} from "lucide-react";
import AttendanceChart from "@/components/dashboard/admin/AttendanceChart";
import GradeDistributionChart from "@/components/dashboard/admin/GradeDistributionChart";

const stats = [
  {
    label: "Total Alumnos",
    value: "850",
    icon: GraduationCap,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    label: "Total Profesores",
    value: "45",
    icon: Users,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  {
    label: "Padres Registrados",
    value: "620",
    icon: UserCog,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    label: "Tasa de Asistencia",
    value: "94%",
    icon: TrendingUp,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    showProgress: true,
    progressValue: 94,
  },
];

const latestNotes = [
  { student: "Miguel Lopez", subject: "Matematica", grade: 18, date: "2024-01-15" },
  { student: "Ana Garcia", subject: "Fisica", grade: 17, date: "2024-01-14" },
  { student: "Carlos Rodriguez", subject: "Quimica", grade: 16, date: "2024-01-14" },
  { student: "Rosa Martinez", subject: "Historia", grade: 19, date: "2024-01-13" },
];

const pendingAnnouncements = [
  { title: "Reunion de padres", date: "2024-01-20", priority: "Alta" },
  { title: "Entrega de notas", date: "2024-01-18", priority: "Media" },
  { title: "Taller de matematicas", date: "2024-01-22", priority: "Baja" },
];

const upcomingEvents = [
  { title: "Inicio de clases", date: "2024-03-01" },
  { title: "Dia del maestro", date: "2024-07-06" },
  { title: "Ceremonia de graduacion", date: "2024-12-15" },
];

const quickActions = [
  { label: "Nueva Matricula", icon: Plus, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { label: "Registrar Usuario", icon: Plus, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { label: "Generar Reporte", icon: Plus, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { label: "Enviar Aviso", icon: Plus, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("notas");

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">
          Bienvenido al Panel Administrativo
        </h1>
        <p className="text-muted-foreground mt-2">
          domingo, 3 de mayo de 2026
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-none shadow-sm rounded-xl"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#0F172A]">{stat.value}</p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              {stat.showProgress && (
                <div className="mt-4">
                  <Progress value={stat.progressValue} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-base font-bold text-[#0F172A] mb-4">
              Asistencia del Mes
            </h2>
            <AttendanceChart />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-base font-bold text-[#0F172A] mb-4">
              Distribucion de Calificaciones
            </h2>
            <GradeDistributionChart />
          </CardContent>
        </Card>
      </div>

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
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${
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
                  {latestNotes.map((row, idx) => (
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
              {pendingAnnouncements.map((item, idx) => (
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
              className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer rounded-xl"
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.iconBg}`}
                >
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <p className="text-sm font-semibold text-[#0F172A]">
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
