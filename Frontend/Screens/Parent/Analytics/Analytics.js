/**
 * UniVerse – Student Analytics Overview
 * Desktop: full grid layout with sidebar-aware content
 * Mobile:  scrollable single-column cards
 * Theme:   consumes ThemeContext from Parentmaindashboard
 *
 * FIXED: Submissions, Pending counts and subject breakdowns now come from
 * the real /assignments API — same logic as Assignment.js & Dashboardpage.js
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../Dashboard/Dashboard';
import axiosInstance from '../../../Src/Axios';

// ─── Year normalisation (mirrors Assignment.js) ───────────────────────────────
const YEAR_REVERSE = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const YEAR_MAP     = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const toApiYear = (y) => {
  if (!y) return null;
  const up = String(y).trim().toUpperCase();
  return YEAR_REVERSE[up] ?? up;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateOverallAttendance(attendanceData = []) {
  if (attendanceData.length === 0) return 0;
  const totalAttended = attendanceData.reduce((sum, item) => sum + item.attended, 0);
  const totalClasses  = attendanceData.reduce((sum, item) => sum + item.total,    0);
  return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
}

const getDuePriority = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return 'LOW';
  const due = new Date(dueDate);
  if (isNaN(due)) return 'LOW';
  const hoursLeft = (due - Date.now()) / 36e5;
  if (hoursLeft < 24) return 'HIGH PRIORITY';
  if (hoursLeft < 72) return 'MEDIUM';
  return 'OPTIONAL';
};

const formatDueDate = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return 'No deadline';
  const d = new Date(dueDate);
  if (isNaN(d)) return dueDate;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const BREAKPOINT = 768;

// ─── Small helpers ────────────────────────────────────────────────────────────
function Tag({ label, color, bg }) {
  return (
    <View style={{ borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: bg, borderColor: color }}>
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color }}>{label}</Text>
    </View>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, label, C }) {
  const size = 72, stroke = 6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.muted, position: 'absolute' }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: C.teal,
        borderRightColor: 'transparent',
        borderBottomColor: pct > 75 ? C.teal : 'transparent',
        position: 'absolute',
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.teal, fontSize: 11, fontWeight: '800' }}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Attendance Card ──────────────────────────────────────────────────────────
function AttendanceCard({ C, st, attendanceData = [] }) {
  const overallAttendance = calculateOverallAttendance(attendanceData);
  return (
    <View style={[st.card, { flex: 1, minWidth: 200 }]}>
      <Text style={st.cardMeta}>Total Attendance</Text>
      <Text style={st.bigNum}>{overallAttendance}%</Text>
      <Text style={[st.cardMeta, { color: C.teal, marginTop: 2 }]}>↑ Above threshold</Text>
      <View style={{ alignItems: 'flex-end', marginTop: -60 }}>
        <ProgressRing pct={overallAttendance} label="Good" C={C} />
      </View>
    </View>
  );
}

// ─── Submissions Card — now receives real data ────────────────────────────────
function SubmissionsCard({ C, st, totalAssignments = 0, totalSubmitted = 0, submissionPct = 0, subjectRows = [] }) {
  return (
    <View style={[st.card, { flex: 1.4 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={st.cardMeta}>Submissions</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text style={st.bigNum}>{totalSubmitted}</Text>
            <Text style={[st.cardMeta, { fontSize: 16 }]}>/{totalAssignments}</Text>
          </View>
          <Text style={[st.cardMeta, { color: C.teal, marginTop: 2 }]}>
            Semester progress: {submissionPct}%
          </Text>
        </View>
        <View style={st.iconCircle}>
          <Text style={{ fontSize: 22 }}>📋</Text>
        </View>
      </View>

      {/* Per-subject submitted / total breakdown */}
      <View style={{ marginTop: 14, gap: 8 }}>
        {subjectRows.length > 0 ? (
          subjectRows.slice(0, 5).map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.rowTxt} numberOfLines={1}>{s.subject}</Text>
              <Text style={[st.rowTxt, { color: C.white }]}>{s.done}/{s.total}</Text>
            </View>
          ))
        ) : (
          <Text style={[st.cardMeta, { fontStyle: 'italic' }]}>No assignments yet</Text>
        )}
      </View>
    </View>
  );
}

// ─── Pending Card — now receives real data ────────────────────────────────────
function PendingCard({ C, st, totalPending = 0, pendingRows = [] }) {
  return (
    <View style={[st.card, { flex: 1.2 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={st.cardMeta}>Pending Tasks</Text>
          <Text style={st.bigNum}>{String(totalPending).padStart(2, '0')}</Text>
          <Text style={[st.cardMeta, { color: C.orange, marginTop: 2 }]}>Action Required</Text>
        </View>
        <View style={[st.iconCircle, { backgroundColor: C.mode === 'dark' ? '#2c1a06' : '#fef3e2' }]}>
          <Text style={{ fontSize: 22 }}>⏰</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 8 }}>
        {pendingRows.length > 0 ? (
          pendingRows.slice(0, 4).map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={st.rowTxt} numberOfLines={1}>{p.subject}</Text>
              <View style={{ borderRadius: 6, borderWidth: 1, backgroundColor: C.mode === 'dark' ? '#3b0f0f' : '#fde8e8', borderColor: C.red, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: C.red }}>{p.count}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[st.cardMeta, { color: C.teal, fontStyle: 'italic' }]}>All caught up! 🎉</Text>
        )}
      </View>
    </View>
  );
}

// ─── Subject Attendance Table ─────────────────────────────────────────────────
function SubjectTable({ isDesktop, C, st, attendanceData = [] }) {
  const [selectedType, setSelectedType] = useState('Theory');

  const filteredData = attendanceData.filter(item =>
    selectedType === 'Theory' ? item.type !== 'Lab' : item.type === 'Lab'
  );

  const getPctColor = (pct) => {
    if (pct >= 90) return C.teal;
    if (pct >= 80) return C.blueLight;
    return C.orange;
  };

  return (
    <View style={[st.card, { flex: isDesktop ? 3 : undefined }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={st.cardTitle}>Subject Wise Attendance</Text>
        <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
          {['Theory', 'Labs'].map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setSelectedType(type)}
              style={[st.toggleBtn, { backgroundColor: selectedType === type ? C.accent : C.cardBorder, borderColor: selectedType === type ? C.accent : C.cardBorder }]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[st.toggleBtnText, { color: C.white }]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={st.tableHeader}>
        <Text style={[st.tableHeaderTxt, { flex: 2 }]}>SUBJECT</Text>
        <TouchableOpacity activeOpacity={0.8} style={[st.lectureBtn, { flex: 1 }]}>
          <Text style={[st.lectureBtnText, { color: C.muted }]}>LECTURE / PRACTICAL</Text>
        </TouchableOpacity>
        <Text style={st.tableHeaderTxt}>STATUS</Text>
        <Text style={st.tableHeaderTxt}>PROGRESS</Text>
      </View>

      {filteredData.length > 0 ? (
        filteredData.map((row, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={[st.tableRow, i === filteredData.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={[st.rowTxt, { flex: 2, color: C.white }]}>{row.subject}</Text>
            <Text style={[st.rowTxt, { flex: 1, textAlign: 'center' }]}>{row.ratio}</Text>
            <Text style={[st.rowTxt, { flex: 1, textAlign: 'center', color: getPctColor(row.pct), fontWeight: '700' }]}>
              {row.pct}%
            </Text>
            <View style={[st.progBg, { flex: 1.2, marginLeft: 8 }]}>
              <View style={[st.progFill, { width: `${row.pct}%`, backgroundColor: getPctColor(row.pct) }]} />
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: C.sub, fontSize: 13 }}>No {selectedType} subjects available</Text>
        </View>
      )}
    </View>
  );
}

// ─── Deadlines Card — now receives real deadline data ─────────────────────────
function DeadlinesCard({ isDesktop, C, st, deadlines = [] }) {
  const priorityMeta = {
    'HIGH PRIORITY': { colorKey: 'red',    bgDark: '#3b0f0f', bgLight: '#fde8e8' },
    'MEDIUM':        { colorKey: 'orange', bgDark: '#2c1a06', bgLight: '#fef3e2' },
    'OPTIONAL':      { colorKey: 'sub',    bgDark: '#1a2f4a', bgLight: '#e2ecf5' },
    'LOW':           { colorKey: 'sub',    bgDark: '#1a2f4a', bgLight: '#e2ecf5' },
  };

  return (
    <View style={[st.card, { flex: isDesktop ? 1.3 : undefined }]}>
      <Text style={[st.cardTitle, { marginBottom: 16 }]}>Upcoming Deadlines</Text>

      {deadlines.length > 0 ? deadlines.map((d, i) => {
        const meta     = priorityMeta[d.priority] ?? priorityMeta['LOW'];
        const tagColor = C[meta.colorKey] ?? C.sub;
        const tagBg    = C.mode === 'dark' ? meta.bgDark : meta.bgLight;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.75}
            style={[st.deadlineItem, i === deadlines.length - 1 && { marginBottom: 0 }]}
          >
            <View style={[st.deadlineAccent, { backgroundColor: tagColor }]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <Text style={st.deadlineTitle} numberOfLines={2}>{d.title}</Text>
                <Tag label={d.priority} color={tagColor} bg={tagBg} />
              </View>
              <Text style={[st.cardMeta, { marginTop: 6 }]}>📅 {d.date}</Text>
            </View>
          </TouchableOpacity>
        );
      }) : (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🎉</Text>
          <Text style={{ color: C.sub, fontSize: 13, textAlign: 'center' }}>No upcoming deadlines</Text>
        </View>
      )}
    </View>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ isDesktop, C, st }) {
  const [searchText,    setSearchText]    = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <View style={[st.topBar, !isDesktop && st.topBarMobile]}>
      <Text style={[st.topBarTitle, !isDesktop && { fontSize: 16 }]}>
        {isDesktop ? 'Student Analytics Overview' : 'Analytics'}
      </Text>
      {isDesktop && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={[st.searchBar, searchFocused && { borderColor: C.blue, backgroundColor: C.card }]}
        >
          <Text style={{ color: C.muted, fontSize: 13, marginRight: 6 }}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search analytics..."
            placeholderTextColor={C.muted}
            style={st.searchInput}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: C.muted, fontSize: 14, marginLeft: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────
function DesktopLayout({ C, st, attendanceData, assignmentProps }) {
  return (
    <ScrollView contentContainerStyle={st.bodyDesktop} showsVerticalScrollIndicator={false}>
      <View style={st.row}>
        <AttendanceCard C={C} st={st} attendanceData={attendanceData} />
        <SubmissionsCard C={C} st={st} {...assignmentProps} />
        <PendingCard     C={C} st={st} {...assignmentProps} />
      </View>
      <View style={[st.row, { alignItems: 'flex-start' }]}>
        <SubjectTable  isDesktop C={C} st={st} attendanceData={attendanceData} />
        <DeadlinesCard isDesktop C={C} st={st} deadlines={assignmentProps.deadlines} />
      </View>
    </ScrollView>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────
function MobileLayout({ C, st, attendanceData, assignmentProps }) {
  const overallAttendance = calculateOverallAttendance(attendanceData);
  return (
    <ScrollView contentContainerStyle={st.bodyMobile} showsVerticalScrollIndicator={false}>
      <View style={st.mobileStatRow}>
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardMeta}>Total Attendance</Text>
          <Text style={[st.bigNum, { fontSize: 32 }]}>{overallAttendance}%</Text>
          <Text style={[st.cardMeta, { color: C.teal }]}>↑ Above threshold</Text>
          <View style={{ borderRadius: 6, borderWidth: 1, marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', backgroundColor: C.mode === 'dark' ? '#0a2e28' : '#d0f5ef', borderColor: C.teal }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.teal }}>Good</Text>
          </View>
        </View>
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardMeta}>Pending Tasks</Text>
          <Text style={[st.bigNum, { fontSize: 32 }]}>
            {String(assignmentProps.totalPending).padStart(2, '0')}
          </Text>
          <Text style={[st.cardMeta, { color: C.orange }]}>Action Required</Text>
          <View style={{ borderRadius: 6, borderWidth: 1, marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', backgroundColor: C.mode === 'dark' ? '#2c1a06' : '#fef3e2', borderColor: C.orange }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.orange }}>⏰ Now</Text>
          </View>
        </View>
      </View>

      <SubmissionsCard C={C} st={st} {...assignmentProps} />
      <PendingCard     C={C} st={st} {...assignmentProps} />
      <SubjectTable    isDesktop={false} C={C} st={st} attendanceData={attendanceData} />
      <DeadlinesCard   isDesktop={false} C={C} st={st} deadlines={assignmentProps.deadlines} />
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { width }   = useWindowDimensions();
  const isDesktop   = width >= BREAKPOINT;
  const { C }       = useTheme();
  const st          = makeStyles(C);

  // Attendance state
  const [attendanceData, setAttendanceData] = useState([]);

  // Assignment state
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalSubmitted,   setTotalSubmitted]   = useState(0);
  const [totalPending,     setTotalPending]     = useState(0);
  const [submissionPct,    setSubmissionPct]    = useState(0);
  const [subjectRows,      setSubjectRows]      = useState([]);  // [{subject, done, total}]
  const [pendingRows,      setPendingRows]      = useState([]);  // [{subject, count}]
  const [deadlines,        setDeadlines]        = useState([]);  // upcoming deadline objects

  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllData(); }, []);

  // ── Fetch attendance ───────────────────────────────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const parentId = await AsyncStorage.getItem('parentId') || await AsyncStorage.getItem('userId');
      if (!parentId) return;

      const [childRes, subjectsRes] = await Promise.all([
        axiosInstance.get(`/parents/child-info/${parentId}`).catch(() => null),
        axiosInstance.get(`/parents/subjects/${parentId}`).catch(() => null),
      ]);

      const student        = childRes?.data?.success ? childRes.data.student : null;
      const fetchedSubjects = subjectsRes?.data?.subjects || student?.subjects || [];
      const fetchedLabs     = subjectsRes?.data?.labs     || student?.labs     || [];

      // ── Attendance ─────────────────────────────────────────────────────────
      const studentMongoId = student?._id;
      if (studentMongoId) {
        const attRes = await axiosInstance.get(`/attendance/student/${studentMongoId}`).catch(() => null);
        if (attRes?.data?.success && attRes.data.subjectSummary) {
          const attMap = {};
          for (const s of attRes.data.subjectSummary) attMap[s.subject.toLowerCase()] = s;

          const rows = [
            ...fetchedSubjects.map(name => {
              const real = attMap[name.toLowerCase()];
              return { subject: name, attended: real?.present ?? 0, total: real?.total ?? 0, pct: real?.percentage ?? 0, ratio: real ? `${real.present}/${real.total}` : '0/0', type: 'Theory' };
            }),
            ...fetchedLabs.map(name => {
              const real = attMap[name.toLowerCase()];
              return { subject: name, attended: real?.present ?? 0, total: real?.total ?? 0, pct: real?.percentage ?? 0, ratio: real ? `${real.present}/${real.total}` : '0/0', type: 'Lab' };
            }),
          ];
          setAttendanceData(rows);
        }
      }

      // ── Assignments (mirrors Assignment.js + Dashboardpage.js) ─────────────
      await fetchAssignmentStats(student);

    } catch (err) {
      console.log('[Analytics] fetchAllData error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentStats = async (student) => {
    if (!student) return;
    try {
      const studentMongoId = student._id;
      const rawYear        = student.year     ?? student.class    ?? null;
      const rawDivision    = student.division ?? student.div      ?? student.section ?? null;
      const apiYear        = toApiYear(rawYear);
      const apiDiv         = rawDivision ? String(rawDivision).trim().toUpperCase() : null;

      const res = await axiosInstance.get('/assignments').catch(() => null);
      if (!res?.data?.success) return;

      const all      = res.data.data ?? [];
      const normYear = apiYear ? (YEAR_MAP[apiYear] ?? apiYear).toUpperCase() : null;

      // Filter to this student's year + division, active only
      const visible = all.filter(a => {
        if (a.status !== 'ACTIVE' && a.status !== 'APPROVED') return false;
        const aYear = a.year     ? (YEAR_MAP[a.year] ?? a.year).toUpperCase()  : null;
        const aDiv  = a.division ? String(a.division).trim().toUpperCase()     : null;
        const yearMatch = !normYear || aYear === normYear;
        const divMatch  = !apiDiv   || aDiv  === apiDiv;
        return yearMatch && divMatch;
      });

      const sid = String(studentMongoId ?? '');

      // ── Overall counts ─────────────────────────────────────────────────────
      const total     = visible.length;
      const submitted = visible.filter(a =>
        (a.submissions ?? []).some(s => String(s.studentId) === sid)
      ).length;
      const pending = total - submitted;
      const pct     = total === 0 ? 0 : Math.round((submitted / total) * 100);

      setTotalAssignments(total);
      setTotalSubmitted(submitted);
      setTotalPending(pending);
      setSubmissionPct(pct);

      // ── Per-subject submission rows ────────────────────────────────────────
      const subjectMap = {};
      visible.forEach(a => {
        const subj = a.subject || 'Unknown';
        if (!subjectMap[subj]) subjectMap[subj] = { total: 0, done: 0 };
        subjectMap[subj].total += 1;
        if ((a.submissions ?? []).some(s => String(s.studentId) === sid)) {
          subjectMap[subj].done += 1;
        }
      });

      const sRows = Object.entries(subjectMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subject, { total: t, done: d }]) => ({ subject, total: t, done: d }));
      setSubjectRows(sRows);

      // ── Pending breakdown by subject (for PendingCard) ─────────────────────
      const pRows = sRows
        .map(r => ({ subject: r.subject, count: r.total - r.done }))
        .filter(r => r.count > 0);
      setPendingRows(pRows);

      // ── Upcoming deadlines (unsubmitted, sorted by dueDate, top 3) ─────────
      const dl = visible
        .filter(a => !(a.submissions ?? []).some(s => String(s.studentId) === sid))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3)
        .map(a => ({
          title:    a.title,
          priority: getDuePriority(a.dueDate),
          date:     formatDueDate(a.dueDate),
        }));
      setDeadlines(dl);

    } catch (err) {
      console.log('[Analytics] fetchAssignmentStats error:', err.message);
    }
  };

  // Bundle all assignment-derived props so layouts stay clean
  const assignmentProps = {
    totalAssignments, totalSubmitted, totalPending, submissionPct,
    subjectRows, pendingRows, deadlines,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar isDesktop={isDesktop} C={C} st={st} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.white, fontSize: 14 }}>Loading analytics data...</Text>
        </View>
      ) : isDesktop ? (
        <DesktopLayout C={C} st={st} attendanceData={attendanceData} assignmentProps={assignmentProps} />
      ) : (
        <MobileLayout  C={C} st={st} attendanceData={attendanceData} assignmentProps={assignmentProps} />
      )}
    </View>
  );
}

// ─── Dynamic StyleSheet ───────────────────────────────────────────────────────
function makeStyles(C) {
  return StyleSheet.create({
    topBar:       { height: 64, backgroundColor: C.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    topBarMobile: { height: 56, paddingHorizontal: 16 },
    topBarTitle:  { color: C.white, fontSize: 20, fontWeight: '800' },
    searchBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.searchBg, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6, minWidth: 220, borderWidth: 1, borderColor: C.cardBorder },
    searchInput:  { flex: 1, color: C.white, fontSize: 13, paddingVertical: 2, outlineStyle: 'none' },
    topIcon:      { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
    bodyDesktop:  { padding: 20, gap: 16 },
    bodyMobile:   { padding: 14, gap: 14 },
    row:          { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    mobileStatRow:{ flexDirection: 'row', gap: 12 },
    card:         { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.cardBorder },
    cardTitle:    { color: C.white, fontSize: 16, fontWeight: '700' },
    cardMeta:     { color: C.sub, fontSize: 12 },
    bigNum:       { color: C.white, fontSize: 38, fontWeight: '900', lineHeight: 46, marginTop: 4 },
    iconCircle:   { width: 48, height: 48, borderRadius: 14, backgroundColor: C.chipBg, alignItems: 'center', justifyContent: 'center' },
    tableHeader:    { flexDirection: 'row', paddingBottom: 8 },
    tableHeaderTxt: { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    tableRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    rowTxt:         { flex: 1, color: C.sub, fontSize: 13 },
    lectureBtn:     { alignItems: 'center' },
    lectureBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    toggleBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    toggleBtnText:  { fontSize: 13, fontWeight: '600', color: C.white },
    progBg:         { height: 4, backgroundColor: C.muted, borderRadius: 2 },
    progFill:       { height: 4, borderRadius: 2 },
    deadlineItem:   { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: C.searchBg, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder },
    deadlineAccent: { width: 3, borderRadius: 2, minHeight: 40 },
    deadlineTitle:  { color: C.white, fontSize: 13, fontWeight: '700', flex: 1 },
    calBtn:         { marginTop: 6, backgroundColor: C.cardBorder, borderRadius: 30, paddingVertical: 13, alignItems: 'center' },
    calBtnTxt:      { color: C.white, fontWeight: '700', fontSize: 14 },
  });
}