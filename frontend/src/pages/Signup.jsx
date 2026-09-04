import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import CoverPhoto from '../assets/CoverPhoto.jpg';
import Logo from '../assets/Logo.png';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    email: '',
    npk: '',
    nama: '',
    jabatan: '',
    password: '',
    konfirmasiPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.konfirmasiPassword) {
      setError('Konfirmasi password tidak sama');
      return;
    }

    try {
      setLoading(true);
      await signup({
        nama: form.nama,
        npk: form.npk,
        email: form.email,
        jabatan: form.jabatan,
        password: form.password,
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
      {/* Image Section */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -60, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden md:flex flex-1 items-center justify-center bg-white p-4"
      >
        <img
          src={CoverPhoto}
          alt="Pupuk Kaltim"
          className="w-full h-full object-cover rounded-3xl"
        />
      </motion.div>

      {/* Form Section */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-1 flex flex-col p-8 md:p-12 bg-white overflow-y-auto"
      >
        <img
          src={Logo}
          alt="Pupuk Kaltim"
          className="h-9 w-auto object-contain mx-auto"
        />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-[#003399] mb-2">Sign Up</h1>
            <p className="text-sm text-[#313957] mb-6 leading-relaxed">
              Silahkan daftarkan akun Anda untuk mengakses iNSIGHT, Aplikasi
              Dashboard Monitoring Kualitas Air.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="signup-email"
                  placeholder="Masukkan email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="peer w-full text-[#313957] placeholder-[#8897AD] px-3.5 py-3 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="signup-email"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Email
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="npk"
                  id="npk"
                  placeholder="NPK"
                  value={form.npk}
                  onChange={handleChange}
                  required
                  className="peer w-full text-[#313957] placeholder-[#8897AD] px-3.5 py-3 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="npk"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  NPK
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="nama"
                  id="nama"
                  placeholder="Nama lengkap"
                  value={form.nama}
                  onChange={handleChange}
                  required
                  className="peer w-full text-[#313957] placeholder-[#8897AD] px-3.5 py-3 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="nama"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Nama Lengkap
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="jabatan"
                  id="jabatan"
                  placeholder="Jabatan"
                  value={form.jabatan}
                  onChange={handleChange}
                  className="peer w-full text-[#313957] placeholder-[#8897AD] px-3.5 py-3 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="jabatan"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Jabatan
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="signup-password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="peer w-full px-3.5 py-3 text-[#313957] placeholder-[#8897AD] pr-10 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="signup-password"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Password
                </label>
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8897AD] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="konfirmasiPassword"
                  id="konfirmasiPassword"
                  placeholder="Konfirmasi password"
                  value={form.konfirmasiPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="peer w-full px-3.5 py-3 text-[#313957] placeholder-[#8897AD] pr-10 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="konfirmasiPassword"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Konfirmasi Password
                </label>
                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8897AD] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#F75807] hover:bg-[#df4e04] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>

            <p className="text-center text-sm text-[#313957] mt-5">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-[#1749AF] font-semibold underline">
                Login
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#8897AD]">
          iNSIGHT © PT Pupuk Kalimantan Timur | Unit Kerja PPE
        </p>
      </motion.div>
    </div>
  );
}