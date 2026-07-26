"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  LogOut,
  ChevronLeft,
} from "lucide-react";

const adminItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Usuarios", href: "/admin/users", icon: Users },
  { label: "Alumnos", href: "/admin/students", icon: GraduationCap },
  { label: "Cursos y Secciones", href: "/admin/courses", icon: BookOpen },
  { label: "Notas", href: "/admin/grades", icon: BarChart3 },
  { label: "Asistencia", href: "/admin/attendance", icon: ClipboardCheck },
  { label: "Matriculas y Pagos", href: "/admin/enrollment", icon: FileText },
  { label: "Horarios", href: "/admin/schedule", icon: Clock },
  { label: "Avisos", href: "/admin/announcements", icon: Bell },
  { label: "Reportes", href: "/admin/reports", icon: TrendingUp },
];

export default function SidebarAdmin() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-100 flex flex-col z-40 hidden lg:flex">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button className="flex items-center justify-between w-full text-sm font-semibold text-[#0F172A]">
          <span>NAVEGACION</span>
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {adminItems.map((item) => {
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

      {/* Footer version */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-[10px] text-muted-foreground text-center">
          Sistema Admin v1.0
        </p>
      </div>
    </aside>
  );
}
