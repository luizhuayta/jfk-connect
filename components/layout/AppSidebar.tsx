"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useSessionUser } from "@/lib/useSessionUser";
import { getInitials, getRoleLabel } from "@/lib/format";

export interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: number;
  badgeColor?: "red" | "amber";
}

interface AppSidebarProps {
  /** Textos del encabezado del sidebar. Si `logoSrc` se define, se usa como
   * imagen institucional; si no, se muestra el círculo dorado genérico. */
  brand: { short: string; sub?: string; logoSrc?: string };
  /** Grupos de enlaces; cada grupo se separa con un divisor. */
  groups: SidebarItem[][];
  mobileOpen: boolean;
  onCloseMobile: () => void;
  children: React.ReactNode;
  /**
   * Si es `true` (default), reserva 64px arriba del `<main>` para un Navbar
   * superior fijo (caso de teacher/admin). Si es `false`, el contenido
   * arranca pegado al borde superior (caso del padre, que ya no usa Navbar).
   */
  reserveTopSpace?: boolean;
  /**
   * Si es `false`, oculta el header de marca (logo + nombre) del sidebar.
   * Úsalo cuando ese mismo logo ya vive en un top bar propio (panel de
   * padres) para no repetirlo; el botón de cerrar el drawer móvil se
   * reubica junto a los datos del usuario en ese caso. Default `true`.
   */
  showBrand?: boolean;
  /** Ícono del botón colapsar/expandir. Default `"chevron"`. */
  collapseIcon?: "chevron" | "hamburger";
}

/**
 * Sidebar oscuro institucional (gradiente azul) compartido por father y
 * teacher. Antes cada rol duplicaba ~150 líneas de estructura; aquí el menú,
 * los badges y la marca se pasan como props. El estado de colapso se persiste
 * en localStorage (mismo criterio que el sidebar admin).
 *
 * Responsabilidades: overlay móvil, header de marca, datos del usuario, menú
 * con badges, botón colapsar (escritorio), logout y el wrapper del contenido
 * principal (padding + margen según colapso).
 */
export default function AppSidebar({
  brand,
  groups,
  mobileOpen,
  onCloseMobile,
  children,
  reserveTopSpace = true,
  showBrand = true,
  collapseIcon = "chevron",
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSessionUser();

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
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    toast.success("Sesión cerrada");
    router.push("/login");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);
    const badgeCount = item.badge ?? 0;
    const dotClass = item.badgeColor === "amber" ? "bg-amber-500" : "bg-red-500";
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-[#F4C15C] text-[#1E2A5E]"
            : "text-white/80 hover:bg-white/10 hover:text-white",
          collapsed && "justify-center",
        )}
      >
        <div className="relative shrink-0">
          <Icon className="h-5 w-5" />
          {badgeCount > 0 && collapsed && (
            <span
              className={cn(
                "absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-white text-[8px] font-bold",
                dotClass,
              )}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {badgeCount > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full text-white text-[10px] font-bold px-1.5",
                  dotClass,
                )}
              >
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onCloseMobile} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 z-50 flex flex-col overflow-x-hidden",
          "bg-gradient-to-b from-[#1E2A5E] to-[#2C3A7A] text-white",
          "transition-all duration-300 ease-in-out",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header de marca — se omite cuando el mismo logo ya vive en un
            top bar propio (panel de padres), para no repetirlo. */}
        {showBrand && (
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          {collapsed ? (
            brand.logoSrc ? (
              <div className="h-9 w-9 rounded-full overflow-hidden bg-white mx-auto shrink-0">
                <Image
                  src={brand.logoSrc}
                  alt={brand.short}
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full bg-[#F4C15C] flex items-center justify-center mx-auto">
                <GraduationCap className="h-5 w-5 text-[#1E2A5E]" />
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 overflow-hidden">
              {brand.logoSrc ? (
                <div className="h-9 w-9 rounded-full overflow-hidden bg-white shrink-0">
                  <Image
                    src={brand.logoSrc}
                    alt={brand.short}
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#F4C15C] flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-[#1E2A5E]" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{brand.short}</p>
                {brand.sub && <p className="text-xs text-white/70 truncate">{brand.sub}</p>}
              </div>
            </div>
          )}

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded hover:bg-white/10 shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        )}

        {/* Datos del usuario. Sin header de marca (showBrand=false) este
            bloque también aloja el cierre del drawer móvil. */}
        {user && (
          <div className={cn("p-4 border-b border-white/10 shrink-0", collapsed && "px-2")}>
            <div className={cn("flex", collapsed ? "justify-center" : "items-center gap-3")}>
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[#F4C15C]">
                <AvatarFallback className="bg-[#F4C15C] text-[#1E2A5E] text-sm font-bold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold truncate">{user.full_name}</p>
                  <p className="text-xs text-white/70 truncate">{getRoleLabel(user.role)}</p>
                </div>
              )}
              {!showBrand && (
                <button
                  onClick={onCloseMobile}
                  className="lg:hidden p-1.5 rounded hover:bg-white/10 shrink-0"
                  aria-label="Cerrar menú"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Menú */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <hr className="border-white/10 my-3" />}
              {group.map(renderItem)}
            </div>
          ))}
        </nav>

        {/* Botón colapsar/expandir (escritorio) */}
        <div className="hidden lg:flex p-3 border-t border-white/10 shrink-0 overflow-x-hidden">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors",
              collapsed && "justify-center",
            )}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapseIcon === "hamburger" ? (
              <Menu className="h-5 w-5" />
            ) : collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
            {!collapsed && <span>Colapsar menú</span>}
          </button>
        </div>

        {/* Botón logout */}
        <div className="p-3 border-t border-white/10 shrink-0 overflow-x-hidden">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-white transition-colors",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          reserveTopSpace && "pt-16",
          collapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
