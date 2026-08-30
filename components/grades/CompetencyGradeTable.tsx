"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CompetencyScoreCell from "./CompetencyScoreCell";
import ConclusionsRow from "./ConclusionsRow";
import type { Competency } from "@/lib/curriculum/types";

export type GridStudent = { id: string; name: string; initials: string; order: number };
export type EntryValue = { score: number | null; conclusion: string };

/**
 * ÚNICA tabla de captura/lectura de notas por competencia, compartida entre
 * el panel docente y el admin (con `readOnly` decide cuál de las dos es).
 * Antes cada panel reimplementaba su propio grid casi idéntico.
 */
export default function CompetencyGradeTable({
  competencies,
  students,
  getEntry,
  onScoreChange,
  onConclusionChange,
  readOnly,
  onGenerateConclusions,
  generatingFor,
}: {
  competencies: Competency[];
  students: GridStudent[];
  getEntry: (studentId: string, competencyId: number) => EntryValue;
  onScoreChange?: (studentId: string, competencyId: number, score: number | null) => void;
  onConclusionChange?: (studentId: string, competencyId: number, conclusion: string) => void;
  readOnly: boolean;
  /** Opcional — feature de IA (ver GenerateConclusionsModal). Sin esto, la tabla se comporta igual que antes. */
  onGenerateConclusions?: (studentId: string) => void;
  generatingFor?: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (studentId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  if (students.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No hay alumnos activos en esta sección.
      </div>
    );
  }
  if (competencies.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No hay competencias configuradas para esta área.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50 hover:bg-gray-50">
          <TableHead className="w-10 text-[#0F172A] font-semibold text-xs pl-5">N°</TableHead>
          <TableHead className="text-[#0F172A] font-semibold text-xs">Alumno</TableHead>
          {competencies.map((c) => (
            <TableHead
              key={c.id}
              className="text-center text-[#0F172A] font-semibold text-xs max-w-[140px]"
              title={c.name}
            >
              <span className="line-clamp-2 leading-tight">{c.name}</span>
            </TableHead>
          ))}
          <TableHead className="w-10 pr-5" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((s) => {
          const isExpanded = expanded.has(s.id);
          return (
            <Fragment key={s.id}>
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="pl-5 text-xs text-muted-foreground font-medium">
                  {String(s.order).padStart(2, "0")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                        {s.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-[#0F172A]">{s.name}</span>
                  </div>
                </TableCell>
                {competencies.map((c) => {
                  const entry = getEntry(s.id, c.id);
                  return (
                    <TableCell key={c.id} className="text-center">
                      <CompetencyScoreCell
                        value={entry.score}
                        readOnly={readOnly}
                        onChange={(v) => onScoreChange?.(s.id, c.id, v)}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="pr-5 text-center">
                  <button
                    onClick={() => toggle(s.id)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label={isExpanded ? "Ocultar conclusiones" : "Ver conclusiones"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableCell colSpan={competencies.length + 3} className="px-5 py-3">
                    <ConclusionsRow
                      competencies={competencies}
                      readOnly={readOnly}
                      getConclusion={(competencyId) => getEntry(s.id, competencyId).conclusion}
                      onChange={(competencyId, value) => onConclusionChange?.(s.id, competencyId, value)}
                      onGenerate={onGenerateConclusions ? () => onGenerateConclusions(s.id) : undefined}
                      generating={generatingFor === s.id}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
