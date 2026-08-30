"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Image from "next/image";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail);
  }, [initialEmail, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !code || !newPwd || !confirm) { setError("Completa todos los campos."); return; }
    if (newPwd.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPwd !== confirm) { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: newPwd }),
      });
      const data = await r.json();
      if (!data.ok) { setError(data.error ?? "Error"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-2">
          <KeyRound className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-[#1E2A5E]">Restablecer contraseña</h3>
        <p className="text-sm text-muted-foreground">Ingresa el código y tu nueva contraseña</p>
      </div>

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-[#1E2A5E]">Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="text-[#1E2A5E]">Código de 6 dígitos</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" maxLength={6} className="text-center text-xl tracking-widest font-mono" required />
          </div>
          <div>
            <Label className="text-[#1E2A5E]">Nueva contraseña (mín. 8)</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
          </div>
          <div>
            <Label className="text-[#1E2A5E]">Confirmar contraseña</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] h-11">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restablecer contraseña"}
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <p className="text-emerald-700 font-semibold">¡Contraseña restablecida!</p>
          <p className="text-sm text-muted-foreground">Redirigiendo al login...</p>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[#2C3A7A] hover:text-[#1E2A5E]">
          <ArrowLeft className="h-4 w-4" /> Volver al login
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">Sistema Institucional IJFK © 2026</p>
    </div>
  );
}

export default function ResetPasswordPage() {
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
          <p className="text-lg font-light tracking-wide text-white/90 drop-shadow-sm">Restablecer contraseña</p>
        </div>
      </div>

      <div className="relative flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 w-full max-w-md">
          <Suspense fallback={<div className="bg-white rounded-2xl shadow-2xl p-8 text-center text-[#1E2A5E]">Cargando...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
