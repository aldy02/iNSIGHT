import { CircleCheck, TrendingUp, TrendingDown, KeySquare } from 'lucide-react';
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

    const current = readings[readings.length - 1];
    const highest = readings.reduce((a, b) => (b.nilai > a.nilai ? b : a), readings[0]);
    const lowest = readings.reduce((a, b) => (b.nilai < a.nilai ? b : a), readings[0]);

    const fmt = (v) => `${v}${satuan ? ` ${satuan}` : ''}`;

    // Count batas atas Y-axis to always show batas atas KOP
    const dataMax = Math.max(...readings.map((r) => r.nilai));
    const dataMin = Math.min(...readings.map((r) => r.nilai));
    const candidatesMax = [dataMax, kop?.max ?? -Infinity].filter((v) => v > -Infinity);
    const candidatesMin = [dataMin, kop?.min ?? Infinity].filter((v) => v < Infinity);
    const yMax = Math.max(...candidatesMax) * 1.15;
    const yMin = 0;

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
            <div className="flex items-center gap-5 text-xs text-[#8292AA] mb-2 flex-wrap">
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
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Titik Tertinggi &bull; {highest.label}
                </span>
            </div>

            {/* Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={readings} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                            domain={[yMin, yMax]}
                            tick={{ fontSize: 11, fill: '#8292AA' }}
                            axisLine={false}
                            tickLine={false}
                            width={36}
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