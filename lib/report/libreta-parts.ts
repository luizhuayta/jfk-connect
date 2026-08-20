import { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import type { LibretaData, BimesterKey } from "@/lib/grades/libreta";
import { LEVEL_RGB, type Level } from "@/lib/grades/scale";
import { AZUL, lastAutoTableY } from "./theme";

const BIMESTER_COLS = [1, 2, 3, 4] as const;

/** Caja con los datos del estudiante, arriba de la tabla principal. */
export function drawStudentBox(doc: jsPDF, data: LibretaData, pageWidth: number, startY: number): number {
  const s = data.student;
  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    theme: "plain",
    body: [
      ["Estudiante", s.name, "DNI", s.dni],
      ["Grado y sección", `${s.grade} "${s.section}"`, "Turno", s.shift],
      ["Código de matrícula", s.code ?? "—", "Tutor(a)", s.tutor ?? "Por asignar"],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: AZUL, cellWidth: 110 },
      1: { cellWidth: 180 },
      2: { fontStyle: "bold", textColor: AZUL, cellWidth: 110 },
      3: { cellWidth: "auto" },
    },
  });
  return lastAutoTableY(doc, startY + 60);
}

/**
 * Tabla de un bloque de áreas (normal o transversal): fila de área en
 * colSpan sobre fondo gris + una fila por competencia con las 4 letras de
 * bimestre coloreadas y la conclusión. `didParseCell` pinta el color de la
 * letra usando LEVEL_RGB — misma fuente que la pantalla (lib/grades/scale).
 */
export function drawAreasTable(
  doc: jsPDF,
  areas: LibretaData["areas"],
  pageWidth: number,
  startY: number,
): number {
  const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];
  // Índice de fila → { bimesterCol → level } para que didParseCell sepa qué color usar.
  const levelByRow = new Map<number, Partial<Record<number, Level | null>>>();

  for (const area of areas) {
    body.push([
      { content: area.name, colSpan: 6, styles: { fillColor: [235, 238, 245], fontStyle: "bold", textColor: AZUL } },
    ]);
    for (const c of area.competencies) {
      const rowIndex = body.length;
      const levels: Partial<Record<number, Level | null>> = {};
      BIMESTER_COLS.forEach((b, i) => {
        levels[i + 1] = c.bimesters[b as BimesterKey].level;
      });
      levelByRow.set(rowIndex, levels);
      const conclusion = BIMESTER_COLS.map((b) => c.bimesters[b as BimesterKey].conclusion)
        .filter(Boolean)
        .join(" · ");
      body.push([
        c.name,
        c.bimesters[1].level ?? "",
        c.bimesters[2].level ?? "",
        c.bimesters[3].level ?? "",
        c.bimesters[4].level ?? "",
        conclusion,
      ]);
    }
  }

  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    head: [["ÁREAS CURRICULARES Y COMPETENCIAS", "I", "II", "III", "IV", "CONCLUSIÓN DESCRIPTIVA"]],
    body,
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 8, halign: "center" },
    styles: { fontSize: 7, cellPadding: 2.5, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      5: { cellWidth: "auto" },
    },
    rowPageBreak: "avoid",
    didParseCell: (hook: CellHookData) => {
      if (hook.section !== "body") return;
      const col = hook.column.index;
      if (col < 1 || col > 4) return;
      const levels = levelByRow.get(hook.row.index);
      const level = levels?.[col];
      if (level && LEVEL_RGB[level]) hook.cell.styles.textColor = LEVEL_RGB[level];
    },
  });

  return lastAutoTableY(doc, startY + 40);
}

/** Cuadro de inasistencias/tardanzas por bimestre + total. */
export function drawAttendanceTable(doc: jsPDF, data: LibretaData, startY: number): number {
  const b = data.attendance;
  const totalInasistencias = b[1].inasistencias + b[2].inasistencias + b[3].inasistencias + b[4].inasistencias;
  const totalTardanzas = b[1].tardanzas + b[2].tardanzas + b[3].tardanzas + b[4].tardanzas;

  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    head: [["Asistencia", "I", "II", "III", "IV", "TOTAL"]],
    body: [
      ["Inasistencias", b[1].inasistencias, b[2].inasistencias, b[3].inasistencias, b[4].inasistencias, totalInasistencias],
      ["Tardanzas", b[1].tardanzas, b[2].tardanzas, b[3].tardanzas, b[4].tardanzas, totalTardanzas],
    ],
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 8, halign: "center" },
    styles: { fontSize: 8, cellPadding: 4, halign: "center" },
    columnStyles: { 0: { fontStyle: "bold", halign: "left", cellWidth: 120 } },
  });

  return lastAutoTableY(doc, startY + 40);
}

/** Leyenda de la escala AD/A/B/C, generada desde lib/grades/scale (no escrita a mano). */
export function drawLegend(doc: jsPDF, data: LibretaData, startY: number): number {
  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    head: [["Nivel", "Rango", "Significado"]],
    body: data.legend.map((l) => [l.level, l.range, l.label]),
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 }, 1: { cellWidth: 70 } },
    didParseCell: (hook: CellHookData) => {
      if (hook.section === "body" && hook.column.index === 0) {
        const level = hook.cell.raw as Level;
        if (LEVEL_RGB[level]) hook.cell.styles.textColor = LEVEL_RGB[level];
      }
    },
  });
  return lastAutoTableY(doc, startY + 60);
}

/** Caja de observaciones + las 3 firmas (Dirección, Tutor(a), Apoderado). */
export function drawSignatures(doc: jsPDF, data: LibretaData, pageWidth: number, startY: number): void {
  doc.setDrawColor(200, 200, 200);
  doc.rect(40, startY, pageWidth - 80, 60);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Observaciones", 46, startY + 12);

  const signY = startY + 110;
  const signWidth = (pageWidth - 80) / 3;
  const labels = ["Dirección", "Tutor(a) de aula", "Padre / Madre / Apoderado"];
  labels.forEach((label, i) => {
    const cx = 40 + signWidth * i + signWidth / 2;
    doc.setDrawColor(80, 80, 80);
    doc.line(cx - 70, signY, cx + 70, signY);
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.text(label, cx, signY + 12, { align: "center" });
  });
}
