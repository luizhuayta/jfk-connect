"use client";

import { useState } from "react";
import FatherSidebar from "@/components/FatherSidebar";
import FatherTopBar from "@/components/layout/FatherTopBar";
import { FatherStudentsProvider } from "@/components/father/useFatherStudents";
import { AnnouncementsProvider } from "@/components/father/AnnouncementsProvider";
import { SessionUserProvider } from "@/lib/useSessionUser";
import { CurriculumProvider } from "@/lib/curriculum/client";

/**
 * Layout del panel del padre.
 *
 * Estructura visual:
 *  - Top bar fija con la marca y la campana de avisos (más la hamburguesa,
 *    solo en móvil, para abrir el drawer del sidebar).
 *  - Sidebar oscuro a la izquierda (drawer en móvil, persistente en
 *    escritorio). En escritorio se colapsa con su propio botón "Colapsar menú".
 *
 * Los providers viven aquí para que la sesión del usuario, la lista de hijos,
 * el hijo seleccionado y los avisos se carguen **una sola vez** y se
 * compartan entre todas las páginas (antes cada página/componente repetía
 * los mismos fetches y, en el caso de los hijos, perdía la selección al
 * navegar).
 *
 * No añadimos un wrapper exterior: el `AppSidebar` (dentro de
 * `FatherSidebar`) ya provee su contenedor raíz. El `reserveTopSpace` por
 * defecto (`true`) reserva los 64 px de la top bar para que el contenido
 * no quede oculto bajo ella.
 */
export default function FatherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SessionUserProvider>
      <CurriculumProvider>
        <FatherStudentsProvider>
          <AnnouncementsProvider>
            <FatherSidebar
              mobileOpen={mobileOpen}
              onCloseMobile={() => setMobileOpen(false)}
            >
              <FatherTopBar onMenuClick={() => setMobileOpen((v) => !v)} />
              {children}
            </FatherSidebar>
          </AnnouncementsProvider>
        </FatherStudentsProvider>
      </CurriculumProvider>
    </SessionUserProvider>
  );
}
