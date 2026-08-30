/**
 * Parseo de Excel (.xlsx) para el importador de notas — IJFK.
 *
 * `exceljs` (MIT) en vez de `xlsx`/SheetJS: SheetJS está congelado en el
 * registro de npm (se mudó a su propio CDN) y arrastra CVEs de prototype
 * pollution en las versiones que quedan publicadas ahí — ver la
 * justificación completa en el plan de esta fase.
 *
 * Import DINÁMICO (`await import("exceljs")`, nunca `import ... from`
 * estático): exceljs pesa ~1 MB con jszip, y esta es la ÚNICA función que lo
 * necesita — un import estático lo metería en el bundle standalone de todas
 * las demás rutas del build.
 */

import type { ParsedSheet } from "@/lib/imports/types";

export async function parseXlsx(buffer: Buffer): Promise<ParsedSheet> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  // exceljs declara su propio tipo `Buffer` local (un stub `extends
  // ArrayBuffer`, no el Buffer de Node) que no calza con @types/node
  // recientes — cast estructural vía Parameters<> en vez de `as any`, para
  // no perder el chequeo de que `load` de verdad acepta un solo argumento.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { sheetName: "", rows: [] };
  }

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    // `row.eachRow` numera columnas desde 1; recorrer con includeEmpty para
    // no desalinear columnas si el docente dejó celdas vacías al medio.
    const colCount = row.cellCount;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      // `.text` da siempre un string de presentación (fechas, fórmulas
      // resueltas, números) — consistente con el path de CSV, que también
      // entrega todo como string.
      cells.push((cell.text ?? "").toString().trim());
    }
    rows.push(cells);
  });

  return { sheetName: sheet.name, rows };
}
