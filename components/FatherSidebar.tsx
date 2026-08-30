"use client";

import {
  LayoutDashboard,
  FileText,
  Calendar,
  Clock,
  Bell,
  BookOpen,
  FolderOpen,
  Users,
} from "lucide-react";
import AppSidebar, { type SidebarItem } from "@/components/layout/AppSidebar";
import { useAnnouncements } from "@/components/father/AnnouncementsProvider";

const HOY: SidebarItem[] = [
  { href: "/father", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/father/students", label: "Mis hijos", icon: Users, exact: false },
  { href: "/father/announcements", label: "Avisos", icon: Bell, exact: false },
];

const LIBRETA: SidebarItem[] = [
  { href: "/father/grades", label: "Libreta", icon: FileText, exact: false },
  { href: "/father/attendance", label: "Asistencia", icon: Calendar, exact: false },
];

const COLEGIO: SidebarItem[] = [
  { href: "/father/schedule", label: "Horario", icon: Clock, exact: false },
  { href: "/father/materials", label: "Materiales", icon: FolderOpen, exact: false },
  { href: "/father/enrollment", label: "Matrícula", icon: BookOpen, exact: false },
];

/**
 * Tres grupos de noche: Hoy (jornada, hijos y avisos), Libreta (notas + asistencia),
 * Colegio (horario, materiales, matrícula).
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

  const hoy = HOY.map((item) =>
    item.href === "/father/announcements" && unreadCount > 0
      ? { ...item, badge: unreadCount, badgeColor: "red" as const }
      : item,
  );

  return (
    <AppSidebar
      brand={{ short: "Colegio IJFK", sub: "Panel de padres", logoSrc: "/Image/logo.jpg" }}
      showBrand={false}
      collapseIcon="hamburger"
      groups={[hoy, LIBRETA, COLEGIO]}
      groupLabels={["Hoy", "Libreta", "Colegio"]}
      mobileOpen={mobileOpen ?? false}
      onCloseMobile={onCloseMobile ?? (() => {})}
    >
      {children}
    </AppSidebar>
  );
}
