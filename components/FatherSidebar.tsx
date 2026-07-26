"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Baby, FileText, Calendar, Clock, Bell, Megaphone,
  ChevronLeft, ChevronRight, LogOut, GraduationCap, X, Menu, BookOpen, Award,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FatherUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const MENU = [
  { href: "/father",               label: "Inicio",      icon: LayoutDashboard, exact: true  },
  { href: "/father/students",      label: "Mis Hijos",   icon: Baby,            exact: false },
  { href: "/father/grades",        label: "Notas",       icon: FileText,        exact: false },
  { href: "/father/attendance",    label: "Asistencia",  icon: Calendar,        exact: false },
  { href: "/father/schedule",      label: "Horario",     icon: Clock,           exact: false },
  { href: "/father/enrollment",    label: "Matrícula",   icon: BookOpen,        exact: false },
  { href: "/father/announcements", label: "Avisos",      icon: Bell,            exact: false },
];

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
function getRoleLabel(role: string): string {
  if (role === "docente") return "Docente";
  if (role === "admin") return "Administrador";
  if (role === "padre") return "Padre/Apoderado";
  return role;
}

export default function FatherSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FatherUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // La sesión vive en la cookie httpOnly; consultamos /api/auth/me sin userId
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50
          bg-gradient-to-b from-[#1E2A5E] to-[#2C3A7A] text-white
          transition-all duration-300 ease-in-out
          ${sidebarWidth} flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-[#F4C15C] flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-[#1E2A5E]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-white/70">IJFK</p>
                <p className="text-sm font-bold truncate">Intranet</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-9 w-9 rounded-full bg-[#F4C15C] flex items-center justify-center mx-auto">
              <GraduationCap className="h-5 w-5 text-[#1E2A5E]" />
            </div>
          )}

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded hover:bg-white/10 shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Datos del usuario */}
        {user && (
          <div className={`p-4 border-b border-white/10 shrink-0 ${collapsed ? "px-2" : ""}`}>
            <div className={`flex ${collapsed ? "justify-center" : "items-center gap-3"}`}>
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[#F4C15C]">
                <AvatarFallback className="bg-[#F4C15C] text-[#1E2A5E] text-sm font-bold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold truncate">{user.full_name}</p>
                  <p className="text-xs text-white/70 truncate">{getRoleLabel(user.role)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {MENU.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors
                  ${active ? "bg-[#F4C15C] text-[#1E2A5E]" : "text-white/80 hover:bg-white/10 hover:text-white"}
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Botón colapsar/expandir (escritorio) */}
        <div className="hidden lg:flex p-3 border-t border-white/10 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white
              transition-colors
              ${collapsed ? "justify-center" : ""}
            `}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span>Colapsar menú</span>}
          </button>
        </div>

        {/* Botón logout */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-white
              transition-colors
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-[#1E2A5E] text-white shadow-md">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded hover:bg-white/10"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#F4C15C]" />
              <span className="font-bold text-sm">IJFK</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#F4C15C] text-[#1E2A5E] text-xs font-bold">
                {user ? getInitials(user.full_name) : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
