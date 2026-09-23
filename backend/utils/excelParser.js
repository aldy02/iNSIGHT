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

// Cari merge range yang memuat cell (row, col). Null kalau cell itu tidak ter-merge.
function findMergeRange(merges, row, col) {
  if (!merges) return null;
  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) return m;
  }
  return null;
}

// Ambil nilai efektif 1 cell, resolve merge (ambil dari pojok kiri-atas range merge-nya).
// Ini kunci untuk "menurunkan" nilai Area/Kategori/Sub/Unit ke tiap kolom di bawah merge-nya.
function getCellValue(ws, merges, row, col) {
  const range = findMergeRange(merges, row, col);
  const r = range ? range.s.r : row;
  const c = range ? range.s.c : col;
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}

/**
 * Parse 1 sheet format horizontal (multi-blok, tiap blok punya kolom "Tanggal" sendiri).
 * Struktur header per blok SELALU 5 level: Area > Kategori Utama > Sub Kategori > Unit > Parameter.
 */
function parseSheet(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan di file`);

  const merges = ws['!merges'] || [];
  const range = XLSX.utils.decode_range(ws['!ref']);

  // 1. Cari semua kolom "Tanggal" beserta rentang baris header-nya (dari merge vertikal sel itu)
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

    // Sanity check: header block ini HARUS persis 5 level (Area, Kategori, Sub, Unit, Parameter)
    if (headerRowCount !== 5) {
      parseErrors.push({
        excelRow: headerStartRow + 1,
        reason: `Blok Tanggal di kolom ${XLSX.utils.encode_col(block.col)} punya ${headerRowCount} baris header, seharusnya 5 (Area/Kategori Utama/Sub Kategori/Unit/Parameter). Blok ini dilewati.`,
      });
      return; // skip seluruh blok ini, jangan sampai salah alamat data
    }

    // 2. Bangun "alamat lengkap" tiap kolom data di blok ini
    const columnPaths = {};
    for (let c = dataColStart; c <= dataColEnd; c++) {
      const levels = [];
      for (let r = headerStartRow; r <= headerEndRow; r++) {
        levels.push(normalize(getCellValue(ws, merges, r, c)));
      }
      columnPaths[c] = levels; // [area, kategoriUtama, subKategori, unit, parameter]
    }

    // 3. Baca baris data, mulai persis setelah header block ini berakhir
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const tanggalRaw = getCellValue(ws, merges, r, block.col);
      const tanggal = parseTanggal(tanggalRaw);
      if (!tanggal) continue; // blok ini tidak punya data di tanggal ini -> wajar, skip (bukan error)

      for (let c = dataColStart; c <= dataColEnd; c++) {
        const rawVal = getCellValue(ws, merges, r, c);
        const nilaiText = normalize(rawVal);
        if (nilaiText === '') continue; // sel kosong -> tidak ada titik data, skip

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