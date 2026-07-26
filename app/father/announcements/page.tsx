"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, Megaphone, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type AnnouncementCategory = "urgente" | "importante" | "general" | "informativo";

type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  sender: string;
  date: string;
  read: boolean;
  audience: string;
};

const CATEGORY_CONFIG: Record<
  AnnouncementCategory,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  urgente:     { label: "Urgente",     bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: AlertTriangle },
  importante:  { label: "Importante",  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: Bell },
  general:     { label: "General",     bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Megaphone },
  informativo: { label: "Informativo", bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",   icon: Info },
};

const FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Urgente", value: "urgente" },
  { label: "Importante", value: "importante" },
  { label: "General", value: "general" },
  { label: "Informativo", value: "informativo" },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function daysSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return `Hace ${diff} días`;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<"all" | AnnouncementCategory>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/announcements");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setAnnouncements(data.announcements);
        setReadIds(new Set(data.announcements.filter((a: Announcement) => a.read).map((a: Announcement) => a.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando avisos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === "all"
    ? announcements
    : announcements.filter((a) => a.category === filter);

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
    setReadIds((prev) => new Set([...prev, id]));
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando avisos...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1E2A5E]">Avisos</h1>
          <p className="text-muted-foreground mt-1">
            Comunicados de la institución
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 bg-[#1E2A5E]/5 border border-[#1E2A5E]/10 rounded-xl px-4 py-2">
            <Bell className="h-4 w-4 text-[#1E2A5E]" />
            <span className="text-sm font-semibold text-[#1E2A5E]">
              {unreadCount} sin leer
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["urgente", "importante", "general", "informativo"] as AnnouncementCategory[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const count = announcements.filter((a) => a.category === cat).length;
          const Icon = cfg.icon;
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? "all" : cat)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${
                filter === cat ? "ring-2 ring-[#1E2A5E]" : ""
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${cfg.text}`} />
              <p className={`text-xl font-bold ${cfg.text}`}>{count}</p>
              <p className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-50 rounded-lg p-1 w-fit flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-[#1E2A5E] text-white"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Announcements list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="border-none shadow-sm rounded-xl">
            <CardContent className="p-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No hay avisos en esta categoría.</p>
            </CardContent>
          </Card>
        )}

        {filtered.map((aviso) => {
          const cfg = CATEGORY_CONFIG[aviso.category];
          const Icon = cfg.icon;
          const isExpanded = expanded === aviso.id;
          const isRead = readIds.has(aviso.id);

          return (
            <Card
              key={aviso.id}
              className={`border shadow-sm rounded-xl transition-all overflow-hidden ${
                !isRead ? "border-[#1E2A5E]/20 shadow-[#1E2A5E]/5" : "border-gray-100"
              }`}
            >
              <button
                className="w-full text-left"
                onClick={() => toggle(aviso.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Category icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.bg} ${cfg.border}`}>
                      <Icon className={`h-5 w-5 ${cfg.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} hover:${cfg.bg}`}>
                            {cfg.label}
                          </Badge>
                          {!isRead && (
                            <span className="flex h-2 w-2 rounded-full bg-[#1E2A5E]" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {daysSince(aviso.date)}
                        </span>
                      </div>

                      <h3 className={`mt-1.5 text-sm font-bold ${!isRead ? "text-[#0F172A]" : "text-[#334155]"}`}>
                        {aviso.title}
                      </h3>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {aviso.sender} · {formatDate(aviso.date)}
                        </p>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                      </div>

                      {/* Body — expandable */}
                      {!isExpanded && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {aviso.body}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className={`mt-4 ml-14 p-4 rounded-xl border text-sm text-[#334155] leading-relaxed ${cfg.bg} ${cfg.border}`}>
                      {aviso.body}
                    </div>
                  )}
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
