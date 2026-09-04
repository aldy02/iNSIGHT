const XLSX = require('xlsx');

const REQUIRED_HEADERS = ['Tanggal', 'Area', 'Kategori Utama', 'Sub Kategori', 'Unit', 'Parameter', 'Nilai'];

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

// Read file Excel objek workbook (All Sheet)
function readWorkbook(fileBuffer) {
  return XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
}

// Parse 1 sheet tertentu dari workbook
function parseSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan di file`);
  }

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  let headerRowIndex = -1;
  let headerCols = [];
  for (let i = 0; i < raw.length; i++) {
    const rowNormalized = raw[i].map((c) => normalize(c));
    if (rowNormalized.includes('Tanggal') && rowNormalized.includes('Nilai')) {
      headerRowIndex = i;
      headerCols = rowNormalized;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(`Header kolom tidak ditemukan di sheet "${sheetName}"`);
  }

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headerCols.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Sheet "${sheetName}": kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}`);
  }

  const colIndex = {};
  REQUIRED_HEADERS.forEach((h) => { colIndex[h] = headerCols.indexOf(h); });

  const rows = [];
  const parseErrors = [];

  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const raw_row = raw[i];
    const isEmpty = raw_row.every((c) => normalize(c) === '');
    if (isEmpty) continue;

    const tanggal = parseTanggal(raw_row[colIndex['Tanggal']]);
    const area = normalize(raw_row[colIndex['Area']]);
    const kategoriUtama = normalize(raw_row[colIndex['Kategori Utama']]);
    const subKategori = normalize(raw_row[colIndex['Sub Kategori']]);
    const unit = normalize(raw_row[colIndex['Unit']]);
    const parameter = normalize(raw_row[colIndex['Parameter']]);
    const nilai = normalize(raw_row[colIndex['Nilai']]);

    const excelRowNumber = i + 1;

    if (!tanggal || !area || !kategoriUtama || !subKategori || !unit || !parameter || nilai === '') {
      parseErrors.push({ excelRow: excelRowNumber, reason: 'Ada kolom wajib yang kosong/format salah', data: raw_row });
      continue;
    }

    rows.push({ excelRow: excelRowNumber, tanggal, area, kategoriUtama, subKategori, unit, parameter, nilai });
  }

  return { rows, parseErrors };
}

module.exports = { readWorkbook, parseSheet, normalize };