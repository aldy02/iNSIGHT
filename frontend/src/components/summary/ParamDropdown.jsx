import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { inputCls } from './FormControls';
import { SMOOTH_EASE } from '../../utils/summary';

// Dropdown multi-selection (checkbox) for parameter
export default function ParamDropdown({ params, selected, onToggle, onToggleAll, disabled, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isOpen = open && !disabled;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const allChecked = params.length > 0 && selected.length === params.length;
  const firstName = params.find((p) => p.id === selected[0])?.nama;
  const label =
    selected.length === 0 ? placeholder : selected.length === 1 ? firstName : `${selected.length} parameter dipilih`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className={`${inputCls} flex items-center justify-between text-left disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors`}
      >
        <span className={`truncate ${selected.length > 0 ? 'text-[#1B2559]' : 'text-[#8292AA]'}`}>{label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: SMOOTH_EASE }}
          className="shrink-0 ml-2"
        >
          <ChevronDown size={16} className="text-[#8292AA]" />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: SMOOTH_EASE }}
            className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden origin-top"
          >
            {params.length > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs text-[#8292AA]">{selected.length} dipilih</span>
                <button
                  type="button"
                  onClick={onToggleAll}
                  className="text-xs font-medium text-[#003399] hover:underline"
                >
                  {allChecked ? 'Batal semua' : 'Pilih semua'}
                </button>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto">
              {params.length === 0 ? (
                <p className="px-3.5 py-3 text-sm text-[#8292AA] text-center">Tidak ada parameter</p>
              ) : (
                params.map((p) => {
                  const checked = selected.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#1B2559] cursor-pointer hover:bg-blue-50 transition-colors ${
                        checked ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(p.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-[#003399] cursor-pointer"
                      />
                      <span className="flex-1">{p.nama}</span>
                      {checked && <Check size={16} className="text-[#003399] shrink-0" />}
                    </label>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}