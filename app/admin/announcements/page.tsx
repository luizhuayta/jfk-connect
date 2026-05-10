"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, AlertTriangle, Info, Megaphone,
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  CalendarDays, Users, X, Send, Eye,
} from "lucide-react";
import { mockAnnouncements, type AnnouncementCategory, type Announcement } from "@/data/mock";

const CAT_META: Record<AnnouncementCategory, {
  label: string; icon: typeof Bell;
  badge: string; cardBg: string; dot: string;
}> = {
  urgente:     { label: "Urgente",     icon: AlertTriangle, badge: "bg-red-100 text-red-700",     cardBg: "bg-red-50/50 border-red-200",    dot: "bg-red-500"    },
  importante:  { label: "Importante",  icon: Megaphone,     badge: "bg-amber-100 text-amber-700", cardBg: "bg-amber-50/50 border-amber-200",dot: "bg-amber-500"  },
  general:     { label: "General",     icon: Bell,          badge: "bg-blue-100 text-blue-700",   cardBg: "bg-blue-50/50 border-blue-200",  dot: "bg-blue-400"   },
  informativo: { label: "Informativo", icon: Info,          badge: "bg-gray-100 text-gray-600",   cardBg: "bg-white border-gray-200",       dot: "bg-gray-400"   },
};

const AUDIENCE_LABELS: Record<string, string> = {
  todos:   "Toda la comunidad",
  padres:  "Padres / Apoderados",
  "5to":   "Alumnos 5to grado",
  "3ro":   "Alumnos 3ro grado",
  docentes:"Docentes",
};

const CATEGORIES = ["urgente", "importante", "general", "informativo"] as AnnouncementCategory[];
const AUDIENCES  = ["todos", "padres", "docentes", "5to", "3ro", "4to", "2do", "1ro"];

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

type DraftAnnouncement = {
  title: string;
  body: string;
  category: AnnouncementCategory;
  audience: string;
};

const EMPTY_DRAFT: DraftAnnouncement = {
  title: "", body: "", category: "general", audience: "todos",
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(mockAnnouncements);
  const [filter, setFilter] = useState<AnnouncementCategory | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<DraftAnnouncement>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const counts = useMemo(() => ({
    urgente:    items.filter((a) => a.category === "urgente").length,
    importante: items.filter((a) => a.category === "importante").length,
    general:    items.filter((a) => a.category === "general").length,
    informativo:items.filter((a) => a.category === "informativo").length,
  }), [items]);

  const displayed = useMemo(() =>
    filter === "all" ? items : items.filter((a) => a.category === filter),
    [items, filter]
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(a: Announcement) {
    setDraft({ title: a.title, body: a.body, category: a.category, audience: a.audience });
    setEditingId(a.id);
    setFormError("");
    setShowForm(true);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit() {
    if (!draft.title.trim()) { setFormError("El título es obligatorio."); return; }
    if (!draft.body.trim())  { setFormError("El contenido es obligatorio."); return; }

    if (editingId) {
      setItems((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, title: draft.title, body: draft.body, category: draft.category, audience: draft.audience as Announcement["audience"] }
            : a
        )
      );
    } else {
      const newAnnouncement: Announcement = {
        id: `adm-${Date.now()}`,
        category: draft.category,
        title: draft.title,
        body: draft.body,
        sender: "Dirección",
        date: new Date().toISOString().slice(0, 10),
        read: false,
        audience: draft.audience as Announcement["audience"],
      };
      setItems((prev) => [newAnnouncement, ...prev]);
    }
    setShowForm(false);
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Avisos</h1>
          <p className="text-muted-foreground mt-1">
            Publica y gestiona comunicados para toda la comunidad educativa
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nuevo aviso
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="border-2 border-[#2563EB]/30 shadow-md rounded-xl">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                {editingId ? "Editar aviso" : "Redactar nuevo aviso"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Row: category + audience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Categoría
                </label>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const meta = CAT_META[cat];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={cat}
                        onClick={() => setDraft((d) => ({ ...d, category: cat }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          draft.category === cat
                            ? `border-transparent ${meta.badge}`
                            : "border-gray-200 text-[#64748B] hover:border-gray-300"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Destinatarios
                </label>
                <div className="flex gap-1 flex-wrap">
                  {AUDIENCES.map((a) => (
                    <button
                      key={a}
                      onClick={() => setDraft((d) => ({ ...d, audience: a }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        draft.audience === a
                          ? "border-[#1E2A5E] bg-[#1E2A5E] text-white"
                          : "border-gray-200 text-[#64748B] hover:border-[#1E2A5E]/30"
                      }`}
                    >
                      {AUDIENCE_LABELS[a] ?? a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                Título
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setFormError(""); }}
                placeholder="Escribe el título del aviso..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-[#0F172A]"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                Contenido
              </label>
              <textarea
                value={draft.body}
                onChange={(e) => { setDraft((d) => ({ ...d, body: e.target.value })); setFormError(""); }}
                placeholder="Redacta el cuerpo del aviso..."
                rows={4}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none text-[#0F172A]"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handleSubmit}
                className="bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-xl h-10 gap-2"
              >
                <Send className="h-4 w-4" />
                {editingId ? "Guardar cambios" : "Publicar aviso"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="rounded-xl h-10 border-gray-200"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const meta = CAT_META[cat];
          const Icon = meta.icon;
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(isActive ? "all" : cat)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isActive ? "border-[#1E2A5E] shadow-sm" : "border-transparent"
              } ${meta.cardBg}`}
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

      {/* Announcements list */}
      <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No hay avisos en esta categoría</p>
          </div>
        )}

        {displayed.map((a) => {
          const meta = CAT_META[a.category];
          const Icon = meta.icon;
          const isExpanded = expandedIds.has(a.id);
          return (
            <Card key={a.id} className={`border shadow-sm rounded-xl overflow-hidden ${meta.cardBg}`}>
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-[11px] font-bold border-0 gap-1 hover:opacity-90 ${meta.badge}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-[#1E2A5E]/8 rounded px-1.5 py-0.5 font-medium">
                            <Users className="h-2.5 w-2.5" />
                            {AUDIENCE_LABELS[a.audience] ?? a.audience}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#0F172A]">{a.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          {a.sender}
                          <span className="opacity-40">·</span>
                          <CalendarDays className="h-3 w-3" />
                          {fmtDate(a.date)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleExpand(a.id)}
                        className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                        title={isExpanded ? "Colapsar" : "Ver contenido"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-lg hover:bg-[#2563EB]/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="ml-5 bg-white/80 rounded-xl p-4 border border-black/5">
                      <p className="text-sm text-[#334155] leading-relaxed">{a.body}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
