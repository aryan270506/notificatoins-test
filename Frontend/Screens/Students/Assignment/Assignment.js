/**
 * Assignment.js  (Student-side dashboard)
 *
 * - Fetches real assignments from /api/assignments?year=&division=
 *   using the student's year + division stored in AsyncStorage at login
 * - Uses submissions.length for progress (total field removed from schema)
 * - Shows description in deadline cards
 * - Falls back gracefully when offline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useWindowDimensions, StatusBar,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';
import AssignmentPortal from './AssignmentPortal';

// ─── Map stored year codes back to API codes ──────────────────────────────────
// Login may normalise "FY"→"1" etc. for quiz use; reverse here.
const YEAR_REVERSE = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const toApiYear = (y) => {
  if (!y) return null;
  const up = String(y).trim().toUpperCase();
  return YEAR_REVERSE[up] ?? up;
};

// ─── Reusable Components ──────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color, style, C }) => (
  <View style={[{ height: 5, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }, style]}>
    <View style={{
      height: '100%', borderRadius: 3,
      width: `${Math.round((value / Math.max(max, 1)) * 100)}%`,
      backgroundColor: color ?? C.accent,
    }} />
  </View>
);

const Badge = ({ label, color }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={styles.badgeText}>{label.toUpperCase()}</Text>
  </View>
);

const StatCard = ({ title, children, style, C }) => (
  <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }, style]}>
    <Text style={[styles.statTitle, { color: C.textMuted }]}>{title}</Text>
    {children}
  </View>
);

const PendingTaskRow = ({ subject, count, onPress, C }) => (
  <View style={styles.pendingRow}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.pendingSubject, { color: C.textPrimary }]} numberOfLines={1}>{subject}</Text>
      <Text style={[styles.pendingCount, { color: C.textMuted }]}>{count} Pending</Text>
    </View>
    <TouchableOpacity activeOpacity={0.75} style={[styles.submitBtn, { backgroundColor: C.accent }]} onPress={onPress}>
      <Text style={styles.submitBtnText}>SUBMIT NOW</Text>
    </TouchableOpacity>
  </View>
);

const CourseRow = ({ name, done, total, color, C }) => (
  <View style={[styles.courseRow, { borderTopColor: C.border }]}>
    <View style={styles.courseInfo}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.courseName, { color: C.textPrimary }]} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={[styles.courseScore, { color }]}>
        {String(done).padStart(2, '0')} / {total}
      </Text>
    </View>
    <ProgressBar value={done} max={total} color={color} style={{ marginTop: 6 }} C={C} />
  </View>
);

const SubjectChip = ({ label, onPress, C }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75}
    style={[styles.subjectChip, { borderColor: C.border }]}>
    <Text style={[styles.subjectChipText, { color: C.textPrimary }]}>{label}</Text>
  </TouchableOpacity>
);

const DeadlineCard = ({ title, description, priority, due, color, onPress, isTablet, C }) => (
  <TouchableOpacity activeOpacity={0.8}
    style={[styles.deadlineCard, { backgroundColor: C.cardAlt, borderColor: C.border }, isTablet ? { flex: 1 } : null]}
    onPress={onPress}>
    <View style={styles.deadlineHeader}>
      <Text style={[styles.deadlineTitle, { color: C.textPrimary }]} numberOfLines={2}>{title}</Text>
      <Badge label={priority} color={color} />
    </View>
    {!!description && (
      <Text style={[styles.deadlineDesc, { color: C.textMuted }]} numberOfLines={2}>{description}</Text>
    )}
    <Text style={[styles.deadlineDue, { color: C.textMuted }]}>⏱  DUE IN: {due}</Text>
    <TouchableOpacity activeOpacity={0.75} style={[styles.deadlineBtn, { borderColor: C.border }]} onPress={onPress}>
      <Text style={[styles.deadlineBtnText, { color: C.textPrimary }]}>
        {priority === 'CRITICAL' ? 'SUBMIT' : 'VIEW'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDuePriority = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return 'LOW';
  const due = new Date(dueDate);
  if (isNaN(due)) return 'LOW';
  const hoursLeft = (due - Date.now()) / 36e5;
  if (hoursLeft < 24)  return 'CRITICAL';
  if (hoursLeft < 72)  return 'MID';
  return 'LOW';
};

const getDueLabel = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return 'No deadline';
  const due = new Date(dueDate);
  if (isNaN(due)) return dueDate;
  const h = Math.max(0, Math.round((due - Date.now()) / 36e5));
  if (h < 1)   return 'Due now';
  if (h < 24)  return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function StudentAssignment({ C, user }) {
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;

  const [portalSubject, setPortalSubject] = useState(null);
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [studentInfo,   setStudentInfo]   = useState(null);
  const [debugInfo,     setDebugInfo]     = useState('initialising…');

  // ── Load student info ─────────────────────────────────────────────────────
  const loadStudent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('studentData');
      console.log('[StudentAssignment] raw studentData from AsyncStorage:', raw);
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log('[StudentAssignment] parsed studentData keys:', Object.keys(parsed));
        console.log('[StudentAssignment] year:', parsed.year, '| division:', parsed.division,
          '| class:', parsed.class, '| batch:', parsed.batch);
        return parsed;
      }
    } catch (e) { console.warn('[StudentAssignment] AsyncStorage error:', e); }
    console.log('[StudentAssignment] falling back to user prop:', user);
    return user ?? null;
  }, [user]);

  // ── Fetch assignments for this student's year + division ──────────────────
  const fetchAssignments = useCallback(async (info) => {
    if (!info) { setLoading(false); setDebugInfo('studentInfo is null'); return; }

    const rawYear     = info.year     ?? info.class    ?? info.Year    ?? info.Class    ?? null;
    const rawDivision = info.division ?? info.Division ?? info.div     ?? info.section  ?? null;

    const apiYear = toApiYear(rawYear);
    const apiDiv  = rawDivision ? String(rawDivision).trim().toUpperCase() : null;

    setDebugInfo(`year: "${rawYear}" → "${apiYear}" | div: "${rawDivision}" → "${apiDiv}"`);

    try {
      // Fetch ALL assignments (no filter) then match client-side
      // This bypasses any server-side year/division mismatch
      const res = await axiosInstance.get('/assignments');

      console.log('[StudentAssignment] ALL assignments:', JSON.stringify(res.data).slice(0, 800));

      if (res.data?.success) {
        const all = res.data.data ?? [];

        // Client-side match — compare year and division case-insensitively
        const YEAR_MAP = { '1':'FY','2':'SY','3':'TY','4':'LY' };
        const normYear = apiYear ? (YEAR_MAP[apiYear] ?? apiYear).toUpperCase() : null;

        const visible = all.filter(a => {
          if (a.status !== 'ACTIVE' && a.status !== 'APPROVED') return false;
          const aYear = a.year ? (YEAR_MAP[a.year] ?? a.year).toUpperCase() : null;
          const aDiv  = a.division ? String(a.division).trim().toUpperCase() : null;
          const yearMatch = !normYear || aYear === normYear;
          const divMatch  = !apiDiv   || aDiv  === apiDiv;
          return yearMatch && divMatch;
        });

        console.log('[StudentAssignment] all:', all.length,
          '| matched year+div:', visible.length,
          '| sample years:', all.slice(0,3).map(a => a.year + '/' + a.division));

        setDebugInfo(prev =>
          prev + ` | DB total: ${all.length}, matched: ${visible.length}` +
          (all.length > 0 ? ` | DB sample: year="${all[0].year}" div="${all[0].division}"` : '')
        );
        setAssignments(visible);
      }
    } catch (err) {
      const errMsg = err?.response?.data ?? err?.message ?? String(err);
      console.warn('[StudentAssignment] fetch error:', errMsg);
      setDebugInfo(prev => prev + ' | ERROR: ' + JSON.stringify(errMsg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const info = await loadStudent();
      setStudentInfo(info);
      await fetchAssignments(info);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const info = await loadStudent();
    await fetchAssignments(info);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  // Normalise studentId to string for safe comparison against submission records
  const studentId = String(studentInfo?._id ?? studentInfo?.id ?? '');

  // Group by subject name — subject name IS the display label and portal key
  const subjectMap = {};
  assignments.forEach(a => {
    const subj = a.subject || 'Unknown';
    if (!subjectMap[subj]) subjectMap[subj] = { total: 0, done: 0 };
    subjectMap[subj].total += 1;
    const submitted = (a.submissions ?? []).some(s => String(s.studentId) === studentId);
    if (submitted) subjectMap[subj].done += 1;
  });

  const subjects = Object.keys(subjectMap).sort();
  const courses  = subjects.map(name => {
    const { total, done } = subjectMap[name];
    const pct = total === 0 ? 0 : done / total;
    return {
      name, done, total,
      color: pct >= 0.9 ? C.green : pct >= 0.7 ? C.accent : C.orange,
    };
  });

  const totalAssignments = assignments.length;
  const totalDone = assignments.filter(a =>
    (a.submissions ?? []).some(s => String(s.studentId) === studentId)
  ).length;
  const totalPending  = totalAssignments - totalDone;
  const submissionPct = totalAssignments === 0 ? 0 : Math.round((totalDone / totalAssignments) * 100);

  // Pending tasks list (subjects with pending > 0, up to 3)
  const pendingTasks = subjects
    .map(subject => ({ subject, count: subjectMap[subject].total - subjectMap[subject].done }))
    .filter(t => t.count > 0)
    .slice(0, 3);

  // Upcoming deadlines — unsubmitted, sorted by dueDate
  const deadlineColors = { CRITICAL: C.red, MID: C.accent, LOW: C.green };
  const deadlines = assignments
    .filter(a => !(a.submissions ?? []).some(s => String(s.studentId) === studentId))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3)
    .map(a => ({
      id:          a._id,
      title:       a.title,
      description: a.description || '',
      subject:     a.subject,
      priority:    getDuePriority(a.dueDate),
      due:         getDueLabel(a.dueDate),
      color:       deadlineColors[getDuePriority(a.dueDate)],
    }));

  const navigateToPortal = (subject) => setPortalSubject(subject);
  const goBack           = ()        => setPortalSubject(null);

  // ── Portal screen ─────────────────────────────────────────────────────────
  if (portalSubject !== null) {
    return (
      <AssignmentPortal
        subject={portalSubject}
        onBack={goBack}
        C={C}
        assignments={assignments}
        studentId={studentId}
        studentName={studentInfo?.name ?? ''}
        onSubmitted={() => fetchAssignments(studentInfo)}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 14 }}>Loading assignments…</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* ── DEBUG PANEL — remove once fetching works ── */}
        <View style={{ backgroundColor: '#1a1a2e', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#ff6b6b' }}>
          <Text style={{ color: '#ff6b6b', fontSize: 9, fontWeight: '800', marginBottom: 4 }}>🔍 DEBUG (remove after fix)</Text>
          <Text style={{ color: '#ffd93d', fontSize: 10, lineHeight: 16 }}>
            {`stored year: ${studentInfo?.year ?? studentInfo?.class ?? 'NOT FOUND'}\n`}
            {`stored div:  ${studentInfo?.division ?? studentInfo?.div ?? studentInfo?.section ?? 'NOT FOUND'}\n`}
            {`studentId:   ${String(studentInfo?._id ?? studentInfo?.id ?? 'NOT FOUND')}\n`}
            {`assignments: ${assignments.length}\n`}
            {`status: ${debugInfo}`}
          </Text>
          <Text style={{ color: '#6bcbff', fontSize: 9, marginTop: 4 }}>
            {`All keys in studentData: ${studentInfo ? Object.keys(studentInfo).join(', ') : 'none'}`}
          </Text>
        </View>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: C.textPrimary }]}>
              Welcome back, {studentInfo?.name ? studentInfo.name.split(' ')[0] : 'Student'}
            </Text>
            <Text style={[styles.subText, { color: C.textMuted }]}>
              {studentInfo?.prn ?? studentInfo?.email ?? '—'}
              {studentInfo?.branch ? ` · ${studentInfo.branch}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        {isTablet ? (
          <View style={styles.rowTablet}>
            <StatCard title="TOTAL ASSIGNMENTS" style={{ flex: 1 }} C={C}>
              <Text style={[styles.bigNumber, { color: C.textPrimary }]}>
                {totalAssignments}{' '}
                <Text style={[styles.pendingLabel, { color: C.accent }]}>□ {totalPending} Pending</Text>
              </Text>
              <ProgressBar value={totalDone} max={totalAssignments} style={{ marginTop: 10 }} C={C} />
            </StatCard>

            <StatCard title="SUBMISSION STATUS" style={{ flex: 1 }} C={C}>
              <View style={styles.rowCenter}>
                <Text style={[styles.bigNumber, { color: C.textPrimary }]}>{totalDone}</Text>
                <Text style={[styles.outOf, { color: C.textMuted }]}> / {totalAssignments}</Text>
                <Text style={[styles.pct, { color: C.green }]}>  ⊙ {submissionPct}%</Text>
              </View>
              <ProgressBar value={totalDone} max={totalAssignments} color={C.green} style={{ marginTop: 10 }} C={C} />
            </StatCard>

            <StatCard title="PENDING TASKS" style={{ flex: 1 }} C={C}>
              {pendingTasks.length === 0
                ? <Text style={[styles.pendingCount, { color: C.green }]}>All caught up! 🎉</Text>
                : pendingTasks.map((task, i) => (
                    <PendingTaskRow key={i} subject={task.subject} count={task.count}
                      onPress={() => navigateToPortal(task.subject)} C={C} />
                  ))
              }
              {deadlines[0] && (
                <Text style={[styles.nextDue, { color: C.orange }]}>
                  NEXT DUE: {deadlines[0].due.toUpperCase()}
                </Text>
              )}
            </StatCard>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.rowTablet}>
              <StatCard title="TOTAL ASSIGNMENTS" style={{ flex: 1 }} C={C}>
                <Text style={[styles.bigNumberMobile, { color: C.textPrimary }]}>{totalAssignments}</Text>
                <Text style={[styles.pendingLabel, { fontSize: 11, color: C.accent }]}>□ {totalPending} Pending</Text>
                <ProgressBar value={totalDone} max={totalAssignments} style={{ marginTop: 8 }} C={C} />
              </StatCard>

              <StatCard title="SUBMISSION STATUS" style={{ flex: 1 }} C={C}>
                <View style={styles.rowCenter}>
                  <Text style={[styles.bigNumberMobile, { color: C.textPrimary }]}>{totalDone}</Text>
                  <Text style={[styles.outOf, { fontSize: 18, color: C.textMuted }]}> / {totalAssignments}</Text>
                </View>
                <Text style={[styles.pct, { color: C.green, fontSize: 12 }]}>⊙ {submissionPct}% Complete</Text>
                <ProgressBar value={totalDone} max={totalAssignments} color={C.green} style={{ marginTop: 8 }} C={C} />
              </StatCard>
            </View>

            <StatCard title="PENDING TASKS" C={C}>
              {pendingTasks.length === 0
                ? <Text style={[styles.pendingCount, { color: C.green }]}>All caught up! 🎉</Text>
                : pendingTasks.map((task, i) => (
                    <PendingTaskRow key={i} subject={task.subject} count={task.count}
                      onPress={() => navigateToPortal(task.subject)} C={C} />
                  ))
              }
              {deadlines[0] && (
                <Text style={[styles.nextDue, { color: C.orange }]}>
                  NEXT DUE: {deadlines[0].due.toUpperCase()}
                </Text>
              )}
            </StatCard>
          </View>
        )}

        {/* ── Course Progress + Subjects ── */}
        {courses.length > 0 && (
          <View style={isTablet ? styles.rowTablet : { gap: 12 }}>
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, isTablet && { flex: 2 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Course Submission Progress</Text>
                {studentInfo?.year && (
                  <View style={[styles.semesterBadge, { backgroundColor: C.accentBg }]}>
                    <Text style={[styles.semesterText, { color: C.accent }]}>Year {studentInfo.year}</Text>
                  </View>
                )}
              </View>
              {courses.map((c, i) => <CourseRow key={i} {...c} C={C} />)}
            </View>

            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, isTablet && { flex: 1 }]}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Subjects</Text>
              {isTablet ? (
                subjects.map((subject, i) => (
                  <SubjectChip key={i} label={subject} onPress={() => navigateToPortal(subject)} C={C} />
                ))
              ) : (
                <View style={styles.subjectGrid}>
                  {subjects.map((subject, i) => (
                    <TouchableOpacity key={i} onPress={() => navigateToPortal(subject)} activeOpacity={0.75}
                      style={[styles.subjectChipGrid, { borderColor: C.border }]}>
                      <Text style={[styles.subjectChipText, { color: C.textPrimary }]}>{subject}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {subjects.length === 0 && (
                <Text style={[styles.pendingCount, { color: C.textMuted }]}>No subjects yet</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Deadlines ── */}
        {deadlines.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Upcoming Deadlines</Text>
            </View>
            {isTablet ? (
              <View style={styles.rowTablet}>
                {deadlines.map((d, i) => (
                  <DeadlineCard key={i} {...d} isTablet
                    onPress={() => navigateToPortal(d.subject)} C={C} />
                ))}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {deadlines.map((d, i) => (
                  <DeadlineCard key={i} {...d} isTablet={false}
                    onPress={() => navigateToPortal(d.subject)} C={C} />
                ))}
              </View>
            )}
            <TouchableOpacity activeOpacity={0.75} style={styles.viewAllBtn}
              onPress={() => navigateToPortal('__ALL__')}>
              <Text style={[styles.viewAllText, { color: C.accent }]}>VIEW ALL ASSIGNMENTS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {assignments.length === 0 && !loading && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 36 }}>📋</Text>
            <Text style={[styles.cardTitle, { color: C.textMuted }]}>No assignments yet</Text>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>Your teacher hasn't posted any assignments.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 8,
    paddingBottom: 32,
    gap: 12,
  },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  welcomeText: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  subText:     { fontSize: 12, marginTop: 2 },

  rowTablet: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'baseline' },

  card:     { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  statCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },

  statTitle:       { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  bigNumber:       { fontSize: 28, fontWeight: '700', marginTop: 4 },
  bigNumberMobile: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  pendingLabel:    { fontSize: 13, fontWeight: '500' },
  outOf:           { fontSize: 22, fontWeight: '500' },
  pct:             { fontSize: 13, fontWeight: '600' },

  pendingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  pendingSubject: { fontSize: 13, fontWeight: '500' },
  pendingCount:   { fontSize: 11, marginTop: 2 },
  submitBtn:      { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  submitBtnText:  { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  nextDue:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },

  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  semesterBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  semesterText:  { fontSize: 10, fontWeight: '600' },

  courseRow:  { paddingVertical: 8, borderTopWidth: 1 },
  courseInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseName: { fontSize: 13, fontWeight: '600', flex: 1 },
  courseScore:{ fontSize: 12, fontWeight: '700', marginLeft: 8 },

  subjectChip:     { borderRadius: 8, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  subjectChipText: { fontSize: 13, fontWeight: '500' },
  subjectGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectChipGrid: { borderRadius: 8, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, width: '47%', alignItems: 'center' },

  deadlineCard:    { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  deadlineHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  deadlineTitle:   { fontSize: 13, fontWeight: '600', flex: 1 },
  deadlineDesc:    { fontSize: 11, lineHeight: 16 },
  badge:           { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText:       { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  deadlineDue:     { fontSize: 11 },
  deadlineBtn:     { borderWidth: 1, borderRadius: 6, paddingVertical: 5, alignItems: 'center' },
  deadlineBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  viewAllBtn:  { alignItems: 'center', paddingVertical: 8 },
  viewAllText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});