"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Hash, Loader2, CheckCircle2, X, Plus } from "lucide-react";

type ClaimedStudent = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

export default function ClaimChildModal({
  open,
  onClose,
  onClaimed,
  canAddMore = true,
}: {
  open: boolean;
  onClose: () => void;
  onClaimed: (student: ClaimedStudent) => void;
  canAddMore?: boolean;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ClaimedStudent | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    if (!code.trim()) {
      setError("Ingresa el código de matrícula.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/father/claim-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentCode: code.trim() }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setSuccess(data.student);
      setCode("");
      onClaimed(data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al vincular");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCode("");
    setError(null);
    setSuccess(null);
    onClose();
  }

  function handleClaimAnother() {
    setSuccess(null);
    setError(null);
    setCode("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1E2A5E]">Vincular a tu hijo</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">¡Hijo vinculado!</p>
              <p className="text-lg font-bold text-[#0F172A] mt-1">{success.name}</p>
              <Badge className="mt-2 bg-[#1E2A5E]/10 text-[#1E2A5E] text-xs font-semibold">
                {success.grade} &quot;{success.section}&quot;
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Ver panel
              </Button>
              {canAddMore && (
                <Button
                  onClick={handleClaimAnother}
                  className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043] gap-2"
                >
                  <Plus className="h-4 w-4" /> Vincular otro
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Input state */
          <>
            <p className="text-sm text-muted-foreground">
              Ingresa el <strong>código de matrícula</strong> que el colegio te
              entregó físicamente. Lo encuentras en la ficha de matrícula o
              constancia del alumno.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Código de matrícula
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                  placeholder="Ej: 2026-2A-0042"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E] text-[#0F172A] font-mono"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !code.trim()}
                className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Vincular hijo"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                ¿No tienes el código? Acércate a Secretaría del colegio (lunes a
                viernes de 8:00 a 13:00 hrs) para obtenerlo.
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}