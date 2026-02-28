import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';

// ─── DATA ────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  {
    code: 'CS101', name: 'Advanced Mathematics',
    internal: 24, internalMax: 25, barColor: '#22c55e',
    cat1: '18/20', cat2: '17/20', fet: '40/60',
  },
  {
    code: 'CS102', name: 'Quantum Physics',
    internal: 20, internalMax: 25, barColor: '#3b82f6',
    cat1: '16/20', cat2: '15/20', fet: '38/60',
  },
  {
    code: 'CS103', name: 'Programming in Python',
    internal: 22, internalMax: 25, barColor: '#22c55e',
    cat1: '19/20', cat2: '19/20', fet: '45/60',
  },
  {
    code: 'CS104', name: 'Database Systems',
    internal: 18, internalMax: 25, barColor: '#f59e0b',
    cat1: '15/20', cat2: '14/20', fet: '35/60',
  },
  {
    code: 'CS105', name: 'Computer Networks',
    internal: 25, internalMax: 25, barColor: '#22c55e',
    cat1: '20/20', cat2: '20/20', fet: '48/60',
  },
];

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color, isTablet, C }) => {
  const pct = Math.min(value / max, 1);
  const BAR_W = isTablet ? 90 : 64;
  return (
    <View style={{ width: BAR_W, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ height: 5, borderRadius: 3, width: BAR_W * pct, backgroundColor: color }} />
    </View>
  );
};

// ─── PASS BADGE ──────────────────────────────────────────────────────────────
const PassBadge = () => (
  <View style={{ borderWidth: 1, borderColor: '#22c55e', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 }}>
    <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>PASS</Text>
  </View>
);

// ─── SUBJECT ROW ─────────────────────────────────────────────────────────────
const SubjectRow = ({ item, last, isTablet, C, s }) => (
  <View style={[s.row, last && s.rowLast]}>
    <View style={s.colSubject}>
      <Text style={s.code}>{item.code}</Text>
      <Text style={s.subName}>{item.name}</Text>
    </View>
    <View style={s.colInternal}>
      <Text style={s.cell}>{item.internal}/{item.internalMax}</Text>
      <ProgressBar value={item.internal} max={item.internalMax} color={item.barColor} isTablet={isTablet} C={C} />
    </View>
    <View style={s.colSmall}><Text style={s.cell}>{item.cat1}</Text></View>
    <View style={s.colSmall}><Text style={s.cell}>{item.cat2}</Text></View>
    <View style={s.colSmall}><Text style={s.cell}>{item.fet}</Text></View>
    <View style={s.colStatus}><PassBadge /></View>
  </View>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Examresult() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const PAD = isTablet ? 32 : 14;
  const s = makeStyles(C, isTablet, PAD);

  return (
    <View style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── BREADCRUMB ── */}
        <View style={s.breadcrumb}>
          {['Home', 'Exam Results', 'CAT 1 Results'].map((crumb, i, arr) => (
            <View key={crumb} style={s.breadcrumbItem}>
              {i < arr.length - 1 ? (
                <>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={s.breadLink}>{crumb}</Text>
                  </TouchableOpacity>
                  <Text style={s.breadSep}> › </Text>
                </>
              ) : (
                <Text style={s.breadCurrent}>{crumb}</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── PROFILE CARD ── */}
        <View style={s.profileCard}>
          <View style={s.leftBar} />
          {isTablet ? (
            <View style={s.profileRowTablet}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarIcon}>🪪</Text>
              </View>
              <View style={s.profileInfoTablet}>
                <Text style={s.profileName}>John Doe</Text>
                <View style={s.profileMetaTablet}>
                  <Text style={s.metaItem}>📋 STU-242141005</Text>
                  <Text style={s.metaItem}>🎓 B.Sc. Computer Science</Text>
                  <Text style={s.metaItem}>📅 Autumn 2026</Text>
                </View>
              </View>
              <View style={s.profileActionsTablet}>
                <TouchableOpacity style={s.downloadBtn} activeOpacity={0.8}>
                  <Text style={s.downloadText}>⬇  Download Transcript</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.shareBtn} activeOpacity={0.8}>
                  <Text style={s.shareText}>⤴</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.profileMobileWrap}>
              <View style={s.profileTopRow}>
                <View style={s.profileAvatar}>
                  <Text style={s.profileAvatarIcon}>🪪</Text>
                </View>
                <View style={s.profileInfoMobile}>
                  <Text style={s.profileName}>John Doe</Text>
                  <Text style={s.metaItem}>📋 STU-242141005</Text>
                  <Text style={s.metaItem}>🎓 B.Sc. Computer Science</Text>
                  <Text style={s.metaItem}>📅 Autumn 2026</Text>
                </View>
              </View>
              <View style={s.profileActionsMobile}>
                <TouchableOpacity style={s.downloadBtnMobile} activeOpacity={0.8}>
                  <Text style={s.downloadText}>⬇  Download Transcript</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.shareBtn} activeOpacity={0.8}>
                  <Text style={s.shareText}>⤴</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── SECTION HEADER ── */}
        <View style={[s.sectionHeader, { flexDirection: isTablet ? 'row' : 'column' }]}>
          <View>
            <Text style={s.sectionTitle}>CAT Exam Results</Text>
            <Text style={s.sectionSub}>Continuous Assessment Test</Text>
          </View>
          <View style={[s.overallWrap, { alignItems: isTablet ? 'flex-end' : 'flex-start' }]}>
            <Text style={s.overallLabel}>OVERALL PERFORMANCE</Text>
            <View style={s.overallRow}>
              <Text style={s.overallPct}>88.4%</Text>
              <View style={s.excellentBadge}>
                <Text style={s.excellentText}>EXCELLENT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── STAT CARDS ── */}
        <View style={s.statRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: C.mode === 'dark' ? '#1e3a5f' : '#dbeafe' }]}>
              <Text style={s.statIconText}>📈</Text>
            </View>
            <View>
              <Text style={s.statLabel}>CLASS RANK</Text>
              <View style={s.rankRow}>
                <Text style={s.statValue}>12th</Text>
                <Text style={s.rankUp}> ↑ 2</Text>
              </View>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: C.mode === 'dark' ? '#431407' : '#fef3c7' }]}>
              <Text style={s.statIconText}>📗</Text>
            </View>
            <View>
              <Text style={s.statLabel}>CREDITS EARNED</Text>
              <Text style={s.statValue}>22 / 22</Text>
            </View>
          </View>
        </View>

        {/* ── RESULTS TABLE ── */}
        <View style={s.table}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={!isTablet}
            scrollEnabled={!isTablet}
            bounces={false}
          >
            <View style={{ minWidth: 1229 }}>
              <View style={s.tableHead}>
                <Text style={[s.headText, s.colSubject]}>SUBJECT CODE & NAME</Text>
                <Text style={[s.headText, s.colInternal]}>INTERNAL MARKS</Text>
                <Text style={[s.headText, s.colSmall]}>CAT 1</Text>
                <Text style={[s.headText, s.colSmall]}>CAT 2</Text>
                <Text style={[s.headText, s.colSmall]}>FET</Text>
                <Text style={[s.headText, s.colStatus]}>                    STATUS</Text>
              </View>
              {SUBJECTS.map((item, i) => (
                <SubjectRow
                  key={item.code}
                  item={item}
                  last={i === SUBJECTS.length - 1}
                  isTablet={isTablet}
                  C={C}
                  s={s}
                />
              ))}
            </View>
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── DYNAMIC STYLES ───────────────────────────────────────────────────────────
function makeStyles(C, isTablet, PAD) {
  // Map ThemeContext keys to local semantic colors
  const bg       = C.bg;
  const surface  = C.card;
  const surface2 = C.mode === 'dark' ? '#1c2233' : '#d4e4f5';
  const border   = C.cardBorder;
  const accent   = C.blue;
  const green    = '#22c55e';
  const text     = C.white;
  const textSub  = C.sub;
  const textMuted= C.muted;

  return StyleSheet.create({
    safe:          { flex: 1, backgroundColor: bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    // Breadcrumb
    breadcrumb:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: PAD, paddingVertical: 14 },
    breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
    breadLink:      { color: textSub, fontSize: 13 },
    breadSep:       { color: textMuted, fontSize: 13 },
    breadCurrent:   { color: text, fontSize: 13, fontWeight: '700' },

    // Profile Card
    profileCard: {
      backgroundColor: surface, marginHorizontal: PAD, borderRadius: 12,
      borderWidth: 1, borderColor: border, padding: 20, paddingLeft: 24,
      marginBottom: 24, overflow: 'hidden',
    },
    leftBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accent },

    // Tablet profile
    profileRowTablet:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
    profileInfoTablet:  { flex: 1 },
    profileMetaTablet:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
    profileActionsTablet: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    // Mobile profile
    profileMobileWrap:   { gap: 14 },
    profileTopRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    profileInfoMobile:   { flex: 1, gap: 3 },
    profileActionsMobile:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
    downloadBtnMobile:   { flex: 1, backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },

    // Shared profile
    profileAvatar:     { width: 64, height: 64, borderRadius: 10, backgroundColor: surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    profileAvatarIcon: { fontSize: 30 },
    profileName:       { color: text, fontSize: isTablet ? 24 : 20, fontWeight: '800', marginBottom: 4 },
    metaItem:          { color: textSub, fontSize: 13 },
    downloadBtn:       { backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
    downloadText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
    shareBtn:          { width: 38, height: 38, borderRadius: 8, backgroundColor: surface2, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    shareText:         { color: text, fontSize: 17 },

    // Section Header
    sectionHeader: { justifyContent: 'space-between', paddingHorizontal: PAD, marginBottom: 14, gap: isTablet ? 0 : 10 },
    sectionTitle:  { color: text, fontSize: isTablet ? 20 : 17, fontWeight: '800' },
    sectionSub:    { color: textSub, fontSize: 12, marginTop: 3 },
    overallWrap:   {},
    overallLabel:  { color: textSub, fontSize: 11, letterSpacing: 0.8, marginBottom: 3 },
    overallRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    overallPct:    { color: accent, fontSize: isTablet ? 34 : 28, fontWeight: '900' },
    excellentBadge:{ backgroundColor: C.mode === 'dark' ? '#052e16' : '#dcfce7', borderWidth: 1, borderColor: green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    excellentText: { color: green, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

    // Stat Cards
    statRow:  { flexDirection: 'row', gap: 12, paddingHorizontal: PAD, marginBottom: 18 },
    statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: surface, borderRadius: 10, borderWidth: 1, borderColor: border, padding: 14 },
    statIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statIconText: { fontSize: 20 },
    statLabel:{ color: textSub, fontSize: 11, letterSpacing: 0.7, marginBottom: 3 },
    statValue:{ color: text, fontSize: isTablet ? 22 : 18, fontWeight: '800' },
    rankRow:  { flexDirection: 'row', alignItems: 'center' },
    rankUp:   { color: green, fontSize: 13, fontWeight: '700' },

    // Table
    table:    { marginHorizontal: PAD, backgroundColor: surface, borderRadius: 10, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 24 },
    tableHead:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: surface2, borderBottomWidth: 1, borderBottomColor: border },
    headText: { color: textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },

    row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
    rowLast: { borderBottomWidth: 0 },

    colSubject:  { flex: isTablet ? 2.4 : 2.0 },
    colInternal: { flex: isTablet ? 2.2 : 1.9, flexDirection: 'row', alignItems: 'center', gap: 7 },
    colSmall:    { flex: isTablet ? 1.1 : 1.0 },
    colStatus:   { flex: isTablet ? 0.9 : 0.85, alignItems: 'flex-end' },

    code:    { color: text, fontWeight: '700', fontSize: isTablet ? 14 : 13 },
    subName: { color: textSub, fontSize: isTablet ? 12 : 11, marginTop: 2 },
    cell:    { color: text, fontWeight: '600', fontSize: isTablet ? 14 : 13 },
  });
}