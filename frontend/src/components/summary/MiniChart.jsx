import { useState, useEffect, useRef, memo } from 'react';
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
import { toMs, buildYTicks, pickStepDays, buildXTicks, MIN_TICK_PX } from '../../utils/chartAxis';

const DAY_MS = 24 * 60 * 60 * 1000;

  function MiniChart({ gid, data, kop }) {
  const values = data.map((d) => d.nilai).filter((v) => v != null);
  const hasData = values.length > 0;

  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return undefined;
    setChartWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setChartWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasData]);

  if (!hasData) return null;

  const dataMax = Math.max(...values);
  // 15% Space from highest point
  const yMax = Math.max(dataMax, kop?.max ?? -Infinity) * 1.15 || 1;

  const highest = data
    .filter((d) => d.nilai != null)
    .reduce((a, b) => (b.nilai > a.nilai ? b : a));

  const { ticks, decimals } = buildYTicks(0, yMax, 5);
  const tickFmt = (v) => v.toFixed(decimals);
  const yAxisWidth = Math.max(36, Math.max(...ticks.map((t) => tickFmt(t).length), 1) * 7 + 10);

  // Plot x area
  const plotWidth = chartWidth - yAxisWidth - 10 - 24;
  const maxXTicks = chartWidth > 0 ? Math.max(2, Math.floor(plotWidth / MIN_TICK_PX)) : 18;

  const pxPerPoint = chartWidth > 0
    ? plotWidth / Math.max(1, data.length - 1)
    : MIN_TICK_PX;
  const minIndexGap = Math.max(1, Math.ceil(MIN_TICK_PX / pxPerPoint));

  const start = toMs(data[0]);
  const end = toMs(data[data.length - 1]);
  let xTicks;
  if (Number.isNaN(start) || Number.isNaN(end)) {
    xTicks = data.filter((_, i) => i % minIndexGap === 0).map((d) => d.label);
  } else {
    xTicks = buildXTicks(data, pickStepDays(Math.max(end - start, DAY_MS), maxXTicks), minIndexGap);
  }

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
      <div ref={chartRef} className="h-52 select-none outline-none **:outline-none">
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
            {/* Animation tuned of so chart can be downloaded in pdf */}
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
export default memo(MiniChart);