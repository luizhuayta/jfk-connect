"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import type { TeacherCourse } from "@/components/teacher/useTeacherCourses";
import { fmtDateLong } from "./tones";

type HistoryRow = {
  date: string;
  A: number;
  F: number;
  T: number;
  J: number;
  pct: number;
};

export default function SessionHistory({
  course,
  history,
  onSelectDate,
}: {
  course: TeacherCourse | undefined;
  history: HistoryRow[];
  onSelectDate: (date: string) => void;
}) {
  if (history.length === 0) return null;

  return (
    <Card className="border-none shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#2563EB]" />
          Historial reciente — {course?.subject} {course?.grade} &quot;{course?.section}&quot;
        </h2>
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-[#0F172A] font-semibold text-sm">Fecha</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Presentes</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Tardanzas</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Faltas</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Justificadas</TableHead>
                <TableHead className="text-center text-[#0F172A] font-semibold text-sm">Asistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow
                  key={h.date}
                  className="hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => onSelectDate(h.date)}
                >
                  <TableCell className="text-sm font-medium text-[#0F172A] capitalize">
                    {fmtDateLong(h.date)}
                  </TableCell>
                  <TableCell className="text-center text-sm font-semibold text-emerald-600">{h.A}</TableCell>
                  <TableCell className="text-center text-sm font-semibold text-amber-600">{h.T}</TableCell>
                  <TableCell className="text-center text-sm font-semibold text-red-500">{h.F}</TableCell>
                  <TableCell className="text-center text-sm font-semibold text-blue-600">{h.J}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`text-xs font-bold border-0 hover:bg-opacity-100 ${
                        h.pct >= 90
                          ? "bg-emerald-100 text-emerald-700"
                          : h.pct >= 75
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      {h.pct}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
