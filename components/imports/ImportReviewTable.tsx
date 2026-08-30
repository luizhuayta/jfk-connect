"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import MatchBadge from "@/components/imports/MatchBadge";

export interface ReviewCell {
  competencyId: number;
  columnLabel: string | null;
  rawValue: string | null;
  score: number | null;
  status: "ok" | "invalido" | "vacio" | "sin_mapear";
  issue: string | null;
}

export interface ReviewRow {
  id: string;
  rowIndex: number;
  rawName: string | null;
  rawDni: string | null;
  matchedStudentId: string | null;
  matchMethod: string | null;
  status: "ok" | "ambiguo" | "sin_match" | "omitido";
  issues: string[];
  cells: ReviewCell[];
}

export interface RosterOption {
  id: string;
  name: string;
  order: number;
}

/**
 * Una fila por alumno detectado en el archivo — la pieza central de la
 * revisión humana obligatoria antes de aplicar a la libreta. Las filas
 * ambiguas/sin match exigen elegir un alumno del roster con un `<select>`
 * antes de poder incluirse en el commit.
 */
export default function ImportReviewTable({
  rows,
  competencies,
  roster,
  onMatchChange,
  onScoreChange,
}: {
  rows: ReviewRow[];
  competencies: { id: number; name: string }[];
  roster: RosterOption[];
  onMatchChange: (rowId: string, studentId: string | null) => void;
  onScoreChange: (rowId: string, competencyId: number, score: number | null) => void;
}) {
  const rosterSorted = [...roster].sort((a, b) => a.order - b.order);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="text-xs font-semibold text-[#0F172A]">Fila</TableHead>
            <TableHead className="text-xs font-semibold text-[#0F172A]">Alumno detectado</TableHead>
            <TableHead className="text-xs font-semibold text-[#0F172A]">Coincidencia</TableHead>
            {competencies.map((c) => (
              <TableHead key={c.id} className="text-center text-xs font-semibold text-[#0F172A] max-w-[120px]">
                <span className="line-clamp-2 leading-tight" title={c.name}>
                  {c.name}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const needsManualMatch = row.status === "ambiguo" || row.status === "sin_match";
            return (
              <TableRow key={row.id} className={row.status === "sin_match" ? "bg-red-50/40" : row.status === "ambiguo" ? "bg-amber-50/40" : ""}>
                <TableCell className="text-xs text-muted-foreground">{row.rowIndex + 1}</TableCell>
                <TableCell className="min-w-[180px]">
                  <p className="text-sm font-medium text-[#0F172A]">{row.rawName ?? "(sin nombre)"}</p>
                  {row.rawDni && <p className="text-[11px] text-muted-foreground">DNI: {row.rawDni}</p>}
                  {row.issues.length > 0 && (
                    <p className="text-[11px] text-amber-700 mt-0.5">{row.issues[0]}</p>
                  )}
                </TableCell>
                <TableCell className="min-w-[180px] space-y-1.5">
                  <MatchBadge method={row.matchMethod} />
                  {needsManualMatch && (
                    <select
                      value={row.matchedStudentId ?? ""}
                      onChange={(e) => onMatchChange(row.id, e.target.value || null)}
                      className="w-full h-7 px-1.5 text-[11px] rounded-md border border-gray-200 bg-white"
                    >
                      <option value="">Elegir alumno...</option>
                      {rosterSorted.map((s) => (
                        <option key={s.id} value={s.id}>
                          {String(s.order).padStart(2, "0")}. {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </TableCell>
                {competencies.map((c) => {
                  const cell = row.cells.find((x) => x.competencyId === c.id);
                  return (
                    <TableCell key={c.id} className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={cell?.score ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          onScoreChange(row.id, c.id, v === "" ? null : Number(v));
                        }}
                        className={`h-8 w-16 mx-auto text-center text-xs ${
                          cell?.status === "invalido" ? "border-red-300 text-red-600" : ""
                        }`}
                        title={cell?.issue ?? undefined}
                      />
                      {cell?.status === "invalido" && cell.issue && (
                        <p className="text-[10px] text-red-600 mt-0.5 max-w-[110px] mx-auto leading-tight">{cell.issue}</p>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
