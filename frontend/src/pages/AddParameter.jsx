import { useMemo, useState } from 'react';
import { Plus, Save, Pencil, Check, X, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------
// DATA MOCK (nanti diganti dari API: plants/areas/kategori/sub/unit)
// ---------------------------------------------------------------
const MASTER = [
  {
    id: 9, kode: 'P1A', nama: 'Pabrik 1A',
    areas: [{
      id: 5, nama: 'Ammonia',
      mains: [
        { id: 51, nama: 'Boiler Feed Water', subs: [{ id: 511, nama: '-', units: [{ id: 'u-p1a-bfw', nama: '-' }] }] },
        { id: 52, nama: 'Boiler Water', subs: [{ id: 521, nama: '-', units: [{ id: 'u-p1a-bw', nama: '-' }] }] },
        { id: 53, nama: 'Steam', subs: [{ id: 531, nama: '-', units: [{ id: 'u-p1a-steam', nama: '-' }] }] },
      ],
    }],
  },
  {
    id: 11, kode: 'P3', nama: 'Pabrik 3',
    areas: [{
      id: 10, nama: 'Ammonia',
      mains: [
        { id: 101, nama: 'Desalination', subs: [{ id: 1011, nama: 'Raw Condensate Tank', units: [{ id: 'u-p3-rct', nama: '-' }] }] },
        {
          id: 102, nama: 'Boiler Feed Water',
          subs: [
            { id: 1021, nama: 'Ammonia', units: [{ id: 'u-p3-bfw-amm', nama: '-' }] },
            { id: 1022, nama: 'Utility', units: [{ id: 'u-p3-bfw-util', nama: '-' }] },
          ],
        },
      ],
    }],
  },
  {
    id: 13, kode: 'P5', nama: 'Pabrik 5',
    areas: [{
      id: 12, nama: 'Utility',
      mains: [{
        id: 121, nama: 'Desalination',
        subs: [{
          id: 1211, nama: 'Reverse Osmosis',
          units: [
            { id: 'u-p5-swro-a', nama: 'SWRO A' },
            { id: 'u-p5-swro-b', nama: 'SWRO B' },
            { id: 'u-p5-bwro-a', nama: 'BWRO A' },
            { id: 'u-p5-bwro-b', nama: 'BWRO B' },
            { id: 'u-p5-rct', nama: 'Raw Condensate Tank' },
          ],
        }],
      }],
    }],
  },
];

const INITIAL_PARAMETERS = [
  { id: 1, nama: 'PH' },
  { id: 2, nama: 'Conductivity' },
  { id: 4, nama: 'Silica' },
  { id: 7, nama: 'Chloride' },
  { id: 11, nama: 'Eliminox' },
  { id: 12, nama: 'Fe' },
  { id: 13, nama: 'Cu' },
  { id: 14, nama: 'Na + K' },
];

// KOP yang sudah terpasang, per unit
const INITIAL_KOP = {
  'u-p1a-steam': [
    { paramId: 1, min: 9, max: 9.5, satuan: '' },
    { paramId: 2, min: null, max: 8, satuan: 'μS/cm' },
    { paramId: 4, min: null, max: 20, satuan: 'ppb' },
  ],
  'u-p5-swro-a': [{ paramId: 2, min: null, max: 1500, satuan: 'μS/cm' }],
  'u-p5-rct': [
    { paramId: 2, min: null, max: 20, satuan: 'μS/cm' },
    { paramId: 4, min: null, max: 20, satuan: 'ppb' },
  ],
};

// ---------------------------------------------------------------
// Helper
// ---------------------------------------------------------------
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#1B2559] ' +
  'focus:outline-none focus:border-[#003399] disabled:bg-slate-50 disabled:text-[#8292AA]';

// Input besar untuk langkah 1
const bigInputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-[#1B2559] ' +
  'placeholder:text-[#8292AA] focus:outline-none focus:border-[#003399]';

const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

// Kolom di DB: decimal(12,4) -> maksimal 4 angka desimal
const tooManyDecimals = (v) => v !== '' && String(v).includes('.') && String(v).split('.')[1].length > 4;

function formatKop(k) {
  const parts = [];
  if (k.min != null) parts.push(`min ${k.min}`);
  if (k.max != null) parts.push(`max ${k.max}`);
  return `${parts.join(' – ')}${k.satuan ? ` ${k.satuan}` : ''}`;
}

const unitLabel = (u) => (u.nama === '-' ? '- (unit tunggal)' : u.nama);

// Validasi min / max / satuan. Mengembalikan teks error atau null.
function validateKop({ min, max, satuan }) {
  if (min === '' && max === '') return 'Isi minimal salah satu: batas bawah atau batas atas.';
  if (tooManyDecimals(min) || tooManyDecimals(max)) return 'Maksimal 4 angka desimal.';
  const a = toNum(min);
  const b = toNum(max);
  if (a !== null && b !== null && a > b) return 'Batas bawah tidak boleh lebih besar dari batas atas.';
  if (satuan.trim().length > 20) return 'Satuan maksimal 20 karakter.';
  return null;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#505F76]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#8292AA]">{hint}</span>}
    </label>
  );
}

function StepCard({ no, title, action, children }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003399] text-sm font-semibold text-white">
            {no}
          </span>
          <h2 className="text-lg font-semibold text-[#1B2559]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------
export default function AddParameter() {
  const [parameters, setParameters] = useState(INITIAL_PARAMETERS);
  const [kopByUnit, setKopByUnit] = useState(INITIAL_KOP);

  // Langkah 1: parameter
  const [paramMode, setParamMode] = useState('existing'); // 'existing' | 'new'
  const [paramId, setParamId] = useState('');
  const [newName, setNewName] = useState('');

  // Langkah 2: lokasi
  const [plantId, setPlantId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [mainId, setMainId] = useState('');
  const [subId, setSubId] = useState('');
  const [unitId, setUnitId] = useState('');

  // Langkah 3: KOP (min, max, satuan saja)
  const emptyKop = { min: '', max: '', satuan: '' };
  const [kop, setKop] = useState(emptyKop);

  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }
  const [editing, setEditing] = useState(null); // { paramId, min, max, satuan }

  // Turunan dari pilihan bertingkat
  const plant = MASTER.find((p) => String(p.id) === plantId);
  const area = plant?.areas.find((a) => String(a.id) === areaId);
  const main = area?.mains.find((m) => String(m.id) === mainId);
  const sub = main?.subs.find((s) => String(s.id) === subId);
  const unit = sub?.units.find((u) => u.id === unitId);

  const unitKops = kopByUnit[unitId] || [];
  const paramName = (id) => parameters.find((p) => p.id === id)?.nama ?? '?';

  const selectedParamName =
    paramMode === 'new' ? newName.trim() : parameters.find((p) => String(p.id) === paramId)?.nama;

  // Handler pilihan bertingkat (reset level di bawahnya)
  const pickPlant = (v) => { setPlantId(v); setAreaId(''); setMainId(''); setSubId(''); setUnitId(''); };
  const pickArea = (v) => { setAreaId(v); setMainId(''); setSubId(''); setUnitId(''); };
  const pickMain = (v) => { setMainId(v); setSubId(''); setUnitId(''); };
  const pickSub = (v) => {
    setSubId(v);
    const s = main?.subs.find((x) => String(x.id) === v);
    setUnitId(s && s.units.length === 1 ? s.units[0].id : ''); // unit tunggal langsung terpilih
  };

  const fail = (text) => { setMessage({ type: 'error', text }); return false; };

  const handleSave = () => {
    setMessage(null);

    // Validasi parameter
    let targetParamId = Number(paramId);
    let newParam = null;
    if (paramMode === 'new') {
      const name = newName.trim();
      if (!name) return fail('Nama parameter baru wajib diisi.');
      if (parameters.some((p) => p.nama.toLowerCase() === name.toLowerCase())) {
        return fail(`Parameter "${name}" sudah ada. Pilih dari daftar parameter yang ada.`);
      }
      targetParamId = Math.max(...parameters.map((p) => p.id)) + 1;
      newParam = { id: targetParamId, nama: name };
    } else if (!paramId) {
      return fail('Pilih parameter terlebih dulu.');
    }

    // Validasi lokasi
    if (!unitId) return fail('Pilih sampai level unit.');

    // Validasi KOP
    const kopError = validateKop(kop);
    if (kopError) return fail(kopError);
    if (unitKops.some((k) => k.paramId === targetParamId)) {
      return fail('Parameter ini sudah punya KOP di unit tersebut. Ubah lewat tabel di bawah.');
    }

    if (newParam) setParameters((prev) => [...prev, newParam]);
    setKopByUnit((prev) => ({
      ...prev,
      [unitId]: [
        ...(prev[unitId] || []),
        { paramId: targetParamId, min: toNum(kop.min), max: toNum(kop.max), satuan: kop.satuan.trim() },
      ],
    }));

    setMessage({
      type: 'ok',
      text: `${newParam ? `Parameter "${newParam.nama}" dibuat dan ` : ''}KOP terpasang di ${plant.kode} › ${main.nama} › ${sub.nama === '-' ? main.nama : sub.nama}.`,
    });
    setKop(emptyKop);
    setNewName('');
    setParamId(String(targetParamId));
    setParamMode('existing');
  };

  // Edit KOP di tabel: hanya min, max, satuan
  const startEdit = (k) =>
    setEditing({ paramId: k.paramId, min: k.min ?? '', max: k.max ?? '', satuan: k.satuan || '' });
  const cancelEdit = () => setEditing(null);
  const saveEdit = () => {
    const kopError = validateKop(editing);
    if (kopError) return setMessage({ type: 'error', text: kopError });
    setKopByUnit((prev) => ({
      ...prev,
      [unitId]: prev[unitId].map((k) =>
        k.paramId === editing.paramId
          ? { ...k, min: toNum(editing.min), max: toNum(editing.max), satuan: editing.satuan.trim() }
          : k
      ),
    }));
    setMessage({ type: 'ok', text: `KOP ${paramName(editing.paramId)} diperbarui.` });
    setEditing(null);
  };

  const kopPreview = useMemo(() => {
    const k = { min: toNum(kop.min), max: toNum(kop.max), satuan: kop.satuan };
    return k.min == null && k.max == null ? '—' : formatKop(k);
  }, [kop]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2559]">Parameter &amp; KOP</h1>
        <p className="mt-1 text-sm text-[#505F76]">Tambah parameter, pasang ke unit, dan atur batas KOP.</p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* LANGKAH 1 */}
      <StepCard
        no={1}
        title="Parameter"
        action={
          <div className="inline-flex rounded-xl bg-[#EEF2F8] p-1">
            {[['existing', 'Pilih yang sudah ada'], ['new', 'Buat parameter baru']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setParamMode(v)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  paramMode === v
                    ? 'bg-white font-semibold text-[#003399] shadow-sm'
                    : 'text-[#6B7A90] hover:text-[#1B2559]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        {paramMode === 'existing' ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#1B2559]">Parameter</label>
            <select className={bigInputCls} value={paramId} onChange={(e) => setParamId(e.target.value)}>
              <option value="">Pilih parameter…</option>
              {parameters.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
            <p className="mt-2 text-xs text-[#8292AA]">Pilih parameter yang sudah terdaftar di master.</p>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#1B2559]">Nama Parameter Baru</label>
            <input
              className={bigInputCls}
              maxLength={100}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="mis. Total Iron, Turbidity, Chloride"
            />
            <p className="mt-2 text-xs text-[#8292AA]">
              Masukkan nama parameter operasional atau data laboratorium baru. Harus sama persis dengan header kolom di Excel.
            </p>
          </div>
        )}
      </StepCard>

      {/* LANGKAH 2 */}
      <StepCard no={2} title="Letakkan di unit">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Pabrik">
            <select className={inputCls} value={plantId} onChange={(e) => pickPlant(e.target.value)}>
              <option value="">Pilih pabrik…</option>
              {MASTER.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </Field>
          <Field label="Area">
            <select className={inputCls} value={areaId} onChange={(e) => pickArea(e.target.value)} disabled={!plant}>
              <option value="">Pilih area…</option>
              {plant?.areas.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
            </select>
          </Field>
          <Field label="Kategori utama">
            <select className={inputCls} value={mainId} onChange={(e) => pickMain(e.target.value)} disabled={!area}>
              <option value="">Pilih kategori…</option>
              {area?.mains.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>
          </Field>
          <Field label="Sub kategori">
            <select className={inputCls} value={subId} onChange={(e) => pickSub(e.target.value)} disabled={!main}>
              <option value="">Pilih sub kategori…</option>
              {main?.subs.map((s) => <option key={s.id} value={s.id}>{s.nama === '-' ? `- (${main.nama})` : s.nama}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className={inputCls} value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!sub}>
              <option value="">Pilih unit…</option>
              {sub?.units.map((u) => <option key={u.id} value={u.id}>{unitLabel(u)}</option>)}
            </select>
          </Field>
        </div>
        <p className="mt-3 text-[11px] text-[#8292AA]">
          Hanya unit yang sudah ada di master. Area, kategori, sub kategori, atau unit baru masih ditambah lewat SQL.
        </p>
      </StepCard>

      {/* LANGKAH 3 */}
      <StepCard no={3} title="Batas KOP">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Batas bawah (min)">
            <input type="number" step="any" className={inputCls} value={kop.min} onChange={(e) => setKop({ ...kop, min: e.target.value })} placeholder="kosong = tanpa batas" />
          </Field>
          <Field label="Batas atas (max)">
            <input type="number" step="any" className={inputCls} value={kop.max} onChange={(e) => setKop({ ...kop, max: e.target.value })} placeholder="kosong = tanpa batas" />
          </Field>
          <Field label="Satuan">
            <input className={inputCls} maxLength={20} value={kop.satuan} onChange={(e) => setKop({ ...kop, satuan: e.target.value })} placeholder="mis. μS/cm, ppb, ppm" />
          </Field>
        </div>

        {/* Ringkasan sebelum simpan */}
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-[#38485D]">
          <div className="mb-1 text-xs font-medium text-[#8292AA]">Ringkasan</div>
          <div className="flex flex-wrap items-center gap-1">
            <strong className="text-[#1B2559]">{selectedParamName || '(parameter)'}</strong>
            <ChevronRight size={14} />
            <span>{plant ? plant.kode : '(pabrik)'}</span><ChevronRight size={14} />
            <span>{main ? main.nama : '(kategori)'}</span><ChevronRight size={14} />
            <span>{sub ? sub.nama : '(sub)'}</span><ChevronRight size={14} />
            <span>{unit ? unit.nama : '(unit)'}</span>
          </div>
          <div className="mt-1">KOP: <strong className="text-[#1B2559]">{kopPreview}</strong></div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003399] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#002a80]"
          >
            {paramMode === 'new' ? <Plus size={16} /> : <Save size={16} />}
            {paramMode === 'new' ? 'Buat & pasang' : 'Pasang KOP'}
          </button>
        </div>
      </StepCard>

      {/* KOP TERPASANG DI UNIT TERPILIH */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-[#1B2559]">KOP terpasang di unit ini</h2>
        <p className="mb-4 text-xs text-[#8292AA]">
          {unit ? `${plant.kode} › ${main.nama} › ${sub.nama} › ${unit.nama}` : 'Pilih unit di langkah 2 untuk melihat daftar.'}
        </p>

        {unit && unitKops.length === 0 && <p className="text-sm text-[#8292AA]">Belum ada parameter terpasang.</p>}

        {unit && unitKops.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-[#8292AA]">
                  <th className="py-2 pr-3 font-medium">Parameter</th>
                  <th className="py-2 pr-3 font-medium">Min</th>
                  <th className="py-2 pr-3 font-medium">Max</th>
                  <th className="py-2 pr-3 font-medium">Satuan</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {unitKops.map((k) => {
                  const isEditing = editing?.paramId === k.paramId;
                  return (
                    <tr key={k.paramId} className="border-b border-slate-100 text-[#1B2559]">
                      <td className="py-2.5 pr-3 font-medium">{paramName(k.paramId)}</td>
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-3"><input type="number" step="any" className={inputCls} value={editing.min} onChange={(e) => setEditing({ ...editing, min: e.target.value })} /></td>
                          <td className="py-2 pr-3"><input type="number" step="any" className={inputCls} value={editing.max} onChange={(e) => setEditing({ ...editing, max: e.target.value })} /></td>
                          <td className="py-2 pr-3"><input className={inputCls} maxLength={20} value={editing.satuan} onChange={(e) => setEditing({ ...editing, satuan: e.target.value })} /></td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pr-3">{k.min ?? '—'}</td>
                          <td className="py-2.5 pr-3">{k.max ?? '—'}</td>
                          <td className="py-2.5 pr-3">{k.satuan || '—'}</td>
                        </>
                      )}
                      <td className="py-2.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-1">
                            <button onClick={saveEdit} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Simpan"><Check size={16} /></button>
                            <button onClick={cancelEdit} className="rounded-md p-1.5 text-[#8292AA] hover:bg-slate-100" title="Batal"><X size={16} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(k)} className="rounded-md p-1.5 text-[#003399] hover:bg-[#EEF3FF]" title="Edit KOP"><Pencil size={16} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}