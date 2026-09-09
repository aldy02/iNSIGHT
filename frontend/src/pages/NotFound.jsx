import notFoundGif from "../assets/NotFound.gif";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      
      {/* GIF */}
      <motion.img
        src={notFoundGif}
        alt="404 Not Found"
        className="w-80 md:w-96 lg:w-110 object-contain mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Title */}
      <motion.h2
        className="text-2xl md:text-3xl font-bold text-[#101a4e] mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Halaman tidak ditemukan!
      </motion.h2>

      {/* Description */}
      <motion.p
        className="text-base md:text-lg text-[#8292AA] max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        URL yang kamu tuju tidak tersedia.
      </motion.p>
    </div>
  );
}