"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScopeSelector from "@/components/grades/ScopeSelector";
import { downloadLibretasSection } from "@/lib/report";

type SectionOption = { grade: string; section: string; studentsTotal: number };

interface SectionRow {
  grade: string;
  section: string;
  studentsTotal: number;
}

/**
 * Descarga masiva de libretas de una sección — la pieza que le faltaba a
 * /admin/reports (antes solo enlazaba a otros paneles). Reutiliza
 * downloadLibretasSection (lib/report/libreta.ts), que ya trae su propia
 * concurrencia limitada; aquí solo se resuelve qué alumnos pertenecen a la
 * sección elegida vía /api/admin/students.
 */
export default function LibretaSectionDownload() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [value, setValue] = useState("");
  const [loadingSections, setLoadingSections] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/sections");
        const d = await r.json();
        if (!d.ok) throw new Error(d.error);
        const opts: SectionOption[] = (d.sections as SectionRow[]).map((s: SectionRow) => ({
          grade: s.grade,
          section: s.section,
          studentsTotal: s.studentsTotal,
        }));
        setSections(opts);
        if (opts.length > 0) setValue(`${opts[0].grade}|${opts[0].section}`);
      } catch {
        toast.error("No se pudieron cargar las secciones");
      } finally {
        setLoadingSections(false);
      }
    })();
  }, []);

  const handleDownload = async () => {
    if (!value) return;
    const [grade, section] = value.split("|");
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/students?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&limit=100`);
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      const ids: string[] = (d.students as { id: string }[]).map((s) => s.id);
      if (ids.length === 0) {
        toast.error("Esta sección no tiene alumnos matriculados.");
        return;
      }
      await downloadLibretasSection(ids);
      toast.success(`${ids.length} libreta(s) descargada(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron descargar las libretas");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ScopeSelector
        value={value}
        onChange={setValue}
        options={sections.map((s) => ({
          value: `${s.grade}|${s.section}`,
          label: `${s.grade} "${s.section}" — ${s.studentsTotal} alumno(s)`,
        }))}
      />
      <Button
        onClick={handleDownload}
        disabled={busy || loadingSections || !value}
        className="h-10 gap-2 rounded-lg bg-[#1E2A5E] text-white text-sm font-semibold hover:bg-[#1E2A5E]/90"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
        Descargar libretas de la sección
      </Button>
    </div>
  );
}
