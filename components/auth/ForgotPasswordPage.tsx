"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailQuestion, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) { setError("Ingresa tu correo."); return; }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!data.ok) { setError(data.error ?? "Error"); return; }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally { setLoading(false); }
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
          <p className="text-lg font-light tracking-wide text-white/90 drop-shadow-sm">Recuperar contraseña</p>
        </div>
      </div>

      <div className="relative flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
            {!sent ? (
              <>
                <div className="text-center space-y-2">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-2">
                    <MailQuestion className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1E2A5E]">¿Olvidaste tu contraseña?</h3>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu correo y te enviaremos un código para restablecerla.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-[#1E2A5E]">Correo electrónico</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@ijfk.edu.pe" required />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] h-11">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
                  </Button>
                </form>

                <div className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-[#2C3A7A] hover:text-[#1E2A5E]">
                    <ArrowLeft className="h-4 w-4" /> Volver al login
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-[#1E2A5E]">¡Código enviado!</h3>
                <p className="text-sm text-muted-foreground">
                  Si el correo <strong>{email}</strong> está registrado, te enviamos un código de recuperación.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  💡 Revisa Mailpit en <a href="http://localhost:8025" target="_blank" className="underline">http://localhost:8025</a>
                </p>
                <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                  <Button className="w-full bg-[#1E2A5E] text-white hover:bg-[#162043]">
                    Ya tengo el código
                  </Button>
                </Link>
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
