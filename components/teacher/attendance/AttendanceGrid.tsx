"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Save, Loader2 } from "lucide-react";
import type { TeacherCourse } from "@/components/teacher/useTeacherCourses";
import { STATUS, fmtDate, fmtDateLong, type AttendanceStatus, type CourseStudent } from "./tones";

export default function AttendanceGrid({
  course,
  activeDate,
  students,
  records,
  counts,
  pct,
  loadingGrid,
  saving,
  saved,
  onSetAll,
  onSetStatus,
  onSave,
}: {
  course: TeacherCourse | undefined;
  activeDate: string;
  students: CourseStudent[];
  records: Record<string, AttendanceStatus>;
  counts: { A: number; F: number; T: number; J: number; total: number };
  pct: number;
  loadingGrid: boolean;
  saving: boolean;
  saved: boolean;
  onSetAll: (status: AttendanceStatus) => void;
  onSetStatus: (studentId: string, status: AttendanceStatus) => void;
  onSave: () => void;
}) {
  return (
    <Card className="border-none shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              {course?.subject} · {course?.grade} &quot;{course?.section}&quot;
            </h2>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {fmtDateLong(activeDate)} · {course?.room}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Marcar todos:</span>
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
              {(["A", "T", "F"] as AttendanceStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onSetAll(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    s === "A"
                      ? "text-emerald-700 hover:bg-emerald-50"
                      : s === "F"
                        ? "text-red-600 hover:bg-red-50"
                        : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {s} · {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingGrid ? (
          <div className="py-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#1E2A5E]" />
            <p className="text-sm text-muted-foreground mt-2">Cargando alumnos...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Presentes", value: counts.A, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: "Tardanzas", value: counts.T, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                { label: "Faltas", value: counts.F, cls: "bg-red-50 border-red-200 text-red-600" },
                { label: "Justificadas", value: counts.J, cls: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: "% Asistencia", value: `${pct}%`, cls: "bg-[#1E2A5E]/5 border-[#1E2A5E]/10 text-[#1E2A5E]" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border p-2.5 text-center ${s.cls}`}>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-[#0F172A] font-semibold text-sm w-10">N°</TableHead>
                    <TableHead className="text-[#0F172A] font-semibold text-sm">Alumno</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Estado</TableHead>
                    <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const status = records[student.id] ?? "A";
                    const cfg = STATUS[status];
                    const Icon = cfg.icon;
                    return (
                      <TableRow
                        key={student.id}
                        className={`border-l-4 transition-colors ${cfg.rowBg} ${cfg.rowBorder}`}
                      >
                        <TableCell className="text-xs text-muted-foreground font-medium py-2.5">
                          {String(student.order).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-[#2563EB] text-white text-[10px] font-bold">
                                {student.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-[#0F172A]">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 gap-0.5">
                            {(["A", "T", "F"] as AttendanceStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => onSetStatus(student.id, s)}
                                title={STATUS[s].label}
                                aria-label={`${STATUS[s].label} — ${student.name}`}
                                className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                                  status === s ? STATUS[s].btn : "text-gray-400 hover:bg-gray-100"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button
              onClick={onSave}
              disabled={saving}
              className="w-full bg-[#F4C15C] text-[#1E2A5E] font-bold hover:bg-[#e0b04f] rounded-lg h-11 gap-2 text-base"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Asistencia guardada
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" /> Guardar asistencia — {fmtDate(activeDate)}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
