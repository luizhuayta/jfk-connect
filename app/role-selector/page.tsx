"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  UserCog,
  Users,
  ArrowLeft,
  Shield,
} from "lucide-react";

const roles = [
  {
    id: "father",
    label: "Padre de Familia",
    description: "Consulta notas, asistencia y horarios de tus hijos.",
    icon: Users,
    href: "/father",
    color: "bg-[#1E2A5E]",
    hoverColor: "hover:bg-[#162147]",
  },
  {
    id: "teacher",
    label: "Profesor",
    description: "Gestiona cursos, calificaciones y asistencia.",
    icon: GraduationCap,
    href: "/teacher",
    color: "bg-[#2C3A7A]",
    hoverColor: "hover:bg-[#243161]",
  },
  {
    id: "admin",
    label: "Administrador",
    description: "Control total de usuarios, reportes y configuración.",
    icon: UserCog,
    href: "/admin",
    color: "bg-[#1E2A5E]",
    hoverColor: "hover:bg-[#162147]",
  },
];

export default function RoleSelectorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Bar */}
      <div className="h-16 border-b bg-white flex items-center px-6">
        <Link href="/login" className="flex items-center gap-2 text-sm text-[#1E2A5E] font-medium hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-2 mb-10 max-w-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2A5E]/10 mb-4">
            <Shield className="h-7 w-7 text-[#1E2A5E]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1E2A5E]">
            Selecciona tu perfil
          </h1>
          <p className="text-muted-foreground">
            Elige el tipo de usuario con el que deseas acceder al sistema.
          </p>
        </div>

        <div className="grid gap-5 w-full max-w-3xl md:grid-cols-3">
          {roles.map((role) => (
            <Link key={role.id} href={role.href} className="group">
              <Card className="h-full border-none shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden">
                <div className={`${role.color} p-6 flex justify-center`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                    <role.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <CardContent className="p-6 text-center space-y-3">
                  <h3 className="text-lg font-bold text-[#1E2A5E] group-hover:text-[#2C3A7A] transition-colors">
                    {role.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full mt-2 border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
                  >
                    Acceder
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Sistema Institucional IJFK — Colegio Industrial John F. Kennedy Chincha
        </p>
      </div>
    </div>
  );
}
