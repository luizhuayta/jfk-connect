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
  ChevronRight,
} from "lucide-react";

const fatherItems = [
  { label: "Inicio", href: "/father", icon: Home },
  { label: "Mis Hijos", href: "/father/students", icon: Users },
  { label: "Notas", href: "/father/grades", icon: BarChart3 },
  { label: "Horario", href: "/father/schedule", icon: Clock },
  { label: "Asistencia", href: "/father/attendance", icon: ClipboardCheck },
  { label: "Matricula", href: "/father/enrollment", icon: FileText },
  { label: "Avisos", href: "/father/announcements", icon: Bell },
];

export default function SidebarFather() {
  const pathname = usePathname();

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
          Cerrar Sesion
        </Link>
      </div>
    </aside>
  );
}
