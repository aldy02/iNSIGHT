import { FileText } from 'lucide-react';
import ReportSection from './ReportSection';
import AddCategory from './AddCategory';

export default function ReportPreview({
  plantName, periodLabel, startDate, endDate, categories, builder, loading,
}) {
  const { sections, index, summaries } = builder;
  const availableCats = categories.filter((c) => !sections.some((s) => s.catId === c.id));

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-medium text-[#8292AA] uppercase tracking-wide">
          <FileText size={14} />
          Pratinjau laporan
        </div>

        {!loading && sections.length > 0 && (
          <button
            type="button"
            onClick={builder.clearReport}
            className="text-xs font-medium text-[#38485D] hover:text-red-600 transition-colors"
          >
            Kosongkan laporan
          </button>
        )}
      </div>

      <h2 className="text-2xl font-bold text-[#1B2559]">Water Quality</h2>
      <p className="text-sm text-[#1B2559] mt-2 leading-relaxed">
        Berikut merupakan kualitas air Utilitas <b className="font-semibold">{plantName}</b> pada{' '}
        <b className="font-semibold">{periodLabel || '...'}</b>.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-[#8292AA]">Memuat data...</p>
      ) : categories.length === 0 ? (
        <div className="mt-8 border-2 border-dashed border-slate-200 rounded-xl px-6 py-14 text-center">
          <p className="text-sm font-medium text-[#1B2559]">Data master belum tersedia</p>
          <p className="text-sm text-[#8292AA] mt-1">Belum ada parameter terdaftar untuk {plantName}.</p>
        </div>
      ) : (
        <>
          {sections.length === 0 && (
            <p className="mt-6 text-sm text-[#8292AA]">
              Laporan masih kosong. Mulai dengan menambahkan kategori utama, lalu pilih unit dan parameter yang
              ingin dimasukkan.
            </p>
          )}

          {sections.length > 0 && (
            <div className="mt-8 space-y-10">
              {sections.map((section, sIdx) => {
                const cat = index.catById[section.catId];
                if (!cat) return null;
                return (
                  <ReportSection
                    key={section.catId}
                    section={section}
                    letter={String.fromCharCode(65 + sIdx)}
                    cat={cat}
                    unitInfo={index.unitInfo}
                    startDate={startDate}
                    endDate={endDate}
                    summaries={summaries}
                    onChangeSummary={builder.changeSummary}
                    onRemove={() => builder.removeCategory(section.catId)}
                    onAddUnit={(unitId, paramIds) => builder.addUnit(section.catId, unitId, paramIds)}
                    onRemoveUnit={(unitId) => builder.removeUnit(section.catId, unitId)}
                    onAddParams={(unitId, ids) => builder.addParams(section.catId, unitId, ids)}
                    onRemoveParam={(unitId, pid) => builder.removeParam(section.catId, unitId, pid)}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <AddCategory options={availableCats} onAdd={builder.addCategory} />
          </div>
        </>
      )}
    </div>
  );
}