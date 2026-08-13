"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardCheck,
  BarChart3,
  FileText,
  Bell,
  TrendingUp,
} from "lucide-react";

const reportCards = [
  {
    label: "Reporte de Asistencia",
    description: "Tasa de asistencia y faltas por curso y sección.",
    href: "/admin/attendance",
    icon: ClipboardCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    label: "Reporte de Notas",
    description: "Promedios, aprobados y desaprobados por bimestre.",
    href: "/admin/grades",
    icon: BarChart3,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Reporte de Matrículas",
    description: "Estado de matrículas, pagos y documentación.",
    href: "/admin/enrollment",
    icon: FileText,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "Reporte de Avisos",
    description: "Historial de avisos enviados por prioridad y audiencia.",
    href: "/admin/announcements",
    icon: Bell,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Reportes</h1>
        <p className="text-muted-foreground mt-1">
          Selecciona el reporte que quieres consultar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="block">
              <Card className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 rounded-xl h-full">
                <CardContent className="p-5 space-y-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">
                      {card.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-none shadow-sm rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E2A5E]/10">
              <TrendingUp className="h-5 w-5 text-[#1E2A5E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Próximamente
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Estamos preparando reportes descargables en PDF y Excel.
                Mientras tanto puedes consultar los paneles anteriores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
