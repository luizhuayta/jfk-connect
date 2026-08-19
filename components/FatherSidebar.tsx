"use client";

import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Clock,
  Bell,
  BookOpen,
  FolderOpen,
} from "lucide-react";
import AppSidebar, { type SidebarItem } from "@/components/layout/AppSidebar";
import { useAnnouncements } from "@/components/father/AnnouncementsProvider";

const MENU: SidebarItem[] = [
  { href: "/father",               label: "Inicio",      icon: LayoutDashboard, exact: true  },
  { href: "/father/students",      label: "Mis Hijos",   icon: Users,          exact: false },
  { href: "/father/grades",        label: "Notas",       icon: FileText,       exact: false },
  { href: "/father/attendance",    label: "Asistencia",  icon: Calendar,       exact: false },
  { href: "/father/materials",     label: "Materiales",  icon: FolderOpen,     exact: false },
  { href: "/father/schedule",      label: "Horario",     icon: Clock,          exact: false },
  { href: "/father/enrollment",    label: "Matrícula",   icon: BookOpen,       exact: false },
  { href: "/father/announcements", label: "Avisos",      icon: Bell,           exact: false },
];

/**
 * Sidebar del padre: delega toda la estructura al `AppSidebar` compartido y
 * aporta el menú del rol más el contador de avisos no leídos (badge rojo).
 * El contador viene del `AnnouncementsProvider` (una sola carga compartida con
 * la top bar y el dashboard) y se actualiza al leer un aviso.
 */
export default function FatherSidebar({
  children,
  mobileOpen,
  onCloseMobile,
}: {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { unreadCount } = useAnnouncements();

  const menu = MENU.map((item) =>
    item.href === "/father/announcements" && unreadCount > 0
      ? { ...item, badge: unreadCount, badgeColor: "red" as const }
      : item,
  );

  return (
    <AppSidebar
      brand={{ short: "Colegio IJFK", sub: "Panel de padres", logoSrc: "/Image/logo.jpg" }}
      showBrand={false}
      collapseIcon="hamburger"
      groups={[menu]}
      mobileOpen={mobileOpen ?? false}
      onCloseMobile={onCloseMobile ?? (() => {})}
    >
      {children}
    </AppSidebar>
  );
}
