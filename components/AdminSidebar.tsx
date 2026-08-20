"use client";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  FileText,
  Clock,
  Bell,
  TrendingUp,
} from "lucide-react";
import AppSidebar, { type SidebarItem } from "@/components/layout/AppSidebar";

const MENU: SidebarItem[] = [
  { href: "/admin",             label: "Dashboard",           icon: LayoutDashboard, exact: true  },
  { href: "/admin/users",       label: "Usuarios",            icon: Users,          exact: false },
  { href: "/admin/students",    label: "Alumnos",             icon: GraduationCap, exact: false },
  { href: "/admin/courses",     label: "Cursos y Secciones",  icon: BookOpen,       exact: false },
  { href: "/admin/grades",      label: "Notas",               icon: BarChart3,     exact: false },
  { href: "/admin/attendance",  label: "Asistencia",          icon: ClipboardCheck, exact: false },
  { href: "/admin/enrollment",  label: "Matrículas y Pagos",  icon: FileText,       exact: false },
  { href: "/admin/schedule",    label: "Horarios",            icon: Clock,          exact: false },
  { href: "/admin/announcements", label: "Avisos",            icon: Bell,           exact: false },
  { href: "/admin/reports",     label: "Reportes",            icon: TrendingUp,     exact: false },
];

/**
 * Sidebar del admin: delega toda la estructura al `AppSidebar` compartido
 * (mismo patrón que FatherSidebar/TeacherSidebar). El contenido se envuelve
 * en `max-w-7xl mx-auto` para conservar el ancho máximo que ya tenían las
 * páginas del admin con el sidebar anterior.
 */
export default function AdminSidebar({
  children,
  mobileOpen,
  onCloseMobile,
}: {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  return (
    <AppSidebar
      brand={{ short: "JOHN F. KENNEDY", sub: "Panel Admin" }}
      showBrand={false}
      showUserBlock={false}
      showLogoutButton={false}
      groups={[MENU]}
      mobileOpen={mobileOpen ?? false}
      onCloseMobile={onCloseMobile ?? (() => {})}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </AppSidebar>
  );
}
