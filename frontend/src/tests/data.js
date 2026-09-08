function u(nama) {
  return { id: nama.toLowerCase().replace(/\s+/g, '-'), nama };
}

const PARAM = {
  ph: { id: 'ph', nama: 'pH', satuan: '' },
  conductivity: { id: 'conductivity', nama: 'Conductivity', satuan: 'μS/cm' },
  silicaPpb: { id: 'silica', nama: 'Silica', satuan: 'ppb' },
  silicaPpm: { id: 'silica', nama: 'Silica', satuan: 'ppm' },
  dissolvedOxygen: { id: 'dissolved-oxygen', nama: 'Dissolved Oxygen', satuan: 'ppm' },
  hydrazine: { id: 'hydrazine', nama: 'Hydrazine', satuan: 'ppm' },
  phospate: { id: 'phospate', nama: 'Phospate', satuan: 'ppm' },
  chlorine: { id: 'chlorine', nama: 'Chlorine', satuan: 'ppm' },
  ammonia: { id: 'ammonia', nama: 'Ammonia', satuan: 'ppm' },
  carbonDioxide: { id: 'carbon-dioxide', nama: 'Carbon Dioxide', satuan: 'ppm' },
};

export const kategoriData = {
  // Area: Utility
  desalination: {
    label: 'Desalination',
    groups: [
      {
        subCategories: [
          {
            nama: 'Reverse Osmosis',
            slug: 'reverse-osmosis',
            units: [u('Ultrafiltrasi'), u('SWRO'), u('BWRO'), u('Raw Condensate Tank')],
            parameters: [PARAM.ph, PARAM.conductivity],
            kop: {
              ph: { min: 6.5, max: 8 },
              conductivity: { min: null, max: 30 },
            },
          },
        ],
      },
    ],
  },

  // Area: Utility — 4 Sub Kategori
  demineralization: {
    label: 'Demineralization',
    groups: [
      {
        subCategories: [
          {
            nama: 'Mixedbed A',
            slug: 'mixedbed-a',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.silicaPpb],
            kop: {
              ph: { min: 6.2, max: 6.5 },
              conductivity: { min: null, max: 1 },
              silica: { min: null, max: 20 },
            },
          },
          {
            nama: 'Mixedbed B',
            slug: 'mixedbed-b',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.silicaPpb],
            kop: {
              ph: { min: 6.2, max: 6.5 },
              conductivity: { min: null, max: 1 },
              silica: { min: null, max: 20 },
            },
          },
          {
            nama: 'Mixedbed C',
            slug: 'mixedbed-c',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.silicaPpb],
            kop: {
              ph: { min: 6.2, max: 6.5 },
              conductivity: { min: null, max: 1 },
              silica: { min: null, max: 20 },
            },
          },
          {
            nama: 'Demin Tank',
            slug: 'demin-tank',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.silicaPpb],
            kop: {
              ph: { min: 6.2, max: 6.5 },
              conductivity: { min: null, max: 1 },
              silica: { min: null, max: 20 },
            },
          },
        ],
      },
    ],
  },

  // Area: Boiler Batubara — 2 Sub Kategori
  'boiler-feed-water': {
    label: 'Boiler Feed Water',
    groups: [
      {
        subCategories: [
          {
            nama: 'BFW BB 1',
            slug: 'bfw-bb-1',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.dissolvedOxygen, PARAM.silicaPpm, PARAM.hydrazine],
            kop: {
              ph: { min: 8.5, max: 9.5 },
              conductivity: { min: null, max: 20 },
              'dissolved-oxygen': { min: null, max: 0.007 },
              silica: { min: null, max: 0.02 },
              hydrazine: { min: null, max: 0.5 },
            },
          },
          {
            nama: 'BFW BB 2',
            slug: 'bfw-bb-2',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.dissolvedOxygen, PARAM.silicaPpm, PARAM.hydrazine],
            kop: {
              ph: { min: 8.5, max: 9.5 },
              conductivity: { min: null, max: 20 },
              'dissolved-oxygen': { min: null, max: 0.007 },
              silica: { min: null, max: 0.02 },
              hydrazine: { min: null, max: 0.5 },
            },
          },
        ],
      },
    ],
  },

  // Area: Boiler Batubara — 2 Sub Kategori Independen (masing-masing punya Unit asli)
  'boiler-water': {
    label: 'Boiler Water',
    groups: [
      {
        subCategories: [
          {
            nama: 'BW BB 1',
            slug: 'bw-bb-1',
            units: [u('BW Steam Timur BB 1'), u('BW Steam Barat BB 1')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.phospate, PARAM.silicaPpm, PARAM.chlorine],
            kop: {
              ph: { min: 9, max: 10 },
              conductivity: { min: null, max: 50 },
              phospate: { min: null, max: 12 },
              silica: { min: null, max: 2 },
              chlorine: { min: null, max: 0.7 },
            },
          },
        ],
      },
      {
        subCategories: [
          {
            nama: 'BW BB 2',
            slug: 'bw-bb-2',
            units: [u('BW Steam Timur BB 2'), u('BW Steam Barat BB 2')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.phospate, PARAM.silicaPpm, PARAM.chlorine],
            kop: {
              ph: { min: 9, max: 10 },
              conductivity: { min: null, max: 50 },
              phospate: { min: null, max: 12 },
              silica: { min: null, max: 2 },
              chlorine: { min: null, max: 0.7 },
            },
          },
        ],
      },
    ],
  },

  // Area: Boiler Batubara — 2 Sub Kategori
  steam: {
    label: 'Steam',
    groups: [
      {
        subCategories: [
          {
            nama: 'Steam Product BB 1',
            slug: 'steam-product-bb-1',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.ammonia, PARAM.carbonDioxide, PARAM.silicaPpm, PARAM.chlorine],
            kop: {
              ph: { min: 9, max: 9.8 },
              conductivity: { min: null, max: 18 },
              ammonia: { min: null, max: 2 },
              'carbon-dioxide': { min: null, max: 1 },
              silica: { min: null, max: 0.1 },
              chlorine: { min: null, max: 0.05, maxInclusive: false },
            },
          },
          {
            nama: 'Steam Product BB 2',
            slug: 'steam-product-bb-2',
            units: [u('-')],
            parameters: [PARAM.ph, PARAM.conductivity, PARAM.ammonia, PARAM.carbonDioxide, PARAM.silicaPpm, PARAM.chlorine],
            kop: {
              ph: { min: 9, max: 9.8 },
              conductivity: { min: null, max: 18 },
              ammonia: { min: null, max: 2 },
              'carbon-dioxide': { min: null, max: 1 },
              silica: { min: null, max: 0.1 },
              chlorine: { min: null, max: 0.05, maxInclusive: false },
            },
          },
        ],
      },
    ],
  },
};

// Generate Data Aktual (dummy seed)
function formatDateLabel(date) {
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${bulan[date.getMonth()]}`;
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function hashKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000;
  return h || 1;
}

function generateReadings(key, kopEntry, days = 90) {
  const maxValue = kopEntry?.max ?? (kopEntry?.min ? kopEntry.min * 1.5 : 10);
  const rand = seededRandom(hashKey(key));
  const today = new Date('2026-09-04');

  const readings = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const wave = Math.sin(i / 3) * (maxValue * 0.35) + maxValue * 0.45;
    const noise = (rand() - 0.5) * maxValue * 0.15;
    const spike = i === 1 ? maxValue * 0.1 : 0;
    const nilai = Math.max(0, +(wave + noise + spike).toFixed(4));

    readings.push({ tanggal: date.toISOString().slice(0, 10), label: formatDateLabel(date), nilai });
  }
  return readings;
}

// Cari Sub Kategori di seluruh group dalam satu kategori
function findSubCategory(kategoriSlug, subSlug) {
  const groups = kategoriData[kategoriSlug]?.groups || [];
  for (const group of groups) {
    const found = group.subCategories.find((s) => s.slug === subSlug);
    if (found) return found;
  }
  return null;
}

// Cache: Cegah data sama di generate ulang tiap render
const readingsCache = new Map();

function getReadingKey(kategoriSlug, subSlug, unitId, parameterId) {
  return `${kategoriSlug}|${subSlug}|${unitId}|${parameterId}`;
}

function getAllReadings(kategoriSlug, subSlug, unitId, parameterId) {
  const key = getReadingKey(kategoriSlug, subSlug, unitId, parameterId);
  if (!readingsCache.has(key)) {
    const sub = findSubCategory(kategoriSlug, subSlug);
    const kop = sub?.kop?.[parameterId];
    readingsCache.set(key, generateReadings(key, kop, 90));
  }
  return readingsCache.get(key);
}

// Cut sesuai rentang tanggal yang dipilih
export function getReadingsInRange(kategoriSlug, subSlug, unitId, parameterId, rangeDays) {
  const all = getAllReadings(kategoriSlug, subSlug, unitId, parameterId);
  return all.slice(-rangeDays);
}

// Format tampilan KOP
export function formatKop(kop, satuan) {
  if (!kop) return '-';
  const unitStr = satuan ? ` ${satuan}` : '';
  const maxSign = kop.maxInclusive === false ? '<' : '\u2264';
  const minSign = kop.minInclusive === false ? '>' : '\u2265';

  if (kop.min != null && kop.max != null) return `${kop.min} - ${kop.max}${unitStr}`;
  if (kop.max != null) return `${maxSign} ${kop.max}${unitStr}`;
  if (kop.min != null) return `${minSign} ${kop.min}${unitStr}`;
  return '-';
}

// Status
export function computeStatus(nilai, kop) {
  if (!kop) return 'no_kop';
  if (nilai == null) return 'no_kop';

  const { min, max, minInclusive = true, maxInclusive = true } = kop;

  if (min != null) {
    const belowMin = minInclusive ? nilai < min : nilai <= min;
    if (belowMin) return 'out_of_range';
  }
  if (max != null) {
    const aboveMax = maxInclusive ? nilai > max : nilai >= max;
    if (aboveMax) return 'out_of_range';
  }
  return 'normal';
}

// Get Data By Range Period
export function getReadingsInDateRange(kategoriSlug, subSlug, unitId, parameterId, startDate, endDate) {
  const all = getAllReadings(kategoriSlug, subSlug, unitId, parameterId);
  return all.filter((r) => r.tanggal >= startDate && r.tanggal <= endDate);
}