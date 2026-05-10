"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockStudents, mockBimesterNotes } from "@/data/mock";

const bimesters = ["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"];

function getLevelLabel(avg: number) {
  if (avg >= 17.5) return "Excelente";
  if (avg >= 14) return "Bueno";
  if (avg >= 11) return "Regular";
  return "Bajo";
}

export default function GradesPage() {
  const [activeStudentId, setActiveStudentId] = useState(mockStudents[0].id);
  const [activeBimester, setActiveBimester] = useState("Bimestre 1");

  const student = mockStudents.find((s) => s.id === activeStudentId)!;
  const notes = mockBimesterNotes[activeStudentId]?.[activeBimester] ?? [];
  const average =
    notes.reduce((sum, n) => sum + n.note, 0) / (notes.length || 1);
  const levelLabel = getLevelLabel(average);

  const bimesterAverages = bimesters.map((b) => {
    const bn = mockBimesterNotes[activeStudentId]?.[b] ?? [];
    const avg = bn.reduce((s, n) => s + n.note, 0) / (bn.length || 1);
    return { label: b, avg };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E2A5E]">Notas</h1>
        <p className="text-muted-foreground mt-1">
          Calificaciones por bimestre — Año Lectivo 2026
        </p>
      </div>

      {/* Student Selector */}
      <div className="flex gap-3 flex-wrap">
        {mockStudents.map((s) => {
          const initials = s.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const isActive = activeStudentId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStudentId(s.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-[#1E2A5E] bg-[#1E2A5E]/5"
                  : "border-gray-200 bg-white hover:border-[#1E2A5E]/30"
              }`}
            >
              <Avatar className="h-9 w-9 border border-[#F4C15C]/40">
                <AvatarFallback
                  className={`text-xs font-semibold ${
                    isActive ? "bg-[#1E2A5E] text-white" : "bg-[#1E2A5E]/10 text-[#1E2A5E]"
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p
                  className={`text-sm font-semibold ${
                    isActive ? "text-[#1E2A5E]" : "text-[#0F172A]"
                  }`}
                >
                  {s.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.grade} &quot;{s.section}&quot;
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bimester strip */}
      <div className="grid grid-cols-4 gap-3">
        {bimesterAverages.map((b, i) => {
          const isActive = activeBimester === b.label;
          return (
            <button
              key={b.label}
              onClick={() => setActiveBimester(b.label)}
              className={`rounded-xl p-4 text-center transition-all border-2 ${
                isActive
                  ? "bg-[#1E2A5E] border-[#1E2A5E] text-white"
                  : "bg-white border-gray-100 hover:border-[#1E2A5E]/30 shadow-sm"
              }`}
            >
              <p
                className={`text-xs font-medium mb-1 ${
                  isActive ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                Bimestre {i + 1}
              </p>
              <p
                className={`text-2xl font-bold ${
                  isActive ? "text-[#F4C15C]" : "text-[#1E2A5E]"
                }`}
              >
                {b.avg.toFixed(1)}
              </p>
              <p
                className={`text-xs mt-1 font-medium ${
                  isActive ? "text-white/60" : "text-muted-foreground"
                }`}
              >
                {getLevelLabel(b.avg)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Grades Card */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0F172A]">
            {activeBimester} — {student.name}
          </h2>

          {/* Grade Table */}
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Curso</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nota</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Nivel</TableHead>
                  <TableHead className="text-right text-[#0F172A] font-semibold text-sm">
                    Observación
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm font-medium text-[#0F172A]">
                      {row.course}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-bold ${
                          row.note >= 17
                            ? "text-emerald-600"
                            : row.note >= 14
                            ? "text-[#1E2A5E]"
                            : "text-amber-600"
                        }`}
                      >
                        {row.note.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs font-bold ${
                          row.level === "AD"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {row.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {row.observation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Promedio */}
          <div className="flex items-center justify-between bg-[#1E2A5E] rounded-xl px-6 py-5">
            <div>
              <p className="text-sm text-white/80">Promedio del {activeBimester}</p>
              <p className="text-3xl font-bold text-[#F4C15C]">{average.toFixed(1)}</p>
            </div>
            <Badge className="bg-[#F4C15C] text-[#1E2A5E] font-bold text-sm px-3 py-1 hover:bg-[#F4C15C]">
              {levelLabel}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
            >
              Descargar Boletín PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white transition-colors"
            >
              Imprimir Reporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
