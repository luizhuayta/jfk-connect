"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calendar,
  Clock,
  FileBox,
  Bell,
} from "lucide-react";
import AppSidebar, { type SidebarItem } from "@/components/layout/AppSidebar";
import { useTeacherCourses } from "@/components/teacher/useTeacherCourses";

const GROUP_1: SidebarItem[] = [
  { href: "/teacher",               label: "Dashboard",  icon: LayoutDashboard, exact: true  },
  { href: "/teacher/courses",       label: "Mis Cursos", icon: BookOpen,       exact: false },
  { href: "/teacher/grades",        label: "Notas",      icon: FileText,       exact: false },
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
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const { courses } = useTeacherCourses();

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.announcements)) {
          setUnreadAnnouncements(
            data.announcements.filter((a: { read: boolean }) => !a.read).length,
          );
        }
      })
      .catch(() => {});
  }, []);

  // Cursos del bimestre en curso que aún no tienen notas → badge ámbar
  const pendingGrades = courses.filter((c) => {
    const b = c.bimesters?.[String(c.currentBimester)];
    return b?.inProgress && !b?.hasData;
  }).length;

  const group1 = GROUP_1.map((item) =>
    item.href === "/teacher/grades" && pendingGrades > 0
      ? { ...item, badge: pendingGrades, badgeColor: "amber" as const }
      : item,
  );
  const group2 = GROUP_2.map((item) =>
    item.href === "/teacher/announcements" && unreadAnnouncements > 0
      ? { ...item, badge: unreadAnnouncements, badgeColor: "red" as const }
      : item,
  );

  return (
    <AppSidebar
      brand={{ short: "JOHN F. KENNEDY" }}
      groups={[group1, group2]}
      mobileOpen={mobileOpen ?? false}
      onCloseMobile={onCloseMobile ?? (() => {})}
    >
      {children}
    </AppSidebar>
  );
}
