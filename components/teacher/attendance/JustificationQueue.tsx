"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileQuestion, Loader2 } from "lucide-react";
import type { TeacherCourse } from "@/components/teacher/useTeacherCourses";
import { fmtDateLong, type JustificationItem } from "./tones";

export default function JustificationQueue({
  course,
  justifications,
  justResponse,
  justBusy,
  onResponseChange,
  onReview,
}: {
  course: TeacherCourse | undefined;
  justifications: JustificationItem[];
  justResponse: Record<string, string>;
  justBusy: string | null;
  onResponseChange: (id: string, value: string) => void;
  onReview: (j: JustificationItem, decision: "aprobar" | "rechazar") => void;
}) {
  const pending = justifications.filter((j) => j.status === "pendiente");
  if (pending.length === 0) return null;

  return (
    <Card className="border-none shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-6 space-y-3">
        <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-amber-600" />
          Justificaciones pendientes — {course?.subject} {course?.grade} &quot;{course?.section}&quot;
        </h2>
        <div className="space-y-3">
          {pending.map((j) => (
            <div key={j.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{j.studentName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {fmtDateLong(j.date)} · solicitado por {j.parentName}
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[11px] font-bold">
                  En revisión
                </Badge>
              </div>
              <p className="text-sm text-[#334155] bg-white rounded-lg border border-amber-100 px-3 py-2">
                <span className="font-semibold">Motivo: </span>
                {j.reason}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={justResponse[j.id] ?? ""}
                  onChange={(e) => onResponseChange(j.id, e.target.value)}
                  placeholder="Respuesta (opcional)..."
                  className="flex-1 min-w-[160px] h-9 px-3 rounded-lg border border-input bg-white text-sm"
                />
                <Button
                  size="sm"
                  disabled={justBusy === j.id}
                  onClick={() => onReview(j, "aprobar")}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg h-9 px-4 text-xs font-bold"
                >
                  {justBusy === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓ Aprobar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={justBusy === j.id}
                  onClick={() => onReview(j, "rechazar")}
                  className="rounded-lg h-9 px-4 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50"
                >
                  ✕ Rechazar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
