import { AlertTriangle, Bell, Info, Megaphone, type LucideIcon } from "lucide-react";
import type { AnnouncementCategory } from "@/components/father/AnnouncementsProvider";

export type CategoryVisual = {
  label: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
  icon: LucideIcon;
};

export const ANNOUNCEMENT_CATEGORY_VISUAL: Record<AnnouncementCategory, CategoryVisual> = {
  urgente: {
    label: "Urgente",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    ring: "ring-red-200",
    icon: AlertTriangle,
  },
  importante: {
    label: "Importante",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-200",
    icon: Bell,
  },
  general: {
    label: "General",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    ring: "ring-blue-200",
    icon: Megaphone,
  },
  informativo: {
    label: "Informativo",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    ring: "ring-slate-200",
    icon: Info,
  },
};

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "urgente",
  "importante",
  "general",
  "informativo",
];
