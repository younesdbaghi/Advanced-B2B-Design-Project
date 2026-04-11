import * as XLSX from "xlsx";

export const exportBeautifulExcel = ({
  title,
  headers,
  rows,
  filenamePrefix = "export",
  sheetName = "Données",
}) => {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const dataRows = safeRows.length ? safeRows : [new Array(safeHeaders.length).fill("")];
  const now = new Date();
  const generatedAt = now.toLocaleString("fr-FR");

  const aoa = [
    [title || "Export"],
    [`Export généré le: ${generatedAt}`],
    [],
    safeHeaders,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, safeHeaders.length - 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, safeHeaders.length - 1) } },
  ];

  ws["!cols"] = safeHeaders.map((h, colIdx) => {
    const headerLen = String(h || "").length;
    let maxLen = headerLen;
    for (let i = 0; i < dataRows.length; i += 1) {
      const v = dataRows[i]?.[colIdx];
      const lineMax = String(v ?? "")
        .split("\n")
        .reduce((m, line) => Math.max(m, line.length), 0);
      maxLen = Math.max(maxLen, lineMax);
    }
    return { wch: Math.min(50, Math.max(12, maxLen + 2)) };
  });

  ws["!rows"] = [{ hpt: 24 }, { hpt: 20 }, { hpt: 8 }];
  if (safeHeaders.length > 0) {
    ws["!autofilter"] = {
      ref: `A4:${String.fromCharCode(64 + Math.min(26, safeHeaders.length))}${Math.max(4, aoa.length)}`,
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const stamp = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}-${stamp}.xlsx`);
};

