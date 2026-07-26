"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, FileImage, Presentation, Sheet, UploadCloud, Search, BookOpen, Filter, Loader2, Trash2, X } from "lucide-react";

type Material = {
  id: string;
  courseId: string;
  title: string;
  type: "pdf" | "pptx" | "docx" | "xlsx" | "img";
  size: string;
  uploadedAt: string;
  topic: string;
};

type TeacherCourse = {
  id: string;
  subject: string;
  grade: string;
  section: string;
};

const TYPE_META: Record<Material["type"], { label: string; icon: typeof FileText; bg: string; text: string; border: string }> = {
  pdf:  { label: "PDF",  icon: FileText,     bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200"  },
  pptx: { label: "PPTX", icon: Presentation, bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  docx: { label: "DOCX", icon: FileText,     bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-200"  },
  xlsx: { label: "XLSX", icon: Sheet,        bg: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-200"},
  img:  { label: "IMG",  icon: FileImage,    bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200"},
};

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function MaterialsPage() {
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>("all");
  const [activeTopic, setActiveTopic] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({ courseId: "", title: "", type: "pdf" as Material["type"], size: "", topic: "" });

  const loadMaterials = async (courseList: TeacherCourse[]) => {
    const results = await Promise.all(
      courseList.map(async (c) => {
        const r = await fetch(`/api/teacher/courses/${c.id}/materials`);
        const data = await r.json();
        return data.ok ? (data.materials as Material[]) : [];
      }),
    );
    setMaterials(results.flat());
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/teacher/courses");
        const data = await r.json();
        if (!data.ok) throw new Error(data.error);
        setCourses(data.courses);
        if (data.courses.length > 0) {
          setForm((f) => ({ ...f, courseId: data.courses[0].id }));
          await loadMaterials(data.courses);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error cargando materiales");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (activeCourseId !== "all" && m.courseId !== activeCourseId) return false;
      if (activeTopic !== "all" && m.topic !== activeTopic) return false;
      if (query && !m.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [materials, activeCourseId, activeTopic, query]);

  const topics = useMemo(() => {
    const base = activeCourseId === "all"
      ? materials
      : materials.filter((m) => m.courseId === activeCourseId);
    return Array.from(new Set(base.map((m) => m.topic).filter(Boolean)));
  }, [materials, activeCourseId]);

  const totalSize = materials.length;
  const byType = (t: Material["type"]) => materials.filter((m) => m.type === t).length;

  const handleUpload = async () => {
    if (!form.title || !form.courseId) {
      alert("Título y curso son obligatorios");
      return;
    }
    setActionLoading(true);
    try {
      const r = await fetch(`/api/teacher/courses/${form.courseId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          size: form.size || null,
          topic: form.topic || null,
        }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setShowUpload(false);
      setForm((f) => ({ ...f, title: "", size: "", topic: "" }));
      await loadMaterials(courses);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (m: Material) => {
    if (!confirm(`¿Eliminar "${m.title}"?`)) return;
    try {
      const r = await fetch(`/api/teacher/courses/${m.courseId}/materials/${m.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error);
      setMaterials((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" />
        <p className="text-sm text-muted-foreground mt-2">Cargando materiales...</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Materiales</h1>
          <p className="text-muted-foreground mt-1">
            Recursos y archivos compartidos con tus secciones
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"
        >
          <UploadCloud className="h-4 w-4" />
          Subir material
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total archivos", value: totalSize, cls: "bg-[#1E2A5E]/5 text-[#1E2A5E]" },
          { label: "PDFs",  value: byType("pdf"),  cls: "bg-red-50 text-red-600"       },
          { label: "PPTX",  value: byType("pptx"), cls: "bg-orange-50 text-orange-600" },
          { label: "DOCX",  value: byType("docx"), cls: "bg-blue-50 text-blue-600"     },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center border border-transparent ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Course filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setActiveCourseId("all"); setActiveTopic("all"); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
            activeCourseId === "all"
              ? "border-[#1E2A5E] bg-[#1E2A5E] text-white"
              : "border-gray-200 bg-white text-[#64748B] hover:border-[#1E2A5E]/30"
          }`}
        >
          Todos los cursos
        </button>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveCourseId(c.id); setActiveTopic("all"); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              activeCourseId === c.id
                ? "border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]"
                : "border-gray-200 bg-white text-[#64748B] hover:border-[#2563EB]/30"
            }`}
          >
            {c.subject} · {c.grade} &quot;{c.section}&quot;
          </button>
        ))}
      </div>

      {/* Topic + search row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-60 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>

        {topics.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setActiveTopic("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTopic === "all"
                  ? "bg-[#1E2A5E] text-white border-[#1E2A5E]"
                  : "bg-white text-[#64748B] border-gray-200 hover:border-gray-400"
              }`}
            >
              Todo
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTopic(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  activeTopic === t
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-white text-[#64748B] border-gray-200 hover:border-[#2563EB]/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No se encontraron materiales</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const meta = TYPE_META[m.type];
            const Icon = meta.icon;
            const course = courses.find((c) => c.id === m.courseId);
            return (
              <Card key={m.id} className="border-none shadow-sm rounded-xl hover:shadow-md transition-shadow group">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border shrink-0 ${meta.bg} ${meta.border}`}>
                    <Icon className={`h-5 w-5 ${meta.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] leading-tight line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                      {m.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge className={`text-[10px] font-bold px-1.5 py-0.5 border-0 ${meta.bg} ${meta.text} hover:${meta.bg}`}>
                        {meta.label}
                      </Badge>
                      {m.size && <span className="text-[10px] text-muted-foreground">{m.size}</span>}
                      {m.topic && (
                        <span className="text-[10px] text-muted-foreground bg-gray-100 rounded px-1.5 py-0.5">
                          {m.topic}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">
                        {course ? `${course.subject} · ${course.grade} "${course.section}"` : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground">{fmtDate(m.uploadedAt)}</p>
                        <button
                          onClick={() => handleDelete(m)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Subir material */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E2A5E]">Subir material</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-[#1E2A5E]">Curso *</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.subject} · {c.grade} &quot;{c.section}&quot;</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1E2A5E]">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Cap. 3 – Ecuaciones cuadráticas"
                  className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-[#1E2A5E]">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as Material["type"] })}
                    className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="pdf">PDF</option>
                    <option value="pptx">PPTX</option>
                    <option value="docx">DOCX</option>
                    <option value="xlsx">XLSX</option>
                    <option value="img">Imagen</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#1E2A5E]">Tamaño</label>
                  <input
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="Ej: 1.2 MB"
                    className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1E2A5E]">Tema</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="Ej: Álgebra"
                  className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowUpload(false)} disabled={actionLoading} className="flex-1">Cancelar</Button>
              <Button onClick={handleUpload} disabled={actionLoading} className="flex-1 bg-[#1E2A5E] text-white hover:bg-[#162043]">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
