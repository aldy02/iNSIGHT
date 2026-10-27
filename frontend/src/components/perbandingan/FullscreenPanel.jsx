import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function FullscreenPanel({ open, onClose, title, children }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const el = rootRef.current;

    // Exit fullscreen can with esc
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    // If browser fullscreen not active
    const onKey = (e) => e.key === 'Escape' && onClose();

    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-9999 bg-white flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <h3 className="text-lg font-semibold text-[#1B2559]">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          title="Keluar layar penuh (Esc)"
          aria-label="Keluar layar penuh"
          className="p-1.5 rounded-md text-[#8292AA] hover:bg-slate-100 hover:text-[#1B2559] transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 px-5 pb-4">{children}</div>
    </div>,
    document.body
  );
}