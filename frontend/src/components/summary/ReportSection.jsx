import { Trash2 } from 'lucide-react';
import UnitCard from './UnitCard';
import AddUnit from './AddUnit';
import { groupItems } from '../../utils/summary';

// Main category with A, B, C, etc
export default function ReportSection({
  section, letter, cat, unitInfo, startDate, endDate, summaries,
  onChangeSummary, onRemove, onAddUnit, onRemoveUnit, onAddParams, onRemoveParam,
}) {
  const usedUnitIds = new Set(section.items.map((i) => i.unitId));
  const groups = groupItems(section.items, unitInfo);
  const total = section.items.reduce((n, i) => n + i.params.length, 0);

  return (
    <section>
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-[#1B2559]">
          {letter}. {cat.nama}
        </h3>
        <span className="ml-auto text-xs text-[#8292AA]">{total} parameter</span>
        <button
          type="button"
          onClick={onRemove}
          title="Hapus kategori dari laporan"
          aria-label={`Hapus ${cat.nama}`}
          className="p-1.5 -mr-1.5 rounded-md text-[#8292AA] hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-7">
        {groups.map((group) => (
          <div key={group.id}>
            {group.sub && <h4 className="text-base font-semibold text-[#1B2559] mb-3">{group.sub.nama}</h4>}
            <div className={`space-y-5 ${group.sub ? 'ml-2 pl-5 border-l border-slate-200' : ''}`}>
              {group.items.map((item, iIdx) => (
                <UnitCard
                  key={item.unitId}
                  no={iIdx + 1}
                  title={item.title}
                  unit={item.unit}
                  paramIds={item.params}
                  startDate={startDate}
                  endDate={endDate}
                  summaries={summaries}
                  onChangeSummary={onChangeSummary}
                  onAddParams={(ids) => onAddParams(item.unitId, ids)}
                  onRemoveParam={(pid) => onRemoveParam(item.unitId, pid)}
                  onRemove={() => onRemoveUnit(item.unitId)}
                />
              ))}
            </div>
          </div>
        ))}

        <AddUnit
          cat={cat}
          usedUnitIds={usedUnitIds}
          onAdd={onAddUnit}
          defaultOpen={section.items.length === 0}
        />
      </div>
    </section>
  );
}