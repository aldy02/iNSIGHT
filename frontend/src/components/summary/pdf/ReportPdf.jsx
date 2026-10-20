// src/components/summary/pdf/ReportPdf.jsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import PdfLineChart from './PdfLineChart';
import { fmtNum } from '../../../utils/summary';

const INK = '#1B2559';
const MUTED = '#8292AA';
const LINE = '#E2E8F0';

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: INK },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: 8 },
  intro: { fontSize: 10.5, marginTop: 6, marginBottom: 14, lineHeight: 1.4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  category: { fontSize: 13, fontFamily: 'Helvetica-Bold', paddingBottom: 4, borderBottomWidth: 0.7, borderBottomColor: LINE, marginTop: 10, marginBottom: 8 },
  group: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 2 },

// Card box
  card: { borderLeftWidth: 0.7, borderRightWidth: 0.7, borderColor: LINE },
  cardFirst: { borderTopWidth: 0.7, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  cardNext: { borderTopWidth: 0.5 },
  cardLast: { borderBottomWidth: 0.7, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, marginBottom: 10 },

  unitTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 0 },
  param: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 14 },
  paramName: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  kop: { fontSize: 8, color: MUTED, marginTop: 5, marginBottom: 10 },
  chartBox: { borderWidth: 0.7, borderColor: LINE, borderRadius: 4, paddingHorizontal: 6, paddingTop: 10, paddingBottom: 6 },
  empty: { fontSize: 8, color: MUTED, textAlign: 'center', paddingVertical: 28 },
  statsRow: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1, borderWidth: 0.7, borderColor: LINE, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6, marginRight: 6 },
  statLast: { marginRight: 0 },
  statLabel: { fontSize: 7, color: MUTED },
  statValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  summary: { marginTop: 12, fontSize: 9, lineHeight: 1.6 },
});

function Stat({ label, value, last }) {
  return (
    <View style={[s.stat, last && s.statLast]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// One block one parameter title unit follow the first
function ParamBlock({ p, title, first, last }) {
  const unit = p.satuan ? ` ${p.satuan}` : '';
  const val = (n) => (p.stats ? `${fmtNum(n)}${unit}` : '-');
  return (
    <View style={[s.card, first ? s.cardFirst : s.cardNext, last && s.cardLast]} wrap={false}>
      {title ? <Text style={s.unitTitle}>{title}</Text> : null}

      <View style={s.param}>
        <Text style={s.paramName}>{p.nama}</Text>
        <Text style={s.kop}>{`KOP ${p.kopLabel}`}</Text>

        <View style={s.chartBox}>
          {p.stats ? (
            <PdfLineChart id={p.key.replace(/[^a-zA-Z0-9]/g, '-')} data={p.data} kop={p.kop} />
          ) : (
            <Text style={s.empty}>Belum ada data pada periode ini</Text>
          )}
        </View>

        <View style={s.statsRow}>
          <Stat label="Rata-rata" value={val(p.stats?.avg)} />
          <Stat label="Tertinggi" value={val(p.stats?.max)} />
          <Stat label="Terendah" value={val(p.stats?.min)} />
          <Stat label="Di luar KOP" value={p.stats ? `${p.stats.outCount} hari` : '-'} last />
        </View>

        {p.summary ? <Text style={s.summary}>{p.summary}</Text> : null}
      </View>
    </View>
  );
}

// Bouilding block category => sub category => unit => paramete
function buildBlocks(report) {
  const blocks = [];
  const seenCat = new Set();
  const seenGroup = new Set();

  report.categories.forEach((cat) =>
    cat.groups.forEach((g) =>
      g.units.forEach((u) =>
        u.params.forEach((p, pi) => {
          const groupKey = `${cat.id}/${g.id}`;
          blocks.push({
            key: `${groupKey}/${u.id}/${p.key}`,
            cat: seenCat.has(cat.id) ? null : cat,
            group: g.title && !seenGroup.has(groupKey) ? g : null,
            unitTitle: pi === 0 ? u.title : null,
            p,
            first: pi === 0,
            last: pi === u.params.length - 1,
          });
          seenCat.add(cat.id);
          seenGroup.add(groupKey);
        })
      )
    )
  );
  return blocks;
}

export default function ReportPdf({ report }) {
  return (
    <Document title={`Laporan ${report.plantName}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Water Quality</Text>
        <Text style={s.intro}>
          {'Berikut merupakan kualitas air Utilitas '}
          <Text style={s.bold}>{report.plantName}</Text>
          {' pada '}
          <Text style={s.bold}>{report.periodLabel}</Text>
          {'.'}
        </Text>

        {buildBlocks(report).map((b) => {
          const block = <ParamBlock p={b.p} title={b.unitTitle} first={b.first} last={b.last} />;
          if (!b.cat && !b.group) return <View key={b.key}>{block}</View>;
          return (
            <View key={b.key} wrap={false}>
              {b.cat && <Text style={s.category}>{b.cat.title}</Text>}
              {b.group && <Text style={s.group}>{b.group.title}</Text>}
              {block}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}