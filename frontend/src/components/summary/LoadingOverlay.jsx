import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ isOpen, title = 'Memproses...', message }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999 p-4"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-[#003399]/10 flex items-center justify-center mx-auto mb-5">
          <Loader2 size={30} className="text-[#003399] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-[#2B3674] mb-2">{title}</h2>
        {message && <p className="text-sm text-[#8789C0] leading-relaxed">{message}</p>}
      </div>
    </div>,
    document.body
  );
}