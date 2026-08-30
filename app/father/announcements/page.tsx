"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, Megaphone, ChevronDown } from "lucide-react";
import { formatDate, daysSince } from "@/lib/format";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import {
  useAnnouncements,
  type AnnouncementCategory,
} from "@/components/father/AnnouncementsProvider";

const CATEGORY_CONFIG: Record<
  AnnouncementCategory,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  urgente:     { label: "Urgente",     bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: AlertTriangle },
  importante:  { label: "Importante",  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: Bell },
  general:     { label: "General",     bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Megaphone },
  informativo: { label: "Informativo", bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",   icon: Info },
};

const CATEGORIES: AnnouncementCategory[] = [
  "urgente",
  "importante",
  "general",
  "informativo",
];

export default function AnnouncementsPage() {
  const {
    announcements,
    loading,
    error,
    unreadCount,
    reload,
    markRead,
    pendingOpenId,
    consumePendingOpen,
  } = useAnnouncements();
  // Deep-link desde el inicio: si el padre tocó un aviso del dashboard, este
  // llega abierto (el `requestOpen` ya lo marcó como leído). Se lee una sola vez
  // al montar y se limpia al salir de la página.
  const [expanded, setExpanded] = useState<string | null>(() => pendingOpenId);
  const [filter, setFilter] = useState<"all" | AnnouncementCategory>("all");

  useEffect(() => consumePendingOpen, [consumePendingOpen]);

  const filtered =
    filter === "all"
      ? announcements
      : announcements.filter((a) => a.category === filter);

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
    markRead(id);
  }

  if (loading) return <LoadingState label="Cargando avisos..." />;

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">Avisos</h1>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            Comunicados de dirección y tutoría
          </p>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm font-semibold text-primary">
            {unreadCount} sin leer
          </p>
        )}
      </div>

      <div>
        <label htmlFor="aviso-filtro" className="sr-only">
          Filtrar avisos
        </label>
        <select
          id="aviso-filtro"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | AnnouncementCategory)}
          className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="all">Todos ({announcements.length})</option>
          {CATEGORIES.map((cat) => {
            const count = announcements.filter((a) => a.category === cat).length;
            return (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].label} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Announcements list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="border-none shadow-sm rounded-xl">
            <CardContent className="p-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden />
              <p className="text-muted-foreground text-sm">
                {announcements.length === 0
                  ? "Todavía no hay avisos publicados."
                  : "No hay avisos en esta categoría."}
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map((aviso) => {
          const cfg = CATEGORY_CONFIG[aviso.category];
          const Icon = cfg.icon;
          const isExpanded = expanded === aviso.id;

          // "Urgente" lleva un tinte de fondo propio (no solo el ícono) para
          // destacar de un vistazo entre avisos rutinarios; los demás usan el
          // mismo tratamiento neutro sin depender de una barra de acento lateral.
          const isUrgent = aviso.category === "urgente";
          return (
            <Card
              key={aviso.id}
              className={`border shadow-sm rounded-xl transition-all overflow-hidden hover:shadow-md ${
                isUrgent
                  ? "border-red-200 bg-red-50/40"
                  : !aviso.read
                  ? "border-primary/20 shadow-primary/5"
                  : "border-gray-100"
              }`}
            >
              <button
                className="w-full text-left"
                onClick={() => toggle(aviso.id)}
                aria-expanded={isExpanded}
                aria-controls={`aviso-${aviso.id}`}
                aria-label={`${isExpanded ? "Contraer" : "Expandir"} aviso${
                  !aviso.read ? " sin leer" : ""
                }: ${aviso.title}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Category icon */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.bg} ${cfg.border}`}
                    >
                      <Icon className={`h-5 w-5 ${cfg.text}`} aria-hidden />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.label}
                          </Badge>
                          {!aviso.read && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                              <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                              Sin leer
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {daysSince(aviso.date)}
                        </span>
                      </div>

                      <p
                        className={`mt-1.5 text-sm font-bold ${
                          !aviso.read ? "text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {aviso.title}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {aviso.sender} · {formatDate(aviso.date)}
                        </p>
                        <ChevronDown
                          aria-hidden
                          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      {/* Body — preview cuando está colapsado */}
                      {!isExpanded && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {aviso.body}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </button>

              {/* Contenido expandido: sin `max-h` fijo, los avisos largos ya no
                  se cortaban en silencio. */}
              {isExpanded && (
                <div id={`aviso-${aviso.id}`} className="px-5 pb-5">
                  <div
                    className={`sm:ml-14 p-4 rounded-xl border text-sm text-foreground/80 leading-relaxed whitespace-pre-line ${cfg.bg} ${cfg.border}`}
                  >
                    {aviso.body}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
