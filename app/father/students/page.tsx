"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, CheckCircle2 } from "lucide-react";
import { mockStudents, mockBimesterNotes } from "@/data/mock";

function getLevel(avg: number) {
  if (avg >= 18) return { label: "AD", color: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A", color: "bg-blue-100 text-blue-700" };
  if (avg >= 11) return { label: "B", color: "bg-amber-100 text-amber-700" };
  return { label: "C", color: "bg-red-100 text-red-700" };
}

function getAnnualAverage(studentId: string) {
  const allNotes = Object.values(mockBimesterNotes[studentId] ?? {}).flat();
  if (!allNotes.length) return 0;
  return allNotes.reduce((sum, n) => sum + n.note, 0) / allNotes.length;
}

export default function StudentsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1E2A5E]">Mis Hijos</h1>
        <p className="text-muted-foreground mt-1">
          Alumnos matriculados — Año Lectivo 2026
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E2A5E]/10">
              <CheckCircle2 className="h-5 w-5 text-[#1E2A5E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E2A5E]">{mockStudents.length}</p>
              <p className="text-xs text-muted-foreground">Hijos matriculados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E2A5E]">12</p>
              <p className="text-xs text-muted-foreground">Cursos por alumno</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E2A5E]">95%</p>
              <p className="text-xs text-muted-foreground">Asistencia promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {mockStudents.map((student) => {
          const initials = student.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const annualAvg = getAnnualAverage(student.id);
          const level = getLevel(annualAvg);
          const avgTextColor =
            annualAvg >= 17
              ? "text-emerald-600"
              : annualAvg >= 14
              ? "text-blue-600"
              : "text-amber-600";
          const avgBg =
            annualAvg >= 17
              ? "bg-emerald-50"
              : annualAvg >= 14
              ? "bg-blue-50"
              : "bg-amber-50";

          return (
            <Card
              key={student.id}
              className="border-none shadow-sm hover:shadow-md transition-shadow rounded-xl"
            >
              <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-[#F4C15C]/30">
                    <AvatarFallback className="bg-[#1E2A5E]/10 text-[#1E2A5E] font-bold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0F172A] text-base">{student.name}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-[#64748B] text-xs"
                      >
                        {student.grade} &quot;{student.section}&quot;
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-100">
                        Matriculado
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-xl ${avgBg} p-3 text-center`}>
                    <p className={`text-xl font-bold ${avgTextColor}`}>
                      {annualAvg.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Promedio</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className={`text-xl font-bold ${level.color.split(" ")[1]}`}>{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Nivel</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-bold text-[#1E2A5E]">12</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Cursos</p>
                  </div>
                </div>

                {/* Bimester mini-summary */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    Promedio por Bimestre
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"].map((b, i) => {
                      const notes = mockBimesterNotes[student.id]?.[b] ?? [];
                      const avg =
                        notes.reduce((s, n) => s + n.note, 0) / (notes.length || 1);
                      return (
                        <div key={b} className="text-center bg-gray-50 rounded-lg py-2">
                          <p className="text-xs text-muted-foreground">B{i + 1}</p>
                          <p className="text-sm font-bold text-[#1E2A5E]">
                            {avg.toFixed(1)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link href="/father/grades" className="flex-1">
                    <Button className="w-full bg-[#F4C15C] text-[#1E2A5E] font-semibold hover:bg-[#e0b04f] rounded-lg h-10 text-sm">
                      Ver Notas
                    </Button>
                  </Link>
                  <Link href="/father/attendance" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full rounded-lg border-[#1E2A5E]/20 text-[#1E2A5E] hover:bg-[#1E2A5E] hover:text-white h-10 text-sm transition-colors"
                    >
                      Asistencia
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
