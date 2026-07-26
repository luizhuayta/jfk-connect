"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Clock,
  FileText,
  Bell,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const teacherItems = [
  { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Mis Cursos", href: "/teacher/courses", icon: BookOpen },
  { label: "Registrar Notas", href: "/teacher/grades", icon: ClipboardList },
  { label: "Asistencia", href: "/teacher/attendance", icon: ClipboardCheck },
  { label: "Mi Horario", href: "/teacher/schedule", icon: Clock },
  { label: "Materiales", href: "/teacher/materials", icon: FileText },
  { label: "Avisos", href: "/teacher/announcements", icon: Bell },
];

export default function SidebarTeacher() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-100 flex flex-col z-40 hidden lg:flex">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button className="flex items-center justify-between w-full text-sm font-semibold text-[#0F172A]">
          <span>Menu</span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {teacherItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1E2A5E] text-white"
                  : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
              )}
            >
              <item.icon className="h-4.5 w-4.5" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" strokeWidth={1.8} />
          Cerrar Sesion
        </Link>
      </div>
    </aside>
  );
}
