"use client";

import { useIsClient } from "@/lib/useIsClient";
import { weekdayCapitalized } from "@/lib/attendance/jornada";

/** Fecha y día lectivo actuales, hidratados solo en el cliente. */
export function useJornadaHoy() {
  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  const weekdayCap = now ? weekdayCapitalized(now) : "";
  const isSchoolDay = now ? now.getDay() >= 1 && now.getDay() <= 5 : false;
  return { isClient, now, weekdayCap, isSchoolDay };
}
