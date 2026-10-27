import { fmtNum, formatKop } from '../../utils/summary';

const thClass = 'px-6 py-3 font-medium text-[#8292AA] text-xs uppercase tracking-wide';
const tdClass = 'px-6 py-3.5 font-medium text-[#1B2559] truncate';

// Badge total day out of range (kop)
function DaysBadge({ stats }) {
  if (!stats) return <span className="text-[#8292AA]">-</span>;

  const out = stats.outCount ?? 0;
  const className = out > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <span className={`inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>
      {out} hari
    </span>
  );
}

// Table ringkasan perbandingan
export default function CompareTable({ rows, title = 'Ringkasan Perbandingan', description }) {
  const val = (stats, key) => (stats ? fmtNum(stats[key]) : '-');

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header Judul */}
      <div className="px-6 pt-6 pb-5 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-[#1B2559]">{title}</h2>
        {description && <p className="text-sm text-[#8292AA] mt-1">{description}</p>}
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className={`w-[28%] ${thClass}`}>Pembanding</th>
              <th className={`w-[14%] ${thClass}`}>Batas KOP</th>
              <th className={`w-[14%] ${thClass}`}>Rata-rata</th>
              <th className={`w-[14%] ${thClass}`}>Tertinggi</th>
              <th className={`w-[14%] ${thClass}`}>Terendah</th>
              <th className={`w-[16%] ${thClass}`}>Di Luar KOP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#8292AA]">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              rows.map(({ plant, color, kop, stats, satuan }) => (
                <tr key={plant.kode} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td
                    className={`${tdClass} relative`}
                    title={`${plant.nama} - ${plant.detail}`}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: color }}
                    />
                    {plant.nama}
                    {plant.detail && (
                      <span className="block text-xs font-normal text-[#8292AA] truncate">{plant.detail}</span>
                    )}
                  </td>
                  <td className={tdClass}>{formatKop(kop, satuan)}</td>
                  <td className={tdClass}>{val(stats, 'avg')}</td>
                  <td className={tdClass}>{val(stats, 'max')}</td>
                  <td className={tdClass}>{val(stats, 'min')}</td>
                  <td className="px-6 py-3.5">
                    <DaysBadge stats={stats} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card List - Mobile */}
      <div className="md:hidden divide-y divide-slate-100">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-[#8292AA] text-sm">Tidak ada data.</div>
        ) : (
          rows.map(({ plant, color, kop, stats, satuan }) => (
            <div key={plant.kode} className="relative p-5 pl-6">
              <span
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
              />
              <h3 className="text-base font-bold text-[#1B2559]">{plant.nama}</h3>
              {plant.detail ? (
                <p className="text-xs text-[#F75807] mt-0.5 mb-4">{plant.detail}</p>
              ) : (
                <div className="mb-4" />
              )}

              <div className="space-y-2 text-sm">
                {[
                  ['Batas KOP', formatKop(kop, satuan)],
                  ['Rata-rata', val(stats, 'avg')],
                  ['Tertinggi', val(stats, 'max')],
                  ['Terendah', val(stats, 'min')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#8292AA]">{label}</span>
                    <span className="font-medium text-[#1B2559]">{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-[#8292AA]">Di Luar KOP</span>
                  <DaysBadge stats={stats} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100">
        <p className="text-xs text-[#8292AA]">Menampilkan {rows.length} pembanding</p>
      </div>
    </div>
  );
}