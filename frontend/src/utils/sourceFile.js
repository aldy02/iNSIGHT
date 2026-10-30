// "Lingkungan (Ammonia)" => "lingkunganammonia" (lowercase without space or symbol)
export const compactName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

// Petunjuk nama file yang dibutuhkan sebuah sumber
// Instructions for the filename required by a file source
export function fileHintFor(nama) {
  const n = String(nama || '').trim();
  if (!n) return '';
  const m = n.match(/^lingkungan\s*\(?([^)]*)\)?$/i);
  if (m) {
    const area = m[1].trim();
    return area
      ? `Nama file harus memuat "Lingkungan" dan berakhiran " - ${area}"`
      : 'Nama file harus memuat "Lingkungan"';
  }
  return `Nama file harus berakhiran " - ${n}" dan tidak memuat "Lingkungan"`;
}

// When upload. Sumber "Lingkungan..." dan non-Lingkungan dibedakan server.
export function overlappingSources(nama, sources) {
  const c = compactName(nama);
  if (!c) return [];
  const isLing = c.startsWith('lingkungan');
  return sources.filter((s) => {
    const o = compactName(s.nama);
    return (
      o !== c &&
      o.startsWith('lingkungan') === isLing &&
      (o.includes(c) || c.includes(o))
    );
  });
}
