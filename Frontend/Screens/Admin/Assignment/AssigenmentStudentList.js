import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────

function generateStudents(year, division) {
  const names = [
    'Aarav Shah', 'Priya Patel', 'Rohit Mehta', 'Sneha Joshi', 'Karan Desai',
    'Ananya Iyer', 'Vikram Rao', 'Pooja Nair', 'Arjun Singh', 'Meera Reddy',
    'Rahul Kulkarni', 'Divya Sharma', 'Siddharth Verma', 'Kavitha Menon', 'Aditya Gupta',
    'Neha Bhat', 'Rohan Pillai', 'Shreya Tiwari', 'Nikhil Joshi', 'Riya Kapoor',
    'Varun Nayak', 'Swati Patil', 'Gaurav Saxena', 'Lakshmi Rajan', 'Harshit Malhotra',
  ];
  const prefix = year?.short?.replace(/\D/g, '') + division;
  return names.map((name, i) => {
    const attendance = Math.floor(Math.random() * 40) + 55;
    return {
      id: i + 1,
      name,
      rollNo: `${prefix}B${String(i + 1).padStart(3, '0')}`,
      attendance,
      initials: name.split(' ').map(n => n[0]).join(''),
    };
  });
}

function getAttendanceColor(pct) {
  if (pct >= 75) return '#4CAF50';
  if (pct >= 50) return '#FFA726';
  return '#EF5350';
}

// ─── CIRCULAR MINI BADGE ──────────────────────────────────────────────────────

function CircleBadge({ percent }) {
  const color = getAttendanceColor(percent);
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 4, borderColor: color + '33',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: color + '11',
      }}>
        <View style={{
          position: 'absolute', width: 52, height: 52, borderRadius: 26,
          borderWidth: 4, borderColor: color,
          borderRightColor:  percent < 25 ? 'transparent' : color,
          borderBottomColor: percent < 50 ? 'transparent' : color,
          borderLeftColor:   percent < 75 ? 'transparent' : color,
        }} />
        <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{percent}%</Text>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function AssignmentStudentListScreen({ selectedYear, selectedDivision, onBack }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('All'); // All | Good | Average | Low

  const students = generateStudents(selectedYear, selectedDivision);

  const avgAttendance = Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length);
  const goodCount     = students.filter(s => s.attendance >= 75).length;
  const avgCount      = students.filter(s => s.attendance >= 50 && s.attendance < 75).length;
  const lowCount      = students.filter(s => s.attendance < 50).length;

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.rollNo.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All'     ? true :
      filter === 'Good'    ? s.attendance >= 75 :
      filter === 'Average' ? s.attendance >= 50 && s.attendance < 75 :
      filter === 'Low'     ? s.attendance < 50 : true;
    return matchSearch && matchFilter;
  });

  const FILTERS = ['All', 'Good', 'Average', 'Low'];

  const avatarColors = [
    '#4FC3F7', '#66BB6A', '#FFA726', '#CE93D8',
    '#F48FB1', '#80CBC4', '#FFCC02', '#FF7043',
  ];

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[st.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[st.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[st.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: C.textPrim }]}>Student List</Text>
          <Text style={[st.headerSub, { color: C.textSec }]}>
            {selectedYear?.label} · Division {selectedDivision} · {students.length} Students
          </Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={[st.statsBar, { backgroundColor: C.surface, borderColor: C.border }]}>
        <StatItem value={`${avgAttendance}%`} label="Avg"    color="#4FC3F7" />
        <View style={[st.statDivider, { backgroundColor: C.border }]} />
        <StatItem value={goodCount}           label="≥75%"   color="#4CAF50" />
        <View style={[st.statDivider, { backgroundColor: C.border }]} />
        <StatItem value={avgCount}            label="50–74%" color="#FFA726" />
        <View style={[st.statDivider, { backgroundColor: C.border }]} />
        <StatItem value={lowCount}            label="<50%"   color="#EF5350" />
      </View>

      {/* Search */}
      <View style={[st.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={[st.searchInput, { color: C.textPrim }]}
          placeholder="Search by name or roll no..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.textMuted, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={st.filterRow}>
        {FILTERS.map(f => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                st.filterPill,
                {
                  backgroundColor: isActive ? C.accentBlue : C.surface,
                  borderColor:     isActive ? C.accentBlue : C.border,
                },
              ]}
            >
              <Text style={[st.filterPillText, { color: isActive ? '#fff' : C.textSec }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Showing count */}
      <Text style={[st.showingText, { color: C.textMuted }]}>Showing {filtered.length} students</Text>

      {/* Student list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filtered.map((student, idx) => {
          const color      = getAttendanceColor(student.attendance);
          const avatarBg   = avatarColors[student.id % avatarColors.length];

          return (
            <View
              key={student.id}
              style={[st.studentCard, { backgroundColor: C.surface, borderColor: C.border }]}
            >
              {/* Avatar */}
              <View style={[st.avatar, { backgroundColor: avatarBg }]}>
                <Text style={st.avatarText}>{student.initials[0]}</Text>
              </View>

              {/* Info + bar */}
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[st.studentName, { color: C.textPrim }]}>{student.name}</Text>
                <Text style={[st.studentRoll, { color: C.textSec }]}>Roll No: {student.rollNo}</Text>
                {/* Progress bar */}
                <View style={[st.barTrack, { backgroundColor: C.surfaceAlt }]}>
                  <View style={[st.barFill, { width: `${student.attendance}%`, backgroundColor: color }]} />
                </View>
              </View>

              {/* Circle badge */}
              <CircleBadge percent={student.attendance} />
            </View>
          );
        })}

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

function StatItem({ value, label, color }) {
  return (
    <View style={st.statItem}>
      <Text style={[st.statValue, { color }]}>{value}</Text>
      <Text style={[st.statLabel, { color: '#888' }]}>{label}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1,
  },
  backBtn:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backArrow:  { fontSize: 18, fontWeight: '700' },
  headerTitle:{ fontSize: 16, fontWeight: '700' },
  headerSub:  { fontSize: 11, marginTop: 2 },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 14,
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue:   { fontSize: 20, fontWeight: '800' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 40 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10,
  },
  filterPill:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '600' },

  showingText: { fontSize: 12, paddingHorizontal: 16, marginBottom: 10 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1,
  },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  studentName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  studentRoll: { fontSize: 11, marginBottom: 6 },
  barTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 3 },
});