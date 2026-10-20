import { Plus, Trash2 } from 'lucide-react';
import ParamCard from './ParamCard';
import { keyOf } from '../../utils/summary';

// Unit card with selected parameter
export default function UnitCard({
  no, title, unit, paramIds, startDate, endDate, summaries,
  onChangeSummary, onAddParams, onRemoveParam, onRemove,
}) {
  const picked = paramIds.map((id) => unit.parameters.find((p) => p.id === id)).filter(Boolean);
  const left = unit.parameters.filter((p) => !paramIds.includes(p.id));

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
        <h4 className="text-sm font-semibold text-[#1B2559]">
          {no}. {title}
        </h4>
        <button
          type="button"
          onClick={onRemove}
          title="Hapus unit dari laporan"
          aria-label={`Hapus ${title}`}
          className="p-1.5 -mr-1.5 rounded-md text-[#8292AA] hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {picked.length === 0 ? (
        <p className="px-4 sm:px-5 py-6 text-sm text-[#8292AA] text-center">
          Belum ada parameter. Pilih parameter di bawah.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {picked.map((p) => {
            const pkey = keyOf(unit.id, p.id);
            return (
              <ParamCard
                key={pkey}
                pkey={pkey}
                unitId={unit.id}
                param={p}
                startDate={startDate}
                endDate={endDate}
                summary={summaries[pkey] || ''}
                onChangeSummary={(text) => onChangeSummary(pkey, text)}
                onRemove={() => onRemoveParam(p.id)}
              />
            );
          })}
        </div>
      )}

      {left.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <span className="text-xs text-[#8292AA] mr-1">Tambah parameter</span>
          {left.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAddParams([p.id])}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-[#38485D] hover:border-[#003399] hover:text-[#003399] transition-colors"
            >
              <Plus size={12} />
              {p.nama}
            </button>
          ))}
          {left.length > 1 && (
            <button
              type="button"
              onClick={() => onAddParams(left.map((p) => p.id))}
              className="ml-auto text-xs font-medium text-[#003399] hover:underline"
            >
              Tambah semua
            </button>
          )}
        </div>
      )}
    </div>
  );
}