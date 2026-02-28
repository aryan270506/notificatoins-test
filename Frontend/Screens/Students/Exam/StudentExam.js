import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTabletOrDesktop = SCREEN_WIDTH >= 768;

// Minimum width for the table to always look "laptop-perfect"
const TABLE_MIN_WIDTH = 904;

const subjects = [
  {
    code: 'CS101',
    name: 'Advanced Mathematics',
    internal: 24,
    internalMax: 25,
    cat1: '18/20',
    cat2: '17/20',
    fet: '40/60',
    status: 'PASS',
    barColor: '#22c55e',
    barPercent: 0.96,
  },
  {
    code: 'CS102',
    name: 'Quantum Physics',
    internal: 20,
    internalMax: 25,
    cat1: '16/20',
    cat2: '15/20',
    fet: '38/60',
    status: 'PASS',
    barColor: '#3b82f6',
    barPercent: 0.8,
  },
  {
    code: 'CS103',
    name: 'Programming in Python',
    internal: 22,
    internalMax: 25,
    cat1: '19/20',
    cat2: '19/20',
    fet: '45/60',
    status: 'PASS',
    barColor: '#22c55e',
    barPercent: 0.88,
  },
  {
    code: 'CS104',
    name: 'Database Systems',
    internal: 18,
    internalMax: 25,
    cat1: '15/20',
    cat2: '14/20',
    fet: '35/60',
    status: 'PASS',
    barColor: '#f59e0b',
    barPercent: 0.72,
  },
  {
    code: 'CS105',
    name: 'Computer Networks',
    internal: 25,
    internalMax: 25,
    cat1: '20/20',
    cat2: '20/20',
    fet: '48/60',
    status: 'PASS',
    barColor: '#22c55e',
    barPercent: 1.0,
  },
];

export default function StudentExamResults({ C, onThemeToggle }) {
  const [pressedRow, setPressedRow] = useState(null);

  const bg        = C?.bg          ?? '#0d1b2e';
  const card      = C?.card        ?? '#112240';
  const cardAlt   = C?.cardAlt     ?? '#0d1b2e';
  const border    = C?.border      ?? '#1e3a5f';
  const textPri   = C?.textPrimary ?? '#e2e8f0';
  const textMut   = C?.textMuted   ?? '#475569';
  const textSub   = C?.textSub     ?? '#94a3b8';
  const accent    = C?.accent      ?? '#2563eb';
  const green     = C?.green       ?? '#22c55e';
  const greenBg   = C?.greenBg     ?? 'rgba(34,197,94,0.12)';
  const moonIcon  = C?.moonIcon    ?? '🌙';
  const statusBar = C?.statusBar   ?? 'light-content';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={statusBar} backgroundColor={bg} />

      {/* Top bar with theme toggle */}
      <View style={[styles.topBar, { backgroundColor: card, borderBottomColor: border }]}>
        <Text style={[styles.topBarTitle, { color: textPri }]}>Exam Results</Text>
        {onThemeToggle && (
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: cardAlt, borderColor: border }]}
            onPress={onThemeToggle}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{moonIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.breadcrumbLink, { color: textMut }]}>Home</Text>
          </TouchableOpacity>
          <Text style={[styles.breadcrumbSep, { color: border }]}> / </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.breadcrumbLink, { color: textMut }]}>Exam Results</Text>
          </TouchableOpacity>
          <Text style={[styles.breadcrumbSep, { color: border }]}> / </Text>
          <Text style={[styles.breadcrumbActive, { color: textSub }]}>CAT 1 Results</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: C?.accentBg ?? '#1e3a5f' }]}>
                <Text style={[styles.avatarInitials, { color: accent }]}>JD</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textPri }]}>John Doe</Text>
              <View style={styles.profileTags}>
                {[
                  { label: 'ID',  value: 'STU-242141005' },
                  { label: 'DEP', value: 'B.Sc. Computer Science' },
                  { label: 'SEM', value: 'Autumn 2026' },
                ].map((t) => (
                  <View key={t.label} style={styles.tag}>
                    <Text style={[styles.tagLabel, { color: textMut, backgroundColor: C?.cardAlt ?? '#1e293b' }]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.tagValue, { color: textSub }]}>{t.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: accent }]} activeOpacity={0.75}>
              <Text style={styles.downloadIcon}>↓</Text>
              <Text style={styles.downloadText}>Download Transcript</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: C?.accentBg ?? '#1e3a5f', borderColor: border }]} activeOpacity={0.75}>
              <Text style={[styles.arrowBtnText, { color: accent }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exam Header */}
        <View style={styles.examHeader}>
          <View>
            <Text style={[styles.examTitle, { color: textPri }]}>CAT Exam Results</Text>
            <Text style={[styles.examSubtitle, { color: textMut }]}>Continuous Assessment Test</Text>
          </View>
          <View style={[styles.overallPerf, { alignItems: isTabletOrDesktop ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.overallLabel, { color: textMut }]}>OVERALL PERFORMANCE</Text>
            <View style={styles.overallScoreRow}>
              <Text style={[styles.overallScore, { color: accent }]}>88.4%</Text>
              <View style={[styles.excellentBadge, { borderColor: accent, backgroundColor: C?.accentBg ?? '#0c2d3f' }]}>
                <Text style={[styles.excellentText, { color: accent }]}>EXCELLENT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: card, borderColor: border }]} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: C?.accentBg ?? '#0f2a50' }]}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { color: textMut }]}>CLASS RANK</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: textPri }]}>12th</Text>
                <Text style={[styles.statDelta, { color: green }]}>▲ 2</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, { backgroundColor: card, borderColor: border }]} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: C?.orangeBg ?? '#3d2a1e' }]}>
              <Text style={styles.statIcon}>📖</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { color: textMut }]}>CREDITS EARNED</Text>
              <Text style={[styles.statValue, { color: textPri }]}>22 / 22</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Subjects Table wrapped in horizontal ScrollView ── */}
        <View style={[styles.tableCard, { backgroundColor: card, borderColor: border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            bounces={false}
          >
            {/* Inner view enforces the minimum width so the layout is always laptop-quality */}
            <View style={{ minWidth: TABLE_MIN_WIDTH }}>
              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: cardAlt, borderBottomColor: border }]}>
                <Text style={[styles.colHeader, { color: textMut, width: 220 }]}>SUBJECT CODE & NAME</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 220 }]}>INTERNAL MARKS</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 100, textAlign: 'center' }]}>CAT 1</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 100, textAlign: 'center' }]}>CAT 2</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 100, textAlign: 'center' }]}>FET</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 100, textAlign: 'right' }]}>STATUS</Text>
              </View>

              {/* Table Rows */}
              {subjects.map((subject, index) => (
                <TouchableOpacity
                  key={subject.code}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: border },
                    pressedRow === index && [styles.tableRowPressed, { backgroundColor: C?.accentBg ?? '#162d4a' }],
                    index === subjects.length - 1 && styles.tableRowLast,
                  ]}
                  activeOpacity={0.85}
                  onPressIn={() => setPressedRow(index)}
                  onPressOut={() => setPressedRow(null)}
                >
                  <View style={styles.colSubject}>
                    <Text style={[styles.subjectCode, { color: textPri }]}>{subject.code}</Text>
                    <Text style={[styles.subjectName, { color: textMut }]}>{subject.name}</Text>
                  </View>

                  <View style={styles.colInternal}>
                    <Text style={[styles.marksText, { color: textSub }]}>
                      {subject.internal}/{subject.internalMax}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: border }]}>
                      <View style={[styles.barFill, { width: `${subject.barPercent * 100}%`, backgroundColor: subject.barColor }]} />
                    </View>
                  </View>

                  <View style={styles.colSmall}>
                    <Text style={[styles.marksText, { color: textSub }]}>{subject.cat1}</Text>
                  </View>
                  <View style={styles.colSmall}>
                    <Text style={[styles.marksText, { color: textSub }]}>{subject.cat2}</Text>
                  </View>
                  <View style={styles.colSmall}>
                    <Text style={[styles.marksText, { color: textSub }]}>{subject.fet}</Text>
                  </View>

                  <View style={styles.colStatus}>
                    <View style={[styles.passBadge, { backgroundColor: greenBg, borderColor: green }]}>
                      <Text style={[styles.passBadgeText, { color: green }]}>{subject.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 16, fontWeight: '700' },
  themeBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  container: { padding: isTabletOrDesktop ? 32 : 16, paddingBottom: 40 },

  breadcrumb:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  breadcrumbLink:   { fontSize: 13 },
  breadcrumbSep:    { fontSize: 13 },
  breadcrumbActive: { fontSize: 13, fontWeight: '600' },

  profileCard: {
    borderRadius: 16, padding: 20,
    flexDirection: isTabletOrDesktop ? 'row' : 'column',
    alignItems: isTabletOrDesktop ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24, gap: 16, borderWidth: 1,
  },
  profileLeft:      { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarWrapper:    { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  avatarPlaceholder:{ width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:   { fontSize: 20, fontWeight: '700' },
  profileInfo:      { flex: 1 },
  profileName:      { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  profileTags:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:              { flexDirection: 'row', gap: 4, alignItems: 'center' },
  tagLabel:         { fontSize: 11, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  tagValue:         { fontSize: 12 },
  profileActions:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  downloadBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  downloadIcon:     { color: '#fff', fontSize: 14 },
  downloadText:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  arrowBtn:         { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  arrowBtnText:     { fontSize: 18 },

  examHeader: {
    flexDirection: isTabletOrDesktop ? 'row' : 'column',
    justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20, gap: 12,
  },
  examTitle:       { fontSize: 22, fontWeight: '700' },
  examSubtitle:    { fontSize: 13, marginTop: 2 },
  overallPerf:     {},
  overallLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  overallScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  overallScore:    { fontSize: 36, fontWeight: '800' },
  excellentBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  excellentText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  statsRow:     { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statCard:     { flex: 1, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  statIconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statIcon:     { fontSize: 20 },
  statLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValue:    { fontSize: 24, fontWeight: '700' },
  statDelta:    { fontSize: 13, fontWeight: '600' },

  // tableCard is now just the rounded border container; the scroll is inside
  tableCard:    { borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 8 },

  tableHeader:  { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1 },
  colHeader:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1 },
  tableRowLast: { borderBottomWidth: 0 },
  tableRowPressed: {},

  colSubject:  { width: 220, paddingRight: 8 },
  colInternal: { width: 220, paddingRight: 10 },
  colSmall:    { width: 100, alignItems: 'center' },
  colStatus:   { width: 100, alignItems: 'flex-end' },

  subjectCode: { fontSize: 14, fontWeight: '700' },
  subjectName: { fontSize: 11, marginTop: 2 },
  marksText:   { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  barTrack:    { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  barFill:     { height: 6, borderRadius: 3 },
  passBadge:   { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  passBadgeText:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
});