import { Plus, X } from 'lucide-react';
import { Select } from '../summary/FormControls';
import DateInput from '../summary/DateInput';

const labelCls = 'block text-sm font-medium text-[#1B2559] mb-1.5';
const miniLabelCls = 'block text-[11px] font-medium text-[#8292AA] uppercase tracking-wide mb-1';

// Filter: Parameter + periode, then compared list (plant, Main category, sub category, unit)
export default function CompareFilters({
  parameters, paramId, onParamChange,
  startDate, endDate, onStartChange, onEndChange,
  minDate, maxDate, // Limit date range
  plants, rows, colorAt, minRows, canAdd,
  onChangeRow, onAddRow, onRemoveRow,
}) {
  const addHint = 'Semua unit untuk parameter ini sudah dipakai';

  // Start: minDate .. min(endDate, maxDate)
  const startMax = endDate && maxDate ? (endDate < maxDate ? endDate : maxDate) : endDate || maxDate || undefined;
  // End: max(startDate, minDate) .. maxDate
  const endMin = startDate && minDate ? (startDate > minDate ? startDate : minDate) : startDate || minDate || undefined;

  return (
    <div className="space-y-6">
      {/* Parameter + periode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Parameter</label>
          <Select value={paramId} onChange={(e) => onParamChange(e.target.value)}>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <DateInput value={startDate} min={minDate || undefined} max={startMax} onChange={onStartChange} />
        </div>
        <div>
          <label className={labelCls}>End date</label>
          <DateInput value={endDate} min={endMin} max={maxDate || undefined} onChange={onEndChange} />
        </div>
      </div>

      {/* Pembanding */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1B2559]">Pembanding</h3>
            <p className="text-xs text-[#8292AA] mt-0.5">
              {rows.length} pembanding
              {!canAdd ? ' • semua unit untuk parameter ini sudah dipakai' : ''}
            </p>
          </div>

          <span
            title={canAdd ? undefined : addHint}
            className={canAdd ? 'inline-flex' : 'inline-flex cursor-not-allowed'}
          >
            <button
              type="button"
              onClick={onAddRow}
              disabled={!canAdd}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-[#F75807] hover:bg-[#df4e04] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:hover:bg-slate-200 disabled:pointer-events-none text-white transition-colors"
            >
              <Plus size={15} /> Tambah
            </button>
          </span>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => {
            const color = colorAt(idx);
            const plant = plants.find((p) => p.kode === row.plantKode);
            const cat = plant?.categories.find((c) => c.nama === row.main);
            const sub = cat?.subs.find((s) => s.nama === row.sub);

            return (
              <div
                key={row.id}
                className="relative rounded-xl bg-slate-50/70 border border-slate-100 pl-5 pr-4 py-4 overflow-hidden"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />

                <button
                  type="button"
                  onClick={() => onRemoveRow(row.id)}
                  disabled={rows.length <= minRows}
                  title="Hapus pembanding"
                  aria-label="Hapus pembanding"
                  className="absolute top-2.5 right-2.5 p-1 rounded-md text-[#8292AA] hover:bg-white hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8292AA] transition-colors"
                >
                  <X size={15} />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pr-6">
                  <div>
                    <label className={miniLabelCls}>Pabrik</label>
                    <Select value={row.plantKode} onChange={(e) => onChangeRow(row.id, { plantKode: e.target.value })}>
                      {plants.map((p) => (
                        <option key={p.kode} value={p.kode}>{p.nama}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className={miniLabelCls}>Kategori</label>
                    <Select value={row.main} onChange={(e) => onChangeRow(row.id, { main: e.target.value })}>
                      {(plant?.categories ?? []).map((c) => (
                        <option key={c.nama} value={c.nama}>{c.nama}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className={miniLabelCls}>Sub kategori</label>
                    <Select value={row.sub} onChange={(e) => onChangeRow(row.id, { sub: e.target.value })}>
                      {(cat?.subs ?? []).map((s) => (
                        <option key={s.nama} value={s.nama}>{s.nama}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className={miniLabelCls}>Unit</label>
                    <Select value={row.unitId} onChange={(e) => onChangeRow(row.id, { unitId: e.target.value })}>
                      {(sub?.units ?? []).map((u) => (
                        <option
                          key={u.id}
                          value={u.id}
                          disabled={u.id !== row.unitId && rows.some((r) => r.id !== row.id && r.unitId === u.id)}
                        >
                          {u.nama}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}