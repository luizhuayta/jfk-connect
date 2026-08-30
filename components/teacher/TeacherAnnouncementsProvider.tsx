"use client";

/**
 * Reutiliza el provider de avisos del panel de padres: el endpoint
 * `/api/announcements` ya filtra por rol en el servidor, así que no hay
 * que duplicar el fetch ni el estado de leídos.
 */
export {
  AnnouncementsProvider as TeacherAnnouncementsProvider,
  useAnnouncements as useTeacherAnnouncements,
} from "@/components/father/AnnouncementsProvider";
