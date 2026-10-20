import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import logoPath from "../assets/logo-sandya.png"

export async function exportSuratToXLSX(
  filename: string,
  data: any[],
  fields: string[],
  labels: string[],
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(filename)

  const totalCols = fields.length

  // Row 1: Logo + Inalite
  await addLogoAndTitle(workbook, sheet, totalCols, "Inalite")

  // Row 2: Headers
  const headerRow = sheet.getRow(2)
  headerRow.height = 25
  labels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    cell.alignment = { vertical: "middle", horizontal: "center" }
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    }
  })

  // Row 3+: Data
  data.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(rowIdx + 3)
    fields.forEach((f, colIdx) => {
      let v = row[f]
      if (v && (v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v))))) {
        const d = new Date(v)
        v = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      }
      const cell = excelRow.getCell(colIdx + 1)
      cell.value = v != null ? String(v) : ""
      cell.font = { size: 10 }
      cell.alignment = { vertical: "middle" }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }
      // Zebra stripe
      if (rowIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      }
    })
  })

  // Auto-width columns
  for (let col = 1; col <= totalCols; col++) {
    const maxLen = Math.max(
      labels[col - 1]?.length || 10,
      ...data.map((r) => String(r[fields[col - 1]] ?? "").length),
    )
    sheet.getColumn(col).width = Math.min(maxLen + 4, 40)
  }

  // Generate & download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, `${filename}.xlsx`)
}

async function addLogoAndTitle(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, totalCols: number, title: string) {
  const logoRow = sheet.getRow(1)
  logoRow.height = 40

  try {
    const res = await fetch(logoPath)
    if (res.ok) {
      const blob = await res.blob()
      const buffer = await blob.arrayBuffer()
      const imageId = workbook.addImage({
        buffer: new Uint8Array(buffer) as any,
        extension: "png",
      })
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 55, height: 40 },
      })
    }
  } catch {}

  if (totalCols > 1) {
    sheet.mergeCells(1, 2, 1, totalCols)
  }
  const titleCell = logoRow.getCell(2)
  titleCell.value = title
  titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } }
  titleCell.alignment = { vertical: "middle", horizontal: "left" }
  logoRow.getCell(1).alignment = { vertical: "middle" }
}

export async function exportRekapToXLSX(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  totalRow?: (string | number)[]
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(filename)

  const totalCols = headers.length

  // Row 1: Logo + Inalite
  await addLogoAndTitle(workbook, sheet, totalCols, "Inalite")

  // Row 2: Headers
  const headerRow = sheet.getRow(2)
  headerRow.height = 25
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    cell.alignment = { vertical: "middle", horizontal: "center" }
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    }
  })

  // Row 3+: Data
  rows.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(rowIdx + 3)
    row.forEach((v, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1)
      cell.value = v != null ? String(v) : ""
      cell.font = { size: 10 }
      cell.alignment = { vertical: "middle" }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }
      if (rowIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      }
    })
  })

  // Total row
  if (totalRow) {
    const totalRowIdx = rows.length + 3
    const excelRow = sheet.getRow(totalRowIdx)
    totalRow.forEach((v, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1)
      cell.value = v != null ? String(v) : ""
      cell.font = { bold: true, size: 10 }
      cell.alignment = { vertical: "middle" }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      }
    })
  }

  // Auto-width
  for (let col = 1; col <= totalCols; col++) {
    const maxLen = Math.max(
      headers[col - 1]?.length || 10,
      ...rows.map((r) => String(r[col - 1] ?? "").length),
      totalRow ? String(totalRow[col - 1] ?? "").length : 0,
    )
    sheet.getColumn(col).width = Math.min(maxLen + 4, 40)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  saveAs(blob, `${filename}.xlsx`)
}
