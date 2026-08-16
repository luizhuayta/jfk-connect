"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, MailQuestion, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Ingresa tu correo.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error ?? "Error");
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Recuperar contraseña">
      {!sent ? (
        <>
          <div className="mb-stack-md text-center">
            <div className="mb-stack-sm inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-container/10">
              <MailQuestion className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <h2 className="text-[24px] leading-[32px] font-semibold tracking-tight text-primary mb-2">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-[16px] leading-[24px] font-normal text-on-surface-variant">
              Ingresa tu correo y te enviaremos un código para restablecerla.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-stack-sm" noValidate>
            <div className="flex flex-col gap-base">
              <label
                htmlFor="email"
                className="text-[14px] leading-[20px] font-medium text-on-surface"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-outline"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@ijfk.edu.pe"
                  autoComplete="email"
                  required
                  className={cn(
                    "w-full rounded-lg border border-outline-variant bg-surface-bright pl-10 pr-4 py-3",
                    "text-[16px] leading-[24px] font-normal text-on-surface placeholder:text-outline",
                    "outline-none transition-all",
                    "focus:border-primary focus:ring-1 focus:ring-primary",
                  )}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[14px] leading-[20px] text-red-700"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-stack-sm">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full rounded-lg bg-secondary-container py-3 px-4 shadow-sm",
                  "text-[14px] leading-[20px] font-bold text-on-secondary-container",
                  "transition-all flex items-center justify-center gap-2",
                  "hover:bg-secondary-fixed",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    Enviar código
                    <Send className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-stack-md border-t border-outline-variant pt-stack-sm text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[14px] leading-[20px] font-medium text-primary hover:text-primary-container hover:underline transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al login
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="mb-stack-md text-center">
            <div className="mb-stack-sm inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
            </div>
            <h2 className="text-[20px] leading-[28px] font-semibold tracking-tight text-primary mb-2">
              ¡Código enviado!
            </h2>
            <p className="text-[16px] leading-[24px] font-normal text-on-surface-variant">
              Si el correo <strong className="text-on-surface">{email}</strong>{" "}
              está registrado, te enviamos un código de recuperación.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-[18px] text-amber-800">
            💡 Si el correo no llega, revisa tu bandeja de spam.
          </div>

          <div className="mt-stack-md">
            <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="block">
              <span
                className={cn(
                  "flex w-full items-center justify-center rounded-lg bg-primary py-3 px-4 shadow-sm",
                  "text-[14px] leading-[20px] font-bold text-on-primary",
                  "transition-colors hover:bg-primary-container",
                )}
              >
                Ya tengo el código
              </span>
            </Link>
          </div>

          <div className="mt-stack-md text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[14px] leading-[20px] font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al login
            </Link>
          </div>
        </>
      )}

      <div className="mt-stack-lg text-center">
        <p className="text-[12px] leading-[16px] font-semibold tracking-[0.05em] uppercase text-outline">
          Sistema Institucional IJFK © {new Date().getFullYear()}
        </p>
      </div>
    </AuthShell>
  );
}