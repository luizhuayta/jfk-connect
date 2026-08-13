"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, FileText, Calendar, Clock, FileBox, Bell,
  LogOut, GraduationCap, X, Menu,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeacherUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const MENU_GROUP_1 = [
  { href: "/teacher",               label: "Dashboard",  icon: LayoutDashboard, exact: true  },
  { href: "/teacher/courses",       label: "Mis Cursos", icon: BookOpen,       exact: false },
  { href: "/teacher/grades",        label: "Notas",      icon: FileText,       exact: false, badge: true },
  { href: "/teacher/attendance",    label: "Asistencia", icon: Calendar,       exact: false },
  { href: "/teacher/schedule",      label: "Horario",    icon: Clock,          exact: false },
];
const MENU_GROUP_2 = [
  { href: "/teacher/materials",     label: "Materiales", icon: FileBox,        exact: false },
  { href: "/teacher/announcements", label: "Avisos",     icon: Bell,           exact: false, badge: true },
];

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}
function getRoleLabel(role: string): string {
  if (role === "docente") return "Docente";
  if (role === "admin") return "Administrador";
  if (role === "padre") return "Padre/Apoderado";
  return role;
}

export default function TeacherSidebar({
  children,
  mobileOpen,
  onCloseMobile,
}: {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [pendingGrades, setPendingGrades] = useState(0);

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
    // Cargar contador de avisos no leídos
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.announcements)) {
          setUnreadAnnouncements(data.announcements.filter((a: { read: boolean }) => !a.read).length);
        }
      })
      .catch(() => {});
    // B5: Cargar contador de notas pendientes (cursos con bimestre en curso sin hasData)
    fetch("/api/teacher/courses")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.courses)) {
          const count = data.courses.filter((c: { currentBimester: number; bimesters: Record<string, { hasData: boolean; inProgress: boolean }> }) => {
            const b = c.bimesters?.[String(c.currentBimester)];
            return b?.inProgress && !b?.hasData;
          }).length;
          setPendingGrades(count);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-16 bottom-0 z-50
          bg-gradient-to-b from-[#1E2A5E] to-[#2C3A7A] text-white
          transition-all duration-300 ease-in-out
          ${sidebarWidth} flex flex-col overflow-x-hidden
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
                <p className="text-sm font-bold truncate">JOHN F. KENNEDY</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-9 w-9 rounded-full bg-[#F4C15C] flex items-center justify-center mx-auto">
              <GraduationCap className="h-5 w-5 text-[#1E2A5E]" />
            </div>
          )}

          {/* Botón cerrar (solo móvil) */}
          <button
            onClick={onCloseMobile}
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
          {MENU_GROUP_1.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            const badgeCount = item.badge ? pendingGrades : 0;
            const showBadge = badgeCount > 0 && !collapsed;
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
                <div className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {item.badge && badgeCount > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5">
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Separador entre grupos */}
          <hr className="border-white/10 my-3" />

          {MENU_GROUP_2.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            const showBadge = item.badge && unreadAnnouncements > 0 && !collapsed;
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
                <div className="relative shrink-0">
                  <Icon className="h-5 w-5" />
                  {item.badge && unreadAnnouncements > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">
                      {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                        {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Botón colapsar/expandir (escritorio) */}
        <div className="hidden lg:flex p-3 border-t border-white/10 shrink-0 overflow-x-hidden">
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
            <Menu className="h-5 w-5" />
            {!collapsed && <span>Colapsar menú</span>}
          </button>
        </div>

        {/* Botón logout */}
        <div className="p-3 border-t border-white/10 shrink-0 overflow-x-hidden">
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

      {/* Contenido principal */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:ml-20" : "lg:ml-60",
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
