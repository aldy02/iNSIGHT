import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, Inbox, Loader2 } from 'lucide-react';
import { getCompareMeta, getCompareData } from '../api/compare';
import CompareFilters from '../components/perbandingan/CompareFilters';
import CompareChart from '../components/perbandingan/CompareChart';
import CompareTable from '../components/perbandingan/CompareTable';
import { summarize, ymd, errorMessage } from '../utils/summary';

// The first 6 color constant, the next will auto generate
const BASE_COLORS = ['#003399', '#F75807', '#027959', '#7C3AED', '#DB2777', '#0891B2'];
const colorAt = (i) =>
  i < BASE_COLORS.length ? BASE_COLORS[i] : `hsl(${Math.round((i * 137.508) % 360)} 65% 45%)`;

// Start date default. If user chose start date earlier then default, history will change automaticly
const DEFAULT_HISTORY_START = '2025-01-01';
// Bottom limit if backend not send mindate
const FALLBACK_MIN_DATE = '2000-01-01';
const MIN_ROWS = 1;

const sameKop = (a, b) =>
  a.min === b.min && a.max === b.max && a.minInclusive === b.minInclusive && a.maxInclusive === b.maxInclusive;

const sliceRange = (rows, start, end) => rows.filter((d) => d.tanggal >= start && d.tanggal <= end);

// Merge rows (date, label, key: nilai)
const mergeRows = (list, field) => {
  const byDate = new Map();
  list.forEach((c) => {
    c[field].forEach((d) => {
      if (!byDate.has(d.tanggal)) byDate.set(d.tanggal, { tanggal: d.tanggal, label: d.label });
      byDate.get(d.tanggal)[c.plant.kode] = d.nilai;
    });
  });
  return [...byDate.values()]
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))
    .map((row) => {
      list.forEach((c) => {
        if (!(c.plant.kode in row)) row[c.plant.kode] = null;
      });
      return row;
    });
};

// List unique parameter from all tree, with total unit that have same parameter
function buildParameters(plants) {
  const map = new Map();
  plants.forEach((p) =>
    p.categories.forEach((c) =>
      c.subs.forEach((s) =>
        s.units.forEach((u) =>
          u.parameters.forEach((prm) => {
            if (!map.has(prm.id)) map.set(prm.id, { id: prm.id, nama: prm.nama, unitCount: 0 });
            map.get(prm.id).unitCount += 1;
          })
        )
      )
    )
  );
  return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
}

// Only plant => main category => sub category => unit that has this parameter
const filterTree = (plants, paramId) =>
  plants
    .map((p) => ({
      ...p,
      categories: p.categories
        .map((c) => ({
          ...c,
          subs: c.subs
            .map((s) => ({ ...s, units: s.units.filter((u) => u.parameters.some((x) => x.id === paramId)) }))
            .filter((s) => s.units.length > 0),
        }))
        .filter((c) => c.subs.length > 0),
    }))
    .filter((p) => p.categories.length > 0);

let rowSeq = 0;
const newRowId = () => {
  rowSeq += 1;
  return rowSeq;
};

function fillRow(tree, row) {
  const plant = tree.find((p) => p.kode === row.plantKode) ?? tree[0];
  const cat = plant?.categories.find((c) => c.nama === row.main) ?? plant?.categories[0];
  const sub = cat?.subs.find((s) => s.nama === row.sub) ?? cat?.subs[0];
  const unit = sub?.units.find((u) => u.id === row.unitId) ?? sub?.units[0];
  return {
    id: row.id ?? newRowId(),
    plantKode: plant?.kode ?? '',
    main: cat?.nama ?? '',
    sub: sub?.nama ?? '',
    unitId: unit?.id ?? '',
  };
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4 text-[#003399]">
        {icon}
      </div>
      <p className="text-sm font-medium text-[#1B2559]">{title}</p>
      <p className="text-sm text-[#8292AA] mt-1">{text}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-14 text-[#8292AA]">
      <Loader2 size={24} className="animate-spin" />
    </div>
  );
}

export default function Perbandingan() {
  const { kode } = useParams(); // If page open with one plant, that plant will become main compare

  const [allPlants, setAllPlants] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState('');
  const [minDate, setMinDate] = useState(''); // Earliest date from db

  const [paramId, setParamId] = useState('');
  const [rows, setRows] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => ymd(new Date()));

  // Start of history that has been/is being loaded. It only moves backwards, so existing data is not discarded.
  const [historyStart, setHistoryStart] = useState(DEFAULT_HISTORY_START);

  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parameters = useMemo(() => buildParameters(allPlants), [allPlants]);
  const tree = useMemo(() => (paramId ? filterTree(allPlants, paramId) : []), [allPlants, paramId]);
  const param = parameters.find((p) => p.id === paramId);

  // Load filter selection once, select initial parameters, then create 1 initial row
  useEffect(() => {
    let alive = true;
    getCompareMeta()
      .then((m) => {
        if (!alive) return;
        setAllPlants(m.plants);
        setMinDate(m.minDate || '');
        const list = buildParameters(m.plants);
        const initial = list[0];
        if (!initial) return;

        const t = filterTree(m.plants, initial.id);
        const first = t.find((p) => p.kode === kode?.toUpperCase()) ?? t[0];
        setParamId(initial.id);
        setRows([fillRow(t, { plantKode: first.kode })]);
      })
      .catch((err) => alive && setMetaError(errorMessage(err, 'Gagal memuat pilihan filter.')))
      .finally(() => alive && setMetaLoading(false));
    return () => {
      alive = false;
    };
  }, [kode]);

  const rangeError = !!startDate && !!endDate && startDate > endDate;
  const hasPeriod = !!startDate && !!endDate && !rangeError;

  // The start date used to determine historical data requirements: it must not be earlier than the available data
  // (or a safe threshold if minDate is not yet known), ensuring that a typo in the year does not trigger a large data fetch.
  const wantStart = useMemo(() => {
    if (!startDate || startDate.length < 10) return '';
    const floor = minDate || FALLBACK_MIN_DATE;
    return startDate < floor ? floor : startDate;
  }, [startDate, minDate]);

  // Expand the history if the user selects a start date earlier than the one already loaded
  useEffect(() => {
    if (wantStart && wantStart < historyStart) setHistoryStart(wantStart);
  }, [wantStart, historyStart]);

  const pendingExpand = hasPeriod && !!wantStart && wantStart < historyStart;

  // Change parameter
  const changeParam = (id) => {
    const t = filterTree(allPlants, id);
    setParamId(id);
    setRows((prev) => [fillRow(t, { ...prev[0], id: undefined })]);
  };
  const changeRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? fillRow(tree, { ...r, ...patch }) : r)));

  // All unit that have selected parameter
  const allUnits = useMemo(
    () =>
      tree.flatMap((p) =>
        p.categories.flatMap((c) =>
          c.subs.flatMap((s) =>
            s.units.map((u) => ({ plantKode: p.kode, main: c.nama, sub: s.nama, unitId: u.id }))
          )
        )
      ),
    [tree]
  );

  // Add a comparator using an unused unit (no limit on the number, as long as units remain available)
  const addRow = () =>
    setRows((prev) => {
      const used = new Set(prev.map((r) => r.unitId));
      const free = allUnits.find((u) => !used.has(u.unitId));
      if (!free) return prev;
      return [...prev, { ...free, id: newRowId() }];
    });
  const canAdd = allUnits.some((u) => !rows.some((r) => r.unitId === u.unitId));

  const removeRow = (id) => setRows((prev) => (prev.length > MIN_ROWS ? prev.filter((r) => r.id !== id) : prev));

  // Unique comparators (identical units are drawn only once)
  const items = useMemo(() => {
    const seen = new Set();
    const list = [];
    rows.forEach((row, idx) => {
      if (!row.unitId || !paramId || seen.has(row.unitId)) return;
      seen.add(row.unitId);
      list.push({ key: `${row.unitId}_${paramId}`, unitId: row.unitId, paramId, color: colorAt(idx) });
    });
    return list;
  }, [rows, paramId]);
  const duplicateCount = rows.filter((r) => r.unitId).length - items.length;
  const itemsKey = items.map((i) => i.key).join(',');

  // Fetch data when the comparator changes or the history is extended backwards.
  useEffect(() => {
    if (items.length < 1) {
      setRaw([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError('');
    getCompareData({ items, startDate: historyStart, endDate: ymd(new Date()) })
      .then((d) => alive && setRaw(d))
      .catch((err) => {
        if (!alive) return;
        setRaw([]);
        setError(errorMessage(err, 'Gagal memuat data perbandingan.'));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [itemsKey, historyStart]);

  // One entry per comparator: full history, data within the filter range, and its statistics
  const compared = useMemo(() => {
    const byKey = new Map(raw.map((r) => [`${r.unitId}_${r.parameterId}`, r]));
    return items
      .map((it) => ({ it, r: byKey.get(it.key) }))
      .filter((x) => x.r)
      .map(({ it, r }) => {
        const extra = [r.sub, r.unit].filter((x) => x && x !== '-').join(' › ');
        const detail = [r.main, extra].filter(Boolean).join(' › ');
        const data = sliceRange(r.data, startDate, endDate);
        return {
          plant: {
            kode: it.key,
            nama: r.plantNama,
            detail,
          },
          seriesName: `${r.plantNama}${detail ? ` › ${detail}` : ''}`,
          color: it.color,
          kop: r.kop,
          satuan: r.satuan,
          history: r.data,
          data,
          stats: summarize(data),
        };
      });
  }, [raw, items, startDate, endDate]);

  const chartData = useMemo(() => mergeRows(compared, 'data'), [compared]);
  const chartHistory = useMemo(() => mergeRows(compared, 'history'), [compared]);

  const satuanSet = [...new Set(compared.map((c) => c.satuan))];
  const mixedSatuan = satuanSet.length > 1;
  const satuan = mixedSatuan ? '' : satuanSet[0] ?? '';

  // Kop line in chart will show if all parameter have same kop
  const sharedKop =
    compared.length > 0 && compared.every((c) => sameKop(c.kop, compared[0].kop)) ? compared[0].kop : null;
  const series = compared.map((c) => ({ key: c.plant.kode, name: c.seriesName, color: c.color }));

  const hasData = chartData.length > 0;
  const rangeMs = hasPeriod ? new Date(endDate) - new Date(startDate) : 0;
  const busy = loading || pendingExpand;

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#8292AA]">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (metaError || !param || rows.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle size={24} />}
        title="Gagal memuat halaman perbandingan"
        text={metaError || 'Belum ada parameter yang bisa dibandingkan.'}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2559]">Perbandingan</h1>
        <p className="text-sm text-[#505F76] mt-1">
          Pilih satu parameter, lalu tambahkan pembanding dari pabrik, kategori, dan unit yang berbeda pada rentang tanggal yang sama.
        </p>
      </div>

      <div className="space-y-6">
        {/* Filter chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <CompareFilters
            parameters={parameters}
            paramId={paramId}
            onParamChange={changeParam}
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            minDate={minDate || undefined}
            maxDate={ymd(new Date())}
            plants={tree}
            rows={rows}
            colorAt={colorAt}
            minRows={MIN_ROWS}
            canAdd={canAdd}
            onChangeRow={changeRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />

          {rangeError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500 mt-3">
              <AlertTriangle size={14} />
              Start date tidak boleh setelah end date.
            </p>
          )}

          {duplicateCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-[#8292AA] mt-3">
              <AlertTriangle size={14} />
              {duplicateCount} pembanding memilih unit yang sama dengan baris lain, jadi hanya digambar sekali.
            </p>
          )}

          {mixedSatuan && !busy && (
            <p className="flex items-center gap-1.5 text-xs text-[#8292AA] mt-3">
              <AlertTriangle size={14} />
              Satuan berbeda antar pembanding ({satuanSet.map((s) => s || 'tanpa satuan').join(', ')}), grafik memakai satu skala sumbu Y.
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100">
            {!hasPeriod ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Pilih periode yang valid"
                text="Grafik perbandingan akan tampil di sini."
              />
            ) : items.length < 1 ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Belum ada pembanding yang valid"
                text="Pilih pabrik, kategori, sub kategori, dan unit yang tersedia."
              />
            ) : busy ? (
              <Spinner />
            ) : error ? (
              <EmptyState icon={<AlertTriangle size={24} />} title="Gagal memuat data" text={error} />
            ) : compared.length < 1 ? (
              <EmptyState
                icon={<BarChart3 size={24} />}
                title="Data tidak ditemukan"
                text="Pembanding yang dipilih tidak mengembalikan data."
              />
            ) : !hasData ? (
              <EmptyState
                icon={<Inbox size={24} />}
                title="Tidak ada data pada rentang ini"
                text="Coba ubah rentang tanggalnya."
              />
            ) : (
              <CompareChart
                title={`${param.nama}${satuan ? ` (${satuan})` : ''}`}
                series={series}
                data={chartData}
                history={chartHistory}
                kop={sharedKop}
                mixedKop={!sharedKop}
                satuan={satuan}
                rangeMs={rangeMs}
              />
            )}
          </div>
        </div>

        {/* Table Ringkasan */}
        {!busy && !error && compared.length >= 1 && hasData && (
          <CompareTable
            rows={compared}
            title="Ringkasan perbandingan"
            description={`Statistik ${param.nama} tiap pembanding pada rentang tanggal terpilih`}
          />
        )}
      </div>
    </div>
  );
}