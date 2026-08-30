"use client";

import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  const confirmClass =
    tone === "danger"
      ? "flex-1 bg-red-600 text-white hover:bg-red-700"
      : "flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]";

  return (
    <Modal open={open} onClose={onClose} titleId="admin-confirm-title" closable={!loading}>
      <div className="space-y-4">
        <div>
          <h2 id="admin-confirm-title" className="text-xl font-bold text-[#0F172A]">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {children}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className={confirmClass}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
