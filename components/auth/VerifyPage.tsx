"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") ?? "";
  const devCode = searchParams.get("devCode") ?? "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email] = useState(emailFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Solo dígitos
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Mover foco al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] ?? "";
    }
    setCode(newCode);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = code.join("");
    if (finalCode.length !== 6) {
      setError("Ingresa los 6 dígitos del código.");
      return;
    }
    if (!email) {
      setError("Falta el email. Vuelve a la página de registro.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: finalCode }),
      });
      const data = await r.json();

      if (!data.ok) {
        setError(data.error ?? "Código incorrecto.");
        // Limpiar el código para reintentar
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess(data.message ?? "¡Cuenta verificada!");
      // Esperar 2s y redirigir al login
      setTimeout(() => {
        router.push("/login?verified=1");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F4C15C]/20 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1E2A5E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[#1E2A5E]">Verifica tu correo</h3>
        <p className="text-sm text-muted-foreground">
          Ingresa el código de 6 dígitos que enviamos a:
        </p>
        {email && (
          <p className="text-sm font-semibold text-[#1E2A5E] break-all">
            {email}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code-0" className="text-[#1E2A5E] text-center block">
            Código de verificación
          </Label>
          <div className="flex gap-2 justify-center">
            {code.map((digit, i) => (
              <Input
                key={i}
                id={`code-${i}`}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading || !!success}
                className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-muted-foreground/30 focus-visible:ring-[#F4C15C] focus-visible:border-[#F4C15C]"
              />
            ))}
          </div>
        </div>

        {/* En modo desarrollo se muestra el código para facilitar la prueba */}
        {devCode && process.env.NODE_ENV !== "production" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800 text-center">
            <strong>Modo desarrollo:</strong> código = <code className="font-mono">{devCode}</code>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center">
            {success}
            <br />
            <span className="text-xs">Redirigiendo al login...</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !!success}
          className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 transition-colors disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Verificar código"}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground pt-2">
        ¿No recibiste el código?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#2C3A7A] hover:text-[#1E2A5E] hover:underline"
        >
          Volver a intentar
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-1">
        Sistema Institucional IJFK © 2026
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Image/fondo_login.webp')" }}
        />
        <div className="absolute inset-0 bg-[#1E2A5E]/80 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-md">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 border-2 border-white/20 backdrop-blur-sm p-1.5">
            <Image
              src="/Image/logo.jpg"
              alt="Logo CIJK"
              width={104}
              height={104}
              className="rounded-full object-cover"
              priority
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight leading-tight drop-shadow-md">
              COLEGIO INDUSTRIAL
              <br />
              JOHN F. KENNEDY
            </h1>
            <p className="text-xl font-semibold tracking-widest text-[#F4C15C] drop-shadow-md">
              CHINCHA
            </p>
          </div>

          <div className="h-px w-24 bg-white/30" />

          <p className="text-lg font-light tracking-wide text-white/90 drop-shadow-sm">
            Verificación de correo
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="relative flex w-full lg:w-1/2 items-center justify-center p-6"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex flex-col items-center mb-8 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20 mb-4 p-1">
              <Image
                src="/Image/logo.jpg"
                alt="Logo CIJK"
                width={56}
                height={56}
                className="rounded-full object-cover"
                priority
              />
            </div>
            <h2 className="text-lg font-bold text-center">
              COLEGIO INDUSTRIAL JOHN F. KENNEDY
            </h2>
            <p className="text-sm font-semibold tracking-widest text-[#F4C15C]">
              CHINCHA
            </p>
          </div>

          <Suspense fallback={<div className="bg-white rounded-2xl shadow-2xl p-8 text-center text-[#1E2A5E]">Cargando...</div>}>
            <VerifyForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
