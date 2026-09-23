const XLSX = require('xlsx');

function normalize(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

function parseTanggal(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const mm = String(parsed.m).padStart(2, '0');
    const dd = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${mm}-${dd}`;
  }

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

function readWorkbook(fileBuffer) {
  return XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
}

//Find merge range
function findMergeRange(merges, row, col) {
  if (!merges) return null;
  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) return m;
  }
  return null;
}

// Get cell value from left (resolve merge) to get child value at the bottom
function getCellValue(ws, merges, row, col) {
  const range = findMergeRange(merges, row, col);
  const r = range ? range.s.r : row;
  const c = range ? range.s.c : col;
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}
// Parse sheet horizontal format (multiple row support)
// 5 level header (Area > Kategori Utama > Sub Kategori > Unit > Parameter)
function parseSheet(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan di file`);

  const merges = ws['!merges'] || [];
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Find all date column and header
  const tanggalBlocks = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && normalize(cell.v).toLowerCase() === 'tanggal') {
        const merge = findMergeRange(merges, r, c);
        tanggalBlocks.push({
          col: c,
          headerStartRow: merge ? merge.s.r : r,
          headerEndRow: merge ? merge.e.r : r,
        });
      }
    }
  }

  if (tanggalBlocks.length === 0) {
    throw new Error(`Kolom "Tanggal" tidak ditemukan di sheet "${sheetName}"`);
  }

  tanggalBlocks.sort((a, b) => a.col - b.col);

  const rows = [];
  const parseErrors = [];

  tanggalBlocks.forEach((block) => {
    const idx = tanggalBlocks.indexOf(block);
    const nextBlockCol = idx + 1 < tanggalBlocks.length ? tanggalBlocks[idx + 1].col : range.e.c + 1;
    const dataColStart = block.col + 1;
    const dataColEnd = nextBlockCol - 1;
    const { headerStartRow, headerEndRow } = block;
    const dataStartRow = headerEndRow + 1;
    const headerRowCount = headerEndRow - headerStartRow + 1;

    // Sanity check: must be 5 level header (Area, Kategori, Sub, Unit, Parameter)
    if (headerRowCount !== 5) {
      parseErrors.push({
        excelRow: headerStartRow + 1,
        reason: `Blok Tanggal di kolom ${XLSX.utils.encode_col(block.col)} punya ${headerRowCount} baris header, seharusnya 5 (Area/Kategori Utama/Sub Kategori/Unit/Parameter). Blok ini dilewati.`,
      });
      return;
    }

    // Create column path
    const columnPaths = {};
    for (let c = dataColStart; c <= dataColEnd; c++) {
      const levels = [];
      for (let r = headerStartRow; r <= headerEndRow; r++) {
        levels.push(normalize(getCellValue(ws, merges, r, c)));
      }
      columnPaths[c] = levels; // output: [area, kategoriUtama, subKategori, unit, parameter]
    }

    // Read data per each row after header
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const tanggalRaw = getCellValue(ws, merges, r, block.col);
      const tanggal = parseTanggal(tanggalRaw);
      if (!tanggal) continue; // no date skip

      for (let c = dataColStart; c <= dataColEnd; c++) {
        const rawVal = getCellValue(ws, merges, r, c);
        const nilaiText = normalize(rawVal);
        if (nilaiText === '') continue; // No cell value also skip

        const [area, kategoriUtama, subKategori, unit, parameter] = columnPaths[c];
        if (!area || !kategoriUtama || !subKategori || !unit || !parameter) {
          parseErrors.push({
            excelRow: r + 1,
            reason: `Kolom ${XLSX.utils.encode_col(c)} ada level header yang kosong (Area/Kategori/Sub/Unit/Parameter)`,
          });
          continue;
        }

        rows.push({ excelRow: r + 1, tanggal, area, kategoriUtama, subKategori, unit, parameter, nilai: nilaiText });
      }
    }
  });

  return { rows, parseErrors };
}

module.exports = { readWorkbook, parseSheet, normalize };