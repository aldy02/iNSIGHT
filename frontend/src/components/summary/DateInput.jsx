import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { inputCls } from './FormControls';
import { fmtDmy, parseDmy } from '../../utils/summary';

// Input tanggal berformat dd/mm/yyyy. Nilai yang masuk/keluar tetap YYYY-MM-DD.
export default function DateInput({ value, onChange, min, max }) {
  const [text, setText] = useState(fmtDmy(value));
  const pickerRef = useRef(null);

  useEffect(() => {
    setText(fmtDmy(value));
  }, [value]);

  const handleType = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    const masked =
      digits.length > 4
        ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
        : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    setText(masked);

    if (digits.length === 0) {
      if (value) onChange('');
      return;
    }
    if (digits.length === 8) {
      const iso = parseDmy(masked);
      if (iso && iso !== value) onChange(iso);
    }
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  };

  const invalid = text.length === 10 && !parseDmy(text);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={handleType}
        onBlur={() => setText(fmtDmy(value))} // tanggal belum lengkap / tidak valid dikembalikan
        aria-invalid={invalid}
        className={`${inputCls} pr-10 ${invalid ? 'border-red-400 focus:border-red-400' : ''}`}
      />

      <button
        type="button"
        onClick={openPicker}
        title="Pilih tanggal"
        aria-label="Pilih tanggal"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#8292AA] hover:text-[#003399] transition-colors"
      >
        <Calendar size={16} />
      </button>

      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
      />
    </div>
  );
}
