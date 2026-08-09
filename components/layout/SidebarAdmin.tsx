"use client";

import { useEffect, useState, memo } from "react";
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
  ChevronLeft,
  Shield,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminItems: SidebarItem[] = [
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

const NavItem = memo(function NavItem({
  item,
  collapsed,
  isActive,
}: {
  item: SidebarItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      key={item.href}
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-[#1E2A5E] text-white"
          : "text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      )}
    </Link>
  );
});

export default function SidebarAdmin({
  children,
  mobileOpen,
  onCloseMobile,
}: {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return JSON.parse(localStorage.getItem("sidebar:collapsed") ?? "false") as boolean;
    } catch {
      return false;
    }
  });

  // Persistir el estado de colapso (solo UI-state, no auth)
  useEffect(() => {
    try {
      localStorage.setItem("sidebar:collapsed", JSON.stringify(collapsed));
    } catch {
      /* noop */
    }
  }, [collapsed]);

  // Cerrar el drawer al navegar
  useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  const nav = (
    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {adminItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          collapsed={collapsed}
          isActive={pathname === item.href}
        />
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 z-50 flex flex-col bg-white border-r border-gray-100 transition-[width] duration-300 ease-in-out",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header / Toggle */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className={cn(
              "flex items-center justify-between w-full rounded-md p-1.5 hover:bg-gray-100 transition-colors text-sm font-semibold text-[#0F172A]",
              collapsed && "justify-center",
            )}
          >
            {!collapsed && <span>NAVEGACION</span>}
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>

        {nav}

        {/* Footer */}
        <div className={cn("p-4 border-t border-gray-100 shrink-0", collapsed && "p-2 flex justify-center")}>
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E2A5E]/10">
              <Shield className="h-4 w-4 text-[#1E2A5E]" />
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center">
              Sistema Admin v1.0
            </p>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
