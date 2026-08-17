"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Info, Megaphone, Plus, Pencil, Trash2, ChevronDown, CalendarDays, Users, X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";

type AnnouncementCategory = "urgente" | "importante" | "general" | "informativo";
type Announcement = {
  id: string; category: AnnouncementCategory; title: string; body: string;
  sender: string; date: string; read: boolean; audience: string;
};

const CAT_META: Record<AnnouncementCategory, { label: string; icon: typeof Bell; badge: string; cardBg: string; dot: string; bar: string }> = {
  urgente: { label: "Urgente", icon: AlertTriangle, badge: "bg-red-100 text-red-700", cardBg: "bg-white border-gray-100", dot: "bg-red-500", bar: "bg-red-500" },
  importante: { label: "Importante", icon: Megaphone, badge: "bg-amber-100 text-amber-700", cardBg: "bg-white border-gray-100", dot: "bg-amber-500", bar: "bg-amber-500" },
  general: { label: "General", icon: Bell, badge: "bg-blue-100 text-blue-700", cardBg: "bg-white border-gray-100", dot: "bg-blue-400", bar: "bg-blue-500" },
  informativo: { label: "Informativo", icon: Info, badge: "bg-gray-100 text-gray-600", cardBg: "bg-white border-gray-100", dot: "bg-gray-400", bar: "bg-gray-400" },
};

const AUDIENCE_LABELS: Record<string, string> = {
  todos: "Toda la comunidad", padres: "Padres / Apoderados", "5to": "Alumnos 5to grado",
  "3ro": "Alumnos 3ro grado", docentes: "Docentes", "4to": "Alumnos 4to grado", "2do": "Alumnos 2do grado", "1ro": "Alumnos 1ro grado",
};
const CATEGORIES = ["urgente", "importante", "general", "informativo"] as AnnouncementCategory[];
const AUDIENCES = ["todos", "padres", "docentes", "5to", "3ro", "4to", "2do", "1ro"];
const EMPTY_DRAFT = { title: "", body: "", category: "general" as AnnouncementCategory, audience: "todos" };

// El API devuelve "YYYY-MM-DDT12:00:00" (mediodía local). Si por compatibilidad
// llegara una fecha pelada, se normaliza a mediodía.
function fmtDate(iso: string) { return new Date(iso.includes("T") ? iso : iso + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }); }

type Draft = typeof EMPTY_DRAFT;

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<AnnouncementCategory | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/announcements");
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setItems(data.announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);
  useEffect(() => {
    // El query se lee en el cliente (window): usar useSearchParams rompería el
    // prerender estático de la build (missing-suspense-with-csr-bailout).
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      openNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => ({
    urgente: items.filter((a) => a.category === "urgente").length,
    importante: items.filter((a) => a.category === "importante").length,
    general: items.filter((a) => a.category === "general").length,
    informativo: items.filter((a) => a.category === "informativo").length,
  }), [items]);

  const displayed = useMemo(() => filter === "all" ? items : items.filter((a) => a.category === filter), [items, filter]);

  function toggleExpand(id: string) { setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function openNew() { setDraft(EMPTY_DRAFT); setEditingId(null); setFormError(""); setShowForm(true); }
  function openEdit(a: Announcement) { setDraft({ title: a.title, body: a.body, category: a.category, audience: a.audience }); setEditingId(a.id); setFormError(""); setShowForm(true); }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este aviso?")) return;
    try {
      const r = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  async function handleSubmit() {
    if (!draft.title.trim()) { setFormError("El título es obligatorio."); return; }
    if (!draft.body.trim()) { setFormError("El contenido es obligatorio."); return; }
    setSaving(true);
    try {
      if (editingId) {
        const r = await fetch(`/api/announcements/${editingId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
      } else {
        const r = await fetch("/api/announcements", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
      }
      setShowForm(false);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) { return <LoadingState label="Cargando avisos..." />; }
  if (error) { return <ErrorState message={error} onRetry={loadItems} />; }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Avisos</h1>
          <p className="text-muted-foreground mt-1">Publica y gestiona comunicados para toda la comunidad educativa</p>
        </div>
        <Button onClick={openNew} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"><Plus className="h-4 w-4" />Nuevo aviso</Button>
      </div>

      {showForm && (
        <Card className="border-2 border-[#2563EB]/30 shadow-md rounded-xl">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">{editingId ? "Editar aviso" : "Redactar nuevo aviso"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Cerrar"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Categoría</label>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const meta = CAT_META[cat];
                    const Icon = meta.icon;
                    return (
                      <button key={cat} onClick={() => setDraft((d) => ({ ...d, category: cat }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${draft.category === cat ? `border-transparent ${meta.badge}` : "border-gray-200 text-[#64748B] hover:border-gray-300"}`}>
                        <Icon className="h-3 w-3" />{meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Destinatarios</label>
                <div className="flex gap-1 flex-wrap">
                  {AUDIENCES.map((a) => (
                    <button key={a} onClick={() => setDraft((d) => ({ ...d, audience: a }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${draft.audience === a ? "border-[#1E2A5E] bg-[#1E2A5E] text-white" : "border-gray-200 text-[#64748B] hover:border-[#1E2A5E]/30"}`}>{AUDIENCE_LABELS[a] ?? a}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Título</label>
              <input type="text" value={draft.title} onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setFormError(""); }} placeholder="Escribe el título del aviso..." className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] text-[#0F172A]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Contenido</label>
              <textarea value={draft.body} onChange={(e) => { setDraft((d) => ({ ...d, body: e.target.value })); setFormError(""); }} placeholder="Redacta el cuerpo del aviso..." rows={4} className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none text-[#0F172A]" />
            </div>
            {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-xl h-10 gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{editingId ? "Guardar cambios" : "Publicar aviso"}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl h-10 border-gray-200">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const meta = CAT_META[cat];
          const Icon = meta.icon;
          const isActive = filter === cat;
          return (
            <button key={cat} onClick={() => setFilter(isActive ? "all" : cat)} className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-sm bg-white border-gray-100 ${isActive ? "ring-2 ring-[#1E2A5E]" : ""}`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
              <div className="flex items-center gap-2 mb-1"><Icon className={`h-4 w-4 ${meta.badge.split(" ")[1]}`} /><span className={`text-xs font-semibold ${meta.badge.split(" ")[1]}`}>{meta.label}</span></div>
              <p className="text-2xl font-bold text-[#0F172A]">{counts[cat]}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {displayed.length === 0 && (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Bell className="h-10 w-10 mb-3 opacity-20" /><p className="text-sm">No hay avisos en esta categoría</p></div>)}
        {displayed.map((a) => {
          const meta = CAT_META[a.category];
          const Icon = meta.icon;
          const isExpanded = expandedIds.has(a.id);
          return (
            <Card key={a.id} className="relative border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white hover:shadow-md transition-all">
              <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
              <CardContent className="p-0">
                <div className="p-5 pl-7">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.badge.replace("text-", "border-").replace("100", "200")}`}>
                      <Icon className={`h-5 w-5 ${meta.badge.split(" ")[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-[11px] font-bold border-0 gap-1 hover:opacity-90 ${meta.badge}`}>{meta.label}</Badge>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-[#1E2A5E]/8 rounded px-1.5 py-0.5 font-medium"><Users className="h-2.5 w-2.5" />{AUDIENCE_LABELS[a.audience] ?? a.audience}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleExpand(a.id)} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors" title={isExpanded ? "Colapsar" : "Ver contenido"} aria-label={isExpanded ? "Colapsar" : "Ver contenido"}>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-[#2563EB]/10 transition-colors" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4 text-[#2563EB]" /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar" aria-label="Eliminar"><Trash2 className="h-4 w-4 text-red-500" /></button>
                        </div>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-[#0F172A]">{a.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{a.sender}<span className="opacity-40">·</span><CalendarDays className="h-3 w-3" />{fmtDate(a.date)}</p>
                      {!isExpanded && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-5 pl-7">
                    <div className="ml-14 bg-gray-50 rounded-xl p-4 border border-gray-100">
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