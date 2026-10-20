import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Select, PanelButtons, inputCls } from './FormControls';
import ParamDropdown from './ParamDropdown';

// Add sub category + unit + parameter
export default function AddUnit({ cat, usedUnitIds, onAdd, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [subId, setSubId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [paramIds, setParamIds] = useState([]);

  const subsLeft = cat.subs.filter((s) => s.units.some((u) => !usedUnitIds.has(u.id)));
  if (subsLeft.length === 0) {
    return <p className="text-xs text-[#8292AA]">Semua sub kategori di {cat.nama} sudah ditambahkan.</p>;
  }

  const sub = subsLeft.find((s) => s.id === subId);
  const unitsLeft = sub ? sub.units.filter((u) => !usedUnitIds.has(u.id)) : [];
  const hasRealUnit = !!sub && sub.units.some((u) => u.nama !== '-');
  const resolvedUnit = !sub
    ? undefined
    : hasRealUnit
    ? unitsLeft.find((u) => u.id === unitId)
    : unitsLeft[0];
  const resolvedUnitId = resolvedUnit?.id ?? '';
  const params = resolvedUnit?.parameters ?? [];
  const allChecked = params.length > 0 && paramIds.length === params.length;

  const close = () => {
    setOpen(false);
    setSubId('');
    setUnitId('');
    setParamIds([]);
  };

  const toggleParam = (id) =>
    setParamIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleAll = () => setParamIds(allChecked ? [] : params.map((p) => p.id));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#003399] hover:underline"
      >
        <Plus size={16} />
        Tambah unit
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Kolom 1: Sub kategori */}
        <div>
          <label className="block text-xs font-medium text-[#38485D] mb-1.5">Sub kategori</label>
          <Select
            value={subId}
            onChange={(e) => {
              setSubId(e.target.value);
              setUnitId('');
              setParamIds([]);
            }}
          >
            <option value="">Pilih sub kategori</option>
            {subsLeft.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </div>

        {/* Kolom 2: Unit */}
        <div>
          <label className="block text-xs font-medium text-[#38485D] mb-1.5">Unit</label>
          {sub && !hasRealUnit ? (
            <div className={`${inputCls} bg-slate-100 text-[#8292AA]`}>Tidak ada unit (otomatis)</div>
          ) : (
            <Select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                setParamIds([]);
              }}
            >
              <option value="">{sub ? 'Pilih unit' : 'Pilih sub kategori dulu'}</option>
              {unitsLeft.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Kolom 3: Parameter (dropdown checkbox) */}
        <div>
          <label className="block text-xs font-medium text-[#38485D] mb-1.5">Parameter</label>
          <ParamDropdown
            key={resolvedUnitId}
            params={params}
            selected={paramIds}
            onToggle={toggleParam}
            onToggleAll={toggleAll}
            disabled={!resolvedUnitId}
            placeholder={resolvedUnitId ? 'Pilih parameter...' : 'Pilih unit dulu'}
          />
        </div>
      </div>

      <PanelButtons
        onCancel={close}
        disabled={!resolvedUnitId || paramIds.length === 0}
        onConfirm={() => {
          onAdd(resolvedUnitId, paramIds);
          close();
        }}
      />
    </div>
  );
}