import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import ParameterCard from '../components/ParameterCard';
import { kategoriData, getReadingsInRange } from '../tests/data';

const RANGE_OPTIONS = [
  { label: '1 Minggu', days: 7 },
  { label: '2 Minggu', days: 14 },
  { label: '1 Bulan', days: 30 },
  { label: '3 Bulan', days: 90 },
];

function GroupSection({ kategoriSlug, group, rangeDays }) {
  const subCategories = group.subCategories;

  const groupKey = subCategories[0].slug;
  const subParamKey = `sub_${groupKey}`;
  const unitParamKey = `unit_${groupKey}`;

  const [searchParams, setSearchParams] = useSearchParams();

  const subFromUrl = searchParams.get(subParamKey);
  const initialSub = subCategories.find((s) => s.slug === subFromUrl) || subCategories[0];

  const [activeSubSlug, setActiveSubSlug] = useState(initialSub.slug);
  const activeSub = subCategories.find((s) => s.slug === activeSubSlug) || subCategories[0];

  const unitFromUrl = searchParams.get(unitParamKey);
  const initialUnit = activeSub.units.find((unit) => unit.id === unitFromUrl) || activeSub.units[0];

  const [activeUnitId, setActiveUnitId] = useState(initialUnit.id);
  const activeUnit = activeSub.units.find((unit) => unit.id === activeUnitId) || activeSub.units[0];

  const showSubTabs = subCategories.length > 1;
  const showUnitTabs = activeSub.units.length > 1;

  const handleSelectSub = (slug) => {
    const sub = subCategories.find((s) => s.slug === slug);
    setActiveSubSlug(slug);
    setActiveUnitId(sub.units[0].id);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(subParamKey, slug);
      if (sub.units.length > 1) {
        next.set(unitParamKey, sub.units[0].id);
      } else {
        next.delete(unitParamKey);
      }
      return next;
    });
  };

  const handleSelectUnit = (unitId) => {
    setActiveUnitId(unitId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(unitParamKey, unitId);
      return next;
    });
  };

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#1B2559]">{activeSub.nama}</h2>
          <span className="text-xs bg-slate-100 text-[#8292AA] px-2 py-0.5 rounded-full">
            {activeSub.parameters.length} Parameter
          </span>
        </div>

        {showSubTabs && (
          <div className="flex flex-wrap bg-slate-100 rounded-lg p-1">
            {subCategories.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => handleSelectSub(sub.slug)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeSubSlug === sub.slug
                    ? 'bg-white text-[#1B2559] shadow-sm'
                    : 'text-[#8292AA] hover:text-[#1B2559]'
                }`}
              >
                {sub.nama}
              </button>
            ))}
          </div>
        )}

        {!showSubTabs && showUnitTabs && (
          <div className="flex bg-slate-100 rounded-lg p-1">
            {activeSub.units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => handleSelectUnit(unit.id)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeUnitId === unit.id
                    ? 'bg-white text-[#1B2559] shadow-sm'
                    : 'text-[#8292AA] hover:text-[#1B2559]'
                }`}
              >
                {unit.nama}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeSub.parameters.map((param) => {
          const readings = getReadingsInRange(kategoriSlug, activeSub.slug, activeUnit.id, param.id, rangeDays);
          const kop = activeSub.kop[param.id];
          return (
            <ParameterCard
              key={param.id}
              parameter={param}
              unit={activeUnit}
              readings={readings}
              kop={kop}
              satuan={param.satuan}
            />
          );
        })}
      </div>
    </div>
  );
}

function KategoriContent({ kategoriSlug }) {
  const [rangeDays, setRangeDays] = useState(30);
  const [searchParams] = useSearchParams();
  const data = kategoriData[kategoriSlug];

  const groupParam = searchParams.get('group');
  const visibleGroups =
    data.groups.length > 1
      ? [data.groups.find((g) => g.subCategories[0].slug === groupParam) || data.groups[0]]
      : data.groups;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2559]">{data.label}</h1>
          <p className="text-sm text-[#8292AA] mt-1">Data Aktual VS KOP Per Parameter</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                rangeDays === opt.days
                  ? 'bg-[#003399] text-white border-[#003399]'
                  : 'bg-white text-[#1B2559] border-slate-200 hover:border-[#003399]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-[#1B2559] border border-slate-200 hover:border-[#003399] transition-colors">
            <CalendarRange size={16} />
            Custom Range
          </button>
        </div>
      </div>

      <hr className="border-t border-slate-200 mb-6" />

      {visibleGroups.map((group, idx) => (
        <GroupSection
          key={`${group.subCategories[0].slug}-${idx}`}
          kategoriSlug={kategoriSlug}
          group={group}
          rangeDays={rangeDays}
        />
      ))}
    </div>
  );
}

function PlaceholderContent({ kode, kategori }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-[#1B2559] capitalize">
        {kategori?.replace(/-/g, ' ') || 'Kategori'}
      </h1>
      <p className="text-sm text-[#8292AA] mt-2">
        Halaman untuk Pabrik {kode} — segera hadir. Data master belum tersedia.
      </p>
    </div>
  );
}

export default function PabrikKategoriPage() {
  const { kode, kategori } = useParams();

  const isP6 = kode?.toUpperCase() === 'P6';
  const hasData = isP6 && kategoriData[kategori];

  return hasData ? (
    <KategoriContent kategoriSlug={kategori} />
  ) : (
    <PlaceholderContent kode={kode} kategori={kategori} />
  );
}