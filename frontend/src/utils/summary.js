// Helper summary jsx
export const SMOOTH_EASE = [0.22, 1, 0.36, 1];

export const keyOf = (unitId, paramId) => `${unitId}:${paramId}`;

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Format dd/mm/yyyy
export const fmtDmy = (str) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};

// dd/mm/yyyy -> YYYY-MM-DD
export function parseDmy(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${yyyy}-${mm}-${dd}`;
}
export const fmtNum = (n) => Number(n.toFixed(2)).toString();

export function formatKop(kop, satuan) {
  if (!kop) return '-';
  const u = satuan ? ` ${satuan}` : '';
  const maxSign = kop.maxInclusive === false ? '<' : '\u2264';
  const minSign = kop.minInclusive === false ? '>' : '\u2265';
  if (kop.min != null && kop.max != null) return `${kop.min} - ${kop.max}${u}`;
  if (kop.max != null) return `${maxSign} ${kop.max}${u}`;
  if (kop.min != null) return `${minSign} ${kop.min}${u}`;
  return '-';
}

// Daily data statistic
export function summarize(data) {
  const vals = data.map((d) => d.nilai).filter((v) => v != null);
  if (vals.length === 0) return null;
  return {
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    max: vals.reduce((a, b) => (b > a ? b : a), vals[0]),
    min: vals.reduce((a, b) => (b < a ? b : a), vals[0]),
    outCount: data.filter((d) => d.status === 'out_of_range').length,
  };
}

// Error message
export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

// Grouping item
export function groupItems(items, info) {
  const groups = [];
  items.forEach((it) => {
    if (!info[it.unitId]) return;
    const { sub, unit } = info[it.unitId];
    const real = sub.units.some((u) => u.nama !== '-');
    const gkey = real ? sub.id : '__flat__';
    let g = groups[groups.length - 1];
    if (!g || g.gkey !== gkey) {
      g = { id: `${gkey}-${groups.length}`, gkey, sub: real ? sub : null, items: [] };
      groups.push(g);
    }
    g.items.push({ ...it, unit, title: real ? unit.nama : sub.nama });
  });
  return groups;
}

// Arrange master structure to keep consistency
export function buildIndex(categories) {
  const catRank = {};
  const catById = {};
  const unitRank = {};
  const unitInfo = {};
  let u = 0;
  categories.forEach((cat, ci) => {
    catRank[cat.id] = ci;
    catById[cat.id] = cat;
    cat.subs.forEach((sub) =>
      sub.units.forEach((unit) => {
        unitRank[unit.id] = u;
        u += 1;
        unitInfo[unit.id] = { cat, sub, unit };
      })
    );
  });
  return { catRank, catById, unitRank, unitInfo };
}

// Build section from item
export function buildSectionsFromItems(items, index) {
  const byCat = new Map();

  items.forEach(({ unitId, parameterId }) => {
    const info = index.unitInfo[unitId];
    if (!info) return;
    const catId = info.cat.id;
    if (!byCat.has(catId)) byCat.set(catId, new Map());
    const units = byCat.get(catId);
    if (!units.has(info.unit.id)) units.set(info.unit.id, new Set());
    units.get(info.unit.id).add(String(parameterId));
  });

  return [...byCat.entries()]
    .map(([catId, units]) => ({
      catId,
      items: [...units.entries()]
        .map(([unitId, wanted]) => ({
          unitId,
          params: index.unitInfo[unitId].unit.parameters.map((p) => p.id).filter((id) => wanted.has(String(id))),
        }))
        .filter((i) => i.params.length > 0)
        .sort((a, b) => index.unitRank[a.unitId] - index.unitRank[b.unitId]),
    }))
    .filter((s) => s.items.length > 0)
    .sort((a, b) => index.catRank[a.catId] - index.catRank[b.catId]);
}

// Report + summary structur that will send
export function buildPayloadItems(sections, summaries) {
  return sections.flatMap((s) =>
    s.items.flatMap((i) =>
      i.params.map((pid) => ({
        unitId: i.unitId,
        parameterId: pid,
        summary: (summaries[keyOf(i.unitId, pid)] || '').trim(),
      }))
    )
  );
}