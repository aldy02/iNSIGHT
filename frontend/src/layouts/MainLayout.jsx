import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7FE]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        {/* Hamburger mobile */}
        <div className="flex items-center lg:hidden px-4 py-3 bg-[#F4F7FE] border-b border-slate-100 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[#2B3674] hover:bg-blue-50 transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>
        </div>

        <main className="p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}