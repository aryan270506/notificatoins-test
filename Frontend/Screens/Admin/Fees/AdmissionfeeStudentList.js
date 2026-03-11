import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AttendanceReportFlow from './Admissionfees';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFeeColor = (pct) => {
  if (pct >= 90) return '#4ADE80';
  if (pct >= 60) return '#69f0ae';
  if (pct >= 40) return '#FBBF24';
  return '#F87171';
};

const getInitial = (name) => (name || '?').charAt(0).toUpperCase();

const getAvg = (students) =>
  students.length === 0 ? 0 :
  Math.round(students.reduce((s, st) => s + (st.paidPct || 0), 0) / students.length);

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ size = 44, strokeWidth = 4, percentage, color, trackColor }) {
  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash    = (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
        <Circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round" rotation="-90"
          origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{percentage}%</Text>
    </View>
  );
}

// ─── Fee chip helper ──────────────────────────────────────────────────────────
const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// ─── Request status config ────────────────────────────────────────────────────
const REQUEST_STATUS = {
  pending:  { label: '⏳ Pending',  bg: '#ffb30018', border: '#ffb300', text: '#ffb300' },
  approved: { label: '✓ Approved', bg: '#4ADE8018', border: '#4ADE80', text: '#4ADE80' },
  rejected: { label: '✕ Rejected', bg: '#F8717118', border: '#F87171', text: '#F87171' },
};

// ─── Student Row ──────────────────────────────────────────────────────────────
function StudentRow({ student, onPress, index, colors }) {
  const C     = colors;
  const pct   = student.paidPct || 0;
  const color = getFeeColor(pct);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct / 100,
      duration: 600,
      delay: index * 40,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Determine request status badge to show
  const reqStatus = student.latestRequestStatus; // 'pending' | 'approved' | 'rejected' | null
  const reqCfg    = reqStatus ? REQUEST_STATUS[reqStatus] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.studentCard, { backgroundColor: C.surface, borderColor: reqStatus === 'pending' ? '#ffb300' : C.border }]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: color, backgroundColor: color + '18' }]}>
        <Text style={[styles.avatarText, { color }]}>{getInitial(student.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.studentInfo}>
        {/* Name + Roll */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
          <Text style={[styles.studentName, { color: C.textPrim, flex: 1 }]} numberOfLines={1}>{student.name}</Text>
          {reqCfg && (
            <View style={[styles.reqBadge, { backgroundColor: reqCfg.bg, borderColor: reqCfg.border }]}>
              <Text style={[styles.reqBadgeText, { color: reqCfg.text }]}>{reqCfg.label}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.studentRoll, { color: C.textSec }]}>
          Roll No: {student.rollNo || student.id}
        </Text>

        {/* Fees row: Total · Paid · Due */}
        <View style={styles.feesRow}>
          <View style={styles.feeChip}>
            <Text style={[styles.feeChipLabel, { color: C.textMuted }]}>Total</Text>
            <Text style={[styles.feeChipValue, { color: '#60A5FA' }]}>
              {student.grandTotal != null ? fmtINR(student.grandTotal) : '—'}
            </Text>
          </View>
          <View style={[styles.feeChipDivider, { backgroundColor: C.border }]} />
          <View style={styles.feeChip}>
            <Text style={[styles.feeChipLabel, { color: C.textMuted }]}>Paid</Text>
            <Text style={[styles.feeChipValue, { color: '#4ADE80' }]}>
              {student.paidTotal != null ? fmtINR(student.paidTotal) : '—'}
            </Text>
          </View>
          <View style={[styles.feeChipDivider, { backgroundColor: C.border }]} />
          <View style={styles.feeChip}>
            <Text style={[styles.feeChipLabel, { color: C.textMuted }]}>Due</Text>
            <Text style={[styles.feeChipValue, { color: student.remaining == null ? C.textMuted : student.remaining > 0 ? '#F87171' : '#4ADE80' }]}>
              {student.remaining == null ? '—' : student.remaining > 0 ? fmtINR(student.remaining) : 'Nil'}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.barTrack, { backgroundColor: C.surfaceAlt }]}>
          <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
        </View>
      </View>

      {/* Right: circular % */}
      <View style={styles.studentRight}>
        <CircularProgress percentage={pct} color={color} trackColor={C.border} />
        <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ students, colors }) {
  const C       = colors;
  const avg     = getAvg(students);
  const good    = students.filter(s => (s.paidPct || 0) >= 90).length;
  const partial = students.filter(s => (s.paidPct || 0) >= 40 && (s.paidPct || 0) < 90).length;
  const low     = students.filter(s => (s.paidPct || 0) < 40).length;

  const stats = [
    { label: 'Avg Paid', value: `${avg}%`,    color: '#60A5FA' },
    { label: 'Cleared',  value: `${good}`,     color: '#4ADE80' },
    { label: 'Partial',  value: `${partial}`,  color: '#FBBF24' },
    { label: 'Overdue',  value: `${low}`,      color: '#F87171' },
  ];

  return (
    <View style={[styles.statsBar, { backgroundColor: C.surface, borderColor: C.border }]}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
          </View>
          {i < stats.length - 1 && <View style={[styles.statDivider, { backgroundColor: C.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentListScreen({ onBack, year = '2nd Year', division = 'B' }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [search,           setSearch]           = useState('');
  const [filter,           setFilter]           = useState('All');
  const [selectedStudent,  setSelectedStudent]  = useState(null);
  const [students,         setStudents]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // ── Fetch students + their finance data ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axiosInstance.get('/students');
        if (!res.data.success) throw new Error('Failed to fetch students');

        const yearId  = typeof year === 'object' ? year.id : year;
        const divId   = typeof division === 'object' ? division.id : division;
        const filtered = res.data.data.filter(
          s => String(s.year) === String(yearId) && String(s.division) === String(divId)
        );

        // Build base fee objects — all null until real finance data arrives
        const base = filtered.map((s, i) => ({
          id:                  i + 1,
          _id:                 s._id || s.id,
          name:                s.name,
          rollNo:              s.roll_no || s.id || '',
          paidTotal:           null,
          remaining:           null,
          paidPct:             0,
          grandTotal:          null,
          hasPendingRequest:   false,
          latestRequestStatus: null,
        }));

        // Batch-fetch finance records
        const financeResults = await Promise.allSettled(
          base.map(st =>
            axiosInstance.get(`/student-finance/${st._id}`)
              .then(r => ({ id: st._id, doc: r.data?.success ? r.data.data : null }))
              .catch(() => ({ id: st._id, doc: null }))
          )
        );

        const merged = base.map((st, i) => {
          const fr = financeResults[i];
          // No finance record (404 or error) → keep nulls, no pending badge
          if (fr.status !== 'fulfilled' || !fr.value.doc) return st;
          const fd = fr.value.doc;

          let totalTuition = 0, totalAid = 0, totalApproved = 0;
          let hasPending = false, hasApproved = false, hasRejected = false;
          let anyPayments = false;

          (fd.yearlyData || []).forEach(yr => {
            const payments = yr.payments || [];
            if (!payments.length) return;
            anyPayments = true;
            const latest = payments[payments.length - 1];
            totalTuition += latest?.tuitionFee   || 0;
            totalAid     += latest?.financialAid || 0;
            payments.forEach(p => {
              if (p.status === 'approved') { hasApproved = true; totalApproved += p.amount; }
              if (p.status === 'pending')    hasPending  = true;
              if (p.status === 'rejected')   hasRejected = true;
            });
          });

          // Badge priority: pending > rejected > approved
          // Only set when at least one real payment exists
          let latestRequestStatus = null;
          if (anyPayments) {
            if (hasPending)       latestRequestStatus = 'pending';
            else if (hasRejected) latestRequestStatus = 'rejected';
            else if (hasApproved) latestRequestStatus = 'approved';
          }

          const netOwed    = Math.max(0, totalTuition - totalAid);
          // Use null when no tuition fees have been set in the finance record
          const grandTotal = netOwed > 0 ? netOwed : null;
          const remaining  = grandTotal != null ? Math.max(0, grandTotal - totalApproved) : null;
          const paidPct    = grandTotal != null && grandTotal > 0
            ? Math.min(100, Math.round((totalApproved / grandTotal) * 100))
            : 0;

          return {
            ...st,
            paidTotal:           totalApproved,
            remaining,
            paidPct,
            grandTotal,
            hasPendingRequest:   hasPending,
            latestRequestStatus,
          };
        });

        setStudents(merged);
      } catch (err) {
        console.error('StudentListScreen fetch error:', err);
        setError('Could not load student fee data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [year, division]);

  // ── When returning from detail, refresh that student's finance data ───────
  const handleBack = async (updatedStudent) => {
    if (updatedStudent) {
      setStudents(prev =>
        prev.map(s => (s._id === updatedStudent._id ? { ...s, ...updatedStudent } : s))
      );
    }
    setSelectedStudent(null);
  };

  if (selectedStudent) {
    return (
      <AttendanceReportFlow
        student={selectedStudent}
        year={year}
        division={division}
        onBack={handleBack}
      />
    );
  }

  const FILTERS = ['All', 'Cleared', 'Partial', 'Due', 'Overdue'];

  const filtered = students.filter(s => {
    const matchSearch =
      (s.name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo|| '').toLowerCase().includes(search.toLowerCase());
    const pct = s.paidPct || 0;
    const matchFilter =
      filter === 'All'     ||
      (filter === 'Cleared'  && pct >= 90) ||
      (filter === 'Partial'  && pct >= 40 && pct < 90) ||
      (filter === 'Due'      && pct >= 10 && pct < 40) ||
      (filter === 'Overdue'  && pct < 10);
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.accentBlue || '#2563eb'} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Loading fee data…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 36, marginBottom: 10 }}>⚠️</Text>
        <Text style={{ color: '#F87171', textAlign: 'center', fontSize: 14 }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrim }]}>Student Fee List</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>
            {typeof year === 'object' ? year.label : year} · Division {typeof division === 'object' ? division.id : division} · {students.length} Students
          </Text>
        </View>
      </View>

      {/* Stats */}
      <StatsBar students={students} colors={C} />

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: C.textPrim }]}
          placeholder="Search by name or roll no..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.textMuted, fontSize: 18, paddingHorizontal: 4 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}>
        {FILTERS.map(f => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                { backgroundColor: C.surface, borderColor: C.border },
                isActive && { backgroundColor: C.accentBlue || '#2563eb', borderColor: C.accentBlue || '#2563eb' },
              ]}
            >
              <Text style={[styles.filterChipText, { color: C.textSec }, isActive && { color: '#fff', fontWeight: '700' }]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.showingText, { color: C.textMuted }]}>Showing {filtered.length} students</Text>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}>
        {filtered.map((student, index) => (
          <StudentRow
            key={student._id || student.id}
            student={student}
            index={index}
            colors={C}
            onPress={() => setSelectedStudent(student)}
          />
        ))}
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 50 }}>
            <Text style={{ fontSize: 34 }}>🔍</Text>
            <Text style={{ color: C.textSec, marginTop: 8 }}>No students found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backArrow:   { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub:   { fontSize: 11, marginTop: 2 },

  // Stats bar
  statsBar: {
    flexDirection: 'row', marginHorizontal: 14, marginTop: 14,
    borderRadius: 14, borderWidth: 1, paddingVertical: 14,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 22, fontWeight: '800' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },

  // Search
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    marginHorizontal: 14, marginTop: 12, paddingHorizontal: 14,
    borderWidth: 1, height: 46, gap: 8,
  },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14 },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 14, marginTop: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  // Showing count
  showingText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 14, marginTop: 10, marginBottom: 6 },

  // Student card
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, marginBottom: 10, padding: 14, borderWidth: 1, gap: 12,
  },

  // Avatar
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },

  // Student info
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  studentRoll: { fontSize: 11, marginBottom: 8 },

  // Fee chips row
  feesRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: 'transparent' },
  feeChip:        { flex: 1, alignItems: 'center' },
  feeChipLabel:   { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  feeChipValue:   { fontSize: 12, fontWeight: '800' },
  feeChipDivider: { width: 1, height: 28, marginHorizontal: 4 },

  // Request status badge
  reqBadge:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, marginLeft: 6 },
  reqBadgeText: { fontSize: 9, fontWeight: '800' },

  // Progress bar
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },

  // Right side
  studentRight: { alignItems: 'center', gap: 6 },
  chevron:      { fontSize: 20, fontWeight: '300', marginLeft: 2 },
});