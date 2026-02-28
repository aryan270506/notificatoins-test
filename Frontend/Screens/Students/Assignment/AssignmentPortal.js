/**
 * AssignmentPortal.js
 * - Accepts C prop directly from StudentMain (via Assignment.js)
 * - No hardcoded palette — all colours come from C
 * - Passes C down to AssignmentSubmission
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, useWindowDimensions, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssignmentSubmission from './Submission';

// ─── Sub-components ──────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <View style={[s.badge, { borderColor: color, backgroundColor: color + '22' }]}>
    <Text style={[s.badgeText, { color }]}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, action, C }) => (
  <View style={s.sectionHeader}>
    <Text style={[s.sectionTitle, { color: C.textMuted }]}>{title}</Text>
    {action && <Text style={[s.sectionAction, { color: C.accent }]}>{action}</Text>}
  </View>
);

const AssignmentCard = ({ subject, subjectColor, title, desc, dueLabel, dueText, dueUrgent, icon, onPress, C }) => (
  <TouchableOpacity
    style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}
    activeOpacity={0.75}
    onPress={onPress}
  >
    <View style={[s.cardIcon, { backgroundColor: subjectColor + '22' }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </View>
    <View style={s.cardBody}>
      <Badge label={subject} color={subjectColor} />
      <Text style={[s.cardTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[s.cardDesc, { color: C.textMuted }]}>{desc}</Text>
    </View>
    <View style={s.cardRight}>
      <Text style={[s.cardDueLabel, { color: C.textMuted }]}>{dueLabel}</Text>
      <Text style={[s.cardDueText, { color: C.textMuted }, dueUrgent && { color: C.red }]}>{dueText}</Text>
      <Text style={[s.chevron, { color: C.textMuted }]}>›</Text>
    </View>
  </TouchableOpacity>
);

const MissingCard = ({ subject, title, desc, C }) => (
  <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
    <View style={[s.cardIcon, { backgroundColor: C.red + '22' }]}>
      <Text style={{ fontSize: 20 }}>⚠️</Text>
    </View>
    <View style={s.cardBody}>
      <Badge label={subject} color={C.red} />
      <Text style={[s.cardTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[s.cardDesc, { color: C.textMuted }]}>{desc}</Text>
    </View>
    <View style={s.cardRight}>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: C.cardAlt, borderColor: C.border, borderWidth: 1 }]}
      >
        <Text style={[s.btnText, { color: C.textPrimary }]}>Request Extension</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const GradedCard = ({ subject, title, desc, score, C }) => (
  <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
    <View style={[s.cardIcon, { backgroundColor: C.green + '22' }]}>
      <Text style={{ fontSize: 20 }}>✅</Text>
    </View>
    <View style={s.cardBody}>
      <Badge label={subject} color={C.green} />
      <Text style={[s.cardTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[s.cardDesc, { color: C.textMuted }]}>{desc}</Text>
    </View>
    <View style={s.cardRight}>
      <Text style={[s.cardDueLabel, { color: C.textMuted }]}>FINAL SCORE</Text>
      <Text style={[s.scoreText, { color: C.green }]}>{score}</Text>
      <TouchableOpacity
        style={[s.btn, { backgroundColor: C.cardAlt, borderColor: C.border, borderWidth: 1 }]}
      >
        <Text style={[s.btnText, { color: C.textPrimary }]}>View Feedback</Text>
      </TouchableOpacity>
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AssignmentPortal({ route, onBack, C }) {
  const subject = route?.params?.subject;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [tab, setTab] = useState('Upcoming');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const tabs = ['Upcoming', 'Pending Submission', 'Graded'];

  if (selectedAssignment) {
    return (
      <AssignmentSubmission
        assignment={selectedAssignment}
        onBack={() => setSelectedAssignment(null)}
        C={C}
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
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={[s.backIcon, { color: C.textPrimary }]}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.pageTitle, { color: C.textPrimary }]}>Subjects</Text>
              <Text style={[s.pageSubtitle, { color: C.textMuted }]}>
                Welcome back, Alex. You have 3 tasks for today.
              </Text>
            </View>
          </View>

          {/* Mobile search */}
          {!isDesktop && (
            <View style={[s.mobileSearchBar, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
              <TextInput
                style={[s.searchInput, { color: C.textPrimary }]}
                placeholder="Search assignments…"
                placeholderTextColor={C.textMuted}
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
            <SectionHeader title="DUE THIS WEEK" action="See All" C={C} />
            <AssignmentCard
              subject="CS401" subjectColor={C.accent}
              title="Neural Network Implementation"
              desc="Build a 3-layer neural network from scratch"
              dueLabel="DUE IN" dueText="2 days" dueUrgent icon="🧠"
              onPress={() => setSelectedAssignment({ title: 'Neural Network Implementation', subject: 'CS401' })}
              C={C}
            />
            <AssignmentCard
              subject="MATH301" subjectColor={C.orange}
              title="Linear Algebra Problem Set"
              desc="Complete problems 1–20 in Chapter 7"
              dueLabel="DUE" dueText="Friday" icon="📐"
              onPress={() => setSelectedAssignment({ title: 'Linear Algebra Problem Set', subject: 'MATH301' })}
              C={C}
            />
            <AssignmentCard
              subject="ENG202" subjectColor={C.green}
              title="Research Paper Draft"
              desc="Submit first draft for peer review"
              dueLabel="DUE" dueText="Next Monday" icon="📝"
              onPress={() => setSelectedAssignment({ title: 'Research Paper Draft', subject: 'ENG202' })}
              C={C}
            />
          </View>

          {/* Missing */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.textMuted }]}>RECENTLY MISSING</Text>
            <MissingCard subject="PHY201" title="Lab Report #4" desc="Electromagnetic induction experiment" C={C} />
          </View>

          {/* Graded */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: C.textMuted }]}>RECENTLY GRADED</Text>
            <GradedCard subject="CS401" title="Algorithm Analysis" desc="Big-O notation and complexity" score="94/100" C={C} />
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

// ─── Styles (no colours — all injected inline) ────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1 },
  layout:        { flex: 1, flexDirection: 'column' },
  layoutDesktop: { flexDirection: 'row' },
  main:          { flex: 1 },

  sidebar:      { width: 64, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1 },
  sidebarIcon:  { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  backBtn:  { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 12 },
  backIcon: { fontSize: 18, fontWeight: '600' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  pageTitle:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  pageSubtitle:{ fontSize: 12, marginTop: 2 },

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
  sectionAction: { fontSize: 12, fontWeight: '600' },

  card:     { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1, gap: 3 },
  cardTitle:{ fontSize: 15, fontWeight: '700', marginTop: 4 },
  cardDesc: { fontSize: 12 },
  cardRight:{ alignItems: 'flex-end', gap: 4 },
  cardDueLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '600' },
  cardDueText:  { fontSize: 12, fontWeight: '500' },
  chevron:      { fontSize: 22, marginTop: 2 },
  scoreText:    { fontSize: 18, fontWeight: '700' },

  badge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  btn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, marginTop: 4 },
  btnText: { fontSize: 12, fontWeight: '600' },

  quickLink:     { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  quickLinkText: { fontSize: 14, fontWeight: '500' },
  rightPanel:    { width: 260, borderLeftWidth: 1, padding: 16 },
});