import { useCallback } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface ExportColumn<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
}

export function useExport() {
  const exportToExcel = useCallback(<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string,
    sheetName = 'Sheet1'
  ) => {
    const processed = data.map((row) => {
      const newRow: Record<string, unknown> = {}
      columns.forEach((col) => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]
        newRow[col.header] = value ?? ''
      })
      return newRow
    })

    const worksheet = XLSX.utils.json_to_sheet(processed)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(blob, `${filename}.xlsx`)
  }, [])

  return { exportToExcel }
}
