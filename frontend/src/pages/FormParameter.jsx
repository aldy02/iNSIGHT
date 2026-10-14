import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { getParameterMeta, getParameters } from '../api/parameters';
import ParameterFormModal, { kopLabel, pathLabel } from '../components/ParameterFormModal';

const PAGE_SIZE = 10;

const KOP_STYLE = {
  true: 'bg-green-50 text-[#1F9254]',
  false: 'bg-orange-50 text-[#CD6200]',
};

const selectClass =
  'w-full appearance-none pl-3.5 pr-10 py-2.5 bg-white text-[#2B3674] border border-gray-300 rounded-lg text-sm outline-none focus:border-[#003399] cursor-pointer';

const subLabel = (r) => [r.sub, r.unit].filter((x) => x && x !== '-').join(' › ');

const errMessage = (err, fallback) => err?.response?.data?.message || fallback;

function SelectBox({ value, onChange, children }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={selectClass}>
        {children}
      </select>
      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8789C0] pointer-events-none" />
    </div>
  );
}

function ColumnBadge({ column }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#003399]">{column}</span>
  );
}

function KopBadge({ kop }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${KOP_STYLE[!!kop]}`}>
      {kop || 'Belum ada KOP'}
    </span>
  );
}

export default function FormParameter() {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState(null);
  const [meta, setMeta] = useState({ tree: [], parameters: [], sources: [] });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null); // { mode: 'form' | 'edit' | 'delete', item }

  const plant = plants.find((p) => p.id === plantId);
  const sources = meta.sources;
  const sourceName = (id) => sources.find((s) => s.id === id)?.nama || '-';

  // Daftar pabrik
  useEffect(() => {
    api.get('/plants')
      .then((res) => {
        const list = res.data?.data ?? [];
        setPlants(list);
        if (list.length > 0) setPlantId(list[0].id);
        else setLoading(false);
      })
      .catch((err) => {
        setLoadError(errMessage(err, 'Gagal mengambil daftar pabrik.'));
        setLoading(false);
      });
  }, []);

  // Struktur form + daftar parameter untuk pabrik terpilih
  const load = useCallback(async () => {
    if (!plantId) return;
    try {
      setLoading(true);
      setLoadError('');
      const [m, list] = await Promise.all([getParameterMeta(plantId), getParameters(plantId)]);
      setMeta(m);
      setRows(list);
    } catch (err) {
      setLoadError(errMessage(err, 'Gagal memuat data parameter.'));
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(rows.map((r) => r.main).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const filtered = rows
    .filter((r) => !categoryFilter || r.main === categoryFilter)
    .filter((r) => {
      const q = search.trim().toLowerCase();
      return !q || `${r.parameter} ${pathLabel(r)} ${r.column || ''}`.toLowerCase().includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Show maksimum 3 pagination, windows will move if page more than 3
  const windowStart = Math.min(Math.max(1, currentPage - 1), Math.max(1, totalPages - 2));
  const pageNumbers = Array.from({ length: Math.min(3, totalPages) }, (_, i) => windowStart + i);

  const openEdit = (item) => setModal({ mode: 'edit', item });
  const openDelete = (item) => setModal({ mode: 'delete', item });

  const FileColumn = ({ item }) =>
    item.sourceId ? (
      <span className="inline-flex items-center gap-2">
        {sourceName(item.sourceId)}
        <ColumnBadge column={item.column} />
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-[#CD6200]">Belum ada kolom</span>
    );

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2B3674]">Add/Edit Parameter</h1>
        <p className="text-sm text-[#8789C0] mt-1">
          Atur parameter yang dipantau, batas KOP, dan kolom Excel tempat nilainya dibaca.
        </p>
      </div>

      {loadError && (
        <div className="mb-5 flex items-start justify-between gap-3 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
          <span className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {loadError}
          </span>
          {plantId && (
            <button onClick={load} className="shrink-0 font-semibold underline underline-offset-2">
              Coba lagi
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#2B3674] mb-4">Daftar Parameter</h2>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="lg:w-56">
              <SelectBox
                value={plantId ?? ''}
                onChange={(e) => {
                  setPlantId(Number(e.target.value));
                  setCategoryFilter('');
                  setSearch('');
                  setPage(1);
                }}
              >
                {plants.length === 0 && <option value="">Memuat pabrik...</option>}
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.kode})</option>
                ))}
              </SelectBox>
            </div>

            <div className="lg:w-56">
              <SelectBox
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SelectBox>
            </div>

            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8789C0]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Cari parameter, lokasi, atau kolom..."
                className="w-full pl-10 pr-4 py-2.5 placeholder-[#8789C0] text-[#2B3674] border border-gray-300 rounded-lg text-sm outline-none focus:border-[#003399]"
              />
            </div>

            <button
              onClick={() => setModal({ mode: 'form', item: null })}
              disabled={!plant || loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F75807] hover:bg-[#e04e05] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus size={18} />
              Tambah Parameter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-[#A3AED0] text-sm">Memuat data...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-[#A3AED0] text-sm">
            {plant ? 'Tidak ada parameter ditemukan' : 'Pilih pabrik terlebih dahulu'}
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#A3AED0] border-b border-gray-100">
                    <th className="pb-3 font-medium">Parameter</th>
                    <th className="pb-3 font-medium">Lokasi di Dashboard</th>
                    <th className="pb-3 font-medium">File dan Kolom</th>
                    <th className="pb-3 font-medium">Batas KOP</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-4 pr-4 font-medium text-[#2B3674] whitespace-nowrap">{item.parameter}</td>
                      <td className="py-4 pr-4 text-[#2B3674]">
                        <span className="font-medium">{item.main}</span>
                        {subLabel(item) && (
                          <span className="block text-xs text-[#8789C0] mt-0.5">{subLabel(item)}</span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-[#2B3674] whitespace-nowrap">
                        <FileColumn item={item} />
                      </td>
                      <td className="py-4 pr-4">
                        <KopBadge kop={kopLabel(item)} />
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 rounded-lg text-[#003399] hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => openDelete(item)}
                            className="p-2 rounded-lg text-[#A30D11] hover:bg-red-50 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <p className="font-bold text-[#2B3674]">{item.parameter}</p>
                    <div className="shrink-0">
                      <KopBadge kop={kopLabel(item)} />
                    </div>
                  </div>
                  <p className="text-xs text-[#8789C0] mb-4">
                    {[item.main, subLabel(item)].filter(Boolean).join(' › ')}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#5B69B9] shrink-0">File sumber</span>
                      <span className="text-sm font-semibold text-[#2B3674] text-right">
                        {item.sourceId ? sourceName(item.sourceId) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#5B69B9] shrink-0">Kolom</span>
                      {item.sourceId ? (
                        <ColumnBadge column={item.column} />
                      ) : (
                        <span className="text-sm font-semibold text-[#2B3674]">-</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-[#003399] text-xs font-semibold hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => openDelete(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-[#A30D11] text-xs font-semibold hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 text-sm">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-400 disabled:opacity-40"
            >
              Previous
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-medium ${
                  p === currentPage ? 'bg-[#003399] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-gray-400 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ParameterFormModal
        isOpen={!!modal}
        mode={modal?.mode}
        initialData={modal?.item}
        plant={plant}
        tree={meta.tree}
        sources={sources}
        rows={rows}
        onClose={() => setModal(null)}
        onSuccess={load}
      />
    </div>
  );
}