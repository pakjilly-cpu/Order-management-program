import * as XLSX from 'xlsx';

interface ExcelColumn {
  key: string;
  label: string;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName?: string,
): void {
  const headers = columns.map(c => c.label);
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      return val;
    }),
  );

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = columns.map((col, i) => {
    const headerLen = col.label.length * 2;
    const maxDataLen = rows.reduce((max, row) => {
      const cellLen = String(row[i] ?? '').length;
      return Math.max(max, cellLen);
    }, 0);
    return { wch: Math.max(headerLen, maxDataLen, 8) + 2 };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const today = new Date().toISOString().split('T')[0];
  const name = fileName ?? `export-${today}.xlsx`;
  XLSX.writeFile(wb, name);
}
