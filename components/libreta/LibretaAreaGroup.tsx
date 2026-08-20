import { Fragment } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import LevelBadge from "@/components/grades/LevelBadge";
import type { LibretaArea } from "@/lib/grades/libreta";

/**
 * Filas de un área dentro de la tabla mayor de la libreta: una fila gris
 * con el nombre del área (colSpan), seguida de una fila por competencia
 * con las 4 letras de bimestre + la conclusión del bimestre activo.
 */
export default function LibretaAreaGroup({
  area,
  activeBimester,
}: {
  area: LibretaArea;
  activeBimester: 1 | 2 | 3 | 4;
}) {
  return (
    <Fragment>
      <TableRow className="bg-gray-100 hover:bg-gray-100">
        <TableCell colSpan={6} className="text-xs font-bold text-[#1E2A5E] uppercase tracking-wide py-2">
          {area.name}
        </TableCell>
      </TableRow>
      {area.competencies.map((c) => {
        const active = c.bimesters[activeBimester];
        return (
          <TableRow key={c.id} className="hover:bg-gray-50/50">
            <TableCell className="text-sm text-[#0F172A] py-2.5 max-w-[220px]">{c.name}</TableCell>
            {([1, 2, 3, 4] as const).map((b) => (
              <TableCell key={b} className="text-center py-2.5">
                <LevelBadge level={c.bimesters[b].level} />
              </TableCell>
            ))}
            <TableCell className="text-xs text-muted-foreground py-2.5 whitespace-normal break-words max-w-[220px]">
              {active.conclusion || "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </Fragment>
  );
}
