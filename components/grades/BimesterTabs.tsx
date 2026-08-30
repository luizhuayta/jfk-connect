"use client";

import { BIMESTERS, isBimesterOpen } from "@/lib/grades/bimesters";

/**
 * Tabs B1-B4 compartidos entre docente y admin. El punto de color no es
 * decorativo: verde = bimestre abierto a captura, gris = cerrado (el
 * servidor es quien decide esto de verdad — ver scope.editable — este
 * punto es solo el reflejo visual de la misma regla, lib/grades/bimesters).
 */
export default function BimesterTabs({
  active,
  onSelect,
  currentBimester,
  showOpenDots = true,
}: {
  active: string;
  onSelect: (bimester: string) => void;
  /** Si se pasa, el tab coincidente muestra «actual» (panel padre). */
  currentBimester?: number;
  /** Puntos verde/gris de captura. El padre no captura notas: dejar en false. */
  showOpenDots?: boolean;
}) {
  return (
    <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
      {BIMESTERS.map((b) => {
        const isActive = active === b;
        const open = isBimesterOpen(Number(b));
        return (
          <button
            key={b}
            type="button"
            onClick={() => onSelect(b)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {showOpenDots && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  open ? (isActive ? "bg-emerald-300" : "bg-emerald-500") : isActive ? "bg-white/40" : "bg-gray-300"
                }`}
              />
            )}
            Bimestre {b}
            {currentBimester === Number(b) ? " · actual" : ""}
          </button>
        );
      })}
    </div>
  );
}
