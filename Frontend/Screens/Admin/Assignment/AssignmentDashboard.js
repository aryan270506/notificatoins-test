import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../dashboard/AdminDashboard';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  {
    id: 1, code: 'DS', name: 'Data Structures', color: '#4F7CF7',
    assignments: [
      { id: 1, title: 'Heap Implementation',     due: 'Oct 25, 2023', status: 'submitted' },
      { id: 2, title: 'Binary Tree Traversal',   due: 'Oct 30, 2023', status: 'submitted' },
      { id: 3, title: 'Graph BFS & DFS',         due: 'Nov 05, 2023', status: 'pending'   },
      { id: 4, title: 'AVL Tree Rotation',       due: 'Nov 10, 2023', status: 'submitted' },
      { id: 5, title: 'Hash Table Design',       due: 'Nov 15, 2023', status: 'pending'   },
    ],
  },
  {
    id: 2, code: 'OS', name: 'Operating Systems', color: '#FF7043',
    assignments: [
      { id: 1, title: 'Process Scheduling',      due: 'Oct 28, 2023', status: 'pending'   },
      { id: 2, title: 'Memory Management',       due: 'Nov 02, 2023', status: 'submitted' },
      { id: 3, title: 'Deadlock Detection',      due: 'Nov 08, 2023', status: 'submitted' },
      { id: 4, title: 'Paging Simulation',       due: 'Nov 14, 2023', status: 'pending'   },
      { id: 5, title: 'File System Design',      due: 'Nov 20, 2023', status: 'submitted' },
      { id: 6, title: 'Semaphore Problems',      due: 'Nov 25, 2023', status: 'pending'   },
    ],
  },
  {
    id: 3, code: 'DB', name: 'Database Systems', color: '#26C6DA',
    assignments: [
      { id: 1, title: 'SQL Normalization',       due: 'Oct 30, 2023', status: 'submitted' },
      { id: 2, title: 'ER Diagram Design',       due: 'Nov 04, 2023', status: 'submitted' },
      { id: 3, title: 'Transaction Management',  due: 'Nov 10, 2023', status: 'submitted' },
      { id: 4, title: 'Query Optimization',      due: 'Nov 16, 2023', status: 'submitted' },
    ],
  },
  {
    id: 4, code: 'CN', name: 'Computer Networks', color: '#AB47BC',
    assignments: [
      { id: 1, title: 'TCP/IP Simulation',       due: 'Nov 05, 2023', status: 'pending'   },
      { id: 2, title: 'Subnetting Practice',     due: 'Nov 12, 2023', status: 'submitted' },
      { id: 3, title: 'HTTP Protocol Study',     due: 'Nov 18, 2023', status: 'pending'   },
      { id: 4, title: 'Socket Programming',      due: 'Nov 23, 2023', status: 'submitted' },
      { id: 5, title: 'DNS & DHCP Setup',        due: 'Nov 28, 2023', status: 'pending'   },
    ],
  },
  {
    id: 5, code: 'AI', name: 'AI / ML Basics', color: '#66BB6A',
    assignments: [
      { id: 1, title: 'Linear Regression',       due: 'Nov 07, 2023', status: 'submitted' },
      { id: 2, title: 'K-Means Clustering',      due: 'Nov 14, 2023', status: 'submitted' },
      { id: 3, title: 'Decision Tree',           due: 'Nov 21, 2023', status: 'submitted' },
      { id: 4, title: 'Neural Network Basics',   due: 'Nov 28, 2023', status: 'pending'   },
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function subjectStats(assignments) {
  const total     = assignments.length;
  const submitted = assignments.filter(a => a.status === 'submitted').length;
  const pending   = total - submitted;
  const percent   = total > 0 ? Math.round((submitted / total) * 100) : 0;
  return { total, submitted, pending, percent };
}

function getPercentColor(p) {
  if (p >= 80) return '#4CAF50';
  if (p >= 50) return '#FFA726';
  return '#EF5350';
}

function overallStats(subjects) {
  const total     = subjects.reduce((s, sub) => s + sub.assignments.length, 0);
  const submitted = subjects.reduce((s, sub) => s + sub.assignments.filter(a => a.status === 'submitted').length, 0);
  const pending   = total - submitted;
  const percent   = total > 0 ? Math.round((submitted / total) * 100) : 0;
  return { total, submitted, pending, percent };
}

// ─── CIRCULAR PROGRESS ────────────────────────────────────────────────────────

function CirclePercent({ percent, color, size = 56 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 5, borderColor: color + '33',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: color + '11',
      }}>
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 5, borderColor: color,
          borderRightColor: percent < 25 ? 'transparent' : color,
          borderBottomColor: percent < 50 ? 'transparent' : color,
          borderLeftColor: percent < 75 ? 'transparent' : color,
        }} />
        <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{percent}%</Text>
      </View>
    </View>
  );
}

// ─── SUBJECT DETAIL MODAL ─────────────────────────────────────────────────────

function SubjectModal({ subject, visible, onClose }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  if (!subject) return null;
  const stats = subjectStats(subject.assignments);

  const submittedBg = isDark ? '#1B5E20' : '#d4edda';
  const pendingBg   = isDark ? '#4E1A0A' : '#fde8e8';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={[ms.sheet, { backgroundColor: C.surface }]}>
          {/* Handle */}
          <View style={[ms.handle, { backgroundColor: C.border }]} />

          {/* Subject Header */}
          <View style={ms.sheetHeader}>
            <View style={[ms.codeBox, { backgroundColor: subject.color + '22', borderColor: subject.color + '44' }]}>
              <Text style={[ms.codeText, { color: subject.color }]}>{subject.code}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[ms.sheetTitle, { color: C.textPrim }]}>{subject.name}</Text>
              <Text style={[ms.sheetSub, { color: C.textSec }]}>{stats.total} assignments total</Text>
            </View>
            <CirclePercent percent={stats.percent} color={getPercentColor(stats.percent)} size={52} />
          </View>

          {/* Mini stats */}
          <View style={ms.miniStats}>
            <MiniStat label="Total"     value={stats.total}         color="#90CAF9" bg={C.surfaceAlt} labelColor={C.textSec} />
            <MiniStat label="Submitted" value={stats.submitted}     color="#4CAF50" bg={C.surfaceAlt} labelColor={C.textSec} />
            <MiniStat label="Pending"   value={stats.pending}       color="#EF5350" bg={C.surfaceAlt} labelColor={C.textSec} />
            <MiniStat label="Done"      value={`${stats.percent}%`} color={getPercentColor(stats.percent)} bg={C.surfaceAlt} labelColor={C.textSec} />
          </View>

          {/* Progress bar */}
          <View style={[ms.progressTrack, { backgroundColor: C.surfaceAlt }]}>
            <View style={[ms.progressFill, { width: `${stats.percent}%`, backgroundColor: getPercentColor(stats.percent) }]} />
          </View>

          {/* Assignment list */}
          <Text style={[ms.listHeader, { color: C.textPrim }]}>All Assignments</Text>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {subject.assignments.map((a, i) => (
              <View key={a.id} style={[ms.assignRow, { borderBottomColor: C.border }]}>
                <View style={[ms.indexDot, { backgroundColor: a.status === 'submitted' ? '#4CAF50' : '#EF5350' }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[ms.assignTitle, { color: C.textPrim }]}>{a.title}</Text>
                  <Text style={[ms.assignDue, { color: C.textSec }]}>Due: {a.due}</Text>
                </View>
                <View style={[ms.statusPill, { backgroundColor: a.status === 'submitted' ? submittedBg : pendingBg }]}>
                  <Text style={[ms.statusPillText, { color: a.status === 'submitted' ? '#4CAF50' : '#FF7043' }]}>
                    {a.status === 'submitted' ? '✓ Done' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[ms.closeBtn, { backgroundColor: C.accentBlue }]} onPress={onClose}>
            <Text style={ms.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MiniStat({ label, value, color, bg, labelColor }) {
  return (
    <View style={[ms.miniBox, { backgroundColor: bg }]}>
      <Text style={[ms.miniVal, { color }]}>{value}</Text>
      <Text style={[ms.miniLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function AssignmentTracker({ onBack }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [search, setSearch]             = useState('');
  const [selectedSub, setSelectedSub]   = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const overall  = overallStats(SUBJECTS);
  const filtered = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (sub) => { setSelectedSub(sub); setModalVisible(true); };

  return (
    <View style={[st.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[st.header, { borderBottomColor: C.border }]}>
        {onBack && (
          <TouchableOpacity style={[st.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={C.textPrim} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, marginLeft: onBack ? 12 : 0 }}>
          <Text style={[st.headerTitle, { color: C.textPrim }]}>Assignment Tracker</Text>
          <Text style={[st.headerSub, { color: C.textSec }]}>Subject-wise breakdown</Text>
        </View>
        <View style={[st.headerBadge, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[st.headerBadgeText, { color: '#4CAF50' }]}>{overall.percent}% Overall</Text>
        </View>
      </View>

      {/* Profile card */}
      <View style={[st.profileCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[st.avatar, { backgroundColor: C.accentBlue }]}>
          <Text style={st.avatarText}>AJ</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[st.profileName, { color: C.textPrim }]}>Alex Johnson</Text>
          <Text style={[st.profileMeta, { color: C.textSec }]}>Computer Science  |  PRN: CS2023001</Text>
          <Text style={[st.profileMeta, { color: C.textSec }]}>3rd Year, Semester 5</Text>
        </View>
        <TouchableOpacity style={[st.profileBtn, { backgroundColor: C.accentBlue }]}>
          <Text style={st.profileBtnText}>Full Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Overall stats */}
      <View style={st.overallRow}>
        <OverallCard label="Total"     value={overall.total}         color="#90CAF9" icon="layers-outline"         C={C} />
        <OverallCard label="Submitted" value={overall.submitted}     color="#4CAF50" icon="checkmark-done-outline" C={C} />
        <OverallCard label="Pending"   value={overall.pending}       color="#EF5350" icon="time-outline"           C={C} />
        <OverallCard label="Done"      value={`${overall.percent}%`} color={getPercentColor(overall.percent)} icon="stats-chart-outline" C={C} />
      </View>

      {/* Overall progress bar */}
      <View style={st.overallBarWrap}>
        <View style={[st.overallBarTrack, { backgroundColor: C.surfaceAlt }]}>
          <View style={[st.overallBarFill, {
            width: `${overall.percent}%`,
            backgroundColor: getPercentColor(overall.percent),
          }]} />
        </View>
        <Text style={[st.overallBarLabel, { color: getPercentColor(overall.percent) }]}>
          {overall.submitted}/{overall.total} submitted
        </Text>
      </View>

      {/* Search */}
      <View style={[st.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="search" size={15} color={C.textSec} style={{ marginRight: 8 }} />
        <TextInput
          style={[st.searchInput, { color: C.textPrim }]}
          placeholder="Search subjects..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={C.textSec} />
          </TouchableOpacity>
        )}
      </View>

      {/* Subject list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Text style={[st.listTitle, { color: C.textPrim }]}>Subject-wise Assignments</Text>

        {filtered.map(sub => {
          const stats  = subjectStats(sub.assignments);
          const pColor = getPercentColor(stats.percent);
          return (
            <TouchableOpacity
              key={sub.id}
              style={[st.subCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => openModal(sub)}
              activeOpacity={0.85}
            >
              {/* Top row */}
              <View style={st.subCardTop}>
                <View style={[st.codeBox, { backgroundColor: sub.color + '22', borderColor: sub.color + '44' }]}>
                  <Text style={[st.codeText, { color: sub.color }]}>{sub.code}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[st.subName, { color: C.textPrim }]}>{sub.name}</Text>
                  <Text style={[st.subMeta, { color: C.textSec }]}>{stats.total} assignments</Text>
                </View>
                <CirclePercent percent={stats.percent} color={pColor} size={52} />
              </View>

              {/* Stats chips */}
              <View style={st.chipsRow}>
                <Chip label="Total"     value={stats.total}     color="#90CAF9" />
                <Chip label="Submitted" value={stats.submitted} color="#4CAF50" />
                <Chip label="Pending"   value={stats.pending}   color="#EF5350" />
              </View>

              {/* Progress bar */}
              <View style={[st.barTrack, { backgroundColor: C.surfaceAlt }]}>
                <View style={[st.barFill, { width: `${stats.percent}%`, backgroundColor: pColor }]} />
              </View>

              {/* Tap hint */}
              <View style={st.tapHint}>
                <Text style={[st.tapHintText, { color: C.textMuted }]}>Tap to see all assignments</Text>
                <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 50 }}>
            <Text style={{ fontSize: 34 }}>🔍</Text>
            <Text style={{ color: C.textSec, marginTop: 8 }}>No subjects found</Text>
          </View>
        )}
      </ScrollView>

      <SubjectModal subject={selectedSub} visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
}

function OverallCard({ label, value, color, icon, C }) {
  return (
    <View style={[st.overallCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[st.overallVal, { color }]}>{value}</Text>
      <Text style={[st.overallLabel, { color: C.textSec }]}>{label}</Text>
    </View>
  );
}

function Chip({ label, value, color }) {
  return (
    <View style={[st.chip, { backgroundColor: color + '15', borderColor: color + '33' }]}>
      <Text style={[st.chipVal, { color }]}>{value}</Text>
      <Text style={[st.chipLabel, { color: color + 'AA' }]}>{label}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:         { padding: 10, borderRadius: 10, borderWidth: 1 },
  headerTitle:     { fontSize: 18, fontWeight: '800' },
  headerSub:       { fontSize: 12 },
  headerBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 14,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  avatar:         { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
  profileName:    { fontSize: 15, fontWeight: '700' },
  profileMeta:    { fontSize: 11, marginTop: 1 },
  profileBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  profileBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  overallRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  overallCard:  { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1 },
  overallVal:   { fontSize: 16, fontWeight: '800' },
  overallLabel: { fontSize: 10 },

  overallBarWrap:  { paddingHorizontal: 16, marginBottom: 14 },
  overallBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  overallBarFill:  { height: '100%', borderRadius: 4 },
  overallBarLabel: { fontSize: 11, fontWeight: '600', marginTop: 5, textAlign: 'right' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  listTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },

  subCard:    { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  subCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  codeBox:    { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  codeText:   { fontSize: 13, fontWeight: '800' },
  subName:    { fontSize: 14, fontWeight: '700' },
  subMeta:    { fontSize: 11, marginTop: 2 },

  chipsRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:      { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  chipVal:   { fontSize: 16, fontWeight: '800' },
  chipLabel: { fontSize: 10, marginTop: 2 },

  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill:  { height: '100%', borderRadius: 3 },

  tapHint:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  tapHintText: { fontSize: 11 },
});

const ms = StyleSheet.create({
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  codeBox:     { width: 50, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  codeText:    { fontSize: 14, fontWeight: '800' },
  sheetTitle:  { fontSize: 16, fontWeight: '800' },
  sheetSub:    { fontSize: 12, marginTop: 2 },

  miniStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  miniBox:   { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  miniVal:   { fontSize: 18, fontWeight: '800' },
  miniLabel: { fontSize: 10, marginTop: 2 },

  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 18 },
  progressFill:  { height: '100%', borderRadius: 4 },

  listHeader:     { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  assignRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  indexDot:       { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  assignTitle:    { fontSize: 13, fontWeight: '600' },
  assignDue:      { fontSize: 11, marginTop: 2 },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  closeBtn:     { padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});