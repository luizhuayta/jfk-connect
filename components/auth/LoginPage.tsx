"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12 relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/Image/fondo_login.webp')" }}
        />
        {/* Dark overlay with blur */}
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
            Intranet Institucional
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

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-bold text-[#1E2A5E]">Iniciar Sesión</h3>
              <p className="text-sm text-muted-foreground">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1E2A5E]">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ijfk.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1E2A5E]">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border-muted-foreground/20 focus-visible:ring-[#F4C15C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Recordarme
                  </Label>
                </div>
                <Link
                  href="#"
                  className="text-sm font-medium text-[#2C3A7A] hover:text-[#1E2A5E] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Link href="/role-selector">
                <Button className="w-full mt-2 bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 transition-colors">
                  Iniciar sesión
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Sistema Institucional IJFK © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
