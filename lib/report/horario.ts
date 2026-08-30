import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawHeader, drawFooterOnAllPages, AZUL } from "./theme";
import { SCHOOL_YEAR } from "@/lib/school-year";

export type HorarioSlot = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

/** PDF horizontal del horario semanal. Solo datos que ya trajo el cliente. */
export function generateHorarioPDF(opts: {
  student: { name: string; grade: string; section: string };
  shift: string;
  periods: string[];
  recessLabel: string;
  schedule: Record<string, (HorarioSlot | null)[]>;
}): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const turno = opts.shift ? `Turno ${opts.shift}` : "";
  const subtitle = [
    opts.student.name,
    `${opts.student.grade} "${opts.student.section}"`,
    turno,
    String(SCHOOL_YEAR),
  ]
    .filter(Boolean)
    .join("  ·  ");
  drawHeader(doc, "HORARIO SEMANAL", subtitle, pageWidth);

  const head = [["Período", ...DAYS]];
  const body: string[][] = [];

  opts.periods.forEach((period, pi) => {
    if (pi === 3) {
      body.push([opts.recessLabel, "Recreo", "Recreo", "Recreo", "Recreo", "Recreo"]);
    }
    body.push([
      period,
      ...DAYS.map((day) => {
        const slot = opts.schedule[day]?.[pi];
        if (!slot) return "—";
        const room = slot.room ? `\n${slot.room}` : "";
        return `${slot.subject}\n${slot.teacher}${room}`;
      }),
    ]);
  });

  autoTable(doc, {
    startY: 136,
    margin: { left: 28, right: 28, bottom: 36 },
    theme: "grid",
    head,
    body,
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
      cellPadding: 6,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      valign: "middle",
      overflow: "linebreak",
      minCellHeight: 34,
    },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: "bold", halign: "center", textColor: AZUL },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const row = data.row.raw as string[] | undefined;
      if (row?.[1] === "Recreo") {
        data.cell.styles.fillColor = [255, 247, 237];
        data.cell.styles.textColor = [146, 64, 14];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.minCellHeight = 22;
      }
    },
  });

  drawFooterOnAllPages(doc, pageWidth, pageHeight);
  return doc;
}

export async function downloadHorario(opts: {
  student: { name: string; grade: string; section: string };
  shift: string;
  periods: string[];
  recessLabel: string;
  schedule: Record<string, (HorarioSlot | null)[]>;
}): Promise<void> {
  const doc = generateHorarioPDF(opts);
  const safe = opts.student.name.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+/g, "_").slice(0, 40);
  doc.save(`Horario_${safe}_${SCHOOL_YEAR}.pdf`);
}
