import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawHeader, drawFooter, lastAutoTableY, AZUL } from "./theme";

/** Constancia de matrícula (datos del alumno, código, avance de documentos). */
export function generateConstanciaPDF(opts: {
  student: { name: string; grade: string; section: string };
  code: string;
  year: number;
  shift: string;
  classroom: string;
  tutor: string;
  docsSubmitted: number;
  docsTotal: number;
}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, "CONSTANCIA DE MATRÍCULA", `${opts.year}`, pageWidth);

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const intro =
    "La Dirección del Colegio John F. Kennedy de Chincha deja constancia de que el(la) " +
    "alumno(a) se encuentra debidamente matriculado(a) en la presente institución " +
    "educativa, conforme al siguiente detalle:";
  const introLines = doc.splitTextToSize(intro, pageWidth - 100);
  doc.text(introLines, 50, 160);

  const docsPct = opts.docsTotal ? Math.round((opts.docsSubmitted / opts.docsTotal) * 100) : 0;
  autoTable(doc, {
    startY: 240,
    margin: { left: 50, right: 50 },
    theme: "grid",
    body: [
      ["Alumno(a)", opts.student.name],
      ["Código de matrícula", opts.code],
      ["Grado y sección", `${opts.student.grade} "${opts.student.section}"`],
      ["Turno", opts.shift],
      ["Aula asignada", opts.classroom],
      ["Tutor / Apoderado", opts.tutor],
      ["Documentos presentados", `${opts.docsSubmitted} de ${opts.docsTotal} (${docsPct}%)`],
    ],
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 7 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 160 },
      1: { cellWidth: 320 },
    },
  });

  const endY = lastAutoTableY(doc, 360);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Se expide la presente constancia a solicitud del apoderado para los fines que estime conveniente.",
    50,
    endY + 40,
  );
  doc.text(`Chincha, ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}`, 50, endY + 60);
  doc.text("____________________________", pageWidth / 2, endY + 160, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Dirección / Secretaría", pageWidth / 2, endY + 175, { align: "center" });

  drawFooter(doc, pageWidth, pageHeight);
  return doc;
}

/** Descarga la constancia de matrícula como PDF. Conecta el botón de Matrícula. */
export async function downloadConstancia(opts: {
  student: { name: string; grade: string; section: string };
  code: string;
  year: number;
  shift: string;
  classroom: string;
  tutor: string;
  docsSubmitted: number;
  docsTotal: number;
}): Promise<void> {
  const doc = generateConstanciaPDF(opts);
  doc.save(`Constancia_${opts.code}.pdf`);
}
