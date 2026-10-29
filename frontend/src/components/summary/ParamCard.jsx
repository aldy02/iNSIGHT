import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import MiniChart from './MiniChart';
import { inputCls } from './FormControls';
import useReadings from '../../hooks/useReadings';
import { summarize, formatKop, fmtNum } from '../../utils/summary';

const SUMMARY_DEBOUNCE_MS = 250;

function Stat({ label, value, warn }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
      <p className="text-[11px] text-[#8292AA]">{label}</p>
      <p className={`text-sm font-semibold ${warn ? 'text-red-600' : 'text-[#1B2559]'}`}>{value}</p>
    </div>
  );
}

// One parameter on report include statistic chart and teks field
export default function ParamCard({
  pkey, unitId, param, startDate, endDate, summary, onChangeSummary, onRemove,
}) {
  const { data, loading, error, reload } = useReadings(unitId, param.id, startDate, endDate);
  const stats = useMemo(() => summarize(data), [data]);
  const gid = `g-${pkey.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const satuan = param.satuan ? ` ${param.satuan}` : '';
  const val = (n) => (stats ? `${fmtNum(n)}${satuan}` : '-');

  // Teks ringkasan diketik di state lokal supaya halaman tidak dirender ulang di setiap ketukan.
  // Nilainya dikirim ke builder setelah jeda mengetik, saat kolom kehilangan fokus, atau saat kartu ditutup.
  const [text, setText] = useState(summary);
  const textRef = useRef(summary);
  const lastSent = useRef(summary);
  const timerRef = useRef(null);
  const onChangeRef = useRef(onChangeSummary);
  onChangeRef.current = onChangeSummary;

  // Sinkron kalau ringkasan berubah dari luar (muat laporan tersimpan, reset)
  useEffect(() => {
    if (summary !== lastSent.current) {
      lastSent.current = summary;
      textRef.current = summary;
      setText(summary);
    }
  }, [summary]);

  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (textRef.current !== lastSent.current) {
      lastSent.current = textRef.current;
      onChangeRef.current(textRef.current);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    textRef.current = value;
    setText(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SUMMARY_DEBOUNCE_MS);
  };

  // Kirim sisa ketikan kalau kartu ditutup sebelum jeda selesai
  useEffect(() => () => flush(), [flush]);

  const emptyMessage = !startDate || !endDate
    ? 'Pilih periode yang valid untuk menampilkan grafik'
    : loading
    ? 'Memuat data...'
    : error || 'Belum ada data pada periode ini';

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h5 className="text-sm font-semibold text-[#1B2559]">{param.nama}</h5>
          <p className="text-xs text-[#8292AA] mt-0.5">KOP {formatKop(param.kop, param.satuan)}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Hapus parameter dari laporan"
          aria-label={`Hapus ${param.nama}`}
          className="p-1.5 -mr-1.5 rounded-md text-[#8292AA] hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg px-3 pt-3 pb-2">
        {stats ? (
          <MiniChart gid={gid} data={data} kop={param.kop} />
        ) : (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-sm text-[#8292AA] text-center px-4">
            <span className={error ? 'text-red-500' : ''}>{emptyMessage}</span>
            {error && (
              <button type="button" onClick={reload} className="text-xs font-medium text-[#003399] hover:underline">
                Coba lagi
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <Stat label="Rata-rata" value={val(stats?.avg)} />
        <Stat label="Tertinggi" value={val(stats?.max)} />
        <Stat label="Terendah" value={val(stats?.min)} />
        <Stat label="Di luar KOP" value={stats ? `${stats.outCount} hari` : '-'} />
      </div>

      <label className="block text-xs font-medium text-[#1B2559] mt-4 mb-1.5">Ringkasan {param.nama}</label>
      <textarea
        rows={3}
        value={text}
        onChange={handleChange}
        onBlur={flush}
        placeholder="Tulis ringkasan terkait kondisi terkini..."
        className={`${inputCls} resize-y leading-relaxed`}
      />
    </div>
  );
}