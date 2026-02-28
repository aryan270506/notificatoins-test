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
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import AttendanceReportFlow from './Admissionfees';
import { ThemeContext } from '../dashboard/AdminDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mock Data ────────────────────────────────────────────────────────────────
const STUDENTS = [
  { id: '2B001', name: 'Aarav Shah',       attendance: 89 },
  { id: '2B002', name: 'Priya Patel',      attendance: 86 },
  { id: '2B003', name: 'Rohit Mehta',      attendance: 66 },
  { id: '2B004', name: 'Sneha Joshi',      attendance: 69 },
  { id: '2B005', name: 'Karan Desai',      attendance: 94 },
  { id: '2B006', name: 'Pooja Nair',       attendance: 62 },
  { id: '2B007', name: 'Arjun Rao',        attendance: 84 },
  { id: '2B008', name: 'Anjali Singh',     attendance: 54 },
  { id: '2B009', name: 'Dev Shah',         attendance: 78 },
  { id: '2B010', name: 'Meera Iyer',       attendance: 91 },
  { id: '2B011', name: 'Rahul Gupta',      attendance: 57 },
  { id: '2B012', name: 'Kavya Reddy',      attendance: 82 },
  { id: '2B013', name: 'Aditya Kumar',     attendance: 76 },
  { id: '2B014', name: 'Riya Sharma',      attendance: 63 },
  { id: '2B015', name: 'Vikram Jain',      attendance: 88 },
  { id: '2B016', name: 'Nisha Pillai',     attendance: 71 },
  { id: '2B017', name: 'Harsh Patel',      attendance: 95 },
  { id: '2B018', name: 'Swati Das',        attendance: 68 },
  { id: '2B019', name: 'Rohan Malhotra',   attendance: 79 },
  { id: '2B020', name: 'Tanvi Kulkarni',   attendance: 85 },
  { id: '2B021', name: 'Aman Verma',       attendance: 58 },
  { id: '2B022', name: 'Simran Kaur',      attendance: 92 },
  { id: '2B023', name: 'Nikhil Bose',      attendance: 73 },
  { id: '2B024', name: 'Deepa Nambiar',    attendance: 61 },
  { id: '2B025', name: 'Yash Mehta',       attendance: 87 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getAttendanceColor = (pct) => {
  if (pct >= 75) return '#4ADE80';
  if (pct >= 50) return '#FBBF24';
  return '#F87171';
};

const getInitial = (name) => name.charAt(0).toUpperCase();

const getAvg = (students) =>
  Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length);

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ size = 44, strokeWidth = 4, percentage, color, trackColor }) {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash   = (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth} fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round" rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{percentage}%</Text>
    </View>
  );
}

// ─── Student Row ──────────────────────────────────────────────────────────────
function StudentRow({ student, onPress, index, colors }) {
  const C     = colors;
  const color = getAttendanceColor(student.attendance);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: student.attendance / 100,
      duration: 600,
      delay: index * 40,
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.studentCard, { backgroundColor: C.surface, borderColor: C.border }]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: color, backgroundColor: color + '18' }]}>
        <Text style={[styles.avatarText, { color }]}>{getInitial(student.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.studentInfo}>
        <Text style={[styles.studentName, { color: C.textPrim }]}>{student.name}</Text>
        <Text style={[styles.studentRoll, { color: C.textSec }]}>Roll No: {student.id}</Text>

        {/* Progress bar */}
        <View style={[styles.barTrack, { backgroundColor: C.surfaceAlt }]}>
          <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
        </View>
      </View>

      {/* Circular % */}
      <View style={styles.studentRight}>
        <CircularProgress percentage={student.attendance} color={color} trackColor={C.border} />
        <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ students, colors }) {
  const C       = colors;
  const avg     = getAvg(students);
  const good    = students.filter((s) => s.attendance >= 75).length;
  const average = students.filter((s) => s.attendance >= 50 && s.attendance < 75).length;
  const low     = students.filter((s) => s.attendance < 50).length;

  const stats = [
    { label: 'Avg',    value: `${avg}%`, color: '#60A5FA' },
    { label: '≥75%',   value: `${good}`, color: '#4ADE80' },
    { label: '50–74%', value: `${average}`, color: '#FBBF24' },
    { label: '<50%',   value: `${low}`,  color: '#F87171' },
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

  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (selectedStudent) {
    return (
      <AttendanceReportFlow
        student={selectedStudent}
        year={year}
        division={division}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  const FILTERS = ['All', 'Good', 'Average', 'Low'];

  const filtered = STUDENTS.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ||
      (filter === 'Good'    && s.attendance >= 75) ||
      (filter === 'Average' && s.attendance >= 50 && s.attendance < 75) ||
      (filter === 'Low'     && s.attendance < 50);
    return matchSearch && matchFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: C.textPrim }]}>Student List</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>
            {year} · Division {division} · {STUDENTS.length} Students
          </Text>
        </View>
      </View>

      {/* Stats */}
      <StatsBar students={STUDENTS} colors={C} />

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
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                { backgroundColor: C.surface, borderColor: C.border },
                isActive && { backgroundColor: C.accentBlue, borderColor: C.accentBlue },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: C.textSec },
                isActive && { color: '#FFFFFF', fontWeight: '700' },
              ]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Count */}
      <Text style={[styles.showingText, { color: C.textMuted }]}>Showing {filtered.length} students</Text>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}
      >
        {filtered.map((student, index) => (
          <StudentRow
            key={student.id}
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

  // Progress bar
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 3 },

  // Right side
  studentRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevron:      { fontSize: 20, fontWeight: '300', marginLeft: 2 },
});