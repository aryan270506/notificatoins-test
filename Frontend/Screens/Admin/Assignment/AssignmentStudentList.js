/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  SCREEN 2 — AssignmentStudentList.js                    ║
 * ║  Student list with search & filter chips.               ║
 * ║  Tap a student → AssignmentDashboard (Screen 3)         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, StatusBar, Animated, ActivityIndicator,
} from 'react-native';

import { ThemeContext } from '../dashboard/AdminDashboard';
import AssignmentDashboard from './AssignmentDashboard';

// ─── API Config ───────────────────────────────────────────────────────────────
const API_BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, "");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4FC3F7', '#66BB6A', '#FFA726', '#CE93D8',
  '#F48FB1', '#80CBC4', '#FFCC02', '#FF7043',
];

const attColor = (pct) =>
  pct >= 75 ? '#4CAF50' : pct >= 50 ? '#FFA726' : '#EF5350';

// ─── Circular badge ───────────────────────────────────────────────────────────

function CircleBadge({ percent }) {
  // percent can be null when no assignment data exists
  const hasData = percent != null;
  const color   = hasData ? attColor(percent) : '#888';
  const label   = hasData ? `${percent}%` : '—';
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        borderWidth: 4, borderColor: color + '33',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: color + '11',
      }}>
        {hasData && (
          <View style={{
            position: 'absolute', width: 52, height: 52, borderRadius: 26,
            borderWidth: 4, borderColor: color,
            borderRightColor:  percent < 25 ? 'transparent' : color,
            borderBottomColor: percent < 50 ? 'transparent' : color,
            borderLeftColor:   percent < 75 ? 'transparent' : color,
          }} />
        )}
        <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Animated student card ────────────────────────────────────────────────────

function StudentCard({ student, index, onPress, C }) {
  const pct     = student.submissionPct;         // may be null
  const hasData = pct != null;
  const color   = hasData ? attColor(pct) : '#888';
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: hasData ? pct / 100 : 0,
      duration: 600, delay: index * 35, useNativeDriver: false,
    }).start();
  }, [pct]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[st.studentCard, { backgroundColor: C.surface, borderColor: C.border }]}
    >
      <View style={[st.avatar, { backgroundColor: student.avatarColor }]}>
        <Text style={st.avatarText}>{student.name.charAt(0)}</Text>
      </View>

      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <Text style={[st.studentName, { color: C.textPrim }]}>{student.name}</Text>
        <Text style={[st.studentRoll, { color: C.textSec }]}>
          Roll No: {student.rollNo ?? '—'}
        </Text>
        {/* Assignment mini-stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 10, color: '#4ADE80', fontWeight: '700' }}>
            ✓ {student.submittedCount ?? '—'}
          </Text>
          <Text style={{ fontSize: 10, color: '#F87171', fontWeight: '700' }}>
            ⏳ {student.pendingCount ?? '—'}
          </Text>
          <Text style={{ fontSize: 10, color: C.textMuted }}>
            / {student.totalAssignments ?? '—'} total
          </Text>
        </View>
        <View style={[st.barTrack, { backgroundColor: C.surfaceAlt }]}>
          <Animated.View style={[st.barFill, { width: barWidth, backgroundColor: color }]} />
        </View>
      </View>

      <CircleBadge percent={pct} />
      <Text style={[st.chevron, { color: C.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ students, C }) {
  const withData = students.filter(s => s.submissionPct != null);
  const avg      = withData.length > 0
    ? Math.round(withData.reduce((s, st) => s + st.submissionPct, 0) / withData.length)
    : null;
  const good = withData.filter(s => s.submissionPct >= 75).length;
  const mid  = withData.filter(s => s.submissionPct >= 50 && s.submissionPct < 75).length;
  const low  = withData.filter(s => s.submissionPct < 50).length;

  const items = [
    { label: 'Avg',     value: avg != null ? `${avg}%` : '—', color: '#4FC3F7' },
    { label: '≥75%',   value: good,                            color: '#4CAF50' },
    { label: '50–74%', value: mid,                             color: '#FFA726' },
    { label: '<50%',   value: low,                             color: '#EF5350' },
  ];

  return (
    <View style={[st.statsBar, { backgroundColor: C.surface, borderColor: C.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <View style={st.statItem}>
            <Text style={[st.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[st.statLabel, { color: C.textMuted }]}>{item.label}</Text>
          </View>
          {i < items.length - 1 && (
            <View style={[st.statDivider, { backgroundColor: C.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Good', 'Average', 'Low'];

export default function AssignmentStudentList({ selectedYear, selectedDivision, onBack }) {
  // ✅ FIXED: Correctly destructure { isDark, colors } from ThemeContext
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);

  // ── API fetch state ────────────────────────────────────────────────────────
  const [students,    setStudents]    = useState([]);
  const [assignments, setAssignments] = useState([]); // raw list, passed to AssignmentDashboard
  const [isLoading,   setIsLoading]   = useState(true);
  const [fetchError,  setFetchError]  = useState(null);

  useEffect(() => {
    const fetchStudentsAndAssignments = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const yearNum = selectedYear?.short?.replace(/\D/g, '') || '1';
        const div     = selectedDivision || 'A';

        // ── 1. Fetch student list ──────────────────────────────────────────
        const stuRes  = await axiosInstance.get('/students', {
          params: { year: yearNum, division: div },
        });
        const stuData = stuRes.data?.data || stuRes.data;
        const rawList = Array.isArray(stuData) ? stuData : [];

        // Filter to the selected year + division if the endpoint returns all
        const filtered = rawList.filter(s => {
          const sYear = String(s.year || '');
          const sDiv  = String(s.division || '');
          return sYear === String(yearNum) && sDiv === div;
        });

        // ── 2. Fetch assignments for this class ───────────────────────────
        let assignments = [];
        try {
          const asnRes  = await axiosInstance.get('/assignments', {
            params: { year: yearNum, division: div },
          });
          assignments = asnRes.data?.data || asnRes.data || [];
          if (!Array.isArray(assignments)) assignments = [];
        } catch (_) { /* assignments stay [] */ }

        setAssignments(assignments); // ← persist so dashboard can use them
        const totalAssignments = assignments.length;

        // ── 3. Build merged student rows ──────────────────────────────────
        if (filtered.length === 0) {
          // No real students found → null rows
          setStudents([]);
        } else {
          setStudents(filtered.map((st, i) => {
            const sid = st._id || st.id || String(i);

            // Count submissions for this student across all assignments
            let submittedCount = 0;
            assignments.forEach(a => {
              const subs = a.submissions || [];
              if (subs.some(s => String(s.studentId) === String(sid))) {
                submittedCount++;
              }
            });

            const pendingCount = totalAssignments - submittedCount;
            // pct is null when there are no assignments at all
            const submissionPct = totalAssignments > 0
              ? Math.round((submittedCount / totalAssignments) * 100)
              : null;

            return {
              id:              sid,
              _id:             sid,
              name:            st.name            || '—',
              rollNo:          st.roll_no || st.rollNo || null,
              prn:             st.prn             || null,
              email:           st.email           || null,
              branch:          st.branch          || null,
              // assignment stats — null when no data available
              totalAssignments: totalAssignments  || null,
              submittedCount:   totalAssignments > 0 ? submittedCount   : null,
              pendingCount:     totalAssignments > 0 ? pendingCount     : null,
              submissionPct:    submissionPct,        // null if no assignments
              // keep attendance as null (no real source yet)
              attendance:      null,
              initials:        (st.name || '?').split(' ').map(n => n[0]).join(''),
              avatarColor:     AVATAR_COLORS[i % AVATAR_COLORS.length],
              subjects:        st.subjects || [],
              lab:             st.lab      || [],
            };
          }));
        }
      } catch (err) {
        console.error('AssignmentStudentList fetch error:', err.message);
        setFetchError(err.message);
        setStudents([]);   // no fake fallback — show empty list with error banner
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndAssignments();
  }, [selectedYear?.short, selectedDivision]);
  // ──────────────────────────────────────────────────────────────────────────

  if (selected) {
    return (
      <AssignmentDashboard
        student={selected}
        year={selectedYear?.label || ''}
        division={selectedDivision || ''}
        assignments={assignments}
        onBack={() => setSelected(null)}
      />
    );
  }

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo || '').toLowerCase().includes(search.toLowerCase());
    const pct = s.submissionPct;   // null when no assignment data
    const matchFilter =
      filter === 'All'     ||
      (filter === 'Good'    && pct != null && pct >= 75) ||
      (filter === 'Average' && pct != null && pct >= 50 && pct < 75) ||
      (filter === 'Low'     && (pct == null || pct < 50));
    return matchSearch && matchFilter;
  });

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      {/* ✅ FIXED: barStyle responds to isDark */}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[st.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[st.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[st.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: C.textPrim }]}>Student List</Text>
          <Text style={[st.headerSub, { color: C.textSec }]}>
            {selectedYear?.label} · Division {selectedDivision} · {isLoading ? 'Loading…' : `${students.length} Students`}
          </Text>
        </View>
        {isLoading && <Text style={{ color: '#4FC3F7', fontSize: 12 }}>⏳</Text>}
        {fetchError && !isLoading && (
          <View style={{ backgroundColor: '#ff525222', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ff5252' }}>
            <Text style={{ color: '#ff5252', fontSize: 10, fontWeight: '700' }}>⚠ Offline</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      {!isLoading && students.length > 0 && <StatsBar students={students} C={C} />}

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
            <Text style={{ color: C.textMuted, fontSize: 18, lineHeight: 20 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={st.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                st.filterChip,
                {
                  backgroundColor: isActive ? C.accentBlue : C.surface,
                  borderColor:     isActive ? C.accentBlue : C.border,
                },
              ]}
            >
              <Text style={[st.filterChipText, { color: isActive ? '#fff' : C.textSec }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[st.showingText, { color: C.textMuted }]}>Showing {filtered.length} students</Text>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color="#4FC3F7" />
            <Text style={{ color: C.textSec, marginTop: 12, fontSize: 14 }}>Loading students from server…</Text>
          </View>
        ) : filtered.map((student, index) => (
          <StudentCard
            key={student.id}
            student={student}
            index={index}
            onPress={() => setSelected(student)}
            C={C}
          />
        ))}
        {!isLoading && filtered.length === 0 && (
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

const st = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backArrow:   { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub:   { fontSize: 11, marginTop: 2 },

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
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow:      { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  filterChip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  showingText: { fontSize: 12, paddingHorizontal: 16, marginBottom: 10 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  studentName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  studentRoll: { fontSize: 11, marginBottom: 6 },
  barTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 3 },
  chevron:     { fontSize: 22, marginLeft: 6 },
});