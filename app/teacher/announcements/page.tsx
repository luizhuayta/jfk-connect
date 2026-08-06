"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, Megaphone, BookOpen, ChevronDown, CalendarDays, Loader2 } from "lucide-react";

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

const CAT_META: Record<AnnouncementCategory, {
  label: string; icon: typeof Bell;
  badge: string; card: string; dot: string; bar: string;
}> = {
  urgente:    { label: "Urgente",    icon: AlertTriangle, badge: "bg-red-100 text-red-700",     card: "border-red-200 bg-red-50/40",    dot: "bg-red-500",    bar: "bg-red-500"   },
  importante: { label: "Importante", icon: Megaphone,     badge: "bg-amber-100 text-amber-700", card: "border-amber-200 bg-amber-50/40",dot: "bg-amber-500",  bar: "bg-amber-500" },
  general:    { label: "General",    icon: Bell,          badge: "bg-blue-100 text-blue-700",   card: "border-blue-200 bg-blue-50/40",  dot: "bg-blue-400",   bar: "bg-blue-500"  },
  informativo:{ label: "Informativo",icon: Info,          badge: "bg-gray-100 text-gray-600",   card: "border-gray-200 bg-white",       dot: "bg-gray-400",   bar: "bg-gray-400"  },
};

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeFilter, setActiveFilter] = useState<AnnouncementCategory | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

  const unread = announcements.filter((a) => !readIds.has(a.id)).length;

  const counts = useMemo(() => ({
    urgente:    announcements.filter((a) => a.category === "urgente").length,
    importante: announcements.filter((a) => a.category === "importante").length,
    general:    announcements.filter((a) => a.category === "general").length,
    informativo:announcements.filter((a) => a.category === "informativo").length,
  }), [announcements]);

  const displayed = useMemo(() =>
    announcements.filter((a) => activeFilter === "all" || a.category === activeFilter),
    [announcements, activeFilter]
  );

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
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
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Avisos</h1>
        <p className="text-muted-foreground mt-1">
          {unread > 0
            ? <><span className="font-semibold text-[#0F172A]">{unread} avisos sin leer</span> · Año Lectivo 2026</>
            : "Todos los avisos leídos · Año Lectivo 2026"
          }
        </p>
      </div>

      {/* Category stat cards / filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["urgente", "importante", "general", "informativo"] as AnnouncementCategory[]).map((cat) => {
          const meta = CAT_META[cat];
          const Icon = meta.icon;
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(isActive ? "all" : cat)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isActive ? "border-[#1E2A5E] shadow-sm" : "border-transparent"
              } ${meta.card}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${meta.badge.split(" ")[1]}`} />
                <span className={`text-xs font-semibold ${meta.badge.split(" ")[1]}`}>{meta.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{counts[cat]}</p>
            </button>
          );
        })}
      </div>

      {/* Announcement list */}
      <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No hay avisos en esta categoría</p>
          </div>
        )}

        {displayed.map((a) => {
          const meta = CAT_META[a.category];
          const Icon = meta.icon;
          const isRead = readIds.has(a.id);
          const isExpanded = expandedIds.has(a.id);
          return (
            <Card
              key={a.id}
              className={`relative border shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md ${
                !isRead ? "border-[#1E2A5E]/20 shadow-md" : "border-gray-100"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
              <CardContent className="p-0">
                <button
                  onClick={() => toggle(a.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start gap-4 pl-3">
                    {/* Dot */}
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!isRead ? meta.dot : "bg-gray-300"}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs font-bold border-0 hover:opacity-90 ${meta.badge}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {meta.label}
                          </Badge>
                          {a.audience === "docentes" && (
                            <Badge className="text-[10px] font-semibold bg-[#1E2A5E]/10 text-[#1E2A5E] border-0 hover:bg-[#1E2A5E]/10">
                              Solo docentes
                            </Badge>
                          )}
                          {!isRead && (
                            <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 rounded px-1.5 py-0.5">
                              Nuevo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                            <CalendarDays className="h-3 w-3" />
                            {fmtDate(a.date)}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      <h3 className={`text-sm font-bold mt-1.5 ${!isRead ? "text-[#0F172A]" : "text-[#334155]"}`}>
                        {a.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.sender}</p>
                    </div>
                  </div>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-3 pr-5 pb-5 pt-0">
                    <div className="ml-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-sm text-[#334155] leading-relaxed">{a.body}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
