import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
    CartesianGrid,
    ReferenceDot,
} from 'recharts';
import {
    ZOOM_STEP, MIN_SPAN_RATIO, MAX_ZOOM_OUT, PLOT_TOP, PLOT_BOTTOM, PLOT_RIGHT,
    toMs, buildYTicks, pickStepDays, buildXTicks,
} from '../../utils/chartAxis';
import { fmtNum } from '../../utils/summary';

// 15% space from highest point
const scaleMax = (m) => {
    const v = m * 1.15;
    return Number.isFinite(v) && v > 0 ? v : 1;
};

export default function MultiSeriesChart({ series, data, history, kop, mixedKop = false, satuan, fill = false }) {
    const source = history && history.length ? history : data;
    const fmt = (v) => (v == null ? '-' : `${fmtNum(v)}${satuan ? ` ${satuan}` : ''}`);

    // time length window: current time range
    const baseStart = toMs(data[0]);
    const baseEnd = toMs(data[data.length - 1]);
    const span = Math.max(1, baseEnd - baseStart);
    const minT = toMs(source[0]);
    const maxT = toMs(source[source.length - 1]);

    const [yRange, setYRange] = useState(null);
    const [winStart, setWinStart] = useState(null);
    const [dragging, setDragging] = useState(false);
    const chartRef = useRef(null);
    const dragRef = useRef(null);

    // Wheen filter or data change, zoom reset and psition move
    useEffect(() => {
        setYRange(null);
        setWinStart(null);
    }, [data]);

    const isZoomed = !!yRange;
    const canPan = fill || isZoomed; // Fullscreen can move
    const panned = canPan && winStart != null;

    const clampStart = (s) => Math.max(minT, Math.min(s, Math.max(minT, maxT - span)));

    const windowStart = panned ? clampStart(winStart) : baseStart;
    const visibleData = panned
        ? source.filter((r) => {
            const t = toMs(r);
            return t >= windowStart && t <= windowStart + span;
        })
        : data;

    // Highest point from all chart series
    const maxOfRows = (rows) => {
        let m = -Infinity;
        rows.forEach((r) =>
            series.forEach((s) => {
                const v = r[s.key];
                if (v != null && v > m) m = v;
            })
        );
        return m;
    };
    const kopMax = kop?.max ?? -Infinity;

    // Y scale
    const baseMax = scaleMax(Math.max(maxOfRows(data), kopMax));
    const yLimit = Math.max(baseMax, scaleMax(Math.max(maxOfRows(source), kopMax)));
    const visibleMax = visibleData.length ? scaleMax(Math.max(maxOfRows(visibleData), kopMax)) : baseMax;
    const fullMax = Math.max(baseMax, visibleMax);
    const curY = yRange ?? { min: 0, max: fullMax };

    // Bottom chart or lowest point of y value always 0, even when zoom
    const maxSpan = fullMax * MAX_ZOOM_OUT;
    const yLo = 0;
    const yHi = Math.max(yLimit, maxSpan);

    // Highest point from all plant
    let highest = null;
    visibleData.forEach((r) =>
        series.forEach((s) => {
            const v = r[s.key];
            if (v != null && (!highest || v > highest.nilai)) highest = { nilai: v, label: r.label, name: s.name };
        })
    );

    // Tick setting
    const { ticks, decimals } = buildYTicks(curY.min, curY.max, fill ? 8 : 5);
    const tickFmt = (v) => v.toFixed(decimals);

    const visibleSpan = visibleData.length ? toMs(visibleData[visibleData.length - 1]) - toMs(visibleData[0]) : 0;
    const xTicks = buildXTicks(visibleData, pickStepDays(visibleSpan, fill ? 30 : 18));

    const yAxisWidth = Math.max(36, Math.max(...ticks.map((t) => tickFmt(t).length), 1) * 7 + 10);
    const yAxisWidthRef = useRef(yAxisWidth);
    yAxisWidthRef.current = yAxisWidth;

    const clampY = (min, ySpan) => {
        const m = Math.max(yLo, Math.min(min, yHi - ySpan));
        return { min: m, max: m + ySpan };
    };

    // Zoom y
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

    // ctrl/cmd + scroll = zoom y
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

            // Right drag, move time back
            const plotW = Math.max(1, el.clientWidth - yAxisWidthRef.current - PLOT_RIGHT);
            const shiftMs = -((e.clientX - d.startX) / plotW) * span;
            setWinStart(clampStart(d.startWin + shiftMs));

            // Y move bottom and top only when y is zooming
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
        panned && visibleData.length ? `${visibleData[0].label} \u2013 ${visibleData[visibleData.length - 1].label}` : null;

    return (
        <div className={fill ? 'flex flex-col h-full min-h-0' : ''}>
            {/* Legenda */}
            <div className={`flex items-center justify-between text-xs text-[#8292AA] ${fill ? 'mb-2 mt-3' : 'mb-4 mt-4'} flex-wrap gap-x-6 gap-y-2`}>
                <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
                    {series.map((s) => (
                        <span key={s.key} className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: s.color }} /> {s.name}
                        </span>
                    ))}
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
                    {mixedKop && <span>Batas KOP berbeda antar pabrik, lihat tabel</span>}
                </div>

                {highest && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Titik Tertinggi &bull; {highest.name} &bull;{' '}
                        {highest.label}
                    </div>
                )}
            </div>

            {/* Petunjuk zoom */}
            <div className="flex items-center justify-between gap-3 mb-2 min-h-7">
                <span className="text-[11px] text-[#8292AA]">
                    Zoom: Ctrl + Scroll
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
                className={`${fill ? 'flex-1 min-h-0' : 'h-72'} select-none outline-none **:outline-none [&_*:focus]:outline-none`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleData} margin={{ top: PLOT_TOP, right: PLOT_RIGHT, left: 0, bottom: 0 }}>
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
                            formatter={(value, name) => [fmt(value), name]}
                            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E9F2' }}
                        />
                        {kop?.max != null && <ReferenceLine y={kop.max} stroke="#F97316" strokeDasharray="4 4" strokeWidth={1.5} />}
                        {kop?.min != null && <ReferenceLine y={kop.min} stroke="#377CEF" strokeDasharray="4 4" strokeWidth={1.5} />}
                        {series.map((s) => (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={!canPan}
                                connectNulls={false}
                            />
                        ))}
                        {highest && (
                            <ReferenceDot x={highest.label} y={highest.nilai} r={5} fill="#EF4444" stroke="#fff" strokeWidth={2} />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}