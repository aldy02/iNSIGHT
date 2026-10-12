const XLSX = require('xlsx');

function normalize(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isValidDate(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// Selalu mengembalikan string 'YYYY-MM-DD' atau null
function parseTanggal(value) {
  if (value === null || value === undefined || value === '') return null;

  // Angka serial Excel
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
  }

  // Objek Date (jika cellDates: true)
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  // Teks: buang spasi dan tanda kutip/apostrof di awal-akhir
  const str = String(value).trim().replace(/^['"‘’“”]+|['"‘’“”]+$/g, '');

  // Format ISO: 2026-04-16 (juga 2026/04/16 atau 2026-04-16T00:00:00)
  let match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
    return isValidDate(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }

  // Format lama: dd/mm/yyyy atau dd-mm-yyyy
  match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const d = Number(match[1]), m = Number(match[2]), y = Number(match[3]);
    return isValidDate(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }

  return null;
}

function readWorkbook(fileBuffer) {
  return XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
}

// Cari range merge yang memuat sel (row, col)
function findMergeRange(merges, row, col) {
  if (!merges) return null;
  for (const m of merges) {
    if (row >= m.s.r && row <= m.e.r && col >= m.s.c && col <= m.e.c) return m;
  }
  return null;
}

// Ambil nilai sel; jika sel bagian dari merge, ambil dari sel kiri-atas merge
function getCellValue(ws, merges, row, col) {
  const range = findMergeRange(merges, row, col);
  const r = range ? range.s.r : row;
  const c = range ? range.s.c : col;
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}

// Parse sheet format horizontal (banyak blok Tanggal)
// Header 5 level: Area > Kategori Utama > Sub Kategori > Unit > Parameter
function parseSheet(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" tidak ditemukan di file`);

  const merges = ws['!merges'] || [];
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Cari semua kolom "Tanggal" beserta baris headernya
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

  tanggalBlocks.forEach((block, idx) => {
    const nextBlockCol = idx + 1 < tanggalBlocks.length ? tanggalBlocks[idx + 1].col : range.e.c + 1;
    const dataColStart = block.col + 1;
    const dataColEnd = nextBlockCol - 1;
    const { headerStartRow, headerEndRow } = block;
    const dataStartRow = headerEndRow + 1;
    const headerRowCount = headerEndRow - headerStartRow + 1;

    // Harus 5 level header
    if (headerRowCount !== 5) {
      parseErrors.push({
        excelRow: headerStartRow + 1,
        reason: `Blok Tanggal di kolom ${XLSX.utils.encode_col(block.col)} punya ${headerRowCount} baris header, seharusnya 5 (Area/Kategori Utama/Sub Kategori/Unit/Parameter). Blok ini dilewati.`,
      });
      return;
    }

    // Susun path header per kolom
    const columnPaths = {};
    for (let c = dataColStart; c <= dataColEnd; c++) {
      const levels = [];
      for (let r = headerStartRow; r <= headerEndRow; r++) {
        levels.push(normalize(getCellValue(ws, merges, r, c)));
      }
      columnPaths[c] = levels; // [area, kategoriUtama, subKategori, unit, parameter]
    }

    // Baca data tiap baris setelah header
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const tanggalRaw = getCellValue(ws, merges, r, block.col);
      const tanggal = parseTanggal(tanggalRaw);

      if (!tanggal) {
        // Sel kosong dilewati diam-diam, tanggal salah format dilaporkan
        if (tanggalRaw !== undefined && String(tanggalRaw).trim() !== '') {
          parseErrors.push({
            excelRow: r + 1,
            reason: `Format tanggal tidak dikenali: "${tanggalRaw}"`,
          });
        }
        continue;
      }

      for (let c = dataColStart; c <= dataColEnd; c++) {
        const rawVal = getCellValue(ws, merges, r, c);
        const nilaiText = normalize(rawVal);
        if (nilaiText === '') continue; // sel kosong dilewati

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

module.exports = { readWorkbook, parseSheet, normalize, parseTanggal };