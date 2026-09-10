import { useState, useRef, useEffect } from 'react';
import { CalendarRange, Calendar } from 'lucide-react';

function DateField({ value, onChange, min }) {
  const inputRef = useRef(null);

  const displayValue = value ? formatDisplay(value) : '';

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder="dd/mm/yyyy"
        onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.focus()}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003399] text-[#1B2559] cursor-pointer"
      />
      <Calendar
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8292AA] pointer-events-none"
      />
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}

function formatDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function DateRangePicker({ isActive, value, onApply }) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(value?.start || '');
  const [draftEnd, setDraftEnd] = useState(value?.end || '');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    if (!draftStart || !draftEnd) return;
    // Rule mulai tidak boleh setelah selesai
    if (draftStart > draftEnd) return;
    onApply({ start: draftStart, end: draftEnd });
    setOpen(false);
  };

  const label =
    isActive && value?.start && value?.end
      ? `${formatShort(value.start)} - ${formatShort(value.end)}`
      : 'Custom Range';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          isActive
            ? 'bg-[#003399] text-white border-[#003399]'
            : 'bg-white text-[#1B2559] border-slate-200 hover:border-[#003399]'
        }`}
      >
        <CalendarRange size={16} />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-20">
          <p className="text-sm font-medium text-[#1B2559] mb-3">Pilih Rentang Tanggal</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#8292AA] mb-1">Dari Tanggal</label>
              <DateField value={draftStart} onChange={setDraftStart} />
            </div>
            <div>
              <label className="block text-xs text-[#8292AA] mb-1">Sampai Tanggal</label>
              <DateField value={draftEnd} onChange={setDraftEnd} min={draftStart} />
            </div>
          </div>

          {draftStart && draftEnd && draftStart > draftEnd && (
            <p className="text-xs text-red-500 mt-2">Tanggal "Dari" tidak boleh setelah tanggal "Sampai"</p>
          )}

          <button
            onClick={handleApply}
            disabled={!draftStart || !draftEnd || draftStart > draftEnd}
            className="w-full mt-4 bg-[#003399] hover:bg-[#002a80] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Terapkan
          </button>
        </div>
      )}
    </div>
  );
}

function formatShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}