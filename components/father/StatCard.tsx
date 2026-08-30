import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "success" | "warning" | "error" | "neutral";

const TONE_STYLES: Record<Tone, { iconBg: string; iconText: string; valueText: string }> = {
  primary: { iconBg: "bg-primary/10", iconText: "text-primary", valueText: "text-primary" },
  accent: { iconBg: "bg-accent/20", iconText: "text-accent-foreground", valueText: "text-primary" },
  success: {
    iconBg: "bg-success-container",
    iconText: "text-on-success-container",
    valueText: "text-on-success-container",
  },
  warning: {
    iconBg: "bg-warning-container",
    iconText: "text-on-warning-container",
    valueText: "text-on-warning-container",
  },
  error: {
    iconBg: "bg-error-container",
    iconText: "text-on-error-container",
    valueText: "text-on-error-container",
  },
  neutral: {
    iconBg: "bg-surface-container-high",
    iconText: "text-on-surface-variant",
    valueText: "text-on-surface",
  },
};

const cardShadow =
  "shadow-[0_1px_2px_rgba(17,28,44,0.04),0_8px_24px_-16px_rgba(17,28,44,0.12)]";

/**
 * Tarjeta de estadística compartida del panel de padres (antes duplicada a
 * mano en attendance/materials/students con padding y tamaños de círculo
 * distintos cada vez). Sin acento `border-l-4`: el color vive únicamente en
 * el ícono, evitando triple-codificar el mismo estado.
 */
export default function StatCard({
  icon: Icon,
  value,
  label,
  tone = "primary",
  layout = "horizontal",
  className,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: Tone;
  layout?: "horizontal" | "centered";
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  if (layout === "centered") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-outline-variant bg-surface-container-lowest p-4",
          cardShadow,
          "flex flex-col items-center justify-center text-center gap-1",
          className,
        )}
      >
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", styles.iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", styles.iconText)} aria-hidden />
        </div>
        <p className={cn("text-2xl font-bold", styles.valueText)}>{value}</p>
        <p className="text-xs text-on-surface-variant">{label}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-outline-variant bg-surface-container-lowest p-5",
        cardShadow,
        "flex items-center gap-4",
        className,
      )}
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", styles.iconBg)}>
        <Icon className={cn("h-5 w-5", styles.iconText)} aria-hidden />
      </div>
      <div>
        <p className={cn("text-2xl font-bold", styles.valueText)}>{value}</p>
        <p className="text-xs text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
