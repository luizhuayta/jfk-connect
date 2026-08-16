"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { useFatherStudents } from "@/components/father/useFatherStudents";
import ClaimChildModal from "@/components/father/ClaimChildModal";
import NoChildrenState from "@/components/father/NoChildrenState";

/**
 * Selector de hijos del panel padre (avatar + iniciales + nombre + grado/
 * sección), compartido por grades/attendance/schedule/enrollment/materials.
 *
 * La lista y el hijo activo vienen del `FatherStudentsProvider`, así que la
 * selección se conserva al navegar entre páginas. Si el padre no tiene hijos
 * vinculados, el estado vacío abre el modal de vinculación aquí mismo (antes
 * llevaba a otra página donde había que volver a pulsar otro botón).
 */
export default function ChildSelector() {
  const { students, activeStudentId, selectStudent, reload } = useFatherStudents();
  const [claimOpen, setClaimOpen] = useState(false);

  if (students.length === 0) {
    return (
      <>
        <NoChildrenState onAddChild={() => setClaimOpen(true)} />
        <ClaimChildModal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          onClaimed={() => reload()}
        />
      </>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap" role="group" aria-label="Seleccionar hijo">
      {students.map((s) => {
        const isActive = activeStudentId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => selectStudent(s.id)}
            aria-pressed={isActive}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
              isActive
                ? "border-[#1E2A5E] bg-[#1E2A5E]/5"
                : "border-gray-200 bg-white hover:border-[#1E2A5E]/30"
            }`}
          >
            <Avatar className="h-9 w-9 border border-[#F4C15C]/40">
              <AvatarFallback
                className={`text-xs font-semibold ${
                  isActive ? "bg-[#1E2A5E] text-white" : "bg-[#1E2A5E]/10 text-[#1E2A5E]"
                }`}
              >
                {getInitials(s.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p
                className={`text-sm font-semibold ${
                  isActive ? "text-[#1E2A5E]" : "text-[#0F172A]"
                }`}
              >
                {s.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.grade} &quot;{s.section}&quot;
                {isActive && <span className="sr-only"> (en vista)</span>}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
