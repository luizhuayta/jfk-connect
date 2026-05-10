"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, FileCheck, AlertCircle, CalendarDays } from "lucide-react";
import { mockStudents, mockBimesterNotes, mockUserFather } from "@/data/mock";

const quickAccess = [
  {
    label: "Ver Horario",
    sublabel: "Horario de clases",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    href: "/father/schedule",
  },
  {
    label: "Estado de Matrícula",
    sublabel: "Al día",
    icon: FileCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    href: "/father/enrollment",
  },
  {
    label: "Asistencia del Mes",
    sublabel: "95% asistencia",
    icon: CalendarDays,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    href: "/father/attendance",
  },
  {
    label: "Avisos Importantes",
    sublabel: "3 avisos nuevos",
    icon: AlertCircle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    href: "/father/announcements",
  },
];

export default function FatherDashboard() {
  const [activeChild, setActiveChild] = useState(mockStudents[0].id);
  const [activeBimester, setActiveBimester] = useState("Bimestre 1");

  const selectedStudent = mockStudents.find((s) => s.id === activeChild)!;
  const currentNotes = mockBimesterNotes[activeChild]?.[activeBimester] ?? [];
  const average =
    currentNotes.reduce((sum, n) => sum + n.note, 0) / (currentNotes.length || 1);
  const levelLabel =
    average >= 17.5 ? "Excelente" : average >= 14 ? "Bueno" : "Regular";

  const today = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E2A5E]">
          Bienvenido, Sr. {mockUserFather.name}
        </h1>
        <p className="text-muted-foreground mt-1" suppressHydrationWarning>
          {todayFormatted}
        </p>
      </div>

      {/* Mis Hijos */}
      <section>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">Mis Hijos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockStudents.map((child) => {
            const initials = child.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Card
                key={child.id}
                className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-[#F4C15C]/30">
                      <AvatarFallback className="bg-[#1E2A5E]/10 text-[#1E2A5E] font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {child.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-1 bg-gray-100 text-[#64748B] font-medium text-xs"
                      >
                        {child.grade} &quot;{child.section}&quot;
                      </Badge>
                    </div>
                  </div>
                  <Link href="/father/students">
                    <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10">
                      Ver detalle
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Notas Recientes */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-[#0F172A]">Notas Recientes</h2>
            <div className="flex gap-2">
              {mockStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveChild(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeChild === s.id
                      ? "bg-[#1E2A5E] text-white"
                      : "bg-gray-100 text-[#64748B] hover:bg-gray-200"
                  }`}
                >
                  {s.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground -mt-4">
            {selectedStudent.name} — {selectedStudent.grade} &quot;{selectedStudent.section}&quot;
          </p>

          {/* Bimester Tabs */}
          <div className="bg-gray-50 rounded-lg p-1">
            <div className="grid grid-cols-4 gap-1">
              {["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"].map((b) => (
                <button
                  key={b}
                  onClick={() => setActiveBimester(b)}
                  className={`py-2 text-sm font-medium rounded-md transition-colors ${
                    activeBimester === b
                      ? "bg-[#1E2A5E] text-white"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Curso</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nota</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nivel</TableHead>
                  <TableHead className="text-right text-[#0F172A] font-semibold text-sm">
                    Observación
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentNotes.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium text-[#0F172A]">
                      {row.course}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-[#1E2A5E]">
                      {row.note.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs font-bold ${
                          row.level === "AD"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {row.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.observation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Promedio */}
          <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-5">
            <div>
              <p className="text-sm text-white/80">Promedio del Bimestre</p>
              <p className="text-3xl font-bold text-[#F4C15C]">{average.toFixed(1)}</p>
            </div>
            <Badge className="bg-[#F4C15C] text-[#1E2A5E] font-bold text-sm px-3 py-1 hover:bg-[#F4C15C]">
              {levelLabel}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/father/grades">
              <Button
                variant="outline"
                className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
              >
                Ver Todas las Notas
              </Button>
            </Link>
            <Button
              variant="outline"
              className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
            >
              Descargar Boletín PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <section>
        <h2 className="text-lg font-bold text-[#0F172A] mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickAccess.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${item.iconBg}`}
                  >
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
