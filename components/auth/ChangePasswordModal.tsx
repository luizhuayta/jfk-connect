"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, X } from "lucide-react";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface ChangePasswordModalProps {
  user: User;
  onSuccess: (newPwd: string) => void;
  onClose?: () => void; // Opcional: si el modal se puede cerrar
  closable?: boolean; // Si false, no se puede cerrar (modo forzado)
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Débil", color: "bg-red-500" };
  if (score <= 3) return { score, label: "Media", color: "bg-amber-500" };
  return { score, label: "Fuerte", color: "bg-emerald-500" };
}

export default function ChangePasswordModal({ user, onSuccess, onClose, closable = false }: ChangePasswordModalProps) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPwd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!current || !newPwd || !confirm) { setError("Completa todos los campos."); return; }
    if (newPwd.length < 8) { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (newPwd !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (newPwd === current) { setError("La nueva contraseña debe ser diferente a la actual."); return; }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: newPwd }),
      });
      const data = await r.json();
      if (!data.ok) { setError(data.error ?? "Error al cambiar la contraseña."); return; }
      setSuccess(true);
      onSuccess(newPwd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-[#1E2A5E] to-[#2C3A7A] p-6 text-white relative">
          {closable && onClose && (
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#F4C15C]/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-[#F4C15C]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {closable ? "Cambiar contraseña" : "Cambio de contraseña obligatorio"}
              </h2>
              <p className="text-sm text-white/80">
                {closable ? "Actualiza tu contraseña de acceso" : "Política de seguridad institucional"}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {!success ? (
            <>
              {!closable && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  <p className="font-semibold">¡Hola, {user.fullName.split(" ")[0]}!</p>
                  <p className="text-xs mt-1">
                    El administrador te creó una cuenta con una <strong>contraseña temporal</strong>.
                    Por políticas de seguridad, debes cambiarla antes de poder acceder al sistema.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label className="text-[#1E2A5E]">Contraseña actual{!closable && " (temporal)"}</Label>
                  <div className="relative">
                    <Input type={showCur ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={closable ? undefined : "ijfk2026"} className="pr-10" />
                    <button type="button" onClick={() => setShowCur(!showCur)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1E2A5E]">
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[#1E2A5E]">Nueva contraseña (mín. 8 caracteres)</Label>
                  <div className="relative">
                    <Input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="pr-10" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1E2A5E]">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPwd && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded ${i <= strength.score ? strength.color : "bg-gray-200"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Seguridad: <strong>{strength.label}</strong></p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-[#1E2A5E]">Confirmar nueva contraseña</Label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>

                {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

                <Button type="submit" disabled={loading} className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] h-11 mt-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><ShieldCheck className="h-4 w-4 mr-2" /> {closable ? "Cambiar contraseña" : "Cambiar contraseña y entrar"}</>
                  )}
                </Button>

                {!closable && (
                  <p className="text-xs text-center text-muted-foreground">
                    🔒 No puedes acceder al sistema hasta cambiar tu contraseña temporal
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <p className="text-emerald-700 font-semibold text-lg">¡Contraseña cambiada con éxito!</p>
                <p className="text-sm text-muted-foreground mt-1">Ya puedes acceder al sistema.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
