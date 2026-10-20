import { Download, Save, Loader2 } from 'lucide-react';

// Title, save status, and save or download button
export default function SummaryHeader({
  selectedCount, filledCount, dirty, saving, savedAt,
  canSave, canDownload, onSave, onDownload,
}) {
  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2559]">Summary</h1>
        <p className="text-sm text-[#505F76] mt-1">
          Pilih pabrik dan tanggal, susun laporan dengan menambahkan kategori, unit, dan parameter, lalu simpan atau
          unduh.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#003399] hover:bg-[#002b80] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={!canDownload}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F75807] hover:bg-[#df4e04] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>
    </div>
  );
}