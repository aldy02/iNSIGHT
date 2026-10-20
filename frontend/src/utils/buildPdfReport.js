import { getReadings } from '../api/reports';
import { groupItems, summarize, formatKop, keyOf } from './summary';

const letter = (i) => String.fromCharCode(65 + i);

// Fix unicode character from μ (yunani) to µ (U+00B5) cause helvetica font cant read latin character
const fix = (s) => (typeof s === 'string' ? s.replace(/\u03bc/g, '\u00b5') : s);

// Make report data from state builder and daily data api
export async function buildPdfReport({ builder, plantName, periodLabel, startDate, endDate }) {
  const { sections, summaries, index } = builder;

  // Get all daily data all parameter
  const jobs = [];
  sections.forEach((sec) =>
    sec.items.forEach((item) =>
      item.params.forEach((pid) => {
        jobs.push(
          getReadings({ unitId: item.unitId, parameterId: pid, start: startDate, end: endDate }).then((data) => [
            keyOf(item.unitId, pid),
            data,
          ])
        );
      })
    )
  );
  const readings = Object.fromEntries(await Promise.all(jobs));

  // Arrange category => sub category => unit => Parameter
  const categories = sections.map((sec, ci) => {
    const cat = index.catById[sec.catId];
    const groups = groupItems(sec.items, index.unitInfo).map((g) => ({
      id: g.id,
      title: fix(g.sub?.nama ?? null),
      units: g.items.map((item, ui) => ({
        id: item.unitId,
        title: fix(`${ui + 1}. ${item.title}`),
        params: item.params
          .map((pid) => item.unit.parameters.find((p) => p.id === pid))
          .filter(Boolean)
          .map((p) => {
            const key = keyOf(item.unitId, p.id);
            const data = readings[key] ?? [];
            return {
              key,
              nama: fix(p.nama),
              satuan: fix(p.satuan),
              kop: p.kop,
              kopLabel: fix(formatKop(p.kop, p.satuan)),
              data,
              stats: summarize(data),
              summary: fix((summaries[key] || '').trim()),
            };
          }),
      })),
    }));
    return { id: sec.catId, title: fix(`${letter(ci)}. ${cat.nama}`), groups };
  });

  return { plantName: fix(plantName), periodLabel, categories };
}