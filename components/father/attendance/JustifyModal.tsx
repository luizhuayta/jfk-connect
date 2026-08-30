"use client";

import { Button } from "@/components/ui/button";
import Modal, { ModalCloseButton } from "@/components/ui/modal";
import { Loader2 } from "lucide-react";
import { longDate } from "@/lib/attendance/calendar";
import type { AttendanceRecord } from "@/lib/father/types";

export default function JustifyModal({
  target,
  reason,
  sending,
  error,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  target: AttendanceRecord | null;
  reason: string;
  sending: boolean;
  error: string | null;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      titleId="justify-title"
      closable={!sending}
      className="space-y-4"
    >
      <>
        <div className="flex items-center justify-between">
          <h2 id="justify-title" className="text-xl font-bold text-primary">
            Justificar falta
          </h2>
          <ModalCloseButton onClose={onClose} disabled={sending} />
        </div>

        <p className="text-sm capitalize text-on-surface-variant">
          {target ? longDate(target.date) : ""}
        </p>

        <div>
          <label
            htmlFor="justify-reason"
            className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
          >
            Motivo de la justificación *
          </label>
          <textarea
            id="justify-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
            placeholder="Ej: Inasistencia por cita médica..."
            className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-right text-xs text-on-surface-variant">
            {reason.length}/500
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
          El docente revisará su solicitud. Si la aprueba, el día se marcará como
          justificado.
        </p>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="h-11 flex-1 rounded-lg"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={sending || !reason.trim()}
            className="h-11 flex-1 rounded-lg bg-primary text-white hover:bg-primary-hover"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              "Enviar justificación"
            )}
          </Button>
        </div>
      </>
    </Modal>
  );
}
