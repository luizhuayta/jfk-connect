"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/**
 * `AuthShell` es el layout compartido de las páginas de autenticación
 * (login, registro, recuperación de contraseña, cambio de contraseña y
 * verificación). Antes cada página duplicaba ~70 líneas del panel izquierdo
 * con el escudo y el fondo institucional; aquí es la única fuente.
 *
 * Sistema de diseño: replica los tokens de Material 3 del HTML de referencia.
 * Las clases utility usan los hex del sistema (`bg-primary-container`,
 * `text-secondary-container`, `bg-surface-container-low`, etc.) en lugar de
 * slate/zinc, para que sea coherente con la paleta institucional.
 *
 * - Panel izquierdo (`<aside>`, oculto en móvil): fondo `bg-primary-container`
 *   con foto opacada + gradiente, escudo del colegio, marca y subtítulo.
 * - Panel derecho: `bg-surface-container-low` con tarjeta
 *   `bg-surface-container-lowest rounded-[16px]` y sombra suave.
 *
 * El subtítulo del panel izquierdo (p. ej. "Crea tu cuenta de acceso") se
 * inyecta como prop porque cambia por pantalla.
 */
export default function AuthShell({
  subtitle,
  children,
}: {
  /** Frase corta que aparece debajo de la marca (p. ej. "Recuperar contraseña"). */
  subtitle?: string;
  /** Contenido del formulario (típicamente un `<form>` o un estado de éxito). */
  children: ReactNode;
}) {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-surface font-sans text-on-surface">
      {/* ── Panel izquierdo: branding institucional (oculto en móvil) ── */}
      <aside
        aria-label="Información institucional"
        className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center overflow-hidden bg-primary-container p-container-padding text-on-primary lg:overflow-y-auto lg:scrollbar-hidden"
      >
        {/* Foto institucional con overlay + gradiente */}
        <div aria-hidden className="absolute inset-0 z-0">
          <div
            className="h-full w-full bg-cover bg-center opacity-30 mix-blend-multiply"
            style={{ backgroundImage: "url('/Image/fondo_login.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-container/80 to-primary-container/95" />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          {/* Escudo */}
          <div className="mb-stack-md flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-lowest p-2 shadow-2xl">
            <Image
              src="/Image/logo.jpg"
              alt="Escudo del Colegio Industrial John F. Kennedy"
              width={96}
              height={96}
              priority
              className="h-full w-full rounded-full object-contain"
            />
          </div>

          <h1 className="text-[48px] leading-[56px] tracking-tight font-bold mb-2">
            COLEGIO INDUSTRIAL
          </h1>
          <h2 className="text-[32px] leading-[40px] tracking-tight font-semibold mb-2">
            JOHN F. KENNEDY
          </h2>
          <p className="text-[24px] leading-[32px] font-semibold tracking-widest uppercase text-secondary-container mb-stack-lg">
            Chincha
          </p>

          <div className="mb-stack-md h-px w-16 bg-outline-variant/50" />

          <p className="text-[18px] leading-[28px] font-normal text-primary-fixed-dim">
            {subtitle ?? "Intranet Institucional"}
          </p>
        </div>
      </aside>

      {/* ── Panel derecho: tarjeta del formulario ── */}
      <section className="flex w-full lg:w-1/2 flex-col items-center justify-start overflow-y-auto scrollbar-hidden bg-surface-container-low p-container-padding">
        <div className="m-auto w-full max-w-md rounded-[16px] border border-outline-variant bg-surface-container-lowest p-6 sm:p-stack-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          {/* Logo pequeño visible solo en móvil */}
          <div className="mb-stack-md flex justify-center lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low p-2 shadow-sm">
              <Image
                src="/Image/logo.jpg"
                alt="Escudo IJFK"
                width={64}
                height={64}
                priority
                className="h-full w-full rounded-full object-contain"
              />
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}