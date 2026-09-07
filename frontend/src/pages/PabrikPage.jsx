import { useParams } from 'react-router-dom';

export default function PabrikPage() {
  const { kode } = useParams();

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-[#2B3674]">
        Pabrik {kode}
      </h1>
      <p className="text-sm text-[#8789C0] mt-2">
        Halaman untuk Pabrik {kode} — segera hadir. Data master belum tersedia.
      </p>
    </div>
  );
}