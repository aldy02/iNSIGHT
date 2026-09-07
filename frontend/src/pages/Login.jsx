import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import CoverPhoto from '../assets/CoverPhoto.jpg';
import Logo from '../assets/Logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await login(form.email, form.password);
      navigate('/pabrik/P1A');
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
      {/* Form Section */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -60, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-1 flex flex-col p-8 md:p-12 bg-white"
      >
        <img
          src={Logo}
          alt="Pupuk Kaltim"
          className="h-9 w-auto object-contain mx-auto"
        />

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-[#003399] mb-2">Login</h1>
            <p className="text-sm text-[#313957] mb-7 leading-relaxed">
              Selamat datang di iNSIGHT, Aplikasi Dashboard Monitoring Kualitas
              Air Pabrik PT Pupuk Kalimantan Timur | Unit Kerja PPE.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Masukkan email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="peer w-full text-[#313957] placeholder-[#8897AD] px-3.5 py-3 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="email"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-[#1749AF] opacity-0 pointer-events-none transition-opacity peer-focus:opacity-100 peer-not-placeholder-shown:opacity-100"
                >
                  Email
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="password"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="peer w-full px-3.5 py-3 text-[#313957] placeholder-[#8897AD] pr-10 border border-[#8897AD] rounded-lg text-sm outline-none focus:border-[#1749AF] transition-colors"
                />
                <label
                  htmlFor="password"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#F75807] hover:bg-[#df4e04] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Memproses...' : 'Login'}
              </button>
            </form>

            <p className="text-center text-sm text-[#313957] mt-5">
              Belum punya akun?{' '}
              <Link to="/signup" className="text-[#1749AF] font-semibold underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#8897AD]">
          iNSIGHT © PT Pupuk Kalimantan Timur | Unit Kerja PPE
        </p>
      </motion.div>

      {/* Image Section */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="hidden md:flex flex-1 items-center justify-center bg-white p-4"
      >
        <img
          src={CoverPhoto}
          alt="Pupuk Kaltim"
          className="w-full h-full object-cover rounded-3xl"
        />
      </motion.div>
    </div>
  );
}