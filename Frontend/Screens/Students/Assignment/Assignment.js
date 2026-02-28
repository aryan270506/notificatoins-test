/**
 * Assignment.js
 * - Accepts C prop directly from StudentMain (no remapping)
 * - Passes C down to AssignmentPortal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssignmentPortal from './AssignmentPortal';

// ─── Reusable Components ──────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color, style, C }) => (
  <View style={[{ height: 5, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }, style]}>
    <View
      style={{
        height: '100%',
        borderRadius: 3,
        width: `${Math.round((value / max) * 100)}%`,
        backgroundColor: color ?? C.accent,
      }}
    />
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
      <Text style={[styles.pendingSubject, { color: C.textPrimary }]}>{subject}</Text>
      <Text style={[styles.pendingCount, { color: C.textMuted }]}>{count} Pending</Text>
    </View>
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.submitBtn, { backgroundColor: C.accent }]}
      onPress={onPress}
    >
      <Text style={styles.submitBtnText}>SUBMIT NOW</Text>
    </TouchableOpacity>
  </View>
);

const CourseRow = ({ name, code, sub, done, total, color, C }) => (
  <View style={[styles.courseRow, { borderTopColor: C.border }]}>
    <View style={styles.courseInfo}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.courseName, { color: C.textPrimary }]}>{name}</Text>
        <Text style={[styles.courseCode, { color: C.textMuted }]}>{code} · {sub}</Text>
      </View>
      <Text style={[styles.courseScore, { color }]}>
        {String(done).padStart(2, '0')} / {total}
      </Text>
    </View>
    <ProgressBar value={done} max={total} color={color} style={{ marginTop: 6 }} C={C} />
  </View>
);

const SubjectChip = ({ label, onPress, C }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.subjectChip, { borderColor: C.border }]}
  >
    <Text style={[styles.subjectChipText, { color: C.textPrimary }]}>{label}</Text>
  </TouchableOpacity>
);

const DeadlineCard = ({ title, priority, due, color, onPress, isTablet, C }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[
      styles.deadlineCard,
      { backgroundColor: C.cardAlt, borderColor: C.border },
      isTablet ? { flex: 1 } : null,
    ]}
    onPress={onPress}
  >
    <View style={styles.deadlineHeader}>
      <Text style={[styles.deadlineTitle, { color: C.textPrimary }]} numberOfLines={2}>
        {title}
      </Text>
      <Badge label={priority} color={color} />
    </View>
    <Text style={[styles.deadlineDue, { color: C.textMuted }]}>⏱  DUE IN: {due}</Text>
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.deadlineBtn, { borderColor: C.border }]}
      onPress={onPress}
    >
      <Text style={[styles.deadlineBtnText, { color: C.textPrimary }]}>
        {priority === 'CRITICAL' ? 'SUBMIT' : 'VIEW'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function StudentAssignment({ C }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [portalSubject, setPortalSubject] = useState(null);

  const navigateToPortal = (subject) => setPortalSubject(subject);
  const goBack = () => setPortalSubject(null);

  if (portalSubject !== null) {
    return <AssignmentPortal subject={portalSubject} onBack={goBack} C={C} />;
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const courses = [
    { name: 'Data Structures & Algorithms', code: 'CS301', sub: 'THEORY & LAB',   done: 12, total: 15, color: C.accent },
    { name: 'Operating Systems',            code: 'CS302', sub: 'ADVANCED CORE',   done: 8,  total: 10, color: C.accent },
    { name: 'Database Management Systems',  code: 'CS303', sub: 'PRACTICAL FOCUS', done: 12, total: 12, color: C.green  },
    { name: 'Computer Networks',            code: 'CS304', sub: 'INFRASTRUCTURE',  done: 5,  total: 8,  color: C.accent },
  ];

  const deadlines = [
    { title: 'System Architecture - Case Study', priority: 'CRITICAL', due: '4h 22m', color: C.red    },
    { title: 'Ethical Hacking Lab Report',       priority: 'MID',      due: '1d 12h', color: C.accent },
    { title: 'Cloud Computing Seminar Prep',     priority: 'LOW',      due: '3d 08h', color: C.green  },
  ];

  const subjects = [
    'Data Structures',
    'Operating Systems',
    'Database Systems',
    'Computer Networks',
  ];

  const pendingTasks = [
    { subject: 'Data Structures',   count: 2 },
    { subject: 'Operating Systems', count: 1 },
    { subject: 'Computer Networks', count: 2 },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: C.textPrimary }]}>Welcome back, John</Text>
            <Text style={[styles.subText, { color: C.textMuted }]}>
              PRN: 202400123 · Dept: Computer Science
            </Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        {isTablet ? (
          <View style={styles.rowTablet}>
            <StatCard title="TOTAL ASSIGNMENTS" style={{ flex: 1 }} C={C}>
              <Text style={[styles.bigNumber, { color: C.textPrimary }]}>
                24{' '}
                <Text style={[styles.pendingLabel, { color: C.accent }]}>□ 4 Pending</Text>
              </Text>
              <ProgressBar value={20} max={24} style={{ marginTop: 10 }} C={C} />
            </StatCard>

            <StatCard title="SUBMISSION STATUS" style={{ flex: 1 }} C={C}>
              <View style={styles.rowCenter}>
                <Text style={[styles.bigNumber, { color: C.textPrimary }]}>24</Text>
                <Text style={[styles.outOf, { color: C.textMuted }]}> / 28</Text>
                <Text style={[styles.pct, { color: C.green }]}>  ⊙ 85%</Text>
              </View>
              <ProgressBar value={24} max={28} color={C.green} style={{ marginTop: 10 }} C={C} />
            </StatCard>

            <StatCard title="PENDING TASKS" style={{ flex: 1 }} C={C}>
              {pendingTasks.map((task, i) => (
                <PendingTaskRow
                  key={i}
                  subject={task.subject}
                  count={task.count}
                  onPress={() => navigateToPortal(task.subject)}
                  C={C}
                />
              ))}
              <Text style={[styles.nextDue, { color: C.orange }]}>NEXT DUE IN 4 HOURS</Text>
            </StatCard>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.rowTablet}>
              <StatCard title="TOTAL ASSIGNMENTS" style={{ flex: 1 }} C={C}>
                <Text style={[styles.bigNumberMobile, { color: C.textPrimary }]}>24</Text>
                <Text style={[styles.pendingLabel, { fontSize: 11, color: C.accent }]}>
                  □ 4 Pending
                </Text>
                <ProgressBar value={20} max={24} style={{ marginTop: 8 }} C={C} />
              </StatCard>

              <StatCard title="SUBMISSION STATUS" style={{ flex: 1 }} C={C}>
                <View style={styles.rowCenter}>
                  <Text style={[styles.bigNumberMobile, { color: C.textPrimary }]}>24</Text>
                  <Text style={[styles.outOf, { fontSize: 18, color: C.textMuted }]}> / 28</Text>
                </View>
                <Text style={[styles.pct, { color: C.green, fontSize: 12 }]}>⊙ 85% Complete</Text>
                <ProgressBar value={24} max={28} color={C.green} style={{ marginTop: 8 }} C={C} />
              </StatCard>
            </View>

            <StatCard title="PENDING TASKS" C={C}>
              {pendingTasks.map((task, i) => (
                <PendingTaskRow
                  key={i}
                  subject={task.subject}
                  count={task.count}
                  onPress={() => navigateToPortal(task.subject)}
                  C={C}
                />
              ))}
              <Text style={[styles.nextDue, { color: C.orange }]}>NEXT DUE IN 4 HOURS</Text>
            </StatCard>
          </View>
        )}

        {/* ── Course Progress + Subjects ── */}
        <View style={isTablet ? styles.rowTablet : { gap: 12 }}>
          <View
            style={[
              styles.card,
              { backgroundColor: C.card, borderColor: C.border },
              isTablet && { flex: 2 },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                Course Submission Progress
              </Text>
              <View style={[styles.semesterBadge, { backgroundColor: C.accentBg }]}>
                <Text style={[styles.semesterText, { color: C.accent }]}>Semester 6</Text>
              </View>
            </View>
            {courses.map((c, i) => <CourseRow key={i} {...c} C={C} />)}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: C.card, borderColor: C.border },
              isTablet && { flex: 1 },
            ]}
          >
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Subjects</Text>
            {isTablet ? (
              subjects.map((subject, i) => (
                <SubjectChip key={i} label={subject} onPress={() => navigateToPortal(subject)} C={C} />
              ))
            ) : (
              <View style={styles.subjectGrid}>
                {subjects.map((subject, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => navigateToPortal(subject)}
                    activeOpacity={0.75}
                    style={[styles.subjectChipGrid, { borderColor: C.border }]}
                  >
                    <Text style={[styles.subjectChipText, { color: C.textPrimary }]}>{subject}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Deadlines ── */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Upcoming Deadlines</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
            >
              <Text style={styles.iconBtnText}>📅</Text>
            </TouchableOpacity>
          </View>

          {isTablet ? (
            <View style={styles.rowTablet}>
              {deadlines.map((d, i) => (
                <DeadlineCard
                  key={i} {...d} isTablet
                  onPress={() => navigateToPortal(d.title)}
                  C={C}
                />
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {deadlines.map((d, i) => (
                <DeadlineCard
                  key={i} {...d} isTablet={false}
                  onPress={() => navigateToPortal(d.title)}
                  C={C}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.viewAllBtn}
            onPress={() => navigateToPortal('All Assignments')}
          >
            <Text style={[styles.viewAllText, { color: C.accent }]}>VIEW ALL ASSIGNMENTS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (no colours — all injected inline) ────────────────────────────────
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

  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 16 },

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

  courseRow:   { paddingVertical: 8, borderTopWidth: 1 },
  courseInfo:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseName:  { fontSize: 13, fontWeight: '600', flex: 1 },
  courseCode:  { fontSize: 10, marginTop: 2 },
  courseScore: { fontSize: 12, fontWeight: '700', marginLeft: 8 },

  subjectChip:     { borderRadius: 8, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  subjectChipText: { fontSize: 13, fontWeight: '500' },
  subjectGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectChipGrid: { borderRadius: 8, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, width: '47%', alignItems: 'center' },

  deadlineCard:   { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  deadlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  deadlineTitle:  { fontSize: 13, fontWeight: '600', flex: 1 },
  badge:          { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText:      { fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  deadlineDue:    { fontSize: 11 },
  deadlineBtn:    { borderWidth: 1, borderRadius: 6, paddingVertical: 5, alignItems: 'center' },
  deadlineBtnText:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  viewAllBtn:  { alignItems: 'center', paddingVertical: 8 },
  viewAllText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});