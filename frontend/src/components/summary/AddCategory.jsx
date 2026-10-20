import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Select, PanelButtons } from './FormControls';

export default function AddCategory({ options, onAdd }) {
  const [open, setOpen] = useState(false);
  const [catId, setCatId] = useState('');

  if (options.length === 0) return null;

  const close = () => {
    setOpen(false);
    setCatId('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2
        py-3 px-5 bg-[#F75807] hover:bg-[#df4e04]
        text-white text-sm font-semibold
        border border-[#F75807] rounded-lg
        transition-colors"
      >
        <Plus size={16} />
        Tambah kategori
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
      <label className="block text-xs font-medium text-[#38485D] mb-1.5">Kategori utama</label>
      <Select value={catId} onChange={(e) => setCatId(e.target.value)}>
        <option value="">Pilih kategori utama</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nama}
          </option>
        ))}
      </Select>
      <PanelButtons
        onCancel={close}
        disabled={!catId}
        onConfirm={() => {
          onAdd(catId);
          close();
        }}
      />
    </div>
  );
}