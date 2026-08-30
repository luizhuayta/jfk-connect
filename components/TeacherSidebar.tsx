"use client";

import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  Clock,
  FileBox,
  Bell,
  Upload,
} from "lucide-react";
import AppSidebar, { type SidebarItem } from "@/components/layout/AppSidebar";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";
import { useTeacherAnnouncements } from "@/components/teacher/TeacherAnnouncementsProvider";
import { pendingGradesCount } from "@/lib/teacher/pending-grades";

const GROUP_1: SidebarItem[] = [
  { href: "/teacher",               label: "Dashboard",  icon: LayoutDashboard, exact: true  },
  { href: "/teacher/courses",       label: "Mis Cursos", icon: BookOpen,       exact: false },
  { href: "/teacher/grades",        label: "Notas",      icon: FileText,       exact: false },
  { href: "/teacher/imports",       label: "Importar notas", icon: Upload,     exact: false },
  { href: "/teacher/attendance",    label: "Asistencia", icon: Calendar,       exact: false },
  { href: "/teacher/schedule",      label: "Horario",    icon: Clock,          exact: false },
];

const GROUP_2: SidebarItem[] = [
  { href: "/teacher/materials",     label: "Materiales", icon: FileBox,        exact: false },
  { href: "/teacher/announcements", label: "Avisos",     icon: Bell,           exact: false },
];

/**
 * Sidebar del docente: delega toda la estructura al `AppSidebar` compartido.
 * Badges: notas pendientes (ámbar, cursos del bimestre en curso sin notas) y
 * avisos no leídos (rojo).
 */
export default function TeacherSidebar({
  children,
  mobileOpen,
  onCloseMobile,
}: {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { unreadCount } = useTeacherAnnouncements();
  const { courses } = useTeacherCourses();
  const pendingGrades = pendingGradesCount(courses);

  const group1 = GROUP_1.map((item) =>
    item.href === "/teacher/grades" && pendingGrades > 0
      ? { ...item, badge: pendingGrades, badgeColor: "amber" as const }
      : item,
  );
  const group2 = GROUP_2.map((item) =>
    item.href === "/teacher/announcements" && unreadCount > 0
      ? { ...item, badge: unreadCount, badgeColor: "red" as const }
      : item,
  );

  return (
    <AppSidebar
      brand={{ short: "JOHN F. KENNEDY" }}
      showBrand={false}
      showUserBlock={false}
      showLogoutButton={false}
      groups={[group1, group2]}
      mobileOpen={mobileOpen ?? false}
      onCloseMobile={onCloseMobile ?? (() => {})}
    >
      {children}
    </AppSidebar>
  );
}
