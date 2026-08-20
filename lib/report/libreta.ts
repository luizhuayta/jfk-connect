import { jsPDF } from "jspdf";
import type { LibretaData } from "@/lib/grades/libreta";
import { drawHeader, drawFooterOnAllPages, printReport } from "./theme";
import { drawStudentBox, drawAreasTable, drawAttendanceTable, drawLegend, drawSignatures } from "./libreta-parts";

/**
 * Genera el PDF de la libreta oficial (2 páginas A4) a partir del payload de
 * /api/libreta. Función pura: no hace fetch — así padre, tutor y admin
 * generan siempre el mismo documento a partir de los mismos datos.
 */
export function generateLibretaPDF(data: LibretaData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Página 1 — cabecera + datos del alumno + áreas curriculares.
  drawHeader(doc, "INFORME DE PROGRESO DE LAS COMPETENCIAS DEL ESTUDIANTE", `${data.year}`, pageWidth);
  let y = drawStudentBox(doc, data, pageWidth, 130);
  drawAreasTable(
    doc,
    data.areas.filter((a) => !a.isTransversal),
    pageWidth,
    y + 10,
  );

  // Página 2 — competencias transversales + asistencia + leyenda + firmas.
  doc.addPage();
  y = drawHeader2(doc, pageWidth);
  const transversal = data.areas.filter((a) => a.isTransversal);
  if (transversal.length > 0) {
    y = drawAreasTable(doc, transversal, pageWidth, y);
  }
  y = drawAttendanceTable(doc, data, y + 10);
  y = drawLegend(doc, data, y + 10);
  drawSignatures(doc, data, pageWidth, y + 10);

  drawFooterOnAllPages(doc, pageWidth, pageHeight);
  return doc;
}

/** Cabecera simple de la página 2 (sin la banda azul completa de portada). */
function drawHeader2(doc: jsPDF, pageWidth: number): number {
  doc.setTextColor(30, 42, 94);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Competencias transversales, asistencia y leyenda", pageWidth / 2, 40, { align: "center" });
  return 56;
}

/** Trae el payload de la libreta desde el endpoint compartido padre/tutor/admin. */
async function fetchLibreta(studentId: string, year?: number): Promise<LibretaData> {
  const params = new URLSearchParams({ studentId });
  if (year) params.set("year", String(year));
  const res = await fetch(`/api/libreta?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "No se pudo obtener la libreta");
  return json.libreta as LibretaData;
}

/** Descarga la libreta de un alumno como PDF. */
export async function downloadLibreta(studentId: string, year?: number): Promise<void> {
  const libreta = await fetchLibreta(studentId, year);
  const doc = generateLibretaPDF(libreta);
  doc.save(`Libreta_${libreta.student.code ?? libreta.student.name.replace(/\s+/g, "_")}.pdf`);
}

/** Abre la libreta de un alumno en una pestaña nueva con diálogo de impresión. */
export async function printLibreta(studentId: string, year?: number): Promise<void> {
  const libreta = await fetchLibreta(studentId, year);
  printReport(generateLibretaPDF(libreta));
}

/**
 * Descarga las libretas de varios alumnos de una sección (uso del admin).
 * Concurrencia limitada a 3 para no saturar el servidor con fetches en
 * paralelo cuando una sección tiene 30+ alumnos.
 */
export async function downloadLibretasSection(studentIds: string[], year?: number): Promise<void> {
  const CONCURRENCY = 3;
  let index = 0;
  async function worker() {
    while (index < studentIds.length) {
      const id = studentIds[index++];
      await downloadLibreta(id, year);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, studentIds.length) }, worker));
}
