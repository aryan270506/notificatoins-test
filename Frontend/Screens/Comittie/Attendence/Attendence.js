import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import SelectionScreen from './Selection-Screen'; // ← your separate file

const { width } = Dimensions.get('window');

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d1b3e',
  card: '#152250',
  cardAlt: '#1a2a5e',
  accent: '#4f7cff',
  accentLight: '#7b9fff',
  green: '#2ecc71',
  greenDim: '#1a7a43',
  yellow: '#f0a500',
  yellowDim: '#7a5200',
  purple: '#8b6fff',
  text: '#ffffff',
  textMuted: '#8899cc',
  border: '#1e3070',
  ring1st: '#4466cc',
  ring2nd: '#4f7cff',
  ring3rd: '#8b6fff',
};

// ─── Circular Progress ────────────────────────────────────────────────────────
function DonutChart({ percent, color, size = 110 }) {
  const stroke = 10;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.bg }} />
      <View
        style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: stroke, borderColor: color,
          borderTopColor: percent < 25 ? C.bg : color,
          borderRightColor: percent < 50 ? C.bg : color,
          borderBottomColor: percent < 75 ? C.bg : color,
          transform: [{ rotate: '-45deg' }],
        }}
      />
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>{percent}%</Text>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statSub, { color: subColor || C.green }]}>{sub}</Text>
    </View>
  );
}

// ─── Year Card ────────────────────────────────────────────────────────────────
function YearCard({ year, percent, conducted, attended, color }) {
  return (
    <View style={[styles.yearCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.yearLabel}>{year}</Text>
      <View style={{ alignItems: 'center', marginVertical: 14 }}>
        <DonutChart percent={percent} color={color} size={100} />
      </View>
      <View style={styles.yearStats}>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatLabel}>Conducted</Text>
          <Text style={styles.yearStatValue}>{conducted}</Text>
        </View>
        <View style={styles.yearStatItem}>
          <Text style={styles.yearStatLabel}>Avg Attended</Text>
          <Text style={styles.yearStatValue}>{attended}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Attendance Bar ───────────────────────────────────────────────────────────
function AttBar({ count, color }) {
  return (
    <View style={styles.attBar}>
      <Text style={[styles.attCount, { color }]}>{count}</Text>
      <Text style={[styles.attPresent, { color }]}>Present</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: color, width: count > 60 ? '90%' : count > 50 ? '75%' : '55%' }]} />
      </View>
    </View>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function ClassRow({ icon, iconBg, subject, year, faculty, date, duration, attendance, attColor, onEdit }) {
  return (
    <View style={styles.tableRow}>
      <View style={[styles.subjectIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1.4 }}>
        <Text style={styles.subjectName}>{subject}</Text>
      </View>
      <Text style={styles.tableCell}>{year}</Text>
      <Text style={styles.tableCell}>{faculty}</Text>
      <Text style={styles.tableCell}>{date}</Text>
      <Text style={styles.tableCell}>{duration}</Text>
      <AttBar count={attendance} color={attColor} />
      <TouchableOpacity style={styles.moreBtn} onPress={onEdit}>
        <Text style={styles.moreBtnText}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const [page, setPage] = useState(1);
  const [showSelection, setShowSelection] = useState(false); // ← single state to show SelectionScreen

  const recentClasses = [
    { icon: '🗃️', iconBg: '#ff6b35', subject: 'DBMS', year: '2nd\nYear', faculty: 'Prof.\nSharma', date: '18 Feb,\n2024', duration: '1h 00m', attendance: 62, attColor: C.green },
    { icon: '🖥️', iconBg: '#4f7cff', subject: 'Operating\nSystems', year: '3rd\nYear', faculty: 'Dr. Arnab\nK.', date: '18 Feb,\n2024', duration: '1h 30m', attendance: 58, attColor: C.green },
    { icon: '⚙️', iconBg: '#8b6fff', subject: 'Data\nStructures', year: '1st\nYear', faculty: 'Prof. Neha\nGupta', date: '17 Feb,\n2024', duration: '2h 00m', attendance: 45, attColor: C.yellow },
    { icon: '🤖', iconBg: '#e74c3c', subject: 'AI/ML Basics', year: '3rd\nYear', faculty: 'Dr. Vivek\nR.', date: '17 Feb,\n2024', duration: '1h 00m', attendance: 64, attColor: C.green },
  ];

  // ── Render SelectionScreen in place of dashboard (sidebar stays intact) ──
  if (showSelection) {
    return (
      <SelectionScreen
        onBack={() => setShowSelection(false)}
        onProceed={({ year, division }) => {
          // TODO: wire to your student list screen
          console.log('Selected:', year.label, 'Division', division.value);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Attendance Dashboard</Text>
            <View style={styles.ayBadge}><Text style={styles.ayText}>AY 2023-24</Text></View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.bell}><Text style={{ fontSize: 18 }}>🔔</Text></TouchableOpacity>
            <View style={styles.adminInfo}>
              <Text style={styles.adminName}>Admin Portal</Text>
              <Text style={styles.adminRole}>Super Administrator</Text>
            </View>
            <View style={styles.avatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
          </View>
        </View>

        {/* ── Stat Cards ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statRow}>
          <StatCard icon="📚" label="Total Classes Conducted" value="1,240" sub="↑ +12% from last month" />
          <StatCard icon="👥" label="Total Students" value="2,450" sub="↑ +34 new enrollments" />
          <StatCard icon="📊" label="Avg Classes Attended" value="1,105" sub="↑ +8% increase" />
          <StatCard icon="🔄" label="Overall Avg Attendance" value="89%" sub="✅ Exceeding target (85%)" />
        </ScrollView>

        {/* ── Year-wise Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Year-wise Average Attendance</Text>
            <TouchableOpacity><Text style={styles.viewReport}>View Detailed Report</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
            <YearCard year="1ST YEAR STUDENTS" percent={86} conducted={420} attended={360} color={C.ring1st} />
            <YearCard year="2ND YEAR STUDENTS" percent={91} conducted={390} attended={355} color={C.ring2nd} />
            <YearCard year="3RD YEAR STUDENTS" percent={90} conducted={430} attended={390} color={C.ring3rd} />
          </ScrollView>
        </View>

        {/* ── Edit Attendance Block ── */}
        <TouchableOpacity
          style={styles.editBlock}
          onPress={() => setShowSelection(true)}
          activeOpacity={0.75}
        >
          <View style={styles.editBlockIconWrap}>
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </View>
          <Text style={styles.editBlockTitle}>Edit Attendance</Text>
          <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800', marginLeft: 'auto' }}>›</Text>
        </TouchableOpacity>

        {/* ── Recent Classes Table ── */}
        <View style={[styles.section, styles.tableSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Classes Conducted</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.filterBtn}><Text style={styles.filterBtnText}>⚡ Filter</Text></TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn}><Text style={styles.exportBtnText}>⬇ Export CSV</Text></TouchableOpacity>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            {['SUBJECT', 'YEAR', 'FACULTY', 'DATE', 'DURATION', 'ATTENDANCE', 'ACTION'].map(h => (
              <Text key={h} style={styles.tableHeaderCell}>{h}</Text>
            ))}
          </View>

          {/* Table Rows */}
          {recentClasses.map((c, i) => (
            <ClassRow key={i} {...c} onEdit={() => setShowSelection(true)} />
          ))}

          {/* Pagination */}
          <View style={styles.pagination}>
            <Text style={styles.paginationInfo}>Showing 4 of 48 recent classes</Text>
            <View style={styles.pageButtons}>
              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>‹</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pageBtn, styles.pageBtnActive]}>
                <Text style={[styles.pageBtnText, { color: C.text }]}>1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pageBtn} onPress={() => setPage(2)}>
                <Text style={styles.pageBtnText}>2</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pageBtn}><Text style={styles.pageBtnText}>›</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  ayBadge: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  ayText: { color: C.text, fontSize: 11, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: { padding: 6 },
  adminInfo: { alignItems: 'flex-end' },
  adminName: { color: C.text, fontSize: 12, fontWeight: '700' },
  adminRole: { color: C.textMuted, fontSize: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.accent,
  },

  statRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  statCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    width: 170, borderWidth: 1, borderColor: C.border,
  },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  statValue: { color: C.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
  statSub: { fontSize: 11, marginTop: 6, fontWeight: '600' },

  section: { marginHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  viewReport: { color: C.accentLight, fontSize: 13, fontWeight: '600' },

  yearRow: { gap: 12, paddingBottom: 8 },
  yearCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    width: 185, borderWidth: 1, borderColor: C.border,
  },
  yearLabel: { color: C.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  yearStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  yearStatItem: { alignItems: 'center' },
  yearStatLabel: { color: C.textMuted, fontSize: 10 },
  yearStatValue: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 2 },

  editBlock: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  editBlockIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1a3a7a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accent,
  },
  editBlockTitle: { color: C.text, fontSize: 15, fontWeight: '900' },

  tableSection: {
    backgroundColor: C.card, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: C.border, marginTop: 16,
  },
  filterBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  filterBtnText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  exportBtn: {
    backgroundColor: C.accent, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  exportBtnText: { color: C.text, fontSize: 12, fontWeight: '700' },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6,
  },
  tableHeaderCell: { color: C.textMuted, fontSize: 9, fontWeight: '800', flex: 1, letterSpacing: 0.5 },

  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6,
  },
  subjectIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  subjectName: { color: C.text, fontSize: 12, fontWeight: '700' },
  tableCell: { color: C.textMuted, fontSize: 10, flex: 1, lineHeight: 14 },

  attBar: { flex: 1.2 },
  attCount: { fontSize: 12, fontWeight: '800' },
  attPresent: { fontSize: 9, fontWeight: '600' },
  barTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 4 },
  barFill: { height: 4, borderRadius: 2 },

  moreBtn: { padding: 4 },
  moreBtnText: { color: C.textMuted, fontSize: 14 },

  pagination: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16,
  },
  paginationInfo: { color: C.textMuted, fontSize: 11 },
  pageButtons: { flexDirection: 'row', gap: 6 },
  pageBtn: {
    width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border,
  },
  pageBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  pageBtnText: { color: C.textMuted, fontSize: 13, fontWeight: '700' },
});