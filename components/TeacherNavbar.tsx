"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Bell, User, Settings, HelpCircle, LogOut, ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import { useSessionUser } from "@/lib/useSessionUser";
import { getInitials, getRoleLabel } from "@/lib/format";

/**
 * Barra superior del panel docente. Antes compartía components/layout/Navbar.tsx
 * con el admin (una sola barra con `if (isAdmin)`/`if (isTeacher)` por dentro);
 * ahora cada rol tiene la suya propia, como ya tenía el padre con FatherTopBar.
 */
export default function TeacherNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Contador de avisos no leídos para el badge de la campana
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

  // Cerrar con click fuera y con Escape
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    toast.success("Sesión cerrada");
    router.push("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-[240px]">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5 text-[#1E2A5E]" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden">
          <Image
            src="/Image/logo.jpg"
            alt="Logo CIJK"
            width={36}
            height={36}
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-[#1E2A5E] tracking-tight">
            CIJK
          </span>
          <span className="text-[10px] text-muted-foreground">
            Panel Docente
          </span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alumno, curso..."
            className="w-full rounded-full border-gray-200 bg-gray-50 pl-10 text-sm focus-visible:ring-[#F4C15C]"
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-4">
        <button
          className="relative p-2 rounded-full hover:bg-gray-50 transition-colors"
          aria-label={unreadAnnouncements > 0 ? `${unreadAnnouncements} avisos sin leer` : "Avisos"}
        >
          <Bell className="h-5 w-5 text-[#1E2A5E]" />
          {unreadAnnouncements > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
            </span>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-100">
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-[#0F172A]">
              {user?.full_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user ? getRoleLabel(user.role) : ""}
            </p>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2A5E]/30"
            >
              <Avatar className="h-9 w-9 border border-gray-200">
                <AvatarFallback className="bg-[#1E2A5E] text-white text-xs font-semibold">
                  {user ? getInitials(user.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ease-out ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            <div
              className={`absolute right-0 top-full mt-2 w-72 max-w-xs rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5 transition-all duration-150 ease-out origin-top-right z-50 ${
                open
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              }`}
              role="menu"
            >
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-gray-200">
                    <AvatarFallback className="bg-[#1E2A5E] text-white text-xs font-semibold">
                      {user ? getInitials(user.full_name) : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">
                      {user?.full_name ?? "Usuario"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user ? getRoleLabel(user.role) : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email ?? ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="p-1">
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    router.push("/teacher/profile");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#334155] hover:bg-gray-50 transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Mi perfil
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    toast("Configuración — próximamente disponible.");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#334155] hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Configuración
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    toast("Ayuda — próximamente disponible.");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#334155] hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Ayuda
                </button>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-100" />

              {/* Logout */}
              <div className="p-1">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
