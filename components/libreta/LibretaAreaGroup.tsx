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
      <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
        <TableCell
          colSpan={6}
          className="py-2 text-xs font-bold uppercase tracking-wide text-primary whitespace-normal"
        >
          {area.name}
        </TableCell>
      </TableRow>
      {area.competencies.map((c) => {
        const active = c.bimesters[activeBimester];
        return (
          <TableRow key={c.id} className="hover:bg-surface-container-low/70">
            <TableCell className="py-2.5 text-sm text-on-surface whitespace-normal break-words">
              {c.name}
            </TableCell>
            {([1, 2, 3, 4] as const).map((b) => (
              <TableCell key={b} className="px-1 py-2.5 text-center whitespace-normal">
                <span className="inline-flex justify-center">
                  <LevelBadge level={c.bimesters[b].level} compact />
                </span>
              </TableCell>
            ))}
            <TableCell className="py-2.5 text-xs text-on-surface-variant whitespace-normal break-words">
              {active.conclusion || "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </Fragment>
  );
}
