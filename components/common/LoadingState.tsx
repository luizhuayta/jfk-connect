import { Loader2 } from "lucide-react";

/**
 * Bloque de carga compartido. Antes cada página del panel padre repetía el
 * mismo `div` con spinner + texto (8 copias idénticas).
 */
export default function LoadingState({
  label = "Cargando...",
  className = "py-16",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`} role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" aria-hidden />
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}
