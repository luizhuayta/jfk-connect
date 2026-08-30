import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { longDate } from "@/lib/attendance/calendar";
import type { AttendanceRecord } from "@/lib/father/types";
import { JUST_STATUS } from "@/components/father/attendance/tones";
import { cn } from "@/lib/utils";

export default function FaltasList({
  records,
  onJustify,
}: {
  records: AttendanceRecord[];
  onJustify: (rec: AttendanceRecord) => void;
}) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Faltas y justificaciones
      </p>
      <p className="text-xs text-on-surface-variant">
        Las faltas sin justificar están en rojo: tóquelas en el calendario o use
        «Justificar».
      </p>
      <div className="space-y-2">
        {records.map((rec) => {
          const just = rec.justification;
          return (
            <div
              key={rec.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                just?.status === "aprobada"
                  ? "border-blue-200 bg-blue-50"
                  : just?.status === "rechazada"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50",
              )}
            >
              <FileQuestion
                aria-hidden
                className={cn(
                  "h-4 w-4 shrink-0",
                  just?.status === "aprobada"
                    ? "text-blue-700"
                    : just?.status === "rechazada"
                      ? "text-red-600"
                      : "text-amber-700",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize leading-tight text-on-surface">
                  {longDate(rec.date)}
                </p>
                {just ? (
                  <>
                    <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                      Motivo: {just.reason}
                    </p>
                    {just.adminResponse && (
                      <p className="mt-0.5 text-xs">
                        <span className="font-semibold">Respuesta del docente: </span>
                        <span className="text-on-surface-variant">{just.adminResponse}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-on-surface-variant">Faltó sin justificar</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {just ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      JUST_STATUS[just.status].chip,
                    )}
                  >
                    {JUST_STATUS[just.status].label}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onJustify(rec)}
                    className="h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover"
                  >
                    Justificar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
