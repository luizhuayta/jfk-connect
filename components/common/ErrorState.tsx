"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Estado de error compartido con acción de reintento. Antes cada página
 * devolvía un `div` rojo sin salida: el usuario solo podía recargar con F5.
 */
export default function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-red-700">
        No pudimos cargar esta información
      </p>
      <p className="mt-1 text-xs text-red-600">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          disabled={retrying}
          variant="outline"
          className="mt-4 gap-2 rounded-lg border-red-200 bg-white text-red-700 hover:bg-red-100"
        >
          <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {retrying ? "Reintentando..." : "Reintentar"}
        </Button>
      )}
    </div>
  );
}
