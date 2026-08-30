import { Check, CheckCircle2, Clock, X } from "lucide-react";
import type { AttendanceStatus } from "@/lib/attendance/labels";

export default function AttendanceMark({
  status,
  className = "h-4 w-4",
}: {
  status: AttendanceStatus | null;
  className?: string;
}) {
  if (status === "A") return <Check className={className} aria-hidden />;
  if (status === "F") return <X className={className} aria-hidden />;
  if (status === "T") return <Clock className={className} aria-hidden />;
  if (status === "J") return <CheckCircle2 className={className} aria-hidden />;
  return <span aria-hidden>—</span>;
}
