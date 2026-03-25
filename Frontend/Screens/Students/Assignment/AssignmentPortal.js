/**
 * AssignmentPortal.js
 *
 * Changes from original:
 *  - Receives `assignments` (real array), `studentId`, `studentName`,
 *    `onSubmitted` callback from Assignment.js
 *  - Filters cards by selected subject (or shows all when subject === '__ALL__')
 *  - Distinguishes Upcoming / Submitted / Missing cards from live data
 *  - Passes the full assignment object (including _id) into AssignmentSubmission
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, useWindowDimensions, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssignmentSubmission from './Submission';

// ─── Sub-components ───────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <View style={[s.badge, { borderColor: color, backgroundColor: color + '22' }]}>
    <Text style={[s.badgeText, { color }]}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, C }) => (
  <View style={s.sectionHeader}>
    <Text style={[s.sectionTitle, { color: C.textMuted }]}>{title}</Text>
  </View>
);

// ── Live assignment card (upcoming / not yet submitted) ───────────────────────
const AssignmentCard = ({ assignment, subjectColor, dueUrgent, onPress, C }) => {
  const dueText = assignment.dueDate && assignment.dueDate !== 'TBD'
    ? assignment.dueDate
    : 'No deadline';

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[s.cardIcon, { backgroundColor: subjectColor + '22' }]}>
        <Text style={{ fontSize: 20 }}>📄</Text>
      </View>
      <View style={s.cardBody}>
        <Badge label={assignment.subject} color={subjectColor} />
        <Text style={[s.cardTitle, { color: C.textPrimary }]}>{assignment.title}</Text>
        <Text style={[s.cardDesc, { color: C.textMuted }]} numberOfLines={2}>
          {assignment.description || assignment.unit || 'Tap to view details'}
        </Text>
      </View>
      <View style={s.cardRight}>
        <Text style={[s.cardDueLabel, { color: C.textMuted }]}>DUE</Text>
        <Text style={[s.cardDueText, { color: C.textMuted }, dueUrgent && { color: C.red }]}>
          {dueText}
        </Text>
        <Text style={[s.chevron, { color: C.textMuted }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Submitted card ────────────────────────────────────────────────────────────
const SubmittedCard = ({ assignment, subjectColor, C }) => (
  <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
    <View style={[s.cardIcon, { backgroundColor: C.green + '22' }]}>
      <Text style={{ fontSize: 20 }}>✅</Text>
    </View>
    <View style={s.cardBody}>
      <Badge label={assignment.subject} color={C.green} />
      <Text style={[s.cardTitle, { color: C.textPrimary }]}>{assignment.title}</Text>
      <Text style={[s.cardDesc, { color: C.textMuted }]} numberOfLines={2}>
        {assignment.description || assignment.unit || ''}
      </Text>
    </View>
    <View style={s.cardRight}>
      <Text style={[s.cardDueLabel, { color: C.textMuted }]}>STATUS</Text>
      <Text style={[s.cardDueText, { color: C.green }]}>Submitted</Text>
    </View>
  </View>
);

const Sidebar = ({ C }) => (
  <View style={[s.sidebar, { backgroundColor: C.card, borderRightColor: C.border }]}>
    <View style={{ flex: 1 }} />
    <View style={s.sidebarIcon}>
      <Text style={{ fontSize: 18 }}>⚙️</Text>
    </View>
  </View>
);

const RightPanel = ({ C }) => (
  <View style={[s.rightPanel, { backgroundColor: C.bg, borderLeftColor: C.border }]}>
    <Text style={[s.sectionTitle, { color: C.textMuted }]}>QUICK LINKS</Text>
    <TouchableOpacity style={[s.quickLink, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={{ fontSize: 18, marginRight: 10 }}>📚</Text>
      <Text style={[s.quickLinkText, { color: C.textPrimary }]}>Digital Library</Text>
    </TouchableOpacity>
  </View>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SUBJECT_COLORS = [
  '#3B6EF5', '#F59E0B', '#22C55E', '#EF4444',
  '#8B5CF6', '#14B8A6', '#F97316', '#EC4899',
];
const subjectColorMap = {};
let colorIdx = 0;
const getSubjectColor = (subject, C) => {
  if (!subjectColorMap[subject]) {
    subjectColorMap[subject] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
    colorIdx++;
  }
  return subjectColorMap[subject];
};

const isUrgent = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return false;
  const d = new Date(dueDate);
  return !isNaN(d) && (d - Date.now()) < 2 * 24 * 3600e3;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssignmentPortal({
  route, onBack, C,
  // New props from Assignment.js:
  assignments = [],
  studentId   = '',
  studentName = '',
  onSubmitted,
}) {
  const subject  = route?.params?.subject;
  const { width } = useWindowDimensions();
  const isDesktop  = width >= 768;

  const [tab,                setTab]                = useState('Upcoming');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [search,             setSearch]             = useState('');
  const tabs = ['Upcoming', 'Submitted', 'All'];

  // ── Filter assignments ──────────────────────────────────────────────────────
  // subject can be '__ALL__' (view all), a subject name, or an assignment title
  const filteredAll = assignments.filter(a => {
    if (!subject || subject === '__ALL__') return true;
    return a.subject === subject || a.title === subject;
  });

  const upcomingList  = filteredAll.filter(a => !(a.submissions ?? []).some(s => s.studentId === studentId));
  const submittedList = filteredAll.filter(a =>  (a.submissions ?? []).some(s => s.studentId === studentId));

  const displayList = (tab === 'Upcoming'  ? upcomingList  :
                       tab === 'Submitted' ? submittedList :
                       filteredAll)
    .filter(a => a.title.toLowerCase().includes(search.toLowerCase()));

  const pageTitle = subject === '__ALL__' ? 'All Assignments'
                  : subject ?? 'Assignments';

  // ── Submission screen ───────────────────────────────────────────────────────
  if (selectedAssignment) {
    return (
      <AssignmentSubmission
        assignment={selectedAssignment}
           
        onBack={() => setSelectedAssignment(null)}
        C={C}
        studentId={studentId}
        studentName={studentName}
        onSubmitted={() => {
          setSelectedAssignment(null);
          onSubmitted?.();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={[s.layout, isDesktop && s.layoutDesktop]}>
        {isDesktop && <Sidebar C={C} />}

        <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={onBack} activeOpacity={0.7}
            >
              <Text style={[s.backIcon, { color: C.textPrimary }]}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.pageTitle, { color: C.textPrimary }]}>{pageTitle}</Text>
              <Text style={[s.pageSubtitle, { color: C.textMuted }]}>
                {upcomingList.length} pending · {submittedList.length} submitted
              </Text>
            </View>
          </View>

          {/* Search */}
          {!isDesktop && (
            <View style={[s.mobileSearchBar, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
              <TextInput
                style={[s.searchInput, { color: C.textPrimary }]}
                placeholder="Search assignments…"
                placeholderTextColor={C.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          )}

          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsContainer}>
            {tabs.map(t => (
              <TouchableOpacity key={t} style={s.tabItem} onPress={() => setTab(t)} activeOpacity={0.75}>
                <Text style={[s.tabText, { color: C.textMuted }, tab === t && { color: C.accent, fontWeight: '700' }]}>
                  {t}
                </Text>
                {tab === t && <View style={[s.tabUnderline, { backgroundColor: C.accent }]} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[s.tabDivider, { backgroundColor: C.border }]} />

          {/* Assignment Cards */}
          <View style={s.section}>
            {displayList.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Text style={{ fontSize: 32 }}>
                  {tab === 'Submitted' ? '🎉' : '📭'}
                </Text>
                <Text style={[s.cardTitle, { color: C.textMuted }]}>
                  {tab === 'Submitted' ? 'Nothing submitted yet' : 'All done here!'}
                </Text>
              </View>
            ) : (
              <>
                <SectionHeader
                  title={tab === 'Upcoming' ? 'PENDING SUBMISSION' :
                         tab === 'Submitted' ? 'SUBMITTED' : 'ALL ASSIGNMENTS'}
                  C={C}
                />
                {displayList.map(a => {
                  const color = getSubjectColor(a.subject, C);
                  const wasSubmitted = (a.submissions ?? []).some(s => s.studentId === studentId);
                  return wasSubmitted ? (
                    <SubmittedCard key={a._id} assignment={a} subjectColor={color} C={C} />
                  ) : (
                    <AssignmentCard
                      key={a._id}
                      assignment={a}
                      subjectColor={color}
                      dueUrgent={isUrgent(a.dueDate)}
                      onPress={() => setSelectedAssignment(a)}
                      C={C}
                    />
                  );
                })}
              </>
            )}
          </View>

          {/* Quick links on mobile */}
          {!isDesktop && (
            <View style={[s.section, { marginTop: 8 }]}>
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>QUICK LINKS</Text>
              <TouchableOpacity style={[s.quickLink, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>📚</Text>
                <Text style={[s.quickLinkText, { color: C.textPrimary }]}>Digital Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {isDesktop && <RightPanel C={C} />}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1 },
  layout:        { flex: 1, flexDirection: 'column' },
  layoutDesktop: { flexDirection: 'row' },
  main:          { flex: 1 },

  sidebar:     { width: 64, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1 },
  sidebarIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  backBtn:  { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 12 },
  backIcon: { fontSize: 18, fontWeight: '600' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  pageTitle:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  pageSubtitle:{ fontSize: 12, marginTop: 2 },
  cardTitle:   { fontSize: 14, fontWeight: '600' },

  mobileSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 16, height: 48,
    borderWidth: 1, marginHorizontal: 16, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13 },

  tabsContainer: { paddingHorizontal: 16 },
  tabItem:       { marginRight: 24, paddingVertical: 8, position: 'relative' },
  tabText:       { fontSize: 14, fontWeight: '500' },
  tabUnderline:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 2 },
  tabDivider:    { height: 1, marginBottom: 16 },

  section:       { paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },

  card:     { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle:{ fontSize: 15, fontWeight: '700', marginTop: 4 },
  cardDesc: { fontSize: 12 },
  cardRight:{ alignItems: 'flex-end', gap: 4 },
  cardDueLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '600' },
  cardDueText:  { fontSize: 12, fontWeight: '500' },
  chevron:      { fontSize: 22, marginTop: 2 },

  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  quickLink:     { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  quickLinkText: { fontSize: 14, fontWeight: '500' },
  rightPanel:    { width: 260, borderLeftWidth: 1, padding: 16 },
});