import ExcelJS from "exceljs"

/**
 * Exports tabular data to an Excel (.xlsx) file and triggers a browser download.
 * @param filename - Output filename (without extension)
 * @param sheetName - Name of the worksheet
 * @param columns - Array of column header strings
 * @param rows - Array of row data (strings or numbers)
 */
export async function exportToExcel(
  filename: string,
  sheetName: string,
  columns: string[],
  rows: (string | number)[][]
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Alpha Fuel Manager"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)

  // Header row with amber styling
  sheet.addRow(columns)
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF59E0B" }, // amber-500
  }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.height = 20

  // Data rows
  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(row)
    if (index % 2 === 1) {
      dataRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" }, // slate-50
      }
    }
  })

  // Auto-fit columns
  sheet.columns.forEach(col => {
    let maxLength = 10
    col.eachCell?.({ includeEmpty: true }, cell => {
      const cellLength = cell.value ? String(cell.value).length : 0
      if (cellLength > maxLength) maxLength = cellLength
    })
    col.width = Math.min(maxLength + 4, 40)
  })

  // Add borders to all cells
  const lastRow = sheet.rowCount
  const lastCol = columns.length
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = sheet.getCell(r, c)
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
