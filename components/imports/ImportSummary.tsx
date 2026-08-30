"use client";

import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Conteos del staging + el botón de aplicar. Bloqueado si quedan filas ambiguas/sin match y `ignoreUnmatched` no está activo. */
export default function ImportSummary({
  ready,
  ambiguous,
  unmatched,
  applying,
  ignoreUnmatched,
  onIgnoreUnmatchedChange,
  onApply,
}: {
  ready: number;
  ambiguous: number;
  unmatched: number;
  applying: boolean;
  ignoreUnmatched: boolean;
  onIgnoreUnmatchedChange: (v: boolean) => void;
  onApply: () => void;
}) {
  const blocked = (ambiguous > 0 || unmatched > 0) && !ignoreUnmatched;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
          <CheckCircle2 className="h-4 w-4" /> {ready} listas
        </span>
        {ambiguous > 0 && (
          <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <AlertTriangle className="h-4 w-4" /> {ambiguous} por revisar
          </span>
        )}
        {unmatched > 0 && (
          <span className="flex items-center gap-1.5 text-red-600 font-semibold">
            <AlertTriangle className="h-4 w-4" /> {unmatched} sin coincidencia
          </span>
        )}
      </div>

      {(ambiguous > 0 || unmatched > 0) && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={ignoreUnmatched}
            onChange={(e) => onIgnoreUnmatchedChange(e.target.checked)}
          />
          Aplicar solo las filas listas, omitiendo las ambiguas/sin coincidencia
        </label>
      )}

      <Button
        onClick={onApply}
        disabled={applying || blocked || ready === 0}
        className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
      >
        {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Aplicar a la libreta
      </Button>
      {blocked && (
        <p className="text-xs text-muted-foreground">
          Resuelve las filas ambiguas/sin coincidencia, o marca la casilla para omitirlas.
        </p>
      )}
    </div>
  );
}
