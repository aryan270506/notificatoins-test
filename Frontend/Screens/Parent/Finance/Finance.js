import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';

// ─── DATA ────────────────────────────────────────────────────────────────────
const yearlyData = [
  { year: 'Year 1 (2021-22)', tuition: '₹5,50,000', aid: '- ₹1,00,000', parent: '₹4,50,000', net: '₹0',        status: 'Paid Full', statusType: 'paid' },
  { year: 'Year 2 (2022-23)', tuition: '₹5,80,000', aid: '- ₹1,80,000', parent: '₹4,80,000', net: '₹0',        status: 'Paid Full', statusType: 'paid' },
  { year: 'Year 3 (2023-24)', tuition: '₹6,20,000', aid: '- ₹1,20,000', parent: '₹5,06,000', net: '₹0',        status: 'Paid Full', statusType: 'paid' },
  { year: 'Year 4 (2024-25)', tuition: '₹6,50,000', aid: '- ₹1,20,000', parent: '₹1,30,000', net: '₹4,00,000', status: 'Pending',   statusType: 'pending' },
];

const fundingSources = [
  { label: 'Personal Funds', percent: 65, color: '#F59E0B' },
  { label: 'Scholarships',   percent: 20, color: '#10B981' },
  { label: 'Other',          percent: 15, color: '#6366F1' },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const StatCard = ({ title, value, sub, showBar, style, s, C }) => (
  <View style={[s.statCard, style]}>
    <Text style={s.statTitle}>{title}</Text>
    <Text style={s.statValue}>{value}</Text>
    {sub && !showBar && <Text style={s.statSub}>{sub}</Text>}
    {showBar && (
      <View style={s.barWrap}>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: '75%' }]} />
        </View>
        <Text style={s.barLabel}>75%</Text>
      </View>
    )}
  </View>
);

const StatusBadge = ({ type, label, C }) => {
  const isPaid = type === 'paid';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 5,
      backgroundColor: isPaid
        ? (C.mode === 'dark' ? '#052e16' : '#dcfce7')
        : (C.mode === 'dark' ? '#431407' : '#fef3c7'),
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isPaid ? '#10B981' : '#F59E0B' }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: isPaid ? '#10B981' : '#F59E0B' }}>{label}</Text>
    </View>
  );
};

const TableRow = ({ item, index, isLaptop, C, s }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[s.tableRow, index % 2 === 0 && s.tableRowAlt, pressed && s.tableRowPressed]}
    >
      {isLaptop ? (
        <View style={s.tableRowInner}>
          <Text style={[s.cellText, { flex: 2 }]}>{item.year}</Text>
          <Text style={[s.cellText, { flex: 1.5, textAlign: 'center' }]}>{item.tuition}</Text>
          <Text style={[s.cellText, s.aidText, { flex: 1.5, textAlign: 'center' }]}>{item.aid}</Text>
          <Text style={[s.cellText, { flex: 1.5, textAlign: 'center' }]}>{item.parent}</Text>
          <Text style={[s.cellText, { flex: 1.2, textAlign: 'center' }, item.statusType === 'pending' && s.pendingAmount]}>
            {item.net}
          </Text>
          <View style={{ flex: 1.2, alignItems: 'center' }}>
            <StatusBadge type={item.statusType} label={item.status} C={C} />
          </View>
        </View>
      ) : (
        <View style={s.mobileRow}>
          <View style={s.mobileRowHeader}>
            <Text style={s.mobileRowYear}>{item.year}</Text>
            <StatusBadge type={item.statusType} label={item.status} C={C} />
          </View>
          <View style={s.mobileRowGrid}>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Tuition & Fees</Text>
              <Text style={s.mobileCellValue}>{item.tuition}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Financial Aid</Text>
              <Text style={[s.mobileCellValue, s.aidText]}>{item.aid}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Parent Contribution</Text>
              <Text style={s.mobileCellValue}>{item.parent}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Net Balance</Text>
              <Text style={[s.mobileCellValue, item.statusType === 'pending' && s.pendingAmount]}>{item.net}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const DonutChart = ({ isLaptop, C, s }) => {
  const size = isLaptop ? 120 : 90;
  const stroke = 14;
  const inner = size - stroke * 2;
  return (
    <View style={s.donutWrapper}>
      <View style={[s.donutPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[s.donutInner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text style={s.donutCenter}>24L</Text>
          <Text style={s.donutSub}>TOTAL</Text>
        </View>
      </View>
      <View style={s.legendWrap}>
        {fundingSources.map((src) => (
          <View key={src.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: src.color }]} />
            <Text style={s.legendText}>
              {src.label} <Text style={{ color: C.sub }}>{src.percent}%</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const CostTrendBars = ({ isLaptop, s }) => {
  const years = ['21-22', '22-23', '23-24', '24-25'];
  const tuitions = [5.5, 5.8, 6.2, 6.5];
  const scholarships = [1.0, 1.8, 1.2, 1.2];
  const maxVal = 7;
  const barH = isLaptop ? 100 : 80;
  return (
    <View style={s.trendWrap}>
      {years.map((y, i) => (
        <View key={y} style={s.trendGroup}>
          <View style={[s.trendBars, { height: barH }]}>
            <View style={[s.trendBar, { height: (tuitions[i] / maxVal) * barH, backgroundColor: '#6366F1', marginRight: 2 }]} />
            <View style={[s.trendBar, { height: (scholarships[i] / maxVal) * barH, backgroundColor: '#10B981' }]} />
          </View>
          <Text style={s.trendLabel}>{y}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function GraduationFinancialDashboard() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;
  const s = makeStyles(C, isLaptop);

  const [notifPressed,  setNotifPressed]  = useState(false);
  const [reportPressed, setReportPressed] = useState(false);

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.container, isLaptop && s.containerLaptop]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>4-Year Graduation Financial Overview</Text>
            <Text style={s.headerSub}>B.Tech in Computer Science & Engineering (2021 - 2025)</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.notifBtn, notifPressed && s.btnActiveLight]}
              activeOpacity={0.7}
              onPressIn={() => setNotifPressed(true)}
              onPressOut={() => setNotifPressed(false)}
            >
              <Text style={s.notifIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.reportBtn, reportPressed && s.reportBtnActive]}
              activeOpacity={0.7}
              onPressIn={() => setReportPressed(true)}
              onPressOut={() => setReportPressed(false)}
            >
              <Text style={s.reportBtnText}>⬆ Full Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STAT CARDS ── */}
        <View style={[s.statsRow, isLaptop && s.statsRowLaptop]}>
          <StatCard title="TOTAL 4-YEAR COST" value="₹24,00,000" sub="Includes tuition, campus fees & insurance" s={s} C={C} />
          <StatCard title="TOTAL PAID" value="₹18,00,000" showBar s={s} C={C} />
          <View style={s.statCard}>
            <Text style={s.statTitle}>REMAINING BALANCE</Text>
            <Text style={s.statValue}>₹6,00,000</Text>
          </View>
        </View>

        {/* ── YEARLY BREAKDOWN ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Yearly Financial Breakdown</Text>
            <TouchableOpacity style={s.filterBtn} activeOpacity={0.7}>
              <Text style={s.filterIcon}>⇅</Text>
            </TouchableOpacity>
          </View>

          {isLaptop && (
            <View style={s.tableHeader}>
              {['ACADEMIC YEAR', 'TUITION & FEES', 'FINANCIAL AID', 'PARENT CONTRIBUTION', 'NET BALANCE', 'STATUS'].map((h, i) => (
                <Text
                  key={h}
                  style={[s.tableHeaderText, { flex: i === 0 ? 2 : i === 4 || i === 5 ? 1.2 : 1.5, textAlign: i === 0 ? 'left' : 'center' }]}
                >
                  {h}
                </Text>
              ))}
            </View>
          )}

          {yearlyData.map((item, i) => (
            <TableRow key={item.year} item={item} index={i} isLaptop={isLaptop} C={C} s={s} />
          ))}
        </View>

        {/* ── BOTTOM ROW ── */}
        <View style={[s.bottomRow, isLaptop && s.bottomRowLaptop]}>
          <View style={[s.bottomCard, isLaptop && { flex: 1 }]}>
            <Text style={s.sectionTitle}>Cost Trends over 4 Years</Text>
            <Text style={s.sectionSub}>Yearly Tuition vs Scholarship impact</Text>
            <CostTrendBars isLaptop={isLaptop} s={s} />
            <View style={s.trendLegend}>
              <View style={s.trendLegItem}>
                <View style={[s.legendDot, { backgroundColor: '#6366F1' }]} />
                <Text style={s.legendText}>Tuition</Text>
              </View>
              <View style={s.trendLegItem}>
                <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={s.legendText}>Scholarship</Text>
              </View>
            </View>
          </View>

          <View style={[s.bottomCard, isLaptop && { flex: 1 }]}>
            <Text style={s.sectionTitle}>Funding Sources</Text>
            <Text style={s.sectionSub}>Total distribution of funding</Text>
            <DonutChart isLaptop={isLaptop} C={C} s={s} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── DYNAMIC STYLES ───────────────────────────────────────────────────────────
function makeStyles(C, isLaptop) {
  // Semantic aliases
  const bg       = C.bg;
  const surface  = C.card;
  const surface2 = C.mode === 'dark' ? '#1c2233' : '#c8daf0';
  const border   = C.cardBorder;
  const accent   = C.blue;
  const text     = C.white;
  const textSub  = C.sub;
  const textMuted= C.muted;

  return StyleSheet.create({
    root:            { flex: 1, backgroundColor: bg },
    scroll:          { flex: 1 },
    container:       { padding: 16, paddingBottom: 40 },
    containerLaptop: { padding: 28, maxWidth: 1100, alignSelf: 'center', width: '100%' },

    // Header
    header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
    headerLeft:    { flex: 1, minWidth: 180 },
    headerTitle:   { fontSize: isLaptop ? 22 : 17, fontWeight: '700', color: text, letterSpacing: 0.2 },
    headerSub:     { fontSize: 12, color: textMuted, marginTop: 3 },
    headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
    notifBtn:      { backgroundColor: surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: border },
    btnActiveLight:{ backgroundColor: border },
    notifIcon:     { fontSize: 16 },
    reportBtn:     { backgroundColor: accent, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
    reportBtnActive:{ backgroundColor: C.blueLight },
    reportBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    // Stat Cards
    statsRow:      { flexDirection: 'column', gap: 12, marginBottom: 20 },
    statsRowLaptop:{ flexDirection: 'row' },
    statCard:      { backgroundColor: surface, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: border, flex: 1 },
    statTitle:     { fontSize: 10, fontWeight: '600', color: textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    statValue:     { fontSize: isLaptop ? 28 : 24, fontWeight: '800', color: text },
    statSub:       { fontSize: 11, color: textSub, marginTop: 6 },
    barWrap:       { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    barBg:         { flex: 1, height: 6, backgroundColor: border, borderRadius: 4, overflow: 'hidden' },
    barFill:       { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
    barLabel:      { fontSize: 12, color: '#10B981', fontWeight: '700' },

    // Section
    section:       { backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border },
    sectionTitle:  { fontSize: 15, fontWeight: '700', color: text },
    sectionSub:    { fontSize: 11, color: textSub, marginTop: 3, marginBottom: 12 },
    filterBtn:     { backgroundColor: surface2, borderRadius: 8, padding: 7 },
    filterIcon:    { color: textSub, fontSize: 14 },

    // Table
    tableHeader:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border },
    tableHeaderText: { fontSize: 10, fontWeight: '600', color: textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
    tableRow:        { borderBottomWidth: 1, borderBottomColor: border },
    tableRowAlt:     { backgroundColor: 'transparent' },
    tableRowPressed: { backgroundColor: surface2 },
    tableRowInner:   { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
    cellText:        { fontSize: 13, color: textSub },
    aidText:         { color: '#F87171' },
    pendingAmount:   { color: accent },

    // Mobile row
    mobileRow:        { padding: 14 },
    mobileRowHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    mobileRowYear:    { fontSize: 13, fontWeight: '700', color: text },
    mobileRowGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mobileCell:       { width: '47%' },
    mobileCellLabel:  { fontSize: 10, color: textMuted, letterSpacing: 0.6, marginBottom: 3, textTransform: 'uppercase' },
    mobileCellValue:  { fontSize: 13, color: textSub, fontWeight: '500' },

    // Bottom row
    bottomRow:      { gap: 16 },
    bottomRowLaptop:{ flexDirection: 'row' },
    bottomCard:     { backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 18 },

    // Trend chart
    trendWrap:    { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 16, marginBottom: 12 },
    trendGroup:   { alignItems: 'center', gap: 4 },
    trendBars:    { flexDirection: 'row', alignItems: 'flex-end' },
    trendBar:     { width: isLaptop ? 18 : 14, borderRadius: 3 },
    trendLabel:   { fontSize: 10, color: textMuted },
    trendLegend:  { flexDirection: 'row', gap: 16 },
    trendLegItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },

    // Donut
    donutWrapper:     { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 20, flexWrap: 'wrap' },
    donutPlaceholder: { backgroundColor: 'transparent', borderWidth: 14, borderColor: '#F59E0B', borderTopColor: '#10B981', borderLeftColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    donutInner:       { backgroundColor: surface, justifyContent: 'center', alignItems: 'center' },
    donutCenter:      { fontSize: 18, fontWeight: '800', color: text },
    donutSub:         { fontSize: 9, color: textMuted, letterSpacing: 1 },
    legendWrap:       { gap: 8 },
    legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
    legendDot:        { width: 10, height: 10, borderRadius: 5 },
    legendText:       { fontSize: 12, color: textSub },
  });
}