"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

const YEARS = [
  { value: "1", label: "1.°" },
  { value: "2", label: "2.°" },
  { value: "3", label: "3.°" },
  { value: "4", label: "4.°" },
  { value: "5", label: "5.°" },
];

const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación local de contraseñas
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
            Crea tu cuenta de acceso
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

          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-bold text-[#1E2A5E]">Crear cuenta</h3>
              <p className="text-sm text-muted-foreground">
                Regístrate para acceder a la Intranet Institucional
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[#1E2A5E]">
                  Nombre completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ej: Carlos Pérez Huamán"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#1E2A5E]">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ijfk.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[#1E2A5E]">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[#1E2A5E]">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="year" className="text-[#1E2A5E]">
                    Año
                  </Label>
                  <Select value={year} onValueChange={(v) => v && setYear(v)} required>
                    <SelectTrigger id="year" className="rounded-lg border-muted-foreground/20 focus:ring-[#F4C15C]">
                      <SelectValue placeholder="Seleccione" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="section" className="text-[#1E2A5E]">
                    Sección
                  </Label>
                  <Select value={section} onValueChange={(v) => v && setSection(v)} required>
                    <SelectTrigger id="section" className="rounded-lg border-muted-foreground/20 focus:ring-[#F4C15C]">
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

                <div className="space-y-1.5">
                  <Label htmlFor="shift" className="text-[#1E2A5E]">
                    Turno
                  </Label>
                  <Select value={shift} onValueChange={(v) => v && setShift(v)} required>
                    <SelectTrigger id="shift" className="rounded-lg border-muted-foreground/20 focus:ring-[#F4C15C]">
                      <SelectValue placeholder="Mañana / Tarde" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mañana">Mañana</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 transition-colors disabled:opacity-50"
              >
                {loading ? "Enviando código..." : "Crear cuenta"}
              </Button>
            </form>

            <div className="rounded-lg bg-[#1E2A5E]/5 border border-[#1E2A5E]/15 p-3 text-xs leading-relaxed text-[#1E2A5E]/80">
              <p>
                <span className="font-semibold text-[#1E2A5E]">Aviso:</span>{" "}
                si tiene más de un hijo(a) matriculado en la institución, la
                configuración de las cuentas adicionales se realizará más
                adelante desde el panel del padre de familia.
              </p>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-1">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#2C3A7A] hover:text-[#1E2A5E] hover:underline"
              >
                Inicia sesión
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Sistema Institucional IJFK © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
