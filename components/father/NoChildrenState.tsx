"use client";

import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Estado vacío único para "no tienes hijos vinculados".
 *
 * Antes existían tres versiones distintas del mismo mensaje (dashboard,
 * Mis Hijos y `ChildSelector`), cada una con su propio color de botón y su
 * propio radio de borde. El CTA abre el modal de vinculación en el sitio en el
 * que está el padre, en lugar de mandarlo a otra página a pulsar otro botón.
 */
export default function NoChildrenState({
  onAddChild,
  className = "",
}: {
  onAddChild: () => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center ${className}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <GraduationCap className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">
        Aún no tienes hijos vinculados
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Usa el código de matrícula de tu hijo para vincularlo y seguir sus notas,
        asistencia y materiales de clase.
      </p>
      <Button
        onClick={onAddChild}
        className="mt-5 h-10 gap-2 rounded-lg bg-primary font-semibold text-white hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" aria-hidden /> Vincular a mi hijo
      </Button>
    </div>
  );
}
