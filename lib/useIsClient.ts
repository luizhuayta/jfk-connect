"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `true` solo después de hidratar en el cliente.
 *
 * Sirve para el contenido que depende de la hora del navegador (el "hoy" del
 * calendario y del saludo): calcularlo en el render del servidor produce un
 * HTML distinto al del cliente, y antes eso se tapaba con
 * `suppressHydrationWarning`. Con `useSyncExternalStore` no hace falta
 * `setState` dentro de un efecto.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
