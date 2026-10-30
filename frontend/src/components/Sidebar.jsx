import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Factory,
  UploadCloud,
  SlidersHorizontal,
  LogOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  FileText,
  ChartSpline,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios'
import logoPupukKaltim from '../assets/Logo.png';

// Judul section
function SectionLabel({ children, className = '' }) {
  return (
    <p className={`px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#A3AED0] ${className}`}>
      {children}
    </p>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const [plants, setPlants] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState(false);

  // State menu open
  const [openPlants, setOpenPlants] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadMenu = () =>
      api
        .get('/plants/menu-structure')
        .then((res) => {
          if (cancelled) return;
          setPlants(res.data.data || []);
          setMenuError(false);
        })
        .catch((err) => {
          console.error('Gagal memuat menu', err);
          if (!cancelled) setMenuError(true);
        })
        .finally(() => {
          if (!cancelled) setLoadingMenu(false);
        });

    loadMenu();

    window.addEventListener('menu:refresh', loadMenu);

    return () => {
      cancelled = true;
      window.removeEventListener('menu:refresh', loadMenu);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';

  const togglePlant = (kode) => {
    setOpenPlants((prev) => ({ ...prev, [kode]: !prev[kode] }));
  };

  // Key per plant, so the same slug with diferent plant not open
  const toggleCategory = (kode, slug) => {
    const key = `${kode}:${slug}`;
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
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
              <SectionLabel>Unit Pabrik</SectionLabel>

              {loadingMenu && (
                <p className="px-4 py-2 text-xs text-[#A3AED0]">Memuat menu...</p>
              )}

              {!loadingMenu && menuError && (
                <p className="px-4 py-2 text-xs text-red-500">Gagal memuat menu pabrik.</p>
              )}

              {!loadingMenu &&
                !menuError &&
                plants.map((plant) => {
                  const hasSub = plant.subMenu?.length > 0;
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
                            const hasChildren = Boolean(cat.children?.length);
                            const catPath = `/pabrik/${plant.kode}/${cat.slug}`;
                            const catActive = isCategoryActive(plant.kode, cat.slug);
                            const catExpanded = Boolean(openCategories[`${plant.kode}:${cat.slug}`]);

                            return (
                              <div key={cat.slug}>
                                {hasChildren ? (
                                  <button
                                    onClick={() => toggleCategory(plant.kode, cat.slug)}
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

                                {/* Level 3: Sub Kategori (ex. BW BB 1 / BW BB 2) */}
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

              {/* Konfigurasi - admin only */}
              {isAdmin && (
                <>
                  <SectionLabel className="mt-5">Konfigurasi</SectionLabel>

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

                  <Link
                    to="/parameter"
                    onClick={onClose}
                    className={`
                      flex items-center gap-3.5 w-full px-4 py-3
                      rounded-xl text-[14px] font-medium
                      transition-colors duration-150
                      ${isLeafActive('/parameter') ? activeStyle : `${baseText} ${hoverStyle}`}
                    `}
                  >
                    <SlidersHorizontal size={20} className="shrink-0" />
                    <span>Add/Edit Parameter</span>
                  </Link>

                  <Link
                    to="/report"
                    onClick={onClose}
                    className={`
                      flex items-center gap-3.5 w-full px-4 py-3
                      rounded-xl text-[14px] font-medium
                      transition-colors duration-150
                      ${isLeafActive('/report') ? activeStyle : `${baseText} ${hoverStyle}`}
                    `}
                  >
                    <FileText size={20} className="shrink-0" />
                    <span>Report</span>
                  </Link>

                  <Link
                    to="/perbandingan"
                    onClick={onClose}
                    className={`
                      flex items-center gap-3.5 w-full px-4 py-3
                      rounded-xl text-[14px] font-medium
                      transition-colors duration-150
                      ${isLeafActive('/perbandingan') ? activeStyle : `${baseText} ${hoverStyle}`}
                    `}
                  >
                    <ChartSpline size={20} className="shrink-0" />
                    <span>Perbandingan</span>
                  </Link>
                </>
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