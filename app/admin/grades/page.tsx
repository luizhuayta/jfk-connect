"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Users, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  mockTeacherCourses,
  mockCourseStudents,
  mockCourseGrades,
} from "@/data/mock";

const BIMESTERS = ["Bimestre 1", "Bimestre 2", "Bimestre 3", "Bimestre 4"];

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  "Matemáticas":       { bg: "bg-blue-50",   text: "text-blue-700"   },
  "Lengua Castellana": { bg: "bg-purple-50", text: "text-purple-700" },
  "Historia":          { bg: "bg-amber-50",  text: "text-amber-700"  },
};

function avg3(n1: number, n2: number, n3: number) {
  return (n1 + n2 + n3) / 3;
}

function levelBadge(avg: number) {
  if (avg >= 18) return { label: "AD", cls: "bg-emerald-100 text-emerald-700" };
  if (avg >= 14) return { label: "A",  cls: "bg-blue-100 text-blue-700"       };
  if (avg >= 11) return { label: "B",  cls: "bg-amber-100 text-amber-700"     };
  return              { label: "C",  cls: "bg-red-100 text-red-600"         };
}

function gradeColor(n: number) {
  if (n === 0) return "text-gray-400";
  if (n >= 17) return "text-emerald-600 font-bold";
  if (n >= 11) return "text-[#0F172A] font-semibold";
  return "text-red-500 font-bold";
}

export default function AdminGradesPage() {
  const [activeCourseId, setActiveCourseId] = useState(mockTeacherCourses[0].id);
  const [activeBimester, setActiveBimester] = useState("Bimestre 1");

  const course = mockTeacherCourses.find((c) => c.id === activeCourseId)!;
  const students = mockCourseStudents[activeCourseId] ?? [];
  const entries = mockCourseGrades[activeCourseId]?.[activeBimester] ?? [];
  const rowMap = Object.fromEntries(entries.map((e) => [e.studentId, e]));

  const hasData = entries.some((e) => e.n3 > 0);
  const inProgress = entries.some((e) => e.n1 > 0) && !hasData;

  const stats = useMemo(() => {
    const complete = entries.filter((e) => e.n1 > 0 && e.n2 > 0 && e.n3 > 0);
    const avgs = complete.map((e) => avg3(e.n1, e.n2, e.n3));
    const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
    return {
      registered: complete.length,
      total: students.length,
      approved: avgs.filter((a) => a >= 11).length,
      failed: avgs.filter((a) => a < 11 && a > 0).length,
      classAvg,
    };
  }, [entries, students]);

  // Global overview: one row per course with B1+B2 avg
  const globalRows = mockTeacherCourses.map((c) => {
    const b1 = mockCourseGrades[c.id]?.["Bimestre 1"] ?? [];
    const b2 = mockCourseGrades[c.id]?.["Bimestre 2"] ?? [];
    const calc = (es: typeof b1) => {
      const complete = es.filter((e) => e.n3 > 0);
      const avgs = complete.map((e) => avg3(e.n1, e.n2, e.n3));
      return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
    };
    return { course: c, b1avg: calc(b1), b2avg: calc(b2) };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Notas</h1>
        <p className="text-muted-foreground mt-1">
          Registro académico por curso y bimestre · Año Lectivo 2026
        </p>
      </div>

      {/* Global overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {globalRows.map(({ course: c, b1avg, b2avg }) => {
          const color = SUBJECT_COLORS[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
          return (
            <Card key={c.id} className="border-none shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.bg} shrink-0`}>
                    <BarChart3 className={`h-4 w-4 ${color.text}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">{c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "B1", val: b1avg }, { label: "B2", val: b2avg }].map(({ label, val }) => (
                    <div key={label} className={`rounded-lg p-2 text-center border ${val ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100"}`}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      {val ? (
                        <p className={`text-base font-bold ${val >= 14 ? "text-emerald-600" : val >= 11 ? "text-amber-600" : "text-red-500"}`}>
                          {val.toFixed(1)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">—</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course + bimester selectors */}
      <div className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          {mockTeacherCourses.map((c) => {
            const isActive = activeCourseId === c.id;
            const color = SUBJECT_COLORS[c.subject] ?? { bg: "bg-gray-50", text: "text-gray-700" };
            return (
              <button
                key={c.id}
                onClick={() => setActiveCourseId(c.id)}
                className={`px-5 py-3 rounded-xl border-2 transition-all text-left ${
                  isActive ? "border-[#2563EB] bg-[#2563EB]/5" : "border-gray-200 bg-white hover:border-[#2563EB]/30"
                }`}
              >
                <p className={`text-sm font-bold ${isActive ? "text-[#2563EB]" : "text-[#0F172A]"}`}>{c.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.grade} &quot;{c.section}&quot; · {c.studentsTotal} alumnos</p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 bg-gray-50 rounded-lg p-1 w-fit">
          {BIMESTERS.map((b) => {
            const es = mockCourseGrades[activeCourseId]?.[b] ?? [];
            const done = es.some((e) => e.n3 > 0);
            const prog = es.some((e) => e.n1 > 0) && !done;
            return (
              <button
                key={b}
                onClick={() => setActiveBimester(b)}
                className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeBimester === b ? "bg-[#1E2A5E] text-white" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {b}
                {done && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />}
                {prog && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 border border-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Registrados",  value: `${stats.registered}/${stats.total}`, icon: Users,         cls: "bg-gray-50 border-gray-200 text-[#0F172A]"         },
          { label: "Aprobados",    value: stats.approved,                        icon: CheckCircle2,  cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Desaprobados", value: stats.failed,                          icon: AlertTriangle, cls: "bg-red-50 border-red-200 text-red-600"             },
          { label: "Promedio aula",value: stats.classAvg > 0 ? stats.classAvg.toFixed(1) : "—", icon: TrendingUp, cls: "bg-blue-50 border-blue-200 text-blue-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 flex items-center gap-3 ${s.cls}`}>
            <s.icon className="h-4 w-4 shrink-0 opacity-70" />
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grades table */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {!hasData && !inProgress ? (
            <div className="py-14 text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Este bimestre aún no tiene notas registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-[#0F172A] font-semibold text-sm pl-5 w-10">N°</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N1</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N2</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">N3</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Promedio</TableHead>
                  <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Nivel</TableHead>
                  <TableHead className="text-[#0F172A] font-semibold text-sm pr-5">Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((st) => {
                  const row = rowMap[st.id];
                  const complete = row && row.n1 > 0 && row.n2 > 0 && row.n3 > 0;
                  const average = complete ? avg3(row.n1, row.n2, row.n3) : null;
                  const level = average !== null ? levelBadge(average) : null;
                  return (
                    <TableRow
                      key={st.id}
                      className={`hover:bg-gray-50/50 ${average !== null && average < 11 ? "bg-red-50/30" : ""}`}
                    >
                      <TableCell className="pl-5 text-xs text-muted-foreground font-medium">
                        {String(st.order).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                              {st.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-[#0F172A]">{st.name}</span>
                        </div>
                      </TableCell>
                      {(["n1", "n2", "n3"] as const).map((f) => (
                        <TableCell key={f} className="text-center">
                          <span className={`text-sm ${row ? gradeColor(row[f]) : "text-gray-400"}`}>
                            {row && row[f] > 0 ? row[f] : "—"}
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {average !== null ? (
                          <span className={`text-sm font-bold ${gradeColor(average)}`}>
                            {average.toFixed(1)}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {level ? (
                          <Badge className={`text-xs font-bold border-0 ${level.cls} hover:opacity-90`}>
                            {level.label}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground pr-5">
                        {row?.observation || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
