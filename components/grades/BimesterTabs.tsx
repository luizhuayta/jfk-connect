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
}: {
  active: string;
  onSelect: (bimester: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
      {BIMESTERS.map((b) => {
        const isActive = active === b;
        const open = isBimesterOpen(Number(b));
        return (
          <button
            key={b}
            onClick={() => onSelect(b)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                open ? (isActive ? "bg-emerald-300" : "bg-emerald-500") : isActive ? "bg-white/40" : "bg-gray-300"
              }`}
            />
            Bimestre {b}
          </button>
        );
      })}
    </div>
  );
}
