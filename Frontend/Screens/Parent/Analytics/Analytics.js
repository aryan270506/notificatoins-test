/**
 * Campus360 – Student Analytics Overview
 * Desktop: full grid layout with sidebar-aware content
 * Mobile:  scrollable single-column cards
 * Theme:   consumes ThemeContext from Parentmaindashboard
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../Dashboard/Dashboard'; // ← adjust path if needed

const BREAKPOINT = 768;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SUBMISSIONS = [
  { name: 'Data Structures',   val: '4/5' },
  { name: 'Operating Systems', val: '3/4' },
  { name: 'Discrete Math',     val: '5/6' },
  { name: 'Database Systems',  val: '2/3' },
];

const PENDING = [
  { name: 'Neural Networks',   count: 1 },
  { name: 'Data Structures',   count: 1 },
  { name: 'Operating Systems', count: 1 },
];

const DEADLINES = [
  { title: 'Neural Networks Project', tag: 'HIGH PRIORITY', tagColorKey: 'red',      tagBgDark: '#3b0f0f', tagBgLight: '#fde8e8', date: 'Oct 24, 2023 • 11:59 PM' },
  { title: 'Data Structures Lab',     tag: 'MEDIUM',        tagColorKey: 'orange',    tagBgDark: '#2c1a06', tagBgLight: '#fef3e2', date: 'Oct 27, 2023 • 05:00 PM' },
  { title: 'Ethics in AI Essay',      tag: 'OPTIONAL',      tagColorKey: 'sub',       tagBgDark: '#1a2f4a', tagBgLight: '#e2ecf5', date: 'Nov 02, 2023 • 09:00 AM' },
];

// ─── Small Helpers ─────────────────────────────────────────────────────────────
function Tag({ label, color, bg }) {
  return (
    <View style={[{ borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: bg, borderColor: color }]}>
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color }}>{label}</Text>
    </View>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, label, C }) {
  const size = 72;
  const stroke = 6;
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
function AttendanceCard({ C, st }) {
  return (
    <View style={[st.card, { flex: 1, minWidth: 200 }]}>
      <Text style={st.cardMeta}>Total Attendance</Text>
      <Text style={st.bigNum}>88%</Text>
      <Text style={[st.cardMeta, { color: C.teal, marginTop: 2 }]}>↑ Above threshold</Text>
      <View style={{ alignItems: 'flex-end', marginTop: -60 }}>
        <ProgressRing pct={88} label="Good" C={C} />
      </View>
    </View>
  );
}

// ─── Submissions Card ─────────────────────────────────────────────────────────
function SubmissionsCard({ C, st }) {
  return (
    <View style={[st.card, { flex: 1.4 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={st.cardMeta}>Submissions</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <Text style={st.bigNum}>21</Text>
            <Text style={[st.cardMeta, { fontSize: 16 }]}>/24</Text>
          </View>
          <Text style={[st.cardMeta, { color: C.teal, marginTop: 2 }]}>Semester progress: 87%</Text>
        </View>
        <View style={st.iconCircle}>
          <Text style={{ fontSize: 22 }}>📋</Text>
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {SUBMISSIONS.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={st.rowTxt}>{s.name}</Text>
            <Text style={[st.rowTxt, { color: C.white }]}>{s.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Pending Card ─────────────────────────────────────────────────────────────
function PendingCard({ C, st }) {
  return (
    <View style={[st.card, { flex: 1.2 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={st.cardMeta}>Pending Tasks</Text>
          <Text style={st.bigNum}>03</Text>
          <Text style={[st.cardMeta, { color: C.orange, marginTop: 2 }]}>Action Required</Text>
        </View>
        <View style={[st.iconCircle, { backgroundColor: C.mode === 'dark' ? '#2c1a06' : '#fef3e2' }]}>
          <Text style={{ fontSize: 22 }}>⏰</Text>
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {PENDING.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.rowTxt}>{p.name}</Text>
            <View style={{ borderRadius: 6, borderWidth: 1, backgroundColor: C.mode === 'dark' ? '#3b0f0f' : '#fde8e8', borderColor: C.red, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.red }}>{p.count}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Subject Attendance Table ─────────────────────────────────────────────────
function SubjectTable({ isDesktop, C, st }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState('Theory');

  // Subjects depend on theme-aware colors
  const SUBJECTS = [
    { name: 'Data Structures',   ratio: '45/50', pct: 90,   status: '90%',   color: C.teal },
    { name: 'Operating Systems', ratio: '42/48', pct: 87.5, status: '87.5%', color: C.blueLight },
    { name: 'Discrete Math',     ratio: '38/45', pct: 84,   status: '84%',   color: C.orange },
    { name: 'Database Mgmt',     ratio: '48/52', pct: 92,   status: '92%',   color: C.teal },
    { name: 'Computer Networks', ratio: '40/50', pct: 80,   status: '80%',   color: C.orange },
  ];

  return (
    <View style={[st.card, { flex: isDesktop ? 3 : undefined }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={st.cardTitle}>Subject Wise Attendance</Text>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDropdown(!showDropdown)}
            style={st.dropdownBtn}
          >
            <Text style={st.dropdownText}>{selectedType} ▾</Text>
          </TouchableOpacity>
          {showDropdown && (
            <View style={[st.dropdownMenu, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
              {['Theory', 'Labs'].map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => { setSelectedType(type); setShowDropdown(false); }}
                  style={st.dropdownItem}
                >
                  <Text style={[st.dropdownItemText, { color: C.white }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Header */}
      <View style={st.tableHeader}>
        <Text style={[st.tableHeaderTxt, { flex: 2 }]}>SUBJECT</Text>
        <TouchableOpacity activeOpacity={0.8} style={[st.lectureBtn, { flex: 1 }]}>
          <Text style={[st.lectureBtnText, { color: C.muted }]}>LECTURE / PRACTICAL</Text>
        </TouchableOpacity>
        <Text style={st.tableHeaderTxt}>STATUS</Text>
        <Text style={st.tableHeaderTxt}>PROGRESS</Text>
      </View>

      {SUBJECTS.map((row, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.7}
          style={[st.tableRow, i === SUBJECTS.length - 1 && { borderBottomWidth: 0 }]}
        >
          <Text style={[st.rowTxt, { flex: 2, color: C.white }]}>{row.name}</Text>
          <Text style={[st.rowTxt, { flex: 1, textAlign: 'center' }]}>{row.ratio}</Text>
          <Text style={[st.rowTxt, { flex: 1, textAlign: 'center', color: row.color, fontWeight: '700' }]}>{row.status}</Text>
          <View style={[st.progBg, { flex: 1.2, marginLeft: 8 }]}>
            <View style={[st.progFill, { width: `${row.pct}%`, backgroundColor: row.color }]} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Deadlines Card ───────────────────────────────────────────────────────────
function DeadlinesCard({ isDesktop, C, st }) {
  return (
    <View style={[st.card, { flex: isDesktop ? 1.3 : undefined }]}>
      <Text style={[st.cardTitle, { marginBottom: 16 }]}>Upcoming Deadlines</Text>

      {DEADLINES.map((d, i) => {
        const tagColor = C[d.tagColorKey];
        const tagBg = C.mode === 'dark' ? d.tagBgDark : d.tagBgLight;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.75}
            style={[st.deadlineItem, i === DEADLINES.length - 1 && { marginBottom: 0 }]}
          >
            <View style={[st.deadlineAccent, { backgroundColor: tagColor }]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <Text style={st.deadlineTitle}>{d.title}</Text>
                <Tag label={d.tag} color={tagColor} bg={tagBg} />
              </View>
              <Text style={[st.cardMeta, { marginTop: 6 }]}>📅 {d.date}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      
    </View>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ isDesktop, C, st }) {
  return (
    <View style={[st.topBar, !isDesktop && st.topBarMobile]}>
      <Text style={[st.topBarTitle, !isDesktop && { fontSize: 16 }]}>
        {isDesktop ? 'Student Analytics Overview' : 'Analytics'}
      </Text>
      {isDesktop && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={st.searchBar}>
            <Text style={{ color: C.muted, fontSize: 13 }}>🔍  Search analytics...</Text>
          </View>
          <TouchableOpacity style={st.topIcon} activeOpacity={0.7}><Text>🔔</Text></TouchableOpacity>
          <TouchableOpacity style={st.topIcon} activeOpacity={0.7}><Text>💬</Text></TouchableOpacity>
        </View>
      )}
      {!isDesktop && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={st.topIconSm} activeOpacity={0.7}><Text style={{ fontSize: 16 }}>🔔</Text></TouchableOpacity>
          <TouchableOpacity style={st.topIconSm} activeOpacity={0.7}><Text style={{ fontSize: 16 }}>💬</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────
function DesktopLayout({ C, st }) {
  return (
    <ScrollView contentContainerStyle={st.bodyDesktop} showsVerticalScrollIndicator={false}>
      <View style={st.row}>
        <AttendanceCard C={C} st={st} />
        <SubmissionsCard C={C} st={st} />
        <PendingCard C={C} st={st} />
      </View>
      <View style={[st.row, { alignItems: 'flex-start' }]}>
        <SubjectTable isDesktop C={C} st={st} />
        <DeadlinesCard isDesktop C={C} st={st} />
      </View>
    </ScrollView>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────
function MobileLayout({ C, st }) {
  return (
    <ScrollView contentContainerStyle={st.bodyMobile} showsVerticalScrollIndicator={false}>
      <View style={st.mobileStatRow}>
        {/* Attendance mini */}
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardMeta}>Total Attendance</Text>
          <Text style={[st.bigNum, { fontSize: 32 }]}>88%</Text>
          <Text style={[st.cardMeta, { color: C.teal }]}>↑ Above threshold</Text>
          <View style={[{ borderRadius: 6, borderWidth: 1, marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', backgroundColor: C.mode === 'dark' ? '#0a2e28' : '#d0f5ef', borderColor: C.teal }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.teal }}>Good</Text>
          </View>
        </View>
        {/* Pending mini */}
        <View style={[st.card, { flex: 1 }]}>
          <Text style={st.cardMeta}>Pending Tasks</Text>
          <Text style={[st.bigNum, { fontSize: 32 }]}>03</Text>
          <Text style={[st.cardMeta, { color: C.orange }]}>Action Required</Text>
          <View style={[{ borderRadius: 6, borderWidth: 1, marginTop: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', backgroundColor: C.mode === 'dark' ? '#2c1a06' : '#fef3e2', borderColor: C.orange }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.orange }}>⏰ Now</Text>
          </View>
        </View>
      </View>

      <SubmissionsCard C={C} st={st} />
      <PendingCard C={C} st={st} />
      <SubjectTable isDesktop={false} C={C} st={st} />
      <DeadlinesCard isDesktop={false} C={C} st={st} />
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;

  // ← Pull C from the shared ThemeContext
  const { C } = useTheme();

  // Build dynamic styles from current theme
  const st = makeStyles(C);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar isDesktop={isDesktop} C={C} st={st} />
      {isDesktop ? <DesktopLayout C={C} st={st} /> : <MobileLayout C={C} st={st} />}
    </View>
  );
}

// ─── Dynamic StyleSheet ───────────────────────────────────────────────────────
function makeStyles(C) {
  return StyleSheet.create({
    // Top Bar
    topBar:       { height: 64, backgroundColor: C.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    topBarMobile: { height: 56, paddingHorizontal: 16 },
    topBarTitle:  { color: C.white, fontSize: 20, fontWeight: '800' },
    searchBar:    { backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, minWidth: 220, borderWidth: 1, borderColor: C.cardBorder },
    topIcon:      { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
    topIconSm:    { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },

    // Layouts
    bodyDesktop:  { padding: 20, gap: 16 },
    bodyMobile:   { padding: 14, gap: 14 },
    row:          { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    mobileStatRow:{ flexDirection: 'row', gap: 12 },

    // Card
    card:      { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.cardBorder },
    cardTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
    cardMeta:  { color: C.sub, fontSize: 12 },
    bigNum:    { color: C.white, fontSize: 38, fontWeight: '900', lineHeight: 46, marginTop: 4 },

    // Icon circle
    iconCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.chipBg, alignItems: 'center', justifyContent: 'center' },

    // Table
    tableHeader:    { flexDirection: 'row', paddingBottom: 8 },
    tableHeaderTxt: { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    tableRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    rowTxt:         { flex: 1, color: C.sub, fontSize: 13 },

    // Dropdown
    dropdownBtn:      { backgroundColor: C.chipBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.cardBorder },
    dropdownText:     { color: C.white, fontSize: 13, fontWeight: '600' },
    dropdownMenu:     { position: 'absolute', top: 38, right: 0, borderRadius: 8, borderWidth: 1, zIndex: 99, minWidth: 110, overflow: 'hidden' },
    dropdownItem:     { paddingVertical: 10, paddingHorizontal: 14 },
    dropdownItemText: { fontSize: 13, fontWeight: '500' },
    lectureBtn:       { alignItems: 'center' },
    lectureBtnText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

    // Progress bar
    progBg:   { height: 4, backgroundColor: C.muted, borderRadius: 2 },
    progFill: { height: 4, borderRadius: 2 },

    // Deadlines
    deadlineItem:   { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: C.searchBg, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder },
    deadlineAccent: { width: 3, borderRadius: 2, minHeight: 40 },
    deadlineTitle:  { color: C.white, fontSize: 13, fontWeight: '700', flex: 1 },

    // Calendar btn
    calBtn:    { marginTop: 6, backgroundColor: C.cardBorder, borderRadius: 30, paddingVertical: 13, alignItems: 'center' },
    calBtnTxt: { color: C.white, fontWeight: '700', fontSize: 14 },
  });
}