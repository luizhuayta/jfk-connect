/**
 * Generación de reportes PDF en el cliente (jspdf + jspdf-autotable).
 * =============================================================================
 * - `generateBoletínPDF`: boletín de notas de un bimestre (cabecera azul/
 *   dorado institucional, tabla de notas con letra y desempeño, promedio y
 *   asistencia).
 * - `generateConstanciaPDF`: constancia de matrícula (datos del alumno,
 *   código de matrícula, avance de documentos).
 * - `printReport`: imprime un PDF en una pestaña nueva (autoPrint).
 *
 * Se ejecuta 100% en el navegador; no hay dependencias server-side, así que
 * funciona igual en Vercel/serverless que en Docker/Turbopack.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { letterGrade, desempeñoLabel } from "@/lib/letter-grade";

// Paleta institucional (misma que la web): azul #1E2A5E, dorado #F4C15C.
const AZUL: [number, number, number] = [30, 42, 94];
const DORADO: [number, number, number] = [244, 193, 92];

export type BoletínGrade = {
  bimester: number;
  course: string;
  note: number;
  letter_grade: string | null;
};

export type BoletínAttendance = {
  pct: number;
  absent: number;
  tardanzas: number;
};

const INSTITUTION = "COLEGIO JOHN F. KENNEDY";
const INSTITUTION_SUB = "Chincha — Año Lectivo";

/** Cabecera institucional compartida por boletín y constancia. */
function drawHeader(doc: jsPDF, title: string, subtitle: string, pageWidth: number) {
  // Banda azul superior
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, pageWidth, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(INSTITUTION, pageWidth / 2, 38, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(INSTITUTION_SUB, pageWidth / 2, 56, { align: "center" });

  // Subrayado dorado
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

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
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

/**
 * Boletin de notas de un bimestre.
 */
export function generateBoletínPDF(opts: {
  student: { name: string; grade: string; section: string };
  year: number;
  bimester: number;
  grades: BoletínGrade[];
  attendance: BoletínAttendance;
}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, `BOLETÍN DE NOTAS — BIMESTRE ${opts.bimester}`, `${opts.year}`, pageWidth);

  // Datos del alumno
  const studentLabel = `${opts.student.name}  ·  ${opts.student.grade} "${opts.student.section}"`;
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Alumno:", 40, 142);
  doc.setFont("helvetica", "normal");
  doc.text(studentLabel, 90, 142);

  // Notas del bimestre
  const rows = opts.grades
    .filter((g) => g.bimester === opts.bimester)
    .map((g) => {
      const letter = g.letter_grade ?? letterGrade(g.note);
      return [
        g.course,
        g.note.toFixed(1),
        letter ?? "—",
        desempeñoLabel(g.note),
      ];
    });

  autoTable(doc, {
    startY: 160,
    margin: { left: 40, right: 40 },
    head: [["Curso", "Nota", "Letra", "Desempeño"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 240 },
      1: { cellWidth: 70, halign: "center" },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 160, halign: "left" },
    },
  });

  // Promedio y asistencia
  const notes = rows.map((r) => r[1]).map(Number).filter((n) => !Number.isNaN(n));
  const average = notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : 0;
  const finalLetter = letterGrade(average);

  const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 300;

  doc.setFillColor(...AZUL);
  doc.roundedRect(40, endY + 24, pageWidth - 80, 58, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROMEDIO", 60, endY + 48);
  doc.setTextColor(...DORADO);
  doc.setFontSize(20);
  doc.text(average.toFixed(1), 60, endY + 70);
  if (finalLetter) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(`Nivel: ${finalLetter}`, 120, endY + 62);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Asistencia: ${opts.attendance.pct}%   ·   Inasistencias: ${opts.attendance.absent}   ·   Tardanzas: ${opts.attendance.tardanzas}`,
    pageWidth - 60,
    endY + 62,
    { align: "right" },
  );

  drawFooter(doc, pageWidth, pageHeight);
  return doc;
}

/**
 * Constancia de matrícula.
 */
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

  // Cuerpo
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const intro =
    "La Dirección del Colegio John F. Kennedy de Chincha deja constancia de que el(la) " +
    "alumno(a) se encuentra debidamente matriculado(a) en la presente institución " +
    "educativa, conforme al siguiente detalle:";
  const introLines = doc.splitTextToSize(intro, pageWidth - 100);
  doc.text(introLines, 50, 160);

  // Tabla de datos
  const docsPct = opts.docsTotal
    ? Math.round((opts.docsSubmitted / opts.docsTotal) * 100)
    : 0;
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

  const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 360;

  // Firma
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

/**
 * Abre el PDF en una pestaña nueva con diálogo de impresión (autoPrint).
 */
export function printReport(doc: jsPDF): void {
  doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url.toString(), "_blank");
}

/** Convierte los registros de asistencia del padre en el resumen del boletín. */
export function attendanceSummary(records: { status: string }[]): BoletínAttendance {
  const total = records.length;
  if (!total) return { pct: 0, absent: 0, tardanzas: 0 };
  const F = records.filter((r) => r.status === "F").length;
  const T = records.filter((r) => r.status === "T").length;
  const J = records.filter((r) => r.status === "J").length;
  // Inasistencias = faltas sin justificar + justificadas; tardanzas aparte.
  const absent = F + J;
  const pct = Math.round(((total - absent - T) / total) * 100);
  return { pct, absent, tardanzas: T };
}

type BoletínOptions = {
  studentId: string;
  student: { name: string; grade: string; section: string };
  year: number;
  bimester: number;
  grades: BoletínGrade[];
};

/** Descarga los registros de asistencia del alumno (mismo guard que la página). */
async function loadAttendance(studentId: string): Promise<BoletínAttendance> {
  try {
    const r = await fetch(`/api/father/attendance?studentId=${studentId}`);
    const data = await r.json();
    if (data.ok && Array.isArray(data.records)) return attendanceSummary(data.records);
  } catch {
    // Sin registros de asistencia no bloqueamos el boletín; va en 0%.
  }
  return { pct: 0, absent: 0, tardanzas: 0 };
}

/**
 * Descarga el boletín de un bimestre como PDF. Conecta el botón inerte de
 * Notas y del Dashboard del padre.
 */
export async function downloadBoletín(opts: BoletínOptions): Promise<void> {
  const attendance = await loadAttendance(opts.studentId);
  const doc = generateBoletínPDF({ ...opts, attendance });
  const safeName = opts.student.name.replace(/[^a-zA-Z0-9áéíóúñÑ ]/g, "").split(" ").slice(0, 2).join("_");
  doc.save(`Boletin_${opts.bimester}Bim_${safeName}.pdf`);
}

/**
 * Abre el boletín en una pestaña nueva con el diálogo de impresión.
 */
export async function printBoletín(opts: BoletínOptions): Promise<void> {
  const attendance = await loadAttendance(opts.studentId);
  const doc = generateBoletínPDF({ ...opts, attendance });
  printReport(doc);
}

/**
 * Descarga la constancia de matrícula como PDF. Conecta el botón de Matrícula.
 */
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
