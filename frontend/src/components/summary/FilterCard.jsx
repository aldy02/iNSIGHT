import { AlertTriangle } from 'lucide-react';
import { Select } from './FormControls';
import DateInput from './DateInput';

// Filter plant and date
export default function FilterCard({
  plants, plantId, startDate, endDate, rangeError,
  onPlantChange, onStartChange, onEndChange,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1B2559] mb-1.5">Pabrik</label>
          <Select value={plantId} onChange={(e) => onPlantChange(Number(e.target.value))}>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.kode})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B2559] mb-1.5">Start date</label>
          <DateInput value={startDate} max={endDate || undefined} onChange={onStartChange} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B2559] mb-1.5">End date</label>
          <DateInput value={endDate} min={startDate || undefined} onChange={onEndChange} />
        </div>
      </div>

      {rangeError && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 mt-3">
          <AlertTriangle size={14} />
          Start date tidak boleh setelah end date.
        </p>
      )}
    </div>
  );
}