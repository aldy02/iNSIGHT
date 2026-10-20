import { ChevronDown, AlertTriangle } from 'lucide-react';

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#003399] text-[#1B2559] bg-white';

export function Select({ value, onChange, children }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={`${inputCls} appearance-none pr-9 cursor-pointer`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8292AA] pointer-events-none"
      />
    </div>
  );
}

export function PanelButtons({ onCancel, onConfirm, disabled, confirmLabel = 'Tambah' }) {
  return (
    <div className="flex justify-end gap-2 mt-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-[#38485D] border border-slate-200 rounded-lg hover:border-[#003399] transition-colors"
      >
        Batal
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="px-4 py-2 text-sm font-medium text-white bg-[#003399] hover:bg-[#002b80] disabled:bg-slate-200 disabled:text-[#8292AA] disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

// Error notice, failed to load or save
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 text-xs font-medium underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}