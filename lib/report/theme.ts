/**
 * Piezas visuales compartidas por todos los PDF institucionales
 * (constancia, libreta): cabecera azul/dorada, pie de página, e impresión
 * en pestaña nueva. Extraído de lib/report-pdf.ts (ahora retirado) al
 * trocear ese archivo en lib/report/.
 */
import { jsPDF } from "jspdf";

export const AZUL: [number, number, number] = [30, 42, 94];
export const DORADO: [number, number, number] = [244, 193, 92];

export const INSTITUTION = "COLEGIO JOHN F. KENNEDY";
export const INSTITUTION_SUB = "Chincha — Año Lectivo";

/** Cabecera institucional: banda azul + título dorado + subtítulo. */
export function drawHeader(doc: jsPDF, title: string, subtitle: string, pageWidth: number): void {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(INSTITUTION, pageWidth / 2, 38, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(INSTITUTION_SUB, pageWidth / 2, 56, { align: "center" });

  doc.setDrawColor(...DORADO);
  doc.setLineWidth(2.5);
  doc.line(pageWidth / 2 - 60, 66, pageWidth / 2 + 60, 66);

  doc.setTextColor(...DORADO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, 84, { align: "center" });
  doc.setTextColor(...AZUL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, pageWidth / 2, 118, { align: "center" });
}

export function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.setFillColor(...AZUL);
  doc.rect(0, pageHeight - 26, pageWidth, 26, "F");
  doc.setTextColor(...DORADO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    "Sistema de Gestión Académica IJFK — Documento generado electrónicamente",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" },
  );
}

/** Pinta el pie de página en TODAS las páginas del documento, no solo la activa. */
export function drawFooterOnAllPages(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight);
  }
}

/** Abre el PDF en una pestaña nueva con diálogo de impresión (autoPrint). */
export function printReport(doc: jsPDF): void {
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank");
}

/** Y de una tabla de jspdf-autotable, para encadenar bloques debajo. */
export function lastAutoTableY(doc: jsPDF, fallback: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}
