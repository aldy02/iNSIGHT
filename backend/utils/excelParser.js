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

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
  }

  // Jika cellDates: true)
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  // Buang spasi dan tanda kutip di awal-akhir
  const str = String(value).trim().replace(/^['"‘’“”]+|['"‘’“”]+$/g, '');

  // Format baru: 2026-04-16 atau 2026/04/16 atau 2026-04-16T00:00:00
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

// Ambil nilai sel; kalau sel bagian dari merge, ambil dari sel kiri-atas merge
function getCellValue(ws, merges, row, col) {
  const range = findMergeRange(merges, row, col);
  const r = range ? range.s.r : row;
  const c = range ? range.s.c : col;
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}

// Kumpulkan semua teks header (baris 1 .. data_start_row-1) untuk satu kolom
function collectHeaderTexts(ws, merges, colIdx, dataStartIdx) {
  const texts = [];
  for (let r = 0; r < dataStartIdx; r++) {
    const t = normalize(getCellValue(ws, merges, r, colIdx));
    if (t !== '' && !texts.includes(t)) texts.push(t);
  }
  return texts;
}

function getUsedRange(ws) {
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  for (const key of Object.keys(ws)) {
    if (key[0] === '!') continue;
    const { r, c } = XLSX.utils.decode_cell(key);
    if (r < minR) minR = r;
    if (c < minC) minC = c;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return maxR < 0 ? null : { s: { r: minR, c: minC }, e: { r: maxR, c: maxC } };
}

/**
 * @param workbook  hasil readWorkbook()
 * @param source    DataSource (sheet_name, date_column, data_start_row)
 * @param columns   array SourceColumn (column_letter, unit_id, parameter_id, header_hint)
 */

function parseSourceSheet(workbook, source, columns) {
  // Pilih sheet: nama tetap kalau diisi, kalau NULL pakai sheet pertama
  let sheetName;
  if (source.sheet_name) {
    sheetName = workbook.SheetNames.find(
      (n) => normalize(n).toLowerCase() === normalize(source.sheet_name).toLowerCase()
    );
    if (!sheetName) {
      const err = new Error(`Sheet "${source.sheet_name}" tidak ditemukan di file`);
      err.sheetTersedia = workbook.SheetNames;
      throw err;
    }
  } else {
    sheetName = workbook.SheetNames[0];
  }

  const ws = workbook.Sheets[sheetName];
  const range = ws ? getUsedRange(ws) : null;
  if (!range) throw new Error(`Sheet "${sheetName}" kosong`);

  const merges = ws['!merges'] || [];
  const dataStartIdx = source.data_start_row - 1;
  const dateColIdx = XLSX.utils.decode_col(source.date_column);

  const parseErrors = [];
  const skippedColumns = [];
  const activeColumns = [];

  for (const col of columns) {
    const colIdx = XLSX.utils.decode_col(col.column_letter);
    if (col.header_hint) {
      const headers = collectHeaderTexts(ws, merges, colIdx, dataStartIdx);
      // header_hint boleh berisi beberapa kata kunci dipisah "|", semuanya harus ditemukan,
      const tokens = String(col.header_hint)
        .split('|')
        .map((t) => normalize(t).toLowerCase())
        .filter(Boolean);
      const match = tokens.every((tok) => headers.some((h) => h.toLowerCase().includes(tok)));
      if (!match) {
        skippedColumns.push({
          column: col.column_letter,
          expected: col.header_hint,
          found: headers,
          reason: `Header kolom ${col.column_letter} tidak cocok dengan "${col.header_hint}". Kolom dilewati (salah file atau kolom bergeser).`,
        });
        continue;
      }
    }
    activeColumns.push({ ...col.toJSON?.() ?? col, colIdx });
  }

  const mappedIdx = new Set(columns.map((c) => XLSX.utils.decode_col(c.column_letter)));
  const unmapped = new Set();
  const rows = [];
  let errorCells = 0;

  for (let r = dataStartIdx; r <= range.e.r; r++) {
    const dateCell = ws[XLSX.utils.encode_cell({ r, c: dateColIdx })];
    const tanggal = dateCell ? parseTanggal(dateCell.v) : null;

    // Skip baris tanpa tanggal valid
    if (!tanggal) continue;

    for (const col of activeColumns) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: col.colIdx })];

      if (cell && cell.t === 'e') {
        errorCells++; // #N/A, #REF!, #DIV/0!, ...
        continue;
      }

      // Sel tidak ada atau isinya kosong diubah jadi 0
      let nilai = cell ? normalize(cell.v) : '';
      if (nilai === '') nilai = '0';

      rows.push({
        excelRow: r + 1,
        tanggal,
        unitId: col.unit_id,
        parameterId: col.parameter_id,
        nilai,
        column: col.column_letter,
      });
    }

    // Deteksi kolom berisi data yang belum dipetakan
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === dateColIdx || mappedIdx.has(c) || unmapped.has(c)) continue;
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t !== 'e' && normalize(cell.v) !== '') unmapped.add(c);
    }
  }

  const unmappedColumns = [...unmapped]
    .sort((a, b) => a - b)
    .map((c) => XLSX.utils.encode_col(c));

  return { sheetName, rows, parseErrors, skippedColumns, unmappedColumns, errorCells };
}

module.exports = { readWorkbook, parseSourceSheet, collectHeaderTexts, getUsedRange, normalize, parseTanggal };