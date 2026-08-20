import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LibretaAreaGroup from "./LibretaAreaGroup";
import type { LibretaArea } from "@/lib/grades/libreta";

/**
 * Tabla calcada a la libreta oficial: áreas curriculares como cabeceras de
 * grupo, sus competencias debajo con las 4 letras de bimestre + la
 * conclusión del bimestre activo. Las competencias transversales van en un
 * bloque aparte al final (mismo componente, area.isTransversal cambia solo
 * el título de la sección).
 */
export default function LibretaTable({
  areas,
  activeBimester,
}: {
  areas: LibretaArea[];
  activeBimester: 1 | 2 | 3 | 4;
}) {
  const normal = areas.filter((a) => !a.isTransversal);
  const transversal = areas.filter((a) => a.isTransversal);

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#1E2A5E] hover:bg-[#1E2A5E]">
            <TableHead className="text-white text-xs font-semibold">Áreas curriculares y competencias</TableHead>
            <TableHead className="text-white text-xs font-semibold text-center w-12">I</TableHead>
            <TableHead className="text-white text-xs font-semibold text-center w-12">II</TableHead>
            <TableHead className="text-white text-xs font-semibold text-center w-12">III</TableHead>
            <TableHead className="text-white text-xs font-semibold text-center w-12">IV</TableHead>
            <TableHead className="text-white text-xs font-semibold">Conclusión descriptiva</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {normal.map((area) => (
            <LibretaAreaGroup key={area.id} area={area} activeBimester={activeBimester} />
          ))}
        </TableBody>
      </Table>

      {transversal.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Competencias transversales
          </p>
          <Table>
            <TableBody>
              {transversal.map((area) => (
                <LibretaAreaGroup key={area.id} area={area} activeBimester={activeBimester} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
