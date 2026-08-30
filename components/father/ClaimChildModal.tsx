"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { GraduationCap, Hash, Loader2, CheckCircle2, Plus } from "lucide-react";
import { readApiJson } from "@/lib/client/api";
import type { ClaimedStudent } from "@/lib/father/claim-student";

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
      setError("Ingrese el código de matrícula.");
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
      const data = await readApiJson(r);
      setSuccess(data.student as ClaimedStudent);
      setCode("");
      onClaimed(data.student as ClaimedStudent);
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
    <Modal open={open} onClose={handleClose} titleId="claim-child-title" closable={!loading}>
      <>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="claim-child-title" className="text-xl font-bold text-primary">
            Vincular a su hijo
          </h2>
          <ModalCloseButton onClose={handleClose} disabled={loading} />
        </div>

        {success ? (
          /* Success state */
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">Ya puede ver la jornada de hoy.</p>
              <p className="text-lg font-bold text-foreground mt-1">{success.name}</p>
              <Badge className="mt-2 bg-primary/10 text-primary text-xs font-semibold">
                {success.grade} &quot;{success.section}&quot;
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Ver la jornada de hoy
              </Button>
              {canAddMore && (
                <Button
                  onClick={handleClaimAnother}
                  className="flex-1 bg-primary text-white hover:bg-primary-hover gap-2"
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
              Ingrese el <strong>código de matrícula</strong> que el colegio le
              entregó en papel. Lo encuentra en la ficha de matrícula o
              constancia del alumno. El ejemplo de abajo no es un código real.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
                  placeholder="Ejemplo: 2026-2A-0042"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
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
                className="flex-1 bg-primary text-white hover:bg-primary-hover"
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
                ¿No tiene el código? Acérquese a Secretaría del colegio (lunes a
                viernes de 8:00 a 13:00) para obtenerlo.
              </span>
            </p>
          </>
        )}
      </>
    </Modal>
  );
}