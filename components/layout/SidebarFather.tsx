"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  BarChart3,
  Clock,
  ClipboardCheck,
  FileText,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { mockStudents } from "@/data/mock";

const fatherItems = [
  { label: "Notas", href: "/father/grades", icon: BarChart3 },
  { label: "Horario", href: "/father/schedule", icon: Clock },
  { label: "Asistencia", href: "/father/attendance", icon: ClipboardCheck },
  { label: "Matrícula", href: "/father/enrollment", icon: FileText },
  { label: "Avisos", href: "/father/announcements", icon: Bell },
];

export default function SidebarFather() {
  const pathname = usePathname();
  const studentsOpen =
    pathname === "/father/students" || pathname.startsWith("/father/students/");

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-100 flex flex-col z-40 hidden lg:flex">
      {/* Collapse toggle */}
      <div className="flex justify-end px-3 pt-3">
        <button className="p-1.5 rounded-md hover:bg-gray-100 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {/* Inicio */}
        <Link
          href="/father"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/father"
              ? "bg-[#1E2A5E] text-white"
              : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
          )}
        >
          <Home className="h-4.5 w-4.5" strokeWidth={1.8} />
          Inicio
        </Link>

        {/* Mis Hijos — expandable */}
        <div>
          <Link
            href="/father/students"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              studentsOpen
                ? "bg-[#1E2A5E] text-white"
                : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]"
            )}
          >
            <Users className="h-4.5 w-4.5" strokeWidth={1.8} />
            <span className="flex-1">Mis Hijos</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                studentsOpen ? "rotate-180" : ""
              )}
              strokeWidth={2}
            />
          </Link>

          {/* Sub-items: each child */}
          {studentsOpen && (
            <div className="mt-1 ml-4 pl-3 border-l-2 border-[#F4C15C]/40 space-y-0.5">
              {mockStudents.map((student) => {
                const firstName = student.name.split(" ")[0];
                const initials = student.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Link
                    key={student.id}
                    href="/father/students"
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-[#1E2A5E] hover:bg-[#1E2A5E]/5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E2A5E]/10 text-[#1E2A5E] text-[10px] font-bold shrink-0">
                      {initials}
                    </span>
                    <div className="leading-tight min-w-0">
                      <p className="text-xs font-semibold truncate">{firstName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {student.grade} &quot;{student.section}&quot;
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Rest of items */}
        {fatherItems.map((item) => {
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
          Cerrar Sesión
        </Link>
      </div>
    </aside>
  );
}
