"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Calendar,
  Hash,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import AuthShell from "@/components/auth/AuthShell";

const YEARS = [
  { value: "1", label: "1.°" },
  { value: "2", label: "2.°" },
  { value: "3", label: "3.°" },
  { value: "4", label: "4.°" },
  { value: "5", label: "5.°" },
];

const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];

/** Input institucional: icono izquierda, botón mostrar/ocultar opcional derecha. */
function FieldInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  trailing,
  autoComplete,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
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
          minLength={minLength}
          className={cn(
            "w-full rounded-lg border border-outline-variant bg-surface-bright",
            trailing ? "pl-10 pr-10" : "pl-10 pr-4",
            "py-3 text-[16px] leading-[24px] font-normal text-on-surface placeholder:text-outline",
            "outline-none transition-all",
            "focus:border-primary focus:ring-1 focus:ring-primary",
          )}
        />
        {trailing && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [shift, setShift] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, year, section, shift }),
      });
      const data = await r.json();

      if (!data.ok) {
        setError(data.error ?? "Error al registrar. Intenta de nuevo.");
        return;
      }

      // Redirigir a /verify con email y (en dev) el código
      const params = new URLSearchParams({ email: data.email });
      if (data.devCode) params.set("devCode", data.devCode);
      router.push(`/verify?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const pwdToggle = (
    <button
      type="button"
      onClick={() => setShowPwd((v) => !v)}
      tabIndex={-1}
      aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="flex h-9 w-9 items-center justify-center rounded-md text-outline hover:text-primary transition-colors"
    >
      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <AuthShell subtitle="Crea tu cuenta de acceso">
      {/* Header */}
      <div className="mb-stack-md text-center">
        <h2 className="text-[24px] leading-[32px] font-semibold tracking-tight text-primary mb-2">
          Crear cuenta
        </h2>
        <p className="text-[16px] leading-[24px] font-normal text-on-surface-variant">
          Regístrate para acceder a la Intranet Institucional
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-stack-sm"
        noValidate
      >
        <FieldInput
          id="fullName"
          label="Nombre completo"
          value={fullName}
          onChange={setFullName}
          placeholder="Ej: Carlos Pérez Huamán"
          icon={User}
          autoComplete="name"
          required
        />

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

        <FieldInput
          id="password"
          label="Contraseña"
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          icon={Lock}
          trailing={pwdToggle}
          autoComplete="new-password"
          required
          minLength={6}
        />

        <FieldInput
          id="confirmPassword"
          label="Confirmar contraseña"
          type={showPwd ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
          icon={Lock}
          trailing={pwdToggle}
          autoComplete="new-password"
          required
          minLength={6}
        />

        {/* Año / Sección / Turno */}
        <div className="grid grid-cols-3 gap-gutter">
          <div className="flex flex-col gap-base">
            <label
              htmlFor="year"
              className="text-[14px] leading-[20px] font-medium text-on-surface"
            >
              Año
            </label>
            <div className="relative">
              <Calendar
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-outline"
              />
              <Select value={year} onValueChange={(v) => setYear(v ?? "")} required>
                <SelectTrigger
                  id="year"
                  className="h-[46px] rounded-lg border-outline-variant bg-surface-bright pl-9 pr-3 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-base">
            <label
              htmlFor="section"
              className="text-[14px] leading-[20px] font-medium text-on-surface"
            >
              Sección
            </label>
            <div className="relative">
              <Hash
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-outline"
              />
              <Select value={section} onValueChange={(v) => setSection(v ?? "")} required>
                <SelectTrigger
                  id="section"
                  className="h-[46px] rounded-lg border-outline-variant bg-surface-bright pl-9 pr-3 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <SelectValue placeholder="A - M" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-base">
            <label
              htmlFor="shift"
              className="text-[14px] leading-[20px] font-medium text-on-surface"
            >
              Turno
            </label>
            <div className="relative">
              <Clock
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-outline"
              />
              <Select value={shift} onValueChange={(v) => setShift(v ?? "")} required>
                <SelectTrigger
                  id="shift"
                  className="h-[46px] rounded-lg border-outline-variant bg-surface-bright pl-9 pr-3 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <SelectValue placeholder="Mañana / Tarde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mañana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              "Enviando código..."
            ) : (
              <>
                Crear cuenta
                <UserPlus className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-[12px] leading-[18px] text-on-surface-variant">
          <span className="font-semibold text-on-surface">Aviso:</span> si tiene
          más de un hijo(a) matriculado en la institución, la configuración de
          las cuentas adicionales se realizará más adelante desde el panel del
          padre de familia.
        </div>
      </form>

      <div className="mt-stack-md border-t border-outline-variant pt-stack-sm text-center">
        <p className="text-[14px] leading-[20px] font-medium text-on-surface-variant">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-primary hover:text-primary-container hover:underline transition-colors"
          >
            Inicia sesión
          </Link>
        </p>
      </div>

      <div className="mt-stack-lg text-center">
        <p className="text-[12px] leading-[16px] font-semibold tracking-[0.05em] uppercase text-outline">
          Sistema Institucional IJFK © {new Date().getFullYear()}
        </p>
      </div>
    </AuthShell>
  );
}