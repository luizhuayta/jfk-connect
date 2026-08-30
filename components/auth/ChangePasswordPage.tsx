"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, X, ShieldCheck } from "lucide-react";
import Image from "next/image";

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

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Cargar usuario de sessionStorage
    const rawUser = typeof window !== "undefined" ? sessionStorage.getItem("ijfk_user") : null;
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const strength = getPasswordStrength(newPwd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!current || !newPwd || !confirm) {
      setError("Completa todos los campos.");
      return;
    }
    if (newPwd.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPwd === current) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: newPwd }),
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error ?? "Error al cambiar la contraseña.");
        return;
      }
      setSuccess(true);
      // Actualizar user en sessionStorage (quitar mustChangePassword)
      if (typeof window !== "undefined" && user) {
        sessionStorage.setItem("ijfk_user", JSON.stringify({ ...user, mustChangePassword: false }));
      }
      // Redirigir al panel después de 2s
      setTimeout(() => {
        const role = user.email.includes("docente") ? "teacher" : user.email.includes("admin") ? "admin" : "father";
        router.push(`/${role}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/Image/fondo_login.webp')" }} />
        <div className="absolute inset-0 bg-[#1E2A5E]/80 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-md">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm p-1.5">
            <Image src="/Image/logo.jpg" alt="Logo CIJK" width={104} height={104} className="rounded-full object-cover" priority />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight leading-tight drop-shadow-md">COLEGIO INDUSTRIAL<br />JOHN F. KENNEDY</h1>
            <p className="text-xl font-semibold tracking-widest text-[#F4C15C] drop-shadow-md">CHINCHA</p>
          </div>
          <div className="h-px w-24 bg-white/30" />
          <p className="text-lg font-light tracking-wide text-white/90 drop-shadow-sm">Cambio de contraseña</p>
        </div>
      </div>

      <div className="relative flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-2">
                <KeyRound className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#1E2A5E]">Cambia tu contraseña</h3>
              <p className="text-sm text-muted-foreground">
                {user ? `Hola ${user.fullName.split(" ")[0]}, tu cuenta fue creada con una contraseña temporal. Cámbiala por una segura.` : "Cargando..."}
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-[#1E2A5E]">Contraseña actual (temporal)</Label>
                  <div className="relative">
                    <Input type={showCur ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="ijfk2026" />
                    <button type="button" onClick={() => setShowCur(!showCur)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[#1E2A5E]">Nueva contraseña (mín. 8 caracteres)</Label>
                  <div className="relative">
                    <Input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
                )}

                <Button type="submit" disabled={loading} className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><ShieldCheck className="h-4 w-4 mr-2" /> Cambiar contraseña</>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <p className="text-emerald-700 font-semibold">¡Contraseña actualizada con éxito!</p>
                <p className="text-sm text-muted-foreground">Redirigiendo a tu panel...</p>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground pt-2">
              Sistema Institucional IJFK © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
