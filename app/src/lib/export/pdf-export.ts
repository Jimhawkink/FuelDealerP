import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/**
 * Exports tabular data to a PDF file and triggers a browser download.
 * @param title - Report title displayed at the top of the PDF
 * @param columns - Array of column header strings
 * @param rows - Array of row data (strings or numbers)
 */
export function exportToPdf(
  title: string,
  columns: string[],
  rows: (string | number)[][]
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  // Title
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(title, 14, 18)

  // Subtitle with date
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generated: ${new Date().toLocaleString("en-KE")}`, 14, 25)

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows.map(row => row.map(cell => String(cell))),
    startY: 30,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [245, 158, 11], // amber-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: 14, right: 14 },
  })

  // Filename: sanitize title
  const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(filename)
}
