import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Factory,
  UploadCloud,
  LogOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoPupukKaltim from '../assets/Logo.png';

const PLANTS = [
  { kode: 'P1A', label: 'Pabrik 1A' },
  { kode: 'P2', label: 'Pabrik 2' },
  { kode: 'P3', label: 'Pabrik 3' },
  { kode: 'P4', label: 'Pabrik 4' },
  { kode: 'P5', label: 'Pabrik 5' },
  {
    kode: 'P6',
    label: 'Pabrik 6',
    subMenu: [
      { label: 'Desalination', slug: 'desalination' },
      { label: 'Demineralization', slug: 'demineralization' },
      { label: 'Boiler Feed Water', slug: 'boiler-feed-water' },
      {
        label: 'Boiler Water',
        slug: 'boiler-water',
        children: [
          { label: 'BW BB 1', slug: 'bw-bb-1', defaultUnitId: 'bw-steam-timur-bb-1' },
          { label: 'BW BB 2', slug: 'bw-bb-2', defaultUnitId: 'bw-steam-timur-bb-2' },
        ],
      },
      { label: 'Steam', slug: 'steam' },
    ],
  },
  { kode: 'P7', label: 'Pabrik 7' },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // Usestate menu open
  const [openPlants, setOpenPlants] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';

  const togglePlant = (kode) => {
    setOpenPlants((prev) => ({ ...prev, [kode]: !prev[kode] }));
  };

  const toggleCategory = (slug) => {
    setOpenCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const isPlantActive = (kode) => location.pathname.startsWith(`/pabrik/${kode}`);
  const isCategoryActive = (kode, slug) => location.pathname.startsWith(`/pabrik/${kode}/${slug}`);
  const isLeafActive = (path) => location.pathname === path;

const isChildActive = (catPath, childSlug, siblings) => {
  if (location.pathname !== catPath) return false;
  const groupParam = searchParams.get('group');
  if (groupParam) return groupParam === childSlug;
  return siblings[0].slug === childSlug;
};

  const baseText = 'text-[#8292AA]';
  const activeStyle = 'bg-[#003399] text-white';
  const hoverStyle = 'hover:bg-[#003399]/10 hover:text-[#003399]';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-99 lg:hidden" onClick={onClose} />
      )}

      <div
        className={`
          fixed top-0 left-0 h-full z-100
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 overflow-visible' : '-translate-x-full overflow-hidden'}
          lg:translate-x-0 lg:overflow-visible
        `}
      >
        <aside className="w-64 h-full bg-white flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.08)]">
          {/* Logo */}
          <div className="relative px-6 pt-7 pb-6 border-b border-slate-100 shrink-0">
            <img src={logoPupukKaltim} alt="Pupuk Kaltim" className="h-9 w-auto" />

            {isOpen && (
              <button
                onClick={onClose}
                className="lg:hidden absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-md flex items-center justify-center text-[#8292AA] hover:text-[#003399] hover:shadow-lg transition-all z-10"
                aria-label="Tutup sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </div>

          {/* Nav scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <nav className="flex flex-col px-4 py-5 gap-1">
              {PLANTS.map((plant) => {
                const hasSub = Boolean(plant.subMenu);
                const plantActive = isPlantActive(plant.kode);
                const plantExpanded = Boolean(openPlants[plant.kode]);

                return (
                  <div key={plant.kode}>
                    {hasSub ? (
                      <button
                        onClick={() => togglePlant(plant.kode)}
                        className={`
                          flex items-center gap-3.5 w-full px-4 py-3
                          rounded-xl text-[14px] font-medium text-left
                          transition-colors duration-150
                          ${plantActive ? activeStyle : `${baseText} ${hoverStyle}`}
                        `}
                      >
                        <span className="shrink-0"><Factory size={20} /></span>
                        <span className="flex-1 leading-tight text-left">{plant.label}</span>
                        <span className="shrink-0">
                          {plantExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>
                    ) : (
                      <Link
                        to={`/pabrik/${plant.kode}`}
                        onClick={onClose}
                        className={`
                          flex items-center gap-3.5 w-full px-4 py-3
                          rounded-xl text-[14px] font-medium
                          transition-colors duration-150
                          ${plantActive ? activeStyle : `${baseText} ${hoverStyle}`}
                        `}
                      >
                        <span className="shrink-0"><Factory size={20} /></span>
                        <span className="flex-1 leading-tight">{plant.label}</span>
                      </Link>
                    )}

                    {/* Level 2: Kategori Utama */}
                    {hasSub && plantExpanded && (
                      <div className="ml-4 pl-5 mt-1 mb-1 flex flex-col gap-0.5 border-l-2 border-slate-100">
                        {plant.subMenu.map((cat) => {
                          const hasChildren = Boolean(cat.children);
                          const catPath = `/pabrik/${plant.kode}/${cat.slug}`;
                          const catActive = isCategoryActive(plant.kode, cat.slug);
                          const catExpanded = Boolean(openCategories[cat.slug]);

                          return (
                            <div key={cat.slug}>
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleCategory(cat.slug)}
                                  className={`
                                    flex items-center gap-2 w-full text-left px-3 py-2 text-[13px] rounded-lg
                                    transition-colors leading-tight
                                    ${catActive ? activeStyle : `${baseText} ${hoverStyle}`}
                                  `}
                                >
                                  <span className="flex-1">{cat.label}</span>
                                  {catExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              ) : (
                                <Link
                                  to={catPath}
                                  onClick={onClose}
                                  className={`
                                    block w-full text-left px-3 py-2 text-[13px] rounded-lg
                                    transition-colors leading-tight
                                    ${isLeafActive(catPath) ? activeStyle : `${baseText} ${hoverStyle}`}
                                  `}
                                >
                                  {cat.label}
                                </Link>
                              )}

                              {/* Level 3: Sub Kategori (BW BB 1 / BW BB 2) */}
                              {hasChildren && catExpanded && (
                                <div className="ml-3 pl-4 mt-1 mb-1 flex flex-col gap-0.5 border-l-2 border-slate-100">
                                  {cat.children.map((child) => {
                                    const childTo = `${catPath}?group=${child.slug}&unit_${child.slug}=${child.defaultUnitId}`;
                                    return (
                                      <Link
                                        key={child.slug}
                                        to={childTo}
                                        onClick={onClose}
                                        className={`
                                          block w-full text-left px-3 py-1.5 text-[12.5px] rounded-lg
                                          transition-colors leading-tight
                                          ${isChildActive(catPath, child.slug, cat.children) ? activeStyle : `${baseText} ${hoverStyle}`}
                                        `}
                                      >
                                        {child.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Form Upload - admin only */}
              {isAdmin && (
                <Link
                  to="/upload"
                  onClick={onClose}
                  className={`
                    flex items-center gap-3.5 w-full px-4 py-3
                    rounded-xl text-[14px] font-medium
                    transition-colors duration-150
                    ${isLeafActive('/upload') ? activeStyle : `${baseText} ${hoverStyle}`}
                  `}
                >
                  <UploadCloud size={20} className="shrink-0" />
                  <span>Form Upload</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Logout */}
          <div className="px-4 pb-5 pt-3 border-t border-slate-100 shrink-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-[14px] font-medium text-[#8292AA] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} className="shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}