"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Save, X, CheckCircle2, Sun, Moon, Loader2 } from "lucide-react";

type AdminSection = {
  id: string; grade: string; section: string;
  shift: "Mañana" | "Tarde"; room: string; tutor: string;
  studentsTotal: number;
};
type ScheduleEntry = {
  grade: string; section: string; day: string; period: number;
  time: string; subject: string; teacher: string | null; room: string | null;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = ["7:45 - 8:30", "8:30 - 9:15", "9:15 - 10:00", "10:20 - 11:05", "11:05 - 11:50", "11:50 - 12:35", "12:35 - 13:20"];
const GRADES = ["1ro", "2do", "3ro", "4to", "5to"];

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Matemáticas": { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  "Comunicación": { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  "Lengua Castellana": { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  "Historia": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  "HGE": { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  "Ciencias": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  "Inglés": { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  "Ed. Física": { bg: "bg-lime-50", text: "text-lime-800", border: "border-lime-200" },
  "DPCC": { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  "EPT": { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  "Arte": { bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-200" },
  "Tutoría": { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  "Religión": { bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200" },
};

const DAY_SHORT: Record<string, string> = { Lunes: "Lun", Martes: "Mar", Miércoles: "Mié", Jueves: "Jue", Viernes: "Vie" };

const TODAY_DAY = new Date().toLocaleDateString("es-PE", { weekday: "long" });
const TODAY_CAPITALIZED = TODAY_DAY.charAt(0).toUpperCase() + TODAY_DAY.slice(1);

function subjectStyle(subject: string) {
  return SUBJECT_COLORS[subject] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
}

export default function AdminSchedulePage() {
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [secRes, schRes] = await Promise.all([
          fetch("/api/admin/sections"),
          fetch("/api/admin/schedule"),
        ]);
        const sec = await secRes.json();
        const sch = await schRes.json();
        if (!sec.ok) throw new Error(sec.error);
        if (!sch.ok) throw new Error(sch.error);
        setSections(sec.sections);
        setEntries(sch.entries);
        if (sec.sections.length > 0) setActiveSectionId(sec.sections[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const section = sections.find((s) => s.id === activeSectionId);
  const schedule = useMemo(() => {
    const grid: Record<string, (ScheduleEntry | null)[]> = {};
    for (const day of DAYS) grid[day] = Array(PERIODS.length).fill(null);
    if (!section) return grid;
    for (const e of entries) {
      if (e.grade === section.grade && e.section === section.section) {
        grid[e.day]?.splice(e.period - 1, 1, e);
      }
    }
    return grid;
  }, [entries, section]);

  const visibleSections = gradeFilter === "all" ? sections : sections.filter((s) => s.grade === gradeFilter);

  function handleSave() { setSaved(true); setEditMode(false); setTimeout(() => setSaved(false), 3000); }

  if (loading) { return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1E2A5E]" /><p className="text-sm text-muted-foreground mt-2">Cargando horarios...</p></div>; }
  if (error) { return <div className="py-16 text-center text-red-600 text-sm">{error}</div>; }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Horarios</h1>
          <p className="text-muted-foreground mt-1">Gestión del horario académico por sección · Turno mañana 7:45–13:20</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"><CheckCircle2 className="h-4 w-4" /> Guardado</span>}
          {editMode ? (
            <>
              <Button onClick={handleSave} className="bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-xl h-10 gap-2"><Save className="h-4 w-4" /> Guardar cambios</Button>
              <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-xl h-10 gap-2 border-gray-200"><X className="h-4 w-4" /> Cancelar</Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)} className="bg-[#1E2A5E] text-white hover:bg-[#162043] rounded-xl h-10 gap-2 font-semibold"><Pencil className="h-4 w-4" /> Editar horario</Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 w-fit">
          <button onClick={() => setGradeFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${gradeFilter === "all" ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>Todos</button>
          {GRADES.map((g) => (
            <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${gradeFilter === g ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"}`}>{g}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {visibleSections.map((s) => {
            const isActive = activeSectionId === s.id;
            return (
              <button key={s.id} onClick={() => setActiveSectionId(s.id)} className={`px-3 py-2 rounded-lg border transition-all text-left ${isActive ? "border-[#2563EB] bg-[#2563EB]/5" : "border-gray-200 bg-white hover:border-[#2563EB]/30"}`}>
                <p className={`text-xs font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>{s.grade} &quot;{s.section}&quot;</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">{s.shift === "Mañana" ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}{s.shift} · {s.room}</p>
              </button>
            );
          })}
        </div>
      </div>

      {section && (
        <div className="flex items-center gap-4 bg-[#1E2A5E]/5 border border-[#1E2A5E]/10 rounded-xl px-5 py-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-[#1E2A5E]">{section.grade} &quot;{section.section}&quot; — {section.tutor}</p>
            <p className="text-xs text-muted-foreground">{section.room} · Turno {section.shift} · {section.studentsTotal} alumnos</p>
          </div>
          {editMode && <Badge className="ml-auto bg-amber-100 text-amber-700 border-0 font-semibold text-xs hover:bg-amber-100">Modo edición activo — haz clic en una celda para modificar</Badge>}
        </div>
      )}

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-[#1E2A5E]">
            <div className="p-3 text-xs font-semibold text-white/50 flex items-center justify-center">Período</div>
            {DAYS.map((day) => {
              const isToday = day === TODAY_CAPITALIZED;
              return (
                <div key={day} className={`relative p-3 text-center text-xs font-bold text-white border-l border-white/10 ${isToday ? "bg-[#F4C15C]/25 ring-2 ring-[#F4C15C] ring-inset" : ""}`}>
                  <span className="hidden sm:block">{day}</span><span className="sm:hidden">{DAY_SHORT[day]}</span>
                  {isToday && (
                    <span className="block text-[10px] text-[#F4C15C] mt-0.5 font-bold tracking-wide">● HOY</span>
                  )}
                </div>
              );
            })}
          </div>
          {PERIODS.map((period, pi) => (
            <Fragment key={period}>
              {pi === 3 && (
                <div className="grid grid-cols-[100px_repeat(5,1fr)] bg-amber-50 border-y border-amber-200">
                  <div className="p-2 text-xs font-semibold text-amber-700 flex items-center justify-center">10:00 – 10:20</div>
                  <div className="col-span-5 p-2 flex items-center"><span className="text-xs font-bold text-amber-700">🔔 Recreo</span></div>
                </div>
              )}
              <div className="grid grid-cols-[100px_repeat(5,1fr)] border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                <div className="p-2.5 flex items-center justify-center border-r border-gray-100"><span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">{period}</span></div>
                {DAYS.map((day) => {
                  const slot = schedule[day]?.[pi] ?? null;
                  const style = slot ? subjectStyle(slot.subject) : null;
                  const isToday = day === TODAY_CAPITALIZED;
                  return (
                    <div key={day} className={`relative p-1.5 border-l border-gray-100 ${isToday ? "bg-[#1E2A5E]/[0.04]" : ""} ${editMode ? "cursor-pointer hover:ring-2 hover:ring-[#2563EB]/30 hover:ring-inset" : ""}`}>
                      {isToday && (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#F4C15C]" />
                      )}
                      {slot && style ? (
                        <div className={`rounded-lg border p-2 h-full flex flex-col gap-0.5 ${style.bg} ${style.border} ${isToday ? "shadow-sm" : ""} ${editMode ? "ring-1 ring-inset ring-transparent hover:ring-[#2563EB]/40" : ""}`}>
                          <p className={`text-[11px] font-bold leading-tight ${style.text}`}>{slot.subject}</p>
                          <p className={`text-[10px] leading-tight hidden sm:block ${style.text} opacity-70`}>{slot.teacher}</p>
                          <div className={`hidden md:flex items-center gap-0.5 text-[10px] leading-tight ${style.text} opacity-60`}><MapPin className="h-2.5 w-2.5 shrink-0" />{slot.room}</div>
                        </div>
                      ) : (
                        <div className={`rounded-lg border border-dashed border-gray-200 p-2 h-full flex items-center justify-center min-h-[52px] ${editMode ? "hover:border-[#2563EB]/50 hover:bg-[#2563EB]/5" : ""}`}>
                          {editMode ? <span className="text-[10px] text-[#2563EB]/60 font-medium">+ Asignar</span> : <span className="text-[10px] text-muted-foreground">—</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Leyenda de colores</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SUBJECT_COLORS).slice(0, 8).map(([subject, color]) => (
            <div key={subject} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${color.bg} ${color.text} ${color.border}`}>{subject}</div>
          ))}
        </div>
      </div>
    </div>
  );
}