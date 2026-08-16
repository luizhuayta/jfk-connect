"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import AuthShell from "@/components/auth/AuthShell";

interface UserData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword?: boolean;
}

const ROLE_HOME: Record<string, string> = {
  padre: "/father",
  docente: "/teacher",
  admin: "/admin",
};

/**
 * Resuelve el destino post-login. El middleware genera `/login?redirect=<ruta>`;
 * aquí se respeta SOLO si es una ruta interna del rol del usuario (o el
 * selector de rol). Cualquier otra cosa (urls externas, rutas de otro rol)
 * cae a la home del rol. Esto evita open-redirect.
 */
function resolveRedirect(target: string | null, role: string): string {
  const home = ROLE_HOME[role] ?? "/role-selector";
  if (!target) return home;
  const prefix = ROLE_HOME[role];
  if (prefix && (target === prefix || target.startsWith(prefix + "/"))) return target;
  if (target === "/role-selector") return target;
  return home;
}

/** Input institucional con icono a la izquierda y focus ring azul institucional. */
function FieldInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-base">
      <label
        htmlFor={id}
        className="text-[14px] leading-[20px] font-medium text-on-surface"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-outline"
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            "w-full rounded-lg border border-outline-variant bg-surface-bright pl-10 pr-4 py-3",
            "text-[16px] leading-[24px] font-normal text-on-surface placeholder:text-outline",
            "outline-none transition-all",
            "focus:border-primary focus:ring-1 focus:ring-primary",
          )}
        />
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const success = justVerified
    ? "¡Tu cuenta fue verificada con éxito! Inicia sesión."
    : null;
  const [pendingUser, setPendingUser] = useState<UserData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();

      if (!data.ok) {
        setError(data.error ?? "Error al iniciar sesión.");
        return;
      }

      // Si debe cambiar la contraseña, mostrar modal bloqueante
      if (data.user.mustChangePassword) {
        setPendingUser(data.user);
        setLoading(false);
        return;
      }

      // Respeta ?redirect= cuando apunta a una ruta del propio rol (ver
      // resolveRedirect); si no, navega a la home del rol.
      router.push(resolveRedirect(searchParams.get("redirect"), data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    if (!pendingUser) return;
    setTimeout(() => {
      router.push(resolveRedirect(searchParams.get("redirect"), pendingUser.role));
    }, 1500);
  };

  return (
    <>
      {success && (
        <div className="mb-stack-md flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[14px] leading-[20px] font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>{success}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-stack-md text-center">
        <h2 className="text-[24px] leading-[32px] font-semibold tracking-tight text-primary mb-2">
          Iniciar Sesión
        </h2>
        <p className="text-[16px] leading-[24px] font-normal text-on-surface-variant">
          Ingresa tus credenciales para acceder al sistema
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-stack-sm" noValidate>
        <FieldInput
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="nombre@ijfk.edu.pe"
          icon={Mail}
          autoComplete="email"
          required
        />

        <div className="flex flex-col gap-base mt-stack-sm">
          <FieldInput
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            icon={Lock}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="mt-stack-sm flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-[14px] leading-[20px] font-medium text-primary underline-offset-2 hover:text-primary-container hover:underline transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
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
            disabled={loading || !!pendingUser}
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
              "Ingresando..."
            ) : (
              <>
                Iniciar sesión
                <LogIn className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Footer Links */}
      <div className="mt-stack-md border-t border-outline-variant pt-stack-sm text-center">
        <p className="text-[14px] leading-[20px] font-medium text-on-surface-variant">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-bold text-primary hover:text-primary-container hover:underline transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>

      <div className="mt-stack-lg text-center">
        <p className="text-[12px] leading-[16px] font-semibold tracking-[0.05em] uppercase text-outline">
          Sistema Institucional IJFK © {new Date().getFullYear()}
        </p>
      </div>

      {pendingUser && (
        <ChangePasswordModal
          user={pendingUser}
          onSuccess={handlePasswordChanged}
          closable={false}
        />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell subtitle="Intranet Institucional">
      <Suspense
        fallback={
          <div className="py-10 text-center text-[14px] text-on-surface-variant">
            Cargando…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}