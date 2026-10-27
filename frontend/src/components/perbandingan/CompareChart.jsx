import { useState, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import MultiSeriesChart from './MultiSeriesChart';
import FullscreenPanel from './FullscreenPanel';

// Title, fullscreen button, grafik
export default function CompareChart({ title, series, data, history, kop, mixedKop, satuan }) {
  const [fullscreen, setFullscreen] = useState(false);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);
  const chartProps = { series, data, history, kop, mixedKop, satuan };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#1B2559]">{title}</h2>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          title="Layar penuh"
          aria-label="Buka grafik layar penuh"
          className="p-1.5 -mr-1.5 -mt-1 rounded-md text-[#8292AA] hover:bg-slate-100 hover:text-[#003399] transition-colors shrink-0"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <MultiSeriesChart {...chartProps} />

      <FullscreenPanel open={fullscreen} onClose={closeFullscreen} title={title}>
        <MultiSeriesChart {...chartProps} fill />
      </FullscreenPanel>
    </div>
  );
}