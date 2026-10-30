import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    CircleCheck, TrendingUp, TrendingDown, KeySquare, Inbox, RotateCcw, Maximize2, X,
} from 'lucide-react';
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
import { formatKop } from '../utils/summary';

const ZOOM_STEP = 0.8; // Every scroll, Y range zooms in to 80% or zooms out by 125%
const MIN_SPAN_RATIO = 0.02; // Zoom in max 2% of default range
const MAX_ZOOM_OUT = 3; // Zoom out max 3x of default range
const PLOT_TOP = 10;
const PLOT_BOTTOM = 30;
const PLOT_RIGHT = 10;
const MIN_TICK_PX = 42; // Minimum distance per X label (tick) for spacing
const TIME_KEY = 'tanggal';
const toMs = (r) => new Date(r[TIME_KEY]).getTime();

// Round tick 1, 2, 5, 10, etc
const niceStep = (raw) => {
    const exp = Math.floor(Math.log10(raw));
    const f = raw / 10 ** exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nf * 10 ** exp;
};

// Make sure Y ticks are consistent
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

const DAY_MS = 24 * 60 * 60 * 1000;

// Options for X (day) tick step
const X_STEPS = [1, 2, 3, 4, 5, 7, 10, 14, 30, 60];

// Pick the smallest step whose tick count fits maxTicks
const pickStepDays = (spanMs, maxTicks) => {
    const days = Math.max(1, spanMs / DAY_MS);
    return X_STEPS.find((s) => days / s <= maxTicks) ?? X_STEPS[X_STEPS.length - 1];
};

// Build X ticks
const buildXTicks = (data, stepDays = 3, minIndexGap = 1) => {
    if (!data.length) return [];
    const start = toMs(data[0]);
    const ticks = [];
    let nextBucket = 0;
    let lastIdx = -Infinity;
    data.forEach((r, i) => {
        const bucket = Math.floor((toMs(r) - start) / (stepDays * DAY_MS));
        if (bucket >= nextBucket && i - lastIdx >= minIndexGap) {
            ticks.push(r.label);
            nextBucket = bucket + 1;
            lastIdx = i;
        }
    });
    return ticks;
};

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

// 4 Stats box
function StatsGrid({ current, highest, lowest, kop, satuan, fmt, className = '' }) {
    return (
        <div className={`grid grid-cols-2 gap-y-4 gap-x-4 ${className}`}>
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
    );
}

function ParameterChart({ parameter, unit, data, history, kop, fmt, gradId, fill = false, rangeMs }) {
    const source = history && history.length ? history : data;

    const baseStart = toMs(data[0]);
    const baseEnd = toMs(data[data.length - 1]);
    // Window width = the selected range (ex. 7 days = 6 days difference, 7 daily points),
    const span = Math.max(1, rangeMs ?? 0, baseEnd - baseStart);
    const minT = toMs(source[0]);
    const maxT = toMs(source[source.length - 1]);

    const [yRange, setYRange] = useState(null);
    const [winStart, setWinStart] = useState(null);
    const [dragging, setDragging] = useState(false);
    const chartRef = useRef(null);
    const dragRef = useRef(null);

    // Actual chart width, used to determine the number of X-axis ticks
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        const el = chartRef.current;
        if (!el) return undefined;
        setChartWidth(el.clientWidth);
        const ro = new ResizeObserver(([entry]) => setChartWidth(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // When filter or data change, reset zoom and pan position
    useEffect(() => {
        setYRange(null);
        setWinStart(null);
    }, [data]);

    const isZoomed = !!yRange;
    // In fullscreen X pan is always active, in card only after Y zoom
    const canPan = fill || isZoomed;
    const panned = canPan && winStart != null;

    const clampStart = (s) => Math.max(minT, Math.min(s, Math.max(minT, maxT - span)));

    const windowStart = panned ? clampStart(winStart) : clampStart(baseEnd - span);
    const visibleData = panned
        ? source.filter((r) => {
            const t = toMs(r);
            return t >= windowStart && t <= windowStart + span;
        })
        : data;

    // Y Scale
    const maxOf = (arr) => Math.max(...arr.map((r) => r.nilai));
    // 15% space above the highest point
    const baseMax = Math.max(maxOf(data), kop?.max ?? -Infinity) * 1.15 || 1;
    const yLimit = Math.max(baseMax, Math.max(maxOf(source), kop?.max ?? -Infinity) * 1.15 || 1);

    const visibleMax = visibleData.length
        ? Math.max(maxOf(visibleData), kop?.max ?? -Infinity) * 1.15 || 1
        : baseMax;
    const fullMax = Math.max(baseMax, visibleMax);
    const curY = yRange ?? { min: 0, max: fullMax };

    // Y axis lowest value is always 0
    const maxSpan = fullMax * MAX_ZOOM_OUT;
    const yLo = 0;
    const yHi = Math.max(yLimit, maxSpan);

    const highest = visibleData.length
        ? visibleData.reduce((a, b) => (b.nilai > a.nilai ? b : a), visibleData[0])
        : null;

    const { ticks, decimals } = buildYTicks(curY.min, curY.max, fill ? 8 : 5);
    const tickFmt = (v) => v.toFixed(decimals);

    const yAxisWidth = Math.max(
        36,
        Math.max(...ticks.map((t) => tickFmt(t).length), 1) * 7 + 10
    );
    const yAxisWidthRef = useRef(yAxisWidth);
    yAxisWidthRef.current = yAxisWidth;

    // X ticks use the window width, not the gap between data points
    const visibleSpan = visibleData.length ? Math.max(span, 1) : 0;

    // X plot area = chart width minus Y-axis, right margin, and XAxis padding (12 + 12)
    const plotWidth = chartWidth - yAxisWidth - PLOT_RIGHT - 24;
    const maxXTicks = chartWidth > 0
        ? Math.max(2, Math.floor(plotWidth / MIN_TICK_PX))
        : (fill ? 30 : 18);
    const pxPerPoint = chartWidth > 0
        ? plotWidth / Math.max(1, visibleData.length - 1)
        : MIN_TICK_PX;
    const minIndexGap = Math.max(1, Math.ceil(MIN_TICK_PX / pxPerPoint));

    const xTicks = buildXTicks(
        visibleData,
        pickStepDays(visibleSpan, maxXTicks),
        minIndexGap
    );

    const clampY = (min, ySpan) => {
        const m = Math.max(yLo, Math.min(min, yHi - ySpan));
        return { min: m, max: m + ySpan };
    };

    const zoomY = (dir, frac = 0.5) => {
        const ySpan = curY.max - curY.min;
        let newSpan = dir === 'in' ? ySpan * ZOOM_STEP : ySpan / ZOOM_STEP;
        if (dir === 'in' && newSpan < fullMax * MIN_SPAN_RATIO) return;
        if (dir === 'out') {
            if (ySpan >= maxSpan) return;
            newSpan = Math.min(newSpan, maxSpan);
        }
        const valueAtCursor = curY.max - frac * ySpan;
        const newMin = valueAtCursor - (1 - frac) * newSpan;
        setYRange(clampY(newMin, newSpan));
    };

    // Ctrl/cmd + scroll = zoom Y only
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

    // Left click hold and drag
    const onPointerDown = (e) => {
        if (!canPan || (e.pointerType === 'mouse' && e.button !== 0)) return;
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startWin: windowStart,
            hasY: !!yRange,
            startMin: yRange?.min ?? 0,
            ySpan: yRange ? yRange.max - yRange.min : 0,
        };
        setDragging(true);
    };

    useEffect(() => {
        if (!dragging) return undefined;
        const onMove = (e) => {
            const d = dragRef.current;
            const el = chartRef.current;
            if (!d || !el) return;

            // Drag right = go back in time
            const plotW = Math.max(1, el.clientWidth - yAxisWidthRef.current - PLOT_RIGHT);
            const shiftMs = -((e.clientX - d.startX) / plotW) * span;
            setWinStart(clampStart(d.startWin + shiftMs));

            // Move up/down only when Y is zoomed
            if (d.hasY) {
                const plotH = Math.max(1, el.clientHeight - PLOT_TOP - PLOT_BOTTOM);
                const shiftY = ((e.clientY - d.startY) / plotH) * d.ySpan;
                setYRange(clampY(d.startMin + shiftY, d.ySpan));
            }
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

    const resetZoom = () => {
        setYRange(null);
        setWinStart(null);
    };

    const showReset = isZoomed || panned;

    const rangeLabel =
        panned && visibleData.length
            ? `${visibleData[0].label} – ${visibleData[visibleData.length - 1].label}`
            : null;

    return (
        <div className={fill ? 'flex flex-col h-full min-h-0' : ''}>
            {/* Legend */}
            <div className={`flex items-center justify-between text-xs text-[#8292AA] ${fill ? 'mb-2 mt-3' : 'mb-4 mt-6'} flex-wrap gap-y-2`}>
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

                {highest && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Titik Tertinggi &bull; {highest.label}
                    </div>
                )}
            </div>

            {/* Zoom hint */}
            <div className="flex items-center justify-between gap-3 mb-2 min-h-7">
                <span className="text-[11px] text-[#8292AA]">
                    Zoom: Ctrl + Scroll{canPan ? ' • Geser: klik tahan lalu drag' : ''}
                    {rangeLabel ? ` • ${rangeLabel}` : ''}
                </span>
                {showReset && (
                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex items-center gap-1 text-xs font-medium text-[#003399] hover:underline"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                )}
            </div>

            {/* Chart */}
            <div
                ref={chartRef}
                onPointerDown={onPointerDown}
                style={{
                    cursor: canPan ? (dragging ? 'grabbing' : 'grab') : 'default',
                    touchAction: canPan ? 'none' : 'auto',
                }}
                className={`${fill ? 'flex-1 min-h-0' : 'h-64'} select-none outline-none **:outline-none [&_*:focus]:outline-none`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleData} margin={{ top: PLOT_TOP, right: PLOT_RIGHT, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
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
                            ticks={xTicks}
                            interval={0}
                            padding={{ left: 12, right: 12 }}
                            tick={{ fontSize: 11, fill: '#8292AA' }}
                            axisLine={{ stroke: '#E5E9F2' }}
                            tickLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            domain={[curY.min, curY.max]}
                            ticks={ticks}
                            interval={0}
                            allowDataOverflow
                            tickFormatter={tickFmt}
                            tick={{ fontSize: 11, fill: '#8292AA' }}
                            axisLine={false}
                            tickLine={false}
                            width={yAxisWidth}
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
                            fill={`url(#${gradId})`}
                            isAnimationActive={!canPan}
                        />
                        {highest && (
                            <ReferenceDot
                                x={highest.label}
                                y={highest.nilai}
                                r={5}
                                fill="#EF4444"
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function FullscreenChart({ open, onClose, parameter, unit, data, history, kop, satuan, fmt, stats, rangeMs }) {
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const el = rootRef.current;

        // Exit from fullscreen can use Esc
        const onFsChange = () => {
            if (!document.fullscreenElement) onClose();
        };
        // If browser fullscreen is not active
        const onKey = (e) => e.key === 'Escape' && onClose();

        document.addEventListener('fullscreenchange', onFsChange);
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (el?.requestFullscreen) el.requestFullscreen().catch(() => { });

        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div ref={rootRef} className="fixed inset-0 z-9999 bg-white flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 pt-4">
                <h3 className="text-lg font-semibold text-[#1B2559]">{parameter.nama}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    title="Keluar layar penuh (Esc)"
                    aria-label="Keluar layar penuh"
                    className="p-1.5 rounded-md text-[#8292AA] hover:bg-slate-100 hover:text-[#1B2559] transition-colors shrink-0"
                >
                    <X size={20} />
                </button>
            </div>

            <StatsGrid
                {...stats}
                kop={kop}
                satuan={satuan}
                fmt={fmt}
                className="md:grid-cols-4 px-5 mt-3"
            />

            <div className="flex-1 min-h-0 px-5 pb-4">
                <ParameterChart
                    parameter={parameter}
                    unit={unit}
                    data={data}
                    history={history}
                    kop={kop}
                    fmt={fmt}
                    gradId={`fill-full-${unit.id}-${parameter.id}`}
                    rangeMs={rangeMs}
                    fill
                />
            </div>
        </div>,
        document.body
    );
}

export default function ParameterCard({ parameter, unit, readings, history, kop, rangeMs }) {
    const satuan = parameter.satuan ?? '';
    const data = readings || [];
    const n = data.length;

    const [fullscreen, setFullscreen] = useState(false);
    const closeFullscreen = useCallback(() => setFullscreen(false), []);

    // If the selected time range has no data
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
    const stats = { current, highest, lowest };

    const fmt = (v) => `${v}${satuan ? ` ${satuan}` : ''}`;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-base font-semibold text-[#1B2559]">{parameter.nama}</h3>
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

            <StatsGrid {...stats} kop={kop} satuan={satuan} fmt={fmt} className="mb-5" />

            <ParameterChart
                parameter={parameter}
                unit={unit}
                data={data}
                history={history}
                kop={kop}
                fmt={fmt}
                gradId={`fill-${unit.id}-${parameter.id}`}
                rangeMs={rangeMs}
            />

            <FullscreenChart
                open={fullscreen}
                onClose={closeFullscreen}
                parameter={parameter}
                unit={unit}
                data={data}
                history={history}
                kop={kop}
                satuan={satuan}
                fmt={fmt}
                stats={stats}
                rangeMs={rangeMs}
            />
        </div>
    );
}