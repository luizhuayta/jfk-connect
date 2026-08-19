"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { useAnnouncements } from "@/components/father/AnnouncementsProvider";
import { cn } from "@/lib/utils";

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
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16 flex items-center gap-4 px-4 sm:px-6",
        // Vidrio esmerilado en tono navy institucional (no blanco): una
        // superficie estructural grande debe leerse "pesada"/con color, igual
        // que el sidebar, para diferenciarse del contenido claro debajo.
        // Un solo tono (sin segundo color ni saturate boost): con backdrop
        // translúcido, saturar de más amplifica cualquier color de fondo que
        // se alcance a filtrar (p. ej. el dorado de un botón) y ensucia el
        // tono hacia un oliva no deseado.
        "bg-primary/95 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-primary/90",
        // Borde inferior sutil + sombra: separa el header del contenido sin
        // una línea dura, como si la luz atravesara el borde del vidrio.
        "border-b border-white/10 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_12px_24px_-16px_rgba(15,23,42,0.45)]",
      )}
    >
      {/* Logo + marca */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="lg:hidden p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          <Menu className="h-5 w-5 text-white" aria-hidden />
        </button>
        <Link href="/father" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-white/40 overflow-hidden shrink-0">
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
            <span className="text-sm font-bold text-white tracking-tight">
              Colegio IJFK
            </span>
            <span className="text-[10px] text-white/70">
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
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
        aria-label={
          unreadCount > 0 ? `${unreadCount} avisos sin leer` : "Avisos"
        }
      >
        <Bell className="h-5 w-5 text-white" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-primary/70">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
