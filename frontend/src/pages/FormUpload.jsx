import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const ACCEPTED_EXT = ['.xlsx', '.xls'];
const MAX_SIZE_MB = 10;
const ALLOWED_ROLES = ['admin'];

export default function FormUpload() {
  const { user } = useAuth();
  const canUpload = ALLOWED_ROLES.includes(user?.role);

  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await api.get('/plants');
        setPlants(res.data?.data ?? []);
      } catch (err) {
        console.error('Gagal mengambil daftar pabrik:', err);
      }
    };
    fetchPlants();
  }, []);

  const validateFile = (f) => {
    if (!f) return 'File tidak ditemukan';
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) return 'File harus berformat .xlsx atau .xls';
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Ukuran file maksimal ${MAX_SIZE_MB}MB`;
    return '';
  };

  const handleFileSelect = (f) => {
    setResult(null);
    const errMsg = validateFile(f);
    if (errMsg) {
      setError(errMsg);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!plantId) {
      setError('Pilih pabrik terlebih dahulu (atau "Semua Pabrik")');
      return;
    }
    if (!file) {
      setError('File Excel wajib diupload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('plantId', plantId);

    setUploading(true);
    try {
      const res = await api.post('/import/master', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ status: 'success', data: res.data });
    } catch (err) {
      const resData = err.response?.data;
      setResult({ status: 'error', data: resData });
      setError(resData?.message || 'Gagal mengupload file. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const isAllMode = String(plantId).toLowerCase() === 'all';

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2559]">Upload Master Data Excel</h1>
        <p className="text-sm text-[#505F76] mt-1">
          Upload file Excel berisi data harian untuk diproses ke dalam sistem.
        </p>
      </div>

      {!canUpload && (
        <div className="mb-6 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Halaman ini hanya bisa digunakan oleh role <b>admin</b>.</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`w-full bg-white rounded-2xl mt-8 p-8 shadow-sm space-y-7 ${!canUpload ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Pilih Pabrik */}
        <div>
          <label className="block text-sm font-medium text-[#1B2559] mb-2">
            Pilih Pabrik
          </label>
          <div className="relative group">
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003399] bg-white transition-colors cursor-pointer ${
                plantId ? 'text-[#1B2559]' : 'text-[#8292AA]'
              }`}
            >
              <option value="">-- Pilih Pabrik --</option>
              <option value="all" className='text-[#1B2559]'>Semua Pabrik</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id} className="text-[#1B2559]">
                  {p.nama} ({p.kode})
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8292AA] pointer-events-none transition-transform duration-200 group-focus-within:rotate-180"
            />
          </div>
          {isAllMode && (
            <p className="text-xs text-amber-600 mt-2 flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Mode "Semua Pabrik": setiap sheet di Excel akan dicocokkan otomatis dengan kode pabrik.
            </p>
          )}
        </div>

        {/* Dropzone */}
        <div>
          <label className="block text-sm font-medium text-[#1B2559] mb-2">
            File Excel
          </label>

          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-12 px-4 cursor-pointer transition-colors ${
                isDragging ? 'border-[#003399] bg-[#003399]/5' : 'border-slate-200 hover:border-[#003399]/40 bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#003399]/10 flex items-center justify-center mb-1">
                <UploadCloud size={22} className="text-[#003399]" />
              </div>
              <p className="text-sm text-[#1B2559]">
                <span className="text-[#003399] font-semibold">Klik untuk pilih file</span> atau seret file ke sini
              </p>
              <p className="text-xs text-[#8292AA]">Format .xlsx atau .xls, maksimal {MAX_SIZE_MB}MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3.5 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1B2559] truncate">{file.name}</p>
                  <p className="text-xs text-[#8292AA]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-[#8292AA] hover:text-red-500 shrink-0 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-[#F75807] hover:bg-[#df4e04] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Mengupload...
            </>
          ) : (
            <>
              <UploadCloud size={18} />
              Upload Excel
            </>
          )}
        </button>
      </form>

      {/* HMessage Hasil Import Sukses */}
      {result && result.status === 'success' && (
        <div className="mt-6 bg-white rounded-2xl p-8 shadow-sm">
          <ResultSummary result={result} />
        </div>
      )}
    </div>
  );
}

function ResultSummary({ result }) {
  const { status, data } = result;

  if (status === 'error') {
    return (
      <div>
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <XCircle size={20} />
          <h3 className="font-semibold text-[#1B2559]">Import Gagal</h3>
        </div>
        <p className="text-sm text-[#8292AA]">{data?.message || 'Terjadi kesalahan saat memproses file.'}</p>
        {data?.sheetTersedia && (
          <p className="text-xs text-[#8292AA] mt-2">
            Sheet tersedia di file: {data.sheetTersedia.join(', ')}
          </p>
        )}
      </div>
    );
  }

  const isAllMode = Array.isArray(data?.results);

  return (
    <div>
      <div className="flex items-center gap-2 text-emerald-600 mb-5">
        <CheckCircle2 size={20} />
        <h3 className="font-semibold text-[#1B2559]">{data?.message || 'Import Selesai'}</h3>
      </div>

      {isAllMode ? (
        <div className="space-y-3">
          {data.skippedSheets?.length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
              Sheet diabaikan (tidak cocok kode pabrik): {data.skippedSheets.join(', ')}
            </p>
          )}
          {data.results.map((r, idx) => (
            <SheetResultRow key={idx} r={r} />
          ))}
        </div>
      ) : (
        <SheetResultRow r={data} />
      )}
    </div>
  );
}

function SheetResultRow({ r }) {
  const isError = r.status === 'error';
  return (
    <div className={`rounded-xl px-4 py-3.5 text-sm border ${isError ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium text-[#1B2559]">{r.plant} {r.sheet ? `(sheet: ${r.sheet})` : ''}</span>
        {isError ? (
          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Error</span>
        ) : (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Sukses</span>
        )}
      </div>
      {isError ? (
        <p className="text-red-600 text-xs mt-1.5">{r.error}</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#8292AA]">
          <span>Baris valid: <b className="text-[#1B2559]">{r.totalRowsValid}</b></span>
          <span>Dibuat: <b className="text-[#1B2559]">{r.created}</b></span>
          <span>Diupdate: <b className="text-[#1B2559]">{r.updated}</b></span>
          <span className={r.failed > 0 ? 'text-red-600 font-medium' : ''}>Gagal: <b>{r.failed}</b></span>
        </div>
      )}
      {(r.parseErrors?.length > 0 || r.lookupErrors?.length > 0) && (
        <details className="mt-2.5">
          <summary className="text-xs text-[#003399] font-medium cursor-pointer">
            Lihat detail error ({(r.parseErrors?.length || 0) + (r.lookupErrors?.length || 0)})
          </summary>
          <ul className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
            {[...(r.parseErrors || []), ...(r.lookupErrors || [])].map((e, i) => (
              <li key={i} className="text-xs text-[#8292AA] border-b border-slate-100 pb-1">
                Baris Excel {e.excelRow}: {e.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}