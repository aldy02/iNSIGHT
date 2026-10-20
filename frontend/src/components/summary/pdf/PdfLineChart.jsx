import { View, Text, Svg, Path, Line, Circle, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import { line, area, curveMonotoneX } from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { buildYTicks, buildXTicks } from '../../../utils/chartTicks';

const C = {
  actual: '#003399',
  upper: '#F97316',
  lower: '#377CEF',
  dot: '#EF4444',
  grid: '#E5E9F2',
  text: '#8292AA',
};

export default function PdfLineChart({ id, data, kop, width = 494, height = 135 }) {
  const values = data.map((d) => d.nilai).filter((v) => v != null);
  if (values.length === 0) return null;

  const dataMax = Math.max(...values);
  const yMax = Math.max(dataMax, kop?.max ?? -Infinity) * 1.15 || 1;
  const highest = data.filter((d) => d.nilai != null).reduce((a, b) => (b.nilai > a.nilai ? b : a));
  const { ticks, decimals } = buildYTicks(0, yMax, 5);
  const fmt = (v) => v.toFixed(decimals);
  const xTicks = buildXTicks(data, 14);

  const m = { top: 6, right: 6, bottom: 18 };
  const left = Math.max(14, Math.max(...ticks.map((t) => fmt(t).length)) * 4.2 + 6);
  const plotW = width - left - m.right;
  const plotH = height - m.top - m.bottom;
  const padX = 8;
  const n = data.length;

  const px = (i) => left + (n <= 1 ? plotW / 2 : padX + (i * (plotW - padX * 2)) / (n - 1));
  const y = scaleLinear().domain([0, yMax]).range([m.top + plotH, m.top]);

  const pts = data.map((d, i) => ({ i, v: d.nilai }));
  const linePath = line()
    .defined((p) => p.v != null)
    .x((p) => px(p.i))
    .y((p) => y(p.v))
    .curve(curveMonotoneX)(pts);
  const areaPath = area()
    .defined((p) => p.v != null)
    .x((p) => px(p.i))
    .y0(y(0))
    .y1((p) => y(p.v))
    .curve(curveMonotoneX)(pts);

  const highestIdx = data.indexOf(highest);

  return (
    <View>
      {/* Legenda */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Legend color={C.actual} label="Aktual" />
          {kop?.max != null && <Legend color={C.upper} label="Batas Atas" dotted />}
          {kop?.min != null && <Legend color={C.lower} label="Batas Bawah" dotted />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Svg width={7} height={7}>
            <Circle cx={3.5} cy={3.5} r={3} fill={C.dot} />
          </Svg>
          <Text style={{ fontSize: 7, color: C.text, marginLeft: 3 }}>{`Titik Tertinggi \u2022 ${highest.label}`}</Text>
        </View>
      </View>

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient
            id={`g-${id}`}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={m.top}
            x2={0}
            y2={m.top + plotH}
          >
            <Stop offset="0%" stopColor={C.actual} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={C.actual} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid horizontal */}
        {ticks.map((t) => (
          <Line key={`gr-${t}`} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={0.5} />
        ))}
        {/* Garis axis X */}
        <Line x1={left} x2={left + plotW} y1={y(0)} y2={y(0)} stroke={C.grid} strokeWidth={0.5} />

        {/* Area and actual line */}
        {areaPath && <Path d={areaPath} fill={`url(#g-${id})`} />}
        {linePath && <Path d={linePath} fill="none" stroke={C.actual} strokeWidth={1.2} />}

        {/* Batas KOP */}
        {kop?.max != null && (
          <Line x1={left} x2={left + plotW} y1={y(kop.max)} y2={y(kop.max)} stroke={C.upper} strokeWidth={0.8} strokeDasharray="3 3" />
        )}
        {kop?.min != null && (
          <Line x1={left} x2={left + plotW} y1={y(kop.min)} y2={y(kop.min)} stroke={C.lower} strokeWidth={0.8} strokeDasharray="3 3" />
        )}

        {/* Titik tertinggi */}
        <Circle cx={px(highestIdx)} cy={y(highest.nilai)} r={2.6} fill={C.dot} stroke="#FFFFFF" strokeWidth={1} />

        {/* Tick Y */}
        {ticks.map((t) => (
          <Text key={`yt-${t}`} x={left - 6} y={y(t) + 2.5} textAnchor="end" fill={C.text} style={{ fontSize: 7 }}>
            {fmt(t)}
          </Text>
        ))}

        {/* Tick X */}
        {xTicks.map((lbl) => {
          const i = data.findIndex((d) => d.label === lbl);
          if (i < 0) return null;
          return (
            <Text key={`xt-${lbl}`} x={px(i)} y={y(0) + 11} textAnchor="middle" fill={C.text} style={{ fontSize: 7 }}>
              {lbl}
            </Text>
          );
        })}
      </Svg>
    </View>
  );
}

function Legend({ color, label, dotted }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <Svg width={12} height={4}>
        <Line
          x1={0} x2={12} y1={2} y2={2}
          stroke={color}
          strokeWidth={dotted ? 1 : 1.5}
          strokeDasharray={dotted ? '1 1.5' : undefined}
        />
      </Svg>
      <Text style={{ fontSize: 7, color: C.text, marginLeft: 3 }}>{label}</Text>
    </View>
  );
}