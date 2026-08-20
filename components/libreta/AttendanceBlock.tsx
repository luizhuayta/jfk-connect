import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BimesterKey } from "@/lib/grades/libreta";

export default function AttendanceBlock({
  attendance,
}: {
  attendance: Record<BimesterKey, { inasistencias: number; tardanzas: number }>;
}) {
  const bimesters: BimesterKey[] = [1, 2, 3, 4];
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 pt-3 pb-2">
        Asistencia por bimestre
      </p>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="text-xs font-semibold text-[#0F172A] pl-4">Bimestre</TableHead>
            {bimesters.map((b) => (
              <TableHead key={b} className="text-center text-xs font-semibold text-[#0F172A]">
                {b}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-xs text-muted-foreground pl-4">Inasistencias</TableCell>
            {bimesters.map((b) => (
              <TableCell key={b} className="text-center text-sm font-semibold text-[#0F172A]">
                {attendance[b].inasistencias}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-xs text-muted-foreground pl-4">Tardanzas</TableCell>
            {bimesters.map((b) => (
              <TableCell key={b} className="text-center text-sm font-semibold text-[#0F172A]">
                {attendance[b].tardanzas}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
