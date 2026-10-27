const UNIT_ORDER = {
  'p5/desalination': [
    'UF Tank',
    'SWRO A',
    'SWRO B',
    'BWRO A',
    'BWRO B',
    'Raw Condensate Tank',
  ],
};

function getUnitOrder(plantKode, kategoriSlug) {
  return UNIT_ORDER[`${plantKode}/${kategoriSlug}`.toLowerCase()];
}

// Works for any array of objects with a `nama` field (or pass a custom getter)
function sortUnits(units, order, getName = (u) => u.nama) {
  if (!order) return units;
  const list = order.map((n) => n.toLowerCase());
  const rank = (u) => {
    const i = list.indexOf(String(getName(u)).trim().toLowerCase());
    return i === -1 ? list.length : i;
  };
  return units
    .map((u, i) => ({ u, i }))
    .sort((a, b) => rank(a.u) - rank(b.u) || a.i - b.i)
    .map((x) => x.u);
}

module.exports = { getUnitOrder, sortUnits };