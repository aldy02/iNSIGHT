import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { createParameter, updateParameter, deleteParameter } from '../api/parameters';

const NEW = '__new__';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  parameter: '',
  main: '',
  sub: '', subNew: '',
  unit: '', unitNew: '',
  min: '', max: '', minInc: true, maxInc: true,
  satuan: '', effectiveDate: today(),
  sourceId: '', column: '',
};

const labelOf = (name) => (name === '-' ? '- (tidak ada)' : name);
const pick = (selected, typed) => (selected === NEW ? typed.trim() : selected);

export const pathLabel = (r) =>
  [r.main, r.sub, r.unit].filter((x) => x && x !== '-').join(' › ');

export function kopLabel(r) {
  const hasMin = r.min !== null && r.min !== undefined && r.min !== '';
  const hasMax = r.max !== null && r.max !== undefined && r.max !== '';
  if (!hasMin && !hasMax) return null;
  const u = r.satuan ? ` ${r.satuan}` : '';
  if (hasMin && hasMax) return `${r.min} – ${r.max}${u}`;
  if (hasMax) return `${r.maxInc ? '≤' : '<'} ${r.max}${u}`;
  return `${r.minInc ? '≥' : '>'} ${r.min}${u}`;
}

const formFromRow = (r) => ({
  parameter: r.parameter,
  main: r.main,
  sub: r.sub, subNew: '',
  unit: r.unit, unitNew: '',
  min: r.min ?? '', max: r.max ?? '', minInc: true, maxInc: true,
  satuan: r.satuan || '', effectiveDate: r.effectiveDate || today(),
  sourceId: r.sourceId ? String(r.sourceId) : '', column: r.column || '',
});

// Small UI
const labelClass = 'block text-sm font-semibold text-[#2B3674] mb-1.5';
const inputClass =
  'w-full placeholder-[#8789C0] text-[#2B3674] px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#003399] bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#8789C0] mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

function SelectBox({ value, onChange, disabled, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${inputClass} appearance-none pr-10 cursor-pointer ${value ? '' : 'text-[#8789C0]'}`}
      >
        {children}
      </select>
      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8789C0] pointer-events-none" />
    </div>
  );
}

// Dropdwon pilihan. if allowNew = true, user can choose "+ Buat baru" and then typing something
function ChoiceField({
  label, value, onChange, newValue, onNewChange, options,
  disabled, error, hint, placeholder, allowNew = true,
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <SelectBox value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Pilih</option>
        {allowNew && <option value={NEW}>+ Buat baru</option>}
        {options.map((o) => (
          <option key={o} value={o}>{labelOf(o)}</option>
        ))}
      </SelectBox>
      {allowNew && value === NEW && (
        <input
          type="text"
          autoFocus
          value={newValue}
          onChange={(e) => onNewChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} mt-2`}
        />
      )}
    </Field>
  );
}

function Section({ title, desc, children }) {
  return (
    <section className="border-t border-gray-100 pt-5">
      <h3 className="text-sm font-bold text-[#2B3674]">{title}</h3>
      {desc && <p className="text-xs text-[#8789C0] mt-0.5">{desc}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mt-3">{children}</div>
    </section>
  );
}

// Modal
function ParameterFormModalContent({
  isOpen, onClose, onSuccess, mode = 'form', initialData,
  plant, tree = [], sources = [], rows = [],
}) {
  const isEdit = mode === 'edit';
  const isDelete = mode === 'delete';

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successView, setSuccessView] = useState(false);
  const [savedName, setSavedName] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (initialData && isEdit) setForm(formFromRow(initialData));
    else setForm({ ...EMPTY_FORM, effectiveDate: today() });
    setErrors({});
    setError('');
    setSuccessView(false);
    setSavedName('');
  }, [initialData, isOpen, isEdit, isDelete]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const mainNode = tree.find((m) => m.nama === form.main);
  const subNode = mainNode?.subs.find((s) => s.nama === form.sub);

  const names = {
    parameter: form.parameter.trim(),
    main: form.main,
    sub: pick(form.sub, form.subNew),
    unit: pick(form.unit, form.unitNew),
  };
  const column = form.column.trim().toUpperCase();
  const source = sources.find((s) => String(s.id) === String(form.sourceId));

  const preview = useMemo(() => {
    if (!plant || !names.parameter || !names.main || !source || !column) return null;
    const kop = kopLabel(form);
    const path = [names.main, names.sub, names.unit].filter((x) => x && x !== '-').join(' › ');
    return `${names.parameter} akan tampil di ${plant.nama} › ${path}${kop ? `, dengan batas ${kop}` : ', belum ada batas KOP'}. Datanya dibaca dari file ${source.nama} kolom ${column}.`;
  }, [form, plant, names.parameter, names.main, names.sub, names.unit, source, column]);

  if (!isOpen || !plant) return null;

  const validate = () => {
    const e = {};
    const editingId = initialData?.id;

    if (!names.parameter) e.parameter = 'Nama parameter wajib diisi.';
    else if (names.parameter.length > 100) e.parameter = 'Nama parameter maksimal 100 karakter.';

    if (!names.main) e.main = 'Pilih kategori utama.';
    ['sub', 'unit'].forEach((k) => {
      if (!names[k]) e[k] = 'Wajib diisi. Isi "-" kalau level ini tidak dipakai.';
    });

    const hasMin = String(form.min) !== '';
    const hasMax = String(form.max) !== '';
    if (hasMin && Number.isNaN(Number(String(form.min).replace(',', '.')))) e.min = 'Harus berupa angka.';
    if (hasMax && Number.isNaN(Number(String(form.max).replace(',', '.')))) e.max = 'Harus berupa angka.';
    if (hasMin && hasMax && !e.min && !e.max && Number(String(form.min).replace(',', '.')) > Number(String(form.max).replace(',', '.')))
      e.max = 'Nilai maksimum tidak boleh lebih kecil dari minimum.';

    if (!form.sourceId) e.sourceId = 'Pilih file sumber data.';
    if (!/^[A-Z]{1,3}$/.test(column)) e.column = 'Isi huruf kolom Excel, contoh: D atau AB.';

    // One parameter (unit + parameter) can only have one column
    if (!e.parameter && names.main && names.sub && names.unit) {
      const dupPoint = rows.find(
        (r) => r.id !== editingId && r.parameter.toLowerCase() === names.parameter.toLowerCase() &&
          r.main === names.main && r.sub === names.sub && r.unit === names.unit,
      );
      if (dupPoint) e.parameter = 'Parameter ini sudah terdaftar di unit tersebut. Edit baris yang ada.';
    }

    // one column from one file can only use for one parameter
    if (!e.column && !e.sourceId) {
      const dupCol = rows.find(
        (r) => r.id !== editingId && String(r.sourceId) === String(form.sourceId) && r.column === column,
      );
      if (dupCol)
        e.column = `Kolom ${column} di file ${source.nama} sudah dipakai ${dupCol.parameter} (${pathLabel(dupCol)}).`;
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading) return;
    setError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      plantId: plant.id,
      parameter: names.parameter,
      main: names.main,
      sub: names.sub,
      unit: names.unit,
      // Backend only create new sub category / unit if user allowed here
      allowCreate: { sub: form.sub === NEW, unit: form.unit === NEW },
      sourceId: Number(form.sourceId),
      column,
      min: String(form.min) === '' ? null : Number(String(form.min).replace(',', '.')),
      max: String(form.max) === '' ? null : Number(String(form.max).replace(',', '.')),
      minInc: true,
      maxInc: true,
      satuan: form.satuan.trim(),
      effectiveDate: form.effectiveDate,
    };

    try {
      setLoading(true);
      if (isEdit) await updateParameter(initialData.unitId, initialData.parameterId, payload);
      else await createParameter(payload);
      setSavedName(payload.parameter);
      onSuccess();
      setSuccessView(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteParameter(initialData.unitId, initialData.parameterId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus parameter');
    } finally {
      setLoading(false);
    }
  };

  // Batas KOP
  const rangeSign = (sign) => (
    <span className="shrink-0 w-11 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-[#8789C0]">
      {sign}
    </span>
  );

  // Success (after add/edit success)
  if (successView) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999 p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-8 relative">
          <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>

          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-5">
            <CheckCircle2 size={30} className="text-[#027959]" />
          </div>

          <h2 className="text-2xl font-bold text-[#2B3674] mb-2">Berhasil!</h2>
          <p className="text-[15px] text-[#8789C0] mb-8 leading-relaxed">
            Parameter{' '}
            <span className="font-semibold text-[#5B69B9]">{savedName}</span>{' '}
            berhasil {isEdit ? 'diperbarui' : 'ditambahkan'}.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-[#027959] hover:bg-green-800 text-white font-semibold text-sm transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  // Delete confirmation
  if (isDelete) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999 p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-8 relative">
          <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
            <X size={22} />
          </button>

          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <Trash2 size={28} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-[#2B3674] mb-2">Hapus Data!</h2>
          <p className="text-[15px] text-[#8789C0] mb-8 leading-relaxed">
            Apakah Anda yakin ingin menghapus parameter{' '}
            <span className="font-semibold text-[#5B69B9]">
              {initialData?.parameter}
              {initialData && pathLabel(initialData) ? ` (${pathLabel(initialData)})` : ''}
            </span>
            ?
            <br />
            Pemetaan kolom dan batas KOP aktif akan dihapus. Data harian yang sudah tersimpan tidak ikut terhapus.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-[#2B3674] font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold text-sm transition-colors"
            >
              {loading ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form (add / edit)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-9999 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-5 top-5 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[#2B3674]">
          {isEdit ? 'Edit Parameter' : 'Tambah Parameter'}
        </h2>
        <p className="text-sm text-[#8789C0] mt-0.5 mb-5">{plant.nama} ({plant.kode})</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field
            label="Nama Parameter"
            error={errors.parameter}
            hint={isEdit ? 'Mengubah nama hanya berlaku untuk parameter di unit ini.' : undefined}
          >
            <input
              type="text"
              value={form.parameter}
              onChange={(e) => set({ parameter: e.target.value })}
              maxLength={100}
              placeholder="Contoh: PH"
              className={inputClass}
            />
          </Field>

          <Section
            title="Lokasi di Dashboard"
            desc="Parameter tampil di menu mana"
          >
            <div className="sm:col-span-2">
              <ChoiceField
                label="Kategori Utama"
                value={form.main}
                onChange={(v) =>
                  set({
                    main: v,
                    sub: '',
                    subNew: '',
                    unit: '',
                    unitNew: '',
                  })
                }
                options={tree.map((m) => m.nama)}
                allowNew={false}
                error={errors.main}
                hint="Menentukan menu tempat parameter tampil."
              />
            </div>

            <ChoiceField
              label="Sub Kategori"
              value={form.sub}
              onChange={(v) =>
                set({
                  sub: v,
                  subNew: '',
                  unit: '',
                  unitNew: '',
                })
              }
              newValue={form.subNew}
              onNewChange={(v) => set({ subNew: v })}
              options={mainNode ? mainNode.subs.map((s) => s.nama) : []}
              disabled={!form.main}
              error={errors.sub}
              hint="Isi '-' kalau tidak ada sub kategori."
              placeholder='Nama sub kategori, atau "-"'
            />

            <ChoiceField
              label="Unit"
              value={form.unit}
              onChange={(v) => set({ unit: v, unitNew: '' })}
              newValue={form.unitNew}
              onNewChange={(v) => set({ unitNew: v })}
              options={subNode ? subNode.units : []}
              disabled={!form.sub}
              error={errors.unit}
              hint="Isi '-' kalau tidak ada unit."
              placeholder='Nama unit, atau "-"'
            />
          </Section>

          <Section title="Batas KOP" desc="Rentang nilai normal. Kosongkan minimum atau maksimum kalau tidak dipakai.">
            <Field label="Minimum" error={errors.min}>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.min}
                  onChange={(e) => set({ min: e.target.value })}
                  placeholder="Tanpa batas bawah"
                  className={inputClass}
                />
                {rangeSign('≥')}
              </div>
            </Field>
            <Field label="Maksimum" error={errors.max}>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.max}
                  onChange={(e) => set({ max: e.target.value })}
                  placeholder="Tanpa batas atas"
                  className={inputClass}
                />
                {rangeSign('≤')}
              </div>
            </Field>
            <Field label="Satuan" error={errors.satuan}>
              <input
                type="text"
                value={form.satuan}
                onChange={(e) => set({ satuan: e.target.value })}
                maxLength={20}
                placeholder="Contoh: µS/cm"
                className={inputClass}
              />
            </Field>
            <Field label="Berlaku Sejak" hint="Tanggal KOP ini mulai dipakai">
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set({ effectiveDate: e.target.value })}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title="Sumber Data" desc="Dari file dan kolom mana parameter ini dibaca saat upload">
            <Field label="File Excel Sumber" error={errors.sourceId}>
              <SelectBox value={form.sourceId} onChange={(e) => set({ sourceId: e.target.value })}>
                <option value="">Pilih file</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </SelectBox>
            </Field>
            <Field label="Huruf Kolom" error={errors.column} hint="Huruf kolom di Excel">
              <input
                type="text"
                value={form.column}
                onChange={(e) => set({ column: e.target.value.toUpperCase() })}
                maxLength={3}
                placeholder="Contoh: AB"
                className={`${inputClass} uppercase`}
              />
            </Field>
          </Section>

          {preview && (
            <div className="flex items-start gap-2 text-sm text-[#2B3674] bg-[#E8EDFB]/70 rounded-lg px-4 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-[#003399]" />
              <span>{preview}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F75807] hover:bg-[#e04e05] disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Parameter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ParameterFormModal(props) {
  return createPortal(<ParameterFormModalContent {...props} />, document.body);
}