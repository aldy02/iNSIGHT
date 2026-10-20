import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

// Confirmation popup when there is some changes before save
export default function UnsavedChangesModal({ isOpen, onCancel, onConfirm }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 relative">
        <button onClick={onCancel} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>

        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>

        <h2 className="text-2xl font-bold text-[#2B3674] mb-2">Perubahan Belum Disimpan!</h2>
        <p className="text-[15px] text-[#8789C0] mb-8 leading-relaxed">
          Laporan ini memiliki perubahan yang{' '}
          <span className="font-semibold text-[#5B69B9]">belum disimpan</span>.
          <br />
          Jika Anda melanjutkan, perubahan tersebut akan hilang.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-[#2B3674] font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
          >
            Buang Perubahan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}