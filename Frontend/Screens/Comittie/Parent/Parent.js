import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Color Tokens — Teacher Management Palette ───────────────────────────────
const C = {
  bg: '#0b0f1e',            // deep navy background
  surface: '#111827',       // card background
  surfaceAlt: '#1a2035',    // slightly lighter surface
  surfaceBorder: '#1e2d45', // card border / dividers
  navBg: '#0d1526',
  searchBg: '#111d33',
  textPrimary: '#e8edf5',
  textSecondary: '#8892a4',
  textMuted: '#4a5568',
  // Accents
  purple: '#7c5cfc',
  purpleLight: '#a78bfa',
  blue: '#4f8ef7',
  blueLight: '#93c5fd',
  // Badge colors
  badgeGreen: '#22c55e',
  badgeGreenBg: '#14532d',
  badgeRed: '#ef4444',
  badgeRedBg: '#450a0a',
  badgeGray: '#6b7280',
  badgeGrayBg: '#1f2937',
  // Status
  online: '#22c55e',
  offline: '#4a5568',
  // Donut
  donutActive: '#5b8def',
  donutInactive: '#1e2d45',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, badge, badgePositive, icon }) {
  const badgeColor = badgePositive === true ? C.badgeGreen : badgePositive === false ? C.badgeRed : C.textSecondary;
  const badgeBg    = badgePositive === true ? C.badgeGreenBg : badgePositive === false ? C.badgeRedBg : C.badgeGrayBg;
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <Text style={styles.statCardIcon}>{icon}</Text>
        <View style={[styles.badgePill, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgePillText, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>
      <Text style={styles.statCardLabel}>{title}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
    </View>
  );
}

// ─── Bar (purple-to-blue stacked) ────────────────────────────────────────────
function GradientBar({ heightPct, value, label, selected }) {
  const maxH = 110;
  const barH  = Math.max(6, Math.round((heightPct / 100) * maxH));
  return (
    <View style={styles.barGroupOuter}>
      <Text style={styles.barValueLabel}>{value}</Text>
      <View style={[styles.barTrack, { height: maxH }]}>
        <View style={[styles.barSegBottom, { height: barH * 0.45 }]} />
        <View style={[styles.barSegTop,    { height: barH * 0.55 }]} />
      </View>
      <Text style={[styles.barYearLabel, selected && styles.barYearSelected]}>{label}</Text>
    </View>
  );
}

// ─── Donut Ring ───────────────────────────────────────────────────────────────
function DonutRing({ total }) {
  return (
    <View style={styles.donutOuter}>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutSubLabel}>TOTAL</Text>
      </View>
    </View>
  );
}

// ─── Parent Row ───────────────────────────────────────────────────────────────
function ParentRow({ name, student, lastActive, status }) {
  const isOnline = status === 'ONLINE';
  return (
    <View style={styles.facultyRow}>
      <View style={styles.facultyAvatar}>
        <Text style={styles.facultyAvatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.facultyInfo}>
        <Text style={styles.facultyName}>{name}</Text>
        <Text style={styles.facultyDept}>{student}</Text>
      </View>
      <View style={styles.facultyRight}>
        <Text style={styles.facultyUpdate}>{isOnline ? 'Active now' : 'Last seen'}</Text>
        <Text style={styles.facultyTime}>{lastActive}</Text>
        <View style={[styles.statusPill, { backgroundColor: isOnline ? C.badgeGreenBg : C.badgeGrayBg }]}>
          <Text style={[styles.statusPillText, { color: isOnline ? C.badgeGreen : C.badgeGray }]}>
            {status}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ParentManagementDashboard() {
  const [searchText, setSearchText] = useState('');

  const parents = [
    { name: 'Sarah Jenkins',   student: 'Leo Jenkins (Grade 4)',     lastActive: 'Just now',    status: 'ONLINE'  },
    { name: 'Michael Chen',    student: 'Emily Chen (Grade 7)',      lastActive: '15 mins ago', status: 'OFFLINE' },
    { name: 'Elena Rodriguez', student: 'Sofia Rodriguez (Grade 5)', lastActive: '2 hours ago', status: 'ONLINE'  },
    { name: 'James Patel',     student: 'Arjun Patel (Grade 9)',     lastActive: '3 hours ago', status: 'OFFLINE' },
    { name: 'Linda Kim',       student: 'Mia Kim (Grade 3)',         lastActive: '5 hours ago', status: 'ONLINE'  },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Parent Management</Text>
            <Text style={styles.pageSubtitle}>Overview of parent enrollment and status health indicators.</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search parents..."
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* ── Stat Cards ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <StatCard title="Total Parents"    value="240" badge="+5%"  badgePositive={true}  icon="👥" />
          <StatCard title="Active Parents"   value="210" badge="+12%" badgePositive={true}  icon="✅" />
          <StatCard title="Inactive Parents" value="30"  badge="-3%"  badgePositive={false} icon="⏸" />
        </ScrollView>

        {/* ── Middle Row ── */}
        <View style={styles.midRow}>

          {/* Bar Chart Card */}
          <View style={[styles.card, styles.barCard]}>
            <Text style={styles.cardTitle}>Account Status</Text>
            <Text style={styles.cardSub}>Headcount breakdown</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalNumber}>240</Text>
              <Text style={styles.totalLabel}> Total</Text>
            </View>
            <View style={styles.barsRow}>
              <GradientBar heightPct={100} value="210" label="Active"   selected />
              <GradientBar heightPct={14}  value="30"  label="Inactive" />
            </View>
          </View>

          {/* Donut Card */}
          <View style={[styles.card, styles.donutCard]}>
            <Text style={styles.cardTitle}>Distribution</Text>
            <Text style={styles.cardSub}>Engagement split</Text>
            <DonutRing total="240" />
            <View style={styles.legendBlock}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: C.donutActive }]} />
                <View>
                  <Text style={styles.legendName}>Active <Text style={styles.legendPct}>87.5%</Text></Text>
                  <Text style={styles.legendDesc}>210 Verified</Text>
                </View>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: C.textMuted }]} />
                <View>
                  <Text style={styles.legendName}>Inactive <Text style={styles.legendPct}>12.5%</Text></Text>
                  <Text style={styles.legendDesc}>30 Pending</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Recently Active Parents ── */}
        <View style={[styles.card, styles.facultyCard]}>
          <View style={styles.facultyCardHeader}>
            <View>
              <Text style={styles.cardTitle}>Recently Active Parents</Text>
              <Text style={styles.cardSub}>Monitor recent platform engagement activity</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL →</Text>
            </TouchableOpacity>
          </View>
          {parents.map((p, i) => (
            <ParentRow key={i} {...p} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll:   { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft:    { flex: 1, paddingRight: 10 },
  pageTitle:     { color: C.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  pageSubtitle:  { color: C.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.surfaceBorder,
  },
  bellIcon: { fontSize: 17 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.searchBg,
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    height: 46,
  },
  searchIconText: { fontSize: 14, marginRight: 8 },
  searchInput:    { flex: 1, color: C.textPrimary, fontSize: 14 },

  // Stat row
  statsRow: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  statCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    width: width * 0.50,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  statCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statCardIcon:  { fontSize: 20 },
  badgePill:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgePillText: { fontSize: 11, fontWeight: '700' },
  statCardLabel: { color: C.textSecondary, fontSize: 12, marginBottom: 4 },
  statCardValue: { color: C.textPrimary, fontSize: 34, fontWeight: '800' },

  // Mid row
  midRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 12, marginBottom: 12 },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  barCard:   { flex: 1.1 },
  donutCard: { flex: 1 },
  cardTitle: { color: C.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cardSub:   { color: C.textSecondary, fontSize: 10, marginBottom: 8 },

  // Bar chart
  totalRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  totalNumber: { color: C.textPrimary, fontSize: 24, fontWeight: '800' },
  totalLabel:  { color: C.textSecondary, fontSize: 11 },
  barsRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 14, justifyContent: 'center' },
  barGroupOuter:  { alignItems: 'center', gap: 4 },
  barValueLabel:  { color: C.textSecondary, fontSize: 9, fontWeight: '600' },
  barTrack:       { width: 28, justifyContent: 'flex-end', borderRadius: 6, overflow: 'hidden' },
  barSegBottom:   { backgroundColor: C.blue, width: '100%' },
  barSegTop:      { backgroundColor: C.purple, width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barYearLabel:   { color: C.textMuted, fontSize: 9 },
  barYearSelected:{ color: C.blueLight, fontWeight: '700' },

  // Donut
  donutOuter: {
    width: 90, height: 90,
    borderRadius: 45,
    borderWidth: 13,
    borderColor: C.donutActive,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 10,
  },
  donutCenter:   { alignItems: 'center' },
  donutValue:    { color: C.textPrimary, fontSize: 18, fontWeight: '800' },
  donutSubLabel: { color: C.textSecondary, fontSize: 8, letterSpacing: 1.5 },

  // Legend
  legendBlock: { gap: 8 },
  legendRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  legendDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  legendName:  { color: C.textPrimary, fontSize: 11, fontWeight: '600' },
  legendPct:   { color: C.textSecondary, fontWeight: '400' },
  legendDesc:  { color: C.textSecondary, fontSize: 10 },

  // Faculty / Parent card
  facultyCard:       { marginHorizontal: 14, marginBottom: 32 },
  facultyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  viewAllText: { color: C.blue, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, paddingTop: 2 },

  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceBorder,
    gap: 12,
  },
  facultyAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.purple + '30',
    borderWidth: 1, borderColor: C.purple + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  facultyAvatarText: { color: C.purpleLight, fontSize: 15, fontWeight: '700' },
  facultyInfo:  { flex: 1 },
  facultyName:  { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  facultyDept:  { color: C.textSecondary, fontSize: 11, marginTop: 1 },
  facultyRight: { alignItems: 'flex-end', gap: 2 },
  facultyUpdate:{ color: C.textSecondary, fontSize: 10 },
  facultyTime:  { color: C.textMuted, fontSize: 10 },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
    marginTop: 3,
  },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});