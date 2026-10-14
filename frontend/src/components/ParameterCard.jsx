import { useState, useEffect, useRef } from 'react';
import { CircleCheck, TrendingUp, TrendingDown, KeySquare, Inbox, RotateCcw } from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    CartesianGrid,
    ReferenceDot,
} from 'recharts';
import { formatKop } from '../tests/data';

const ZOOM_STEP = 0.8; // Everytime scroll, range y will zoom in 80% or zoom out 125%
const MIN_SPAN_RATIO = 0.02; // Zoom max 2%
const PLOT_TOP = 10;
const PLOT_BOTTOM = 30;

function StatBox({ icon, iconBg, iconColor, label, value, sub }) {
    return (
        <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                <span className={iconColor}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[#8292AA]">{label}</p>
                <p className="text-sm font-semibold text-[#1B2559] leading-tight">{value}</p>
                {sub && <p className="text-[11px] text-[#8292AA] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function ParameterCard({ parameter, unit, readings, kop }) {
    const satuan = parameter.satuan ?? '';
    const data = readings || [];
    const n = data.length;

    // Zoom Y: null = display full
    const [yRange, setYRange] = useState(null);
    const [dragging, setDragging] = useState(false);
    const chartRef = useRef(null);
    const dragRef = useRef(null);

    // When time range changes, zoom reset
    useEffect(() => {
        setYRange(null);
    }, [readings]);

    // Space 15% from highest point
    const dataMax = n ? Math.max(...data.map((r) => r.nilai)) : 0;
    const baseMax = Math.max(dataMax, kop?.max ?? -Infinity) * 1.15 || 1;
    const curY = yRange ?? { min: 0, max: baseMax };

    const clampY = (min, span) => {
        const m = Math.max(0, Math.min(min, baseMax - span));
        return { min: m, max: m + span };
    };

    // Zoom Y axis
    const zoomY = (dir, frac = 0.5) => {
        const span = curY.max - curY.min;
        const newSpan = dir === 'in' ? span * ZOOM_STEP : span / ZOOM_STEP;
        if (dir === 'in' && newSpan < baseMax * MIN_SPAN_RATIO) return;
        if (newSpan >= baseMax) {
            setYRange(null);
            return;
        }
        const valueAtCursor = curY.max - frac * span;
        const newMin = valueAtCursor - (1 - frac) * newSpan;
        setYRange(clampY(newMin, newSpan));
    };

    // Ctrl/Cmd + scroll = zoom Y 
    useEffect(() => {
        const el = chartRef.current;
        if (!el) return undefined;
        const onWheel = (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const plotH = Math.max(1, rect.height - PLOT_TOP - PLOT_BOTTOM);
            const frac = Math.min(1, Math.max(0, (e.clientY - rect.top - PLOT_TOP) / plotH));
            zoomY(e.deltaY < 0 ? 'in' : 'out', frac);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    });

    // Move up or bottom chart area when zoom
    const onPointerDown = (e) => {
        if (!yRange || (e.pointerType === 'mouse' && e.button !== 0)) return;
        dragRef.current = { startY: e.clientY, startMin: yRange.min, span: yRange.max - yRange.min };
        setDragging(true);
    };

    useEffect(() => {
        if (!dragging) return undefined;
        const onMove = (e) => {
            const d = dragRef.current;
            const el = chartRef.current;
            if (!d || !el) return;
            const plotH = Math.max(1, el.clientHeight - PLOT_TOP - PLOT_BOTTOM);
            const shift = ((e.clientY - d.startY) / plotH) * d.span;
            setYRange(clampY(d.startMin + shift, d.span));
        };
        const onUp = () => {
            dragRef.current = null;
            setDragging(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [dragging]);

    // If user choose time range that have 0 datas
    if (n === 0) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-[#1B2559] mb-4">{parameter.nama}</h3>
                <div className="h-64 flex flex-col items-center justify-center text-[#8292AA]">
                    <Inbox size={28} className="mb-2" />
                    <p className="text-sm">Tidak ada data pada rentang ini</p>
                </div>
            </div>
        );
    }

    const current = data[n - 1];
    const highest = data.reduce((a, b) => (b.nilai > a.nilai ? b : a), data[0]);
    const lowest = data.reduce((a, b) => (b.nilai < a.nilai ? b : a), data[0]);

    const fmt = (v) => `${v}${satuan ? ` ${satuan}` : ''}`;
    const tickFmt = (v) => Number(Number(v).toFixed(2));

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-[#1B2559] mb-4">{parameter.nama}</h3>

            {/* 4 kotak stat */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-5">
                <StatBox
                    icon={<CircleCheck size={18} />}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-500"
                    label="Nilai Terkini"
                    value={fmt(current.nilai)}
                    sub={current.label}
                />
                <StatBox
                    icon={<TrendingUp size={18} />}
                    iconBg="bg-red-50"
                    iconColor="text-red-500"
                    label="Tertinggi"
                    value={fmt(highest.nilai)}
                    sub={highest.label}
                />
                <StatBox
                    icon={<TrendingDown size={18} />}
                    iconBg="bg-yellow-50"
                    iconColor="text-yellow-500"
                    label="Terendah"
                    value={fmt(lowest.nilai)}
                    sub={lowest.label}
                />
                <StatBox
                    icon={<KeySquare size={18} />}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-500"
                    label="KOP"
                    value={formatKop(kop, satuan)}
                    sub="Batas Kendali Operasi"
                />
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-between text-xs text-[#8292AA] mb-4 mt-6 flex-wrap gap-y-2">
                {/* Kontainer Aktual, Batas Atas, Batas Bawah */}
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

                {/* Kontainer Titik Tertinggi */}
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Titik Tertinggi &bull; {highest.label}
                </div>
            </div>

            {/* Petunjuk zoom */}
            <div className="flex items-center justify-between gap-3 mb-2 min-h-7">
                <span className="text-[11px] text-[#8292AA]">
                    Zoom: Ctrl + Scroll
                </span>
                {yRange && (
                    <button
                        type="button"
                        onClick={() => setYRange(null)}
                        className="flex items-center gap-1 text-xs font-medium text-[#003399] hover:underline"
                    >
                        <RotateCcw size={12} /> Reset zoom
                    </button>
                )}
            </div>

            {/* Chart */}
            <div
                ref={chartRef}
                onPointerDown={onPointerDown}
                style={{
                    cursor: yRange ? (dragging ? 'grabbing' : 'grab') : 'default',
                    touchAction: yRange ? 'pan-x' : 'auto',
                }}
                className="h-64 select-none outline-none **:outline-none [&_*:focus]:outline-none"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: PLOT_TOP, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`fill-${unit.id}-${parameter.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#003399" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#003399" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            vertical={false}
                            stroke="#E5E9F2"
                            strokeDasharray="0"
                        />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#8292AA' }}
                            axisLine={{ stroke: '#E5E9F2' }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={[curY.min, curY.max]}
                            allowDataOverflow
                            tickFormatter={tickFmt}
                            tick={{ fontSize: 11, fill: '#8292AA' }}
                            axisLine={false}
                            tickLine={false}
                            width={44}
                        />
                        <Tooltip
                            formatter={(value) => [fmt(value), parameter.nama]}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E9F2' }}
                        />
                        {kop?.max != null && (
                            <ReferenceLine
                                y={kop.max}
                                stroke="#F97316"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                            />
                        )}
                        {kop?.min != null && (
                            <ReferenceLine
                                y={kop.min}
                                stroke="#377CEF"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="nilai"
                            stroke="#003399"
                            strokeWidth={2}
                            fill={`url(#fill-${unit.id}-${parameter.id})`}
                        />
                        <ReferenceDot
                            x={highest.label}
                            y={highest.nilai}
                            r={5}
                            fill="#EF4444"
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}