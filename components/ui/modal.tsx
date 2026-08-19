"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Primitivo de modal compartido: Escape, click en backdrop y ARIA
 * consistentes (antes cada modal del panel de padres implementaba esto por
 * su cuenta — algunos con Escape, otros sin backdrop-dismiss, ninguno con
 * los tres a la vez).
 */
export default function Modal({
  open,
  onClose,
  titleId,
  children,
  className,
  closable = true,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  className?: string;
  /** false mientras una acción está en curso: bloquea Escape/backdrop/X. */
  closable?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closable, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => closable && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-2xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalCloseButton({
  onClose,
  disabled = false,
}: {
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClose}
      disabled={disabled}
      aria-label="Cerrar"
      className="rounded p-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  );
}
