import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mock Data ────────────────────────────────────────────────────────────────
const attendanceByYearDiv = {
  '1st': {
    A: [78, 82, 80, 85, 88, 83, 81, 87, 84, 86, 89, 85, 83, 88, 90, 86, 84, 88, 91, 87, 85, 89, 92, 88, 86, 90, 93, 89, 87, 91],
    B: [72, 75, 78, 74, 80, 77, 73, 81, 79, 76, 78, 82, 80, 77, 75, 79, 83, 81, 78, 76, 80, 82, 79, 77, 81, 84, 80, 78, 82, 79],
    C: [80, 84, 82, 87, 90, 85, 83, 89, 86, 88, 91, 87, 85, 90, 92, 88, 86, 90, 93, 89, 87, 91, 94, 90, 88, 92, 95, 91, 89, 93],
  },
  '2nd': {
    A: [85, 88, 86, 91, 94, 89, 87, 93, 90, 92, 95, 91, 89, 94, 92, 90, 88, 92, 95, 91, 89, 93, 96, 92, 90, 94, 93, 91, 89, 93],
    B: [76, 79, 77, 82, 85, 80, 78, 84, 81, 83, 86, 82, 80, 85, 87, 83, 81, 85, 88, 84, 82, 86, 89, 85, 83, 87, 90, 86, 84, 88],
    C: [82, 85, 83, 88, 91, 86, 84, 90, 87, 89, 92, 88, 86, 91, 89, 87, 85, 89, 92, 88, 86, 90, 93, 89, 87, 91, 94, 90, 88, 92],
  },
  '3rd': {
    A: [88, 91, 89, 94, 92, 90, 88, 93, 91, 95, 93, 91, 89, 92, 94, 90, 92, 96, 94, 92, 90, 93, 91, 95, 93, 97, 95, 93, 91, 94],
    B: [79, 82, 80, 85, 83, 81, 79, 84, 82, 86, 84, 82, 80, 83, 85, 81, 83, 87, 85, 83, 81, 84, 82, 86, 84, 88, 86, 84, 82, 85],
    C: [83, 86, 84, 89, 87, 85, 83, 88, 86, 90, 88, 86, 84, 87, 89, 85, 87, 91, 89, 87, 85, 88, 86, 90, 88, 92, 90, 88, 86, 89],
  },
  '4th': {
    A: [91, 94, 92, 97, 95, 93, 91, 96, 94, 92, 95, 93, 91, 94, 96, 92, 94, 98, 96, 94, 92, 95, 93, 97, 95, 93, 96, 94, 92, 95],
    B: [83, 86, 84, 89, 87, 85, 83, 88, 86, 84, 87, 85, 83, 86, 88, 84, 86, 90, 88, 86, 84, 87, 85, 89, 87, 85, 88, 86, 84, 87],
    C: [87, 90, 88, 93, 91, 89, 87, 92, 90, 88, 91, 89, 87, 90, 92, 88, 90, 94, 92, 90, 88, 91, 89, 93, 91, 89, 92, 90, 88, 91],
  },
};

const YEARS = ['1st', '2nd', '3rd', '4th'];
const DIVS = ['A', 'B', 'C'];

const YEAR_COLORS = {
  '1st': { primary: '#4FC3F7', bg: '#0A2030' },
  '2nd': { primary: '#66BB6A', bg: '#0A2010' },
  '3rd': { primary: '#FFA726', bg: '#201400' },
  '4th': { primary: '#CE93D8', bg: '#1A0820' },
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const MiniBarChart = ({ data, color, height = 100 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const barW = (SCREEN_WIDTH - 80) / data.length;

  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end' }}>
      {data.map((val, i) => {
        const barH = ((val - min) / range) * (height - 16) + 6;
        const opacity = 0.3 + ((val - min) / range) * 0.7;
        return (
          <View
            key={i}
            style={{
              width: barW - 1,
              height: barH,
              backgroundColor: color,
              opacity,
              borderRadius: 2,
              marginRight: 1,
            }}
          />
        );
      })}
    </View>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, color }) => (
  <View style={[styles.statPill, { borderColor: color + '40' }]}>
    <Text style={[styles.statPillValue, { color }]}>{value}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportYearDivSelection({ onBack }) {
  const [selectedYear, setSelectedYear] = useState('1st');
  const [selectedDiv, setSelectedDiv] = useState('A');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const accentColor = YEAR_COLORS[selectedYear].primary;
  const data = attendanceByYearDiv[selectedYear][selectedDiv];
  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const max = Math.max(...data);
  const min = Math.min(...data);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [selectedYear, selectedDiv]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Attendance Detail</Text>
          <Text style={styles.headerSub}>Monthly breakdown by year & division</Text>
        </View>
        <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Year Selector */}
        <Text style={styles.sectionLabel}>SELECT YEAR</Text>
        <View style={styles.yearGrid}>
          {YEARS.map(year => {
            const isActive = selectedYear === year;
            const c = YEAR_COLORS[year];
            return (
              <TouchableOpacity
                key={year}
                onPress={() => setSelectedYear(year)}
                style={[
                  styles.yearCard,
                  { borderColor: isActive ? c.primary : '#1A2C3D', backgroundColor: isActive ? c.bg : '#0D1B2A' },
                ]}
              >
                <View style={[styles.yearIndicator, { backgroundColor: isActive ? c.primary : '#1A2C3D' }]} />
                <Text style={[styles.yearCardText, { color: isActive ? c.primary : '#4A6070' }]}>
                  {year} Year
                </Text>
                {isActive && (
                  <View style={[styles.yearActiveCheck, { backgroundColor: c.primary }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Division Selector */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SELECT DIVISION</Text>
        <View style={styles.divRow}>
          {DIVS.map(div => {
            const isActive = selectedDiv === div;
            return (
              <TouchableOpacity
                key={div}
                onPress={() => setSelectedDiv(div)}
                style={[
                  styles.divCard,
                  {
                    backgroundColor: isActive ? accentColor + '20' : '#0D1B2A',
                    borderColor: isActive ? accentColor : '#1A2C3D',
                  },
                ]}
              >
                <Text style={[styles.divLetter, { color: isActive ? accentColor : '#3A5060' }]}>
                  {div}
                </Text>
                <Text style={[styles.divLabel, { color: isActive ? accentColor + 'CC' : '#2A4050' }]}>
                  Division
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Summary */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.statsRow}>
            <StatPill label="AVG %" value={`${avg}%`} color={accentColor} />
            <StatPill label="PEAK" value={`${max}%`} color="#66BB6A" />
            <StatPill label="LOW" value={`${min}%`} color="#EF5350" />
            <StatPill label="DAYS" value="30" color="#7A9AAA" />
          </View>

          {/* Chart Card */}
          <View style={[styles.chartCard, { borderColor: accentColor + '30' }]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>
                  {selectedYear} Year — Division {selectedDiv}
                </Text>
                <Text style={styles.chartSub}>Daily attendance · Current Month</Text>
              </View>
              <View style={[styles.avgBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                <Text style={[styles.avgBadgeText, { color: accentColor }]}>{avg}% avg</Text>
              </View>
            </View>

            <MiniBarChart data={data} color={accentColor} height={120} />

            <View style={styles.xAxisRow}>
              {['Day 1', 'Day 10', 'Day 20', 'Day 30'].map(l => (
                <Text key={l} style={styles.xAxisLabel}>{l}</Text>
              ))}
            </View>

            {/* Threshold line indicator */}
            <View style={styles.thresholdRow}>
              <View style={[styles.thresholdLine, { backgroundColor: '#EF5350' }]} />
              <Text style={styles.thresholdText}>75% minimum threshold</Text>
            </View>
          </View>

          {/* Week breakdown */}
          <Text style={[styles.sectionLabel, { marginTop: 20, marginBottom: 12 }]}>WEEKLY BREAKDOWN</Text>
          {[0, 1, 2, 3].map(week => {
            const weekData = data.slice(week * 7, week * 7 + 7);
            const weekAvg = Math.round(weekData.reduce((a, b) => a + b, 0) / weekData.length);
            const status = weekAvg >= 90 ? 'Excellent' : weekAvg >= 80 ? 'Good' : weekAvg >= 75 ? 'Satisfactory' : 'Critical';
            const statusColor = weekAvg >= 90 ? '#66BB6A' : weekAvg >= 80 ? accentColor : weekAvg >= 75 ? '#FFA726' : '#EF5350';
            return (
              <View key={week} style={styles.weekRow}>
                <Text style={styles.weekLabel}>Week {week + 1}</Text>
                <View style={styles.weekBarBg}>
                  <View style={[styles.weekBarFill, { width: `${weekAvg}%`, backgroundColor: statusColor }]} />
                </View>
                <Text style={[styles.weekPct, { color: statusColor }]}>{weekAvg}%</Text>
                <View style={[styles.weekTag, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                  <Text style={[styles.weekTagText, { color: statusColor }]}>{status}</Text>
                </View>
              </View>
            );
          })}

          {/* Students at risk */}
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskTitle}>⚠️  Students At Risk</Text>
              <Text style={styles.riskSub}>Below 75% attendance</Text>
            </View>
            {[
              { name: 'Marcus Reid', id: `${selectedYear === '1st' ? 'CS' : selectedYear === '2nd' ? 'BM' : selectedYear === '3rd' ? 'EC' : 'ME'}-2024-0${selectedDiv === 'A' ? '312' : selectedDiv === 'B' ? '445' : '518'}`, pct: 68 },
              { name: 'Priya Nair', id: `${selectedYear === '1st' ? 'CS' : selectedYear === '2nd' ? 'BM' : selectedYear === '3rd' ? 'EC' : 'ME'}-2024-0${selectedDiv === 'A' ? '287' : selectedDiv === 'B' ? '391' : '472'}`, pct: 71 },
            ].map((s, i) => (
              <View key={i} style={styles.riskRow}>
                <View style={[styles.riskAvatar, { backgroundColor: '#EF535020', borderColor: '#EF535040' }]}>
                  <Text style={styles.riskAvatarText}>{s.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskName}>{s.name}</Text>
                  <Text style={styles.riskId}>{s.id}</Text>
                </View>
                <View style={styles.riskPctBadge}>
                  <Text style={styles.riskPctText}>{s.pct}%</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070F1A' },
  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A2C3D',
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: '#0D1B2A', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1A2C3D',
  },
  backArrow: { color: '#7A9AAA', fontSize: 18, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#4A6070', fontSize: 11, marginTop: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  scroll: { padding: 16, paddingTop: 20 },
  sectionLabel: { color: '#3A5060', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  yearGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  yearCard: {
    width: (SCREEN_WIDTH - 52) / 2, padding: 14, borderRadius: 14,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative',
  },
  yearIndicator: { width: 8, height: 8, borderRadius: 4 },
  yearCardText: { fontSize: 13, fontWeight: '700' },
  yearActiveCheck: {
    position: 'absolute', right: 12, top: 12,
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#070F1A', fontSize: 10, fontWeight: '900' },
  divRow: { flexDirection: 'row', gap: 12 },
  divCard: {
    flex: 1, paddingVertical: 18, alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
  },
  divLetter: { fontSize: 28, fontWeight: '800' },
  divLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 16 },
  statPill: {
    flex: 1, backgroundColor: '#0D1B2A', borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  statPillValue: { fontSize: 16, fontWeight: '800' },
  statPillLabel: { color: '#3A5060', fontSize: 9, fontWeight: '700', marginTop: 2 },
  chartCard: {
    backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16, borderWidth: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chartSub: { color: '#4A6070', fontSize: 10, marginTop: 2 },
  avgBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  avgBadgeText: { fontSize: 11, fontWeight: '700' },
  xAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xAxisLabel: { color: '#2A4050', fontSize: 9 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  thresholdLine: { width: 16, height: 2, borderRadius: 1 },
  thresholdText: { color: '#EF5350', fontSize: 10, opacity: 0.7 },
  weekRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12, backgroundColor: '#0D1B2A',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1A2C3D',
  },
  weekLabel: { color: '#5A7A90', fontSize: 11, fontWeight: '600', width: 48 },
  weekBarBg: { flex: 1, height: 6, backgroundColor: '#1A2C3D', borderRadius: 3 },
  weekBarFill: { height: 6, borderRadius: 3 },
  weekPct: { fontSize: 12, fontWeight: '800', width: 36, textAlign: 'right' },
  weekTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  weekTagText: { fontSize: 9, fontWeight: '700' },
  riskCard: {
    backgroundColor: '#0D1B2A', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EF535030', marginTop: 4,
  },
  riskHeader: { marginBottom: 14 },
  riskTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  riskSub: { color: '#EF5350', fontSize: 10, marginTop: 2, opacity: 0.7 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  riskAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  riskAvatarText: { color: '#EF5350', fontSize: 11, fontWeight: '700' },
  riskName: { color: '#AAC0CC', fontSize: 12, fontWeight: '600' },
  riskId: { color: '#3A5060', fontSize: 10, marginTop: 1 },
  riskPctBadge: {
    backgroundColor: '#EF535020', borderRadius: 8, paddingHorizontal: 8,
    paddingVertical: 4, borderWidth: 1, borderColor: '#EF535040',
  },
  riskPctText: { color: '#EF5350', fontSize: 12, fontWeight: '800' },
});