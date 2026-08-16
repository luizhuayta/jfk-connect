"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { useAnnouncements } from "@/components/father/AnnouncementsProvider";

/**
 * Barra superior del panel del padre.
 *
 * Diferencias con `Navbar` (usado por teacher/admin):
 *  - Sin identidad de usuario a la derecha: el nombre y el rol viven en el
 *    sidebar.
 *  - Hamburguesa solo en móvil: en escritorio el sidebar es persistente y se
 *    colapsa con su propio botón ("Colapsar menú"), así que aquí no aporta.
 *  - Campana de avisos no leídos que enlaza a `/father/announcements`.
 *
 * El contador viene del `AnnouncementsProvider`, compartido con el sidebar y el
 * dashboard: una sola carga y siempre coherente al marcar avisos como leídos.
 */
export default function FatherTopBar({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { unreadCount } = useAnnouncements();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-[#E2E8F0] flex items-center gap-4 px-4 sm:px-6">
      {/* Logo + marca */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5 text-[#1E2A5E]" aria-hidden />
        </button>
        <Link href="/father" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden shrink-0">
            <Image
              src="/Image/logo.jpg"
              alt=""
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-[#1E2A5E] tracking-tight">
              Colegio IJFK
            </span>
            <span className="text-[10px] text-muted-foreground">
              Panel de padres
            </span>
          </div>
        </Link>
      </div>

      {/* Espaciador: la marca queda a la izquierda y los avisos a la derecha */}
      <div className="flex-1" />

      {/* Avisos */}
      <Link
        href="/father/announcements"
        className="relative p-2 rounded-full hover:bg-gray-50 transition-colors shrink-0"
        aria-label={
          unreadCount > 0 ? `${unreadCount} avisos sin leer` : "Avisos"
        }
      >
        <Bell className="h-5 w-5 text-[#1E2A5E]" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
