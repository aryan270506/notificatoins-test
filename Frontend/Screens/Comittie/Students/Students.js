import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Animated,
  StatusBar,
} from 'react-native';

// ─── Stat Card (full-width, stacked) ────────────────────────────────────────
const StatCard = ({ title, value, subtitle, valueColor, iconEmoji, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.statIconWrap}>
        <Text style={styles.statIconText}>{iconEmoji}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={[styles.statSub, { color: subtitle.color }]}>{subtitle.text}</Text>
    </Animated.View>
  );
};

// ─── Year Item ───────────────────────────────────────────────────────────────
const YearItem = ({ year, count, showDivider }) => (
  <View style={styles.yearItem}>
    <Text style={styles.yearLabel}>{year}</Text>
    <Text style={styles.yearCount}>{count}</Text>
    {showDivider && <View style={styles.yearDivider} />}
  </View>
);

// ─── Bar Chart ───────────────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const CHART_H = 180;

  const barColor = (v) => {
    if (v >= 80) return '#4f7cff';
    if (v >= 60) return '#7c6fff';
    return '#4ade80';
  };

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {/* Y axis labels */}
        <View style={styles.yAxis}>
          {['100%', '75%', '50%', '25%', '0%'].map((l) => (
            <Text key={l} style={styles.yLabel}>{l}</Text>
          ))}
        </View>

        {/* Bars + grid */}
        <View style={{ flex: 1 }}>
          <View style={[styles.gridWrap, { height: CHART_H }]}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>
          <View style={[styles.barsRow, { height: CHART_H }]}>
            {data.map((item, i) => {
              const anim = useRef(new Animated.Value(0)).current;
              useEffect(() => {
                Animated.timing(anim, {
                  toValue: (item.value / 100) * CHART_H,
                  duration: 700,
                  delay: i * 80,
                  useNativeDriver: false,
                }).start();
              }, [item.value]);

              return (
                <View key={item.day} style={styles.barCol}>
                  <Animated.View
                    style={[styles.bar, { height: anim, backgroundColor: barColor(item.value) }]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X labels */}
      <View style={styles.xLabelsRow}>
        <View style={styles.xLabelSpacer} />
        {data.map((item) => (
          <Text key={item.day} style={styles.xLabel}>{item.day}</Text>
        ))}
      </View>
    </View>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
export default function StudentManagementDashboard() {
  const [activeTab, setActiveTab] = useState('Weekly');

  const weeklyData = [
    { day: 'Mon', value: 88 },
    { day: 'Tue', value: 72 },
    { day: 'Wed', value: 91 },
    { day: 'Thu', value: 65 },
    { day: 'Fri', value: 83 },
    { day: 'Sat', value: 45 },
    { day: 'Sun', value: 38 },
  ];

  const monthlyData = [
    { day: 'W1', value: 82 },
    { day: 'W2', value: 78 },
    { day: 'W3', value: 85 },
    { day: 'W4', value: 90 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080e25" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb */}
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbGray}>Dashboard {'>'} </Text>
          <Text style={styles.breadcrumbBlue}>Students</Text>
        </View>

        {/* Page title */}
        <Text style={styles.pageTitle}>Student Management</Text>

        {/* Search + Add button */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search student by name or roll..."
              placeholderTextColor="#4b5563"
            />
          </View>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>＋  Add Single Student</Text>
          </TouchableOpacity>
        </View>

        {/* Stat Cards — full width stacked */}
        <StatCard
          title="Total Students"
          value="1,200"
          subtitle={{ text: '↑ +4.2% from last term', color: '#4ade80' }}
          iconEmoji="👥"
          delay={0}
        />
        <StatCard
          title="Enrolled Students"
          value="1,100"
          subtitle={{ text: '✓  91.6% Retention rate', color: '#4ade80' }}
          iconEmoji="✅"
          delay={100}
        />
        <StatCard
          title="Inactive Students"
          value="100"
          valueColor="#f59e0b"
          subtitle={{ text: '⚠  Action required', color: '#f59e0b' }}
          iconEmoji="🚫"
          delay={200}
        />

        {/* Year-wise Distribution */}
        <Text style={styles.sectionTitle}>Year-wise Distribution</Text>
        <View style={styles.yearCard}>
          <YearItem year="1ST YEAR" count="320" showDivider />
          <YearItem year="2ND YEAR" count="290" showDivider />
          <YearItem year="3RD YEAR" count="310" showDivider />
          <YearItem year="4TH YEAR" count="280" showDivider={false} />
        </View>

        {/* Attendance Chart */}
        <View style={styles.chartCard}>
          {/* Title */}
          <View style={styles.chartTitleRow}>
            <Text style={styles.chartIcon}>📊</Text>
            <Text style={styles.chartTitle}>Weekly Student Attendance</Text>
          </View>

          {/* Controls */}
          <View style={styles.chartControlRow}>
            
          </View>

          <BarChart data={activeTab === 'Weekly' ? weeklyData : monthlyData} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const BG = '#080e25';
const CARD = '#0f172a';
const BORDER = '#1a2848';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 },

  /* Breadcrumb */
  breadcrumbRow: { flexDirection: 'row', marginBottom: 4 },
  breadcrumbGray: { fontSize: 12, color: '#6b7280' },
  breadcrumbBlue: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },

  /* Title */
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    marginBottom: 16,
  },

  /* Search */
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: '#e2e8f0', fontSize: 13, padding: 0 },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Stat Cards */
  statCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  statIconWrap: { position: 'absolute', top: 14, right: 16, opacity: 0.2 },
  statIconText: { fontSize: 52 },
  statTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 8 },
  statValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  statSub: { fontSize: 13, fontWeight: '600' },

  /* Year Distribution */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  yearCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    paddingVertical: 24,
    marginBottom: 14,
  },
  yearItem: { flex: 1, alignItems: 'center', position: 'relative' },
  yearLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  yearCount: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  yearDivider: {
    position: 'absolute',
    right: 0,
    top: '10%',
    height: '80%',
    width: 2,
    backgroundColor: '#1e3a8a',
    borderRadius: 1,
  },

  /* Chart Card */
  chartCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chartIcon: { fontSize: 18 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  chartControlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: '#0a1228', borderRadius: 8, padding: 3 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4ade80',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  exportIcon: { fontSize: 13 },
  exportText: { fontSize: 12, color: '#4ade80', fontWeight: '700' },

  /* Bar Chart */
  yAxis: {
    width: 40,
    height: 180,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yLabel: { fontSize: 10, color: '#4b5563' },
  gridWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'space-between',
  },
  gridLine: { height: 1, backgroundColor: '#151e38', width: '100%' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, gap: 5 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '90%', borderRadius: 5, minHeight: 4 },
  xLabelsRow: { flexDirection: 'row', marginTop: 6 },
  xLabelSpacer: { width: 40 },
  xLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#6b7280', fontWeight: '500' },
});