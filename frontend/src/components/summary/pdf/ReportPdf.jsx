import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import PdfLineChart from './PdfLineChart';
import { fmtNum } from '../../../utils/summary';
import logo from '../../../assets/Logo.png';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
  ],
});

const INK = '#1B2559';
const MUTED = '#8292AA';
const LINE = '#E2E8F0';

// Page setting
const PER_PAGE = 3;
const CHART_H = 75; // Chart height

const PAGE_PAD_TOP = 24;
const PAGE_PAD_BOTTOM = 42;
const PAGE_H = 842; // A4 (pt)
const CONTENT_H = PAGE_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM;

// Size settings
const EST = {
  base: 172,
  summaryLine: 13,
  summaryChars: 105,
  summaryGap: 6,
  unitTitle: 19,
  category: 28,
  group: 18,
  noData: 20,
  firstPageHeader: 50,
  safety: 6,
};

const s = StyleSheet.create({
  page: {
    paddingTop: PAGE_PAD_TOP,
    paddingHorizontal: 32,
    paddingBottom: PAGE_PAD_BOTTOM,
    fontSize: 9,
    fontFamily: 'Roboto',
    color: INK,
  },
  title: { fontSize: 18, fontFamily: 'Roboto', fontWeight: 'bold', marginTop: 0 },
  intro: { fontSize: 10, marginTop: 3, marginBottom: 4, lineHeight: 1.3 },
  bold: { fontFamily: 'Roboto', fontWeight: 'bold' },
  category: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    paddingBottom: 3,
    borderBottomWidth: 0.7,
    borderBottomColor: LINE,
    marginTop: 4,
    marginBottom: 4,
  },
  group: { fontSize: 10.5, fontFamily: 'Roboto', fontWeight: 'bold', marginBottom: 3, marginTop: 0 },

  // Card box
  card: { borderLeftWidth: 0.7, borderRightWidth: 0.7, borderColor: LINE },
  cardFirst: { borderTopWidth: 0.7, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  cardNext: { borderTopWidth: 0.5 },
  cardLast: { borderBottomWidth: 0.7, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, marginBottom: 6 },
  cardPageEnd: { marginBottom: 0 }, // The verry bootm of the card in the page did not have a margin so it will not overflow

  unitTitle: { fontSize: 10, fontFamily: 'Roboto', fontWeight: 'bold', paddingHorizontal: 10, paddingTop: 6, paddingBottom: 0 },
  param: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8 },
  paramName: { fontSize: 10, fontFamily: 'Roboto', fontWeight: 'bold' },
  kop: { fontSize: 8, color: MUTED, marginTop: 3, marginBottom: 5 },
  chartBox: { borderWidth: 0.7, borderColor: LINE, borderRadius: 4, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 3 },
  empty: { fontSize: 8, color: MUTED, textAlign: 'center', paddingVertical: 20 },
  statsRow: { flexDirection: 'row', marginTop: 6 },
  stat: { flex: 1, borderWidth: 0.7, borderColor: LINE, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 },
  statLast: { marginRight: 0 },
  statLabel: { fontSize: 7, color: MUTED },
  statValue: { fontSize: 9, fontFamily: 'Roboto', fontWeight: 'bold', marginTop: 1 },
  summary: { marginTop: 6, fontSize: 9, lineHeight: 1.4 },

  // Footer
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 18,
    paddingTop: 6,
    borderTopWidth: 0.7,
    borderTopColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
  },
  footerLogo: { width: 84, height: 12.5 }, // rasio 504x75
  footerText: { flex: 1, textAlign: 'center', paddingHorizontal: 8 },
  footerPage: { width: 84, textAlign: 'right' },
});

function Stat({ label, value, last }) {
  return (
    <View style={[s.stat, last && s.statLast]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// Satu blok = satu parameter (judul unit hanya di parameter pertama)
function ParamBlock({ p, title, first, last, pageEnd }) {
  const unit = p.satuan ? ` ${p.satuan}` : '';
  const val = (n) => (p.stats ? `${fmtNum(n)}${unit}` : '-');
  return (
    <View
      style={[s.card, first ? s.cardFirst : s.cardNext, last && s.cardLast, pageEnd && s.cardPageEnd]}
      wrap={false}
    >
      {title ? <Text style={s.unitTitle}>{title}</Text> : null}

      <View style={s.param}>
        <Text style={s.paramName}>{p.nama}</Text>
        <Text style={s.kop}>{`KOP ${p.kopLabel}`}</Text>

        <View style={s.chartBox}>
          {p.stats ? (
            <PdfLineChart id={p.key.replace(/[^a-zA-Z0-9]/g, '-')} data={p.data} kop={p.kop} height={CHART_H} />
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

// Susun blok: kategori => sub kategori => unit => parameter
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

// Perkiraan tinggi satu blok (pt)
function estimateHeight(b) {
  let h = EST.base;
  if (!b.p.stats) h += EST.noData;
  if (b.p.summary) {
    h += Math.ceil(b.p.summary.length / EST.summaryChars) * EST.summaryLine + EST.summaryGap;
  }
  if (b.unitTitle) h += EST.unitTitle;
  if (b.cat) h += EST.category;
  if (b.group) h += EST.group;
  return h;
}

// Bagi ke halaman: maksimal PER_PAGE blok DAN tidak melebihi tinggi halaman
function paginate(blocks) {
  const pages = [];
  let cur = [];
  let used = EST.firstPageHeader;
  const limit = CONTENT_H - EST.safety;

  blocks.forEach((b) => {
    const h = estimateHeight(b);
    const full = cur.length >= PER_PAGE || (cur.length > 0 && used + h > limit);
    if (full) {
      pages.push(cur);
      cur = [];
      used = 0;
    }
    cur.push(b);
    used += h;
  });
  if (cur.length) pages.push(cur);
  return pages;
}

const formatPrinted = (d = new Date()) =>
  d.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ReportPdf({ report }) {
  const printedAt = report.printedAt ?? formatPrinted();
  const pages = paginate(buildBlocks(report));

  return (
    <Document title={`Laporan ${report.plantName}`} author="iNSIGHT - Pupuk Kaltim">
      {pages.map((blocks, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          {pageIdx === 0 && (
            <>
              <Text style={s.title}>Water Quality</Text>
              <Text style={s.intro}>
                {'Berikut merupakan kualitas air Utilitas '}
                <Text style={s.bold}>{report.plantName}</Text>
                {' pada '}
                <Text style={s.bold}>{report.periodLabel}</Text>
                {'.'}
              </Text>
            </>
          )}

          {blocks.map((b, i) => {
            const block = (
              <ParamBlock
                p={b.p}
                title={b.unitTitle}
                first={b.first}
                last={b.last}
                pageEnd={i === blocks.length - 1}
              />
            );
            if (!b.cat && !b.group) return <View key={b.key}>{block}</View>;
            return (
              <View key={b.key} wrap={false}>
                {b.cat && <Text style={s.category}>{b.cat.title}</Text>}
                {b.group && <Text style={s.group}>{b.group.title}</Text>}
                {block}
              </View>
            );
          })}

          <View style={s.footer} fixed>
            <Image src={logo} style={s.footerLogo} />
            <Text style={s.footerText}>{`iNSIGHT - Pupuk Kaltim | Dept. PPE | ${report.plantName} | Dicetak ${printedAt}`}</Text>
            <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  );
}