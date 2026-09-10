import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatKop } from '../tests/data';

const DATES_PER_PAGE = 7;

const STATUS_STYLE = {
    normal: { label: 'Normal', dot: 'bg-emerald-500', className: 'bg-emerald-50 text-emerald-600' },
    out_of_range: { label: 'Di Luar Batas', dot: 'bg-red-500', className: 'bg-red-50 text-red-600' },
    no_kop: { label: 'Belum Ada KOP', dot: 'bg-slate-400', className: 'bg-slate-100 text-[#8292AA]' },
};

const STATUS_OPTIONS = [
    { value: 'all', label: 'Semua Status' },
    { value: 'normal', label: 'Normal' },
    { value: 'out_of_range', label: 'Di Luar Batas' },
    { value: 'no_kop', label: 'Belum Ada KOP' },
];

export default function DataTable({ rows, resetKey, subKategoriNama, unitColumnLabel = 'Unit' }) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [parameterFilter, setParameterFilter] = useState('all');

    useEffect(() => {
        setPage(1);
    }, [resetKey, search, statusFilter, parameterFilter]);

    const parameterOptions = useMemo(() => {
        return [...new Set(rows.map((r) => r.parameterNama))];
    }, [rows]);

    const filteredRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return rows.filter((row) => {
            const matchSearch =
                !keyword ||
                row.parameterNama.toLowerCase().includes(keyword) ||
                row.unitNama.toLowerCase().includes(keyword);
            const matchStatus = statusFilter === 'all' || row.status === statusFilter;
            const matchParameter = parameterFilter === 'all' || row.parameterNama === parameterFilter;
            return matchSearch && matchStatus && matchParameter;
        });
    }, [rows, search, statusFilter, parameterFilter]);

    // Kelompokkan berdasarkan tanggal
    const uniqueDates = useMemo(() => {
        return [...new Set(filteredRows.map((r) => r.tanggal))].sort((a, b) => (a < b ? 1 : -1));
    }, [filteredRows]);

    const totalPages = Math.max(1, Math.ceil(uniqueDates.length / DATES_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const dateStart = (currentPage - 1) * DATES_PER_PAGE;
    const activeDates = new Set(uniqueDates.slice(dateStart, dateStart + DATES_PER_PAGE));

    const pageRows = filteredRows.filter((r) => activeDates.has(r.tanggal));

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header Judul */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-[#1B2559]">Log Histori Data Monitoring Kualitas Air</h2>
                        <p className="text-sm text-[#8292AA] mt-1">
                            Catatan data aktual harian terhadap Key Operating Parameter Pabrik (KOP)
                            {subKategoriNama ? ` — ${subKategoriNama}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full lg:w-auto shrink-0">
                        <div className="relative w-full md:w-56">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8292AA]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari parameter / unit..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003399] text-[#1B2559]"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:flex gap-2 shrink-0">
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full md:w-40 appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003399] text-[#1B2559] bg-white cursor-pointer"
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8292AA] pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    value={parameterFilter}
                                    onChange={(e) => setParameterFilter(e.target.value)}
                                    className="w-full md:w-44 appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003399] text-[#1B2559] bg-white cursor-pointer"
                                >
                                    <option value="all">Semua Parameter</option>
                                    {parameterOptions.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8292AA] pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table - Desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                    <thead>
                        <tr className="border-b border-slate-100 text-left">
                            <th className="w-[15%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">Tanggal</th>
                            <th className="w-[20%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">{unitColumnLabel}</th>
                            <th className="w-[20%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">Parameter</th>
                            <th className="w-[15%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">Nilai Aktual</th>
                            <th className="w-[15%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">KOP</th>
                            <th className="w-[15%] px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-[#8292AA]">
                                    Tidak ada data yang cocok dengan pencarian/filter.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((row, idx) => {
                                const statusInfo = STATUS_STYLE[row.status] || STATUS_STYLE.no_kop;
                                return (
                                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                                        <td className="px-6 py-3.5 font-medium text-[#1B2559] truncate">{row.label}</td>
                                        <td className="px-6 py-3.5 font-medium text-[#1B2559] truncate">{row.unitNama}</td>
                                        <td className="px-6 py-3.5 font-medium text-[#1B2559] truncate">{row.parameterNama}</td>
                                        <td className="px-6 py-3.5 font-medium text-[#1B2559] truncate">
                                            {row.nilai}{row.satuan ? ` ${row.satuan}` : ''}
                                        </td>
                                        <td className="px-6 py-3.5 font-medium text-[#1B2559] truncate">{formatKop(row.kop, row.satuan)}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusInfo.className}`}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Card List - Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
                {pageRows.length === 0 ? (
                    <div className="px-5 py-10 text-center text-[#8292AA] text-sm">
                        Tidak ada data yang cocok dengan pencarian/filter.
                    </div>
                ) : (
                    pageRows.map((row, idx) => {
                        const statusInfo = STATUS_STYLE[row.status] || STATUS_STYLE.no_kop;
                        return (
                            <div key={idx} className="p-5">
                                <div className="flex items-start justify-between gap-3 mb-1">
                                    <h3 className="text-base font-bold text-[#1B2559]">{row.parameterNama}</h3>
                                    <span className={`shrink-0 inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusInfo.className}`}>
                                        {statusInfo.label}
                                    </span>
                                </div>
                                <p className="text-xs text-[#F75807] mb-4">{row.unitNama}</p>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8292AA]">Tanggal</span>
                                        <span className="font-medium text-[#1B2559]">{row.label}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8292AA]">Nilai Aktual</span>
                                        <span className="font-medium text-[#1B2559]">
                                            {row.nilai}{row.satuan ? ` ${row.satuan}` : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#8292AA]">KOP</span>
                                        <span className="font-medium text-[#1B2559]">{formatKop(row.kop, row.satuan)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
                <p className="text-xs text-[#8292AA]">
                    Menampilkan {activeDates.size} tanggal ({pageRows.length} data monitoring) dari {uniqueDates.length} tanggal total
                </p>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg text-sm text-[#8292AA] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-1"
                    >
                        <ChevronLeft size={15} /> Sebelumnya
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === currentPage
                                ? 'bg-[#003399] text-white'
                                : 'text-[#1B2559] hover:bg-slate-100'
                                }`}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm text-[#8292AA] hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center gap-1"
                    >
                        Selanjutnya <ChevronRight size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
}