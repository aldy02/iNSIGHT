import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

const TIME_KEY = 'tanggal'; // nama field timestamp di tiap data
const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (r) => new Date(r[TIME_KEY]).getTime();

// Langkah tick yang "bulat": 1, 2, atau 5 dikali pangkat 10
const niceStep = (raw) => {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
};

// Tick sumbu Y yang rapi untuk rentang [min, max], kira-kira sebanyak `target`
const buildYTicks = (min, max, target = 5) => {
  const span = max - min;
  if (!(span > 0)) return { ticks: [min], decimals: 0 };
  const step = niceStep(span / target);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return { ticks, decimals };
};

// Pilihan jarak tick sumbu X (hari), dipilih otomatis dari lebar rentang data
const X_STEPS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 60];

const pickStepDays = (spanMs, maxTicks) => {
  const days = Math.max(1, spanMs / DAY_MS);
  return X_STEPS.find((s) => days / s <= maxTicks) ?? X_STEPS[X_STEPS.length - 1];
};

// Tick sumbu X per N hari (N menyesuaikan rentang). Memakai label data yang benar-benar ada.
// Kalau field tanggal tidak valid, jatuh ke tick berjarak merata berdasarkan urutan data.
const buildXTicks = (data, maxTicks = 18) => {
  if (!data.length) return [];
  const start = toMs(data[0]);
  const end = toMs(data[data.length - 1]);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    const step = Math.max(1, Math.ceil(data.length / maxTicks));
    return data.filter((_, i) => i % step === 0).map((d) => d.label);
  }

  const stepMs = pickStepDays(end - start, maxTicks) * DAY_MS;
  const ticks = [];
  let nextBucket = 0;
  data.forEach((r) => {
    const bucket = Math.floor((toMs(r) - start) / stepMs);
    if (bucket >= nextBucket) {
      ticks.push(r.label);
      nextBucket = bucket + 1;
    }
  });
  return ticks;
};

export default function MiniChart({ gid, data, kop }) {
  const values = data.map((d) => d.nilai).filter((v) => v != null);
  if (values.length === 0) return null;

  const dataMax = Math.max(...values);
  // Ruang 15% dari titik tertinggi
  const yMax = Math.max(dataMax, kop?.max ?? -Infinity) * 1.15 || 1;

  const highest = data
    .filter((d) => d.nilai != null)
    .reduce((a, b) => (b.nilai > a.nilai ? b : a));

  const { ticks, decimals } = buildYTicks(0, yMax, 5);
  const tickFmt = (v) => v.toFixed(decimals);
  const yAxisWidth = Math.max(36, Math.max(...ticks.map((t) => tickFmt(t).length), 1) * 7 + 10);

  const xTicks = buildXTicks(data, 18);

  return (
    <div>
      {/* Legenda */}
      <div className="flex items-center justify-between text-xs text-[#8292AA] mb-3 flex-wrap gap-y-2">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#003399] inline-block rounded" /> Aktual
          </span>
          {kop?.max != null && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dotted border-orange-400 inline-block" /> Batas Atas
            </span>
          )}
          {kop?.min != null && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dotted border-[#377CEF] inline-block" /> Batas Bawah
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Titik Tertinggi &bull; {highest.label}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 select-none outline-none **:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003399" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#003399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E5E9F2" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              ticks={xTicks}
              interval={0}
              padding={{ left: 12, right: 12 }}
              tick={{ fontSize: 11, fill: '#8292AA' }}
              axisLine={{ stroke: '#E5E9F2' }}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={ticks}
              interval={0}
              tickFormatter={tickFmt}
              tick={{ fontSize: 11, fill: '#8292AA' }}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
            />
            {kop?.max != null && (
              <ReferenceLine y={kop.max} stroke="#F97316" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {kop?.min != null && (
              <ReferenceLine y={kop.min} stroke="#377CEF" strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            {/* Animasi dimatikan supaya grafik bisa ditangkap saat download PDF */}
            <Area
              type="monotone"
              dataKey="nilai"
              stroke="#003399"
              strokeWidth={2}
              fill={`url(#${gid})`}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={highest.label}
              y={highest.nilai}
              r={5}
              fill="#EF4444"
              stroke="#fff"
              strokeWidth={2}
              isFront
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}