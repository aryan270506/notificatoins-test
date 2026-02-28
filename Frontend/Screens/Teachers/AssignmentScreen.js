// Screens/Teachers/AssignmentScreen.js
// Fully responsive Assignment Dashboard — no grading system

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

/* ─── Colors ─────────────────────────────────────────────────────────────── */
const C = {
  bg:         '#0B0E1C',
  surface:    '#111827',
  surfaceEl:  '#1A2236',
  card:       '#141D2E',
  border:     '#1E2A40',
  borderDash: '#2A3650',
  accent:     '#3B6EF5',
  accentSoft: 'rgba(59,110,245,0.15)',
  green:      '#22C55E',
  greenSoft:  'rgba(34,197,94,0.15)',
  yellow:     '#F59E0B',
  yellowSoft: 'rgba(245,158,11,0.15)',
  red:        '#EF4444',
  redSoft:    'rgba(239,68,68,0.15)',
  purple:     '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.15)',
  teal:       '#14B8A6',
  tealSoft:   'rgba(20,184,166,0.15)',
  textPri:    '#EEF2FF',
  textSec:    '#8B96B2',
  textMuted:  '#3D4A6A',
  white:      '#FFFFFF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Static data ────────────────────────────────────────────────────────── */
const STATUS_META = {
  ACTIVE:   { color: C.green,     bg: C.greenSoft,            label: 'Active'   },
  APPROVED: { color: C.teal,      bg: C.tealSoft,             label: 'Approved' },
  CLOSED:   { color: C.textMuted, bg: 'rgba(61,74,106,0.3)',  label: 'Closed'   },
};

const SUBJECTS  = ['All Subjects', 'Mathematics', 'History', 'Chemistry', 'English Literature', 'Physics'];
const STATUSES  = ['All Statuses', 'ACTIVE', 'APPROVED', 'CLOSED'];
const CLASSES   = ['FY', 'SY', 'TY'];
const DIVISIONS = { FY: ['A', 'B', 'C'], SY: ['A', 'B'], TY: ['A', 'B', 'C', 'D'] };

const INITIAL_ASSIGNMENTS = [
  {
    id: 1, status: 'ACTIVE',
    title: 'Mid-term Calculus Quiz',
    subject: 'Mathematics', unit: 'Unit 4: Integrals',
    submitted: 24, total: 30,
    dueDate: 'Oct 24, 2023', dueTime: '11:59 PM',
    tag: null, approved: false,
    submissions: [
      { name: 'Ananya Sharma', roll: 'TYB-001', submittedAt: '10:32 AM' },
      { name: 'Rohan Mehta',   roll: 'TYB-002', submittedAt: '11:10 AM' },
      { name: 'Dev Patel',     roll: 'TYB-004', submittedAt: '09:55 AM' },
      { name: 'Sneha Iyer',    roll: 'TYB-005', submittedAt: '10:48 AM' },
    ],
  },
  {
    id: 2, status: 'ACTIVE',
    title: 'Historical Revolution Essay',
    subject: 'History', unit: 'Modern Era',
    submitted: 28, total: 28,
    dueDate: 'Oct 18, 2023', dueTime: null,
    tag: { label: 'All Submitted', color: C.green, icon: 'checkmark-circle-outline' },
    approved: false,
    submissions: [
      { name: 'Ananya Sharma', roll: 'TYB-001', submittedAt: '09:00 AM' },
      { name: 'Rohan Mehta',   roll: 'TYB-002', submittedAt: '09:20 AM' },
      { name: 'Dev Patel',     roll: 'TYB-004', submittedAt: '10:05 AM' },
      { name: 'Kavya Nair',    roll: 'TYB-007', submittedAt: '10:30 AM' },
    ],
  },
  {
    id: 3, status: 'CLOSED',
    title: 'Lab Report: Chemical Bonds',
    subject: 'Chemistry', unit: 'General Science',
    submitted: 22, total: 25,
    dueDate: 'Oct 10, 2023', dueTime: null,
    tag: { label: 'Archived', color: C.textMuted, icon: 'archive-outline' },
    approved: true,
    submissions: [
      { name: 'Ananya Sharma', roll: 'TYB-001', submittedAt: '08:45 AM' },
      { name: 'Rohan Mehta',   roll: 'TYB-002', submittedAt: '09:15 AM' },
      { name: 'Dev Patel',     roll: 'TYB-004', submittedAt: '09:50 AM' },
    ],
  },
  {
    id: 4, status: 'ACTIVE',
    title: 'Literature Review: Gatsby',
    subject: 'English Literature', unit: 'American Classics',
    submitted: 5, total: 32,
    dueDate: 'Oct 30, 2023', dueTime: null,
    tag: { label: 'New', color: C.accent, icon: 'information-circle-outline' },
    approved: false,
    submissions: [
      { name: 'Sneha Iyer', roll: 'TYB-005', submittedAt: '11:00 AM' },
      { name: 'Mihir Shah', roll: 'TYB-008', submittedAt: '11:22 AM' },
    ],
  },
  {
    id: 5, status: 'APPROVED',
    title: 'Physics: Projectile Motion',
    subject: 'Physics', unit: 'Mechanics',
    submitted: 30, total: 30,
    dueDate: 'Oct 15, 2023', dueTime: null,
    tag: { label: 'Approved', color: C.teal, icon: 'checkmark-circle-outline' },
    approved: true,
    submissions: [
      { name: 'Ananya Sharma', roll: 'TYB-001', submittedAt: '08:30 AM' },
      { name: 'Rohan Mehta',   roll: 'TYB-002', submittedAt: '09:00 AM' },
      { name: 'Dev Patel',     roll: 'TYB-004', submittedAt: '09:30 AM' },
    ],
  },
];

/* ─── Progress bar ───────────────────────────────────────────────────────── */
const ProgressBar = ({ submitted, total, status }) => {
  const pct    = Math.min(100, Math.round((submitted / total) * 100));
  const barClr = status === 'APPROVED' ? C.teal
               : status === 'CLOSED'   ? C.textMuted
               : C.accent;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: barClr, textAlign: 'right', marginBottom: 5 }}>
        {submitted} / {total}
      </Text>
      <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barClr, borderRadius: 3 }} />
      </View>
    </View>
  );
};

/* ─── Submissions modal ──────────────────────────────────────────────────── */
const SubmissionsModal = ({ visible, assignment, onClose }) => {
  if (!assignment) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          <View style={mo.header}>
            <View style={{ flex: 1 }}>
              <Text style={mo.title}>{assignment.title}</Text>
              <Text style={mo.sub}>{assignment.submitted} submissions · {assignment.subject}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {assignment.submissions.map((sub, i) => (
              <View key={i} style={mo.row}>
                <View style={mo.avatar}>
                  <Text style={mo.avatarText}>{sub.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={mo.name}>{sub.name}</Text>
                  <Text style={mo.meta}>{sub.roll} · Submitted {sub.submittedAt}</Text>
                </View>
                <View style={mo.checkDot}>
                  <Ionicons name="checkmark" size={13} color={C.green} />
                </View>
              </View>
            ))}
            {assignment.submissions.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Ionicons name="document-outline" size={36} color={C.textMuted} />
                <Text style={{ fontSize: 14, color: C.textMuted }}>No submissions yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Results modal ──────────────────────────────────────────────────────── */
const ResultsModal = ({ visible, assignment, onClose }) => {
  if (!assignment) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          <View style={mo.header}>
            <View style={{ flex: 1 }}>
              <Text style={mo.title}>Results — {assignment.title}</Text>
              <Text style={mo.sub}>{assignment.submitted} / {assignment.total} submitted</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={mo.closeBtn}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {assignment.submissions.map((sub, i) => (
              <View key={i} style={mo.row}>
                <View style={mo.avatar}>
                  <Text style={mo.avatarText}>{sub.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={mo.name}>{sub.name}</Text>
                  <Text style={mo.meta}>{sub.roll} · {sub.submittedAt}</Text>
                </View>
                <View style={[mo.checkDot, { backgroundColor: C.tealSoft, borderColor: C.teal + '60' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={C.teal} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const mo = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header:   { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title:    { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 3 },
  sub:      { fontSize: 12, color: C.textSec },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  avatar:   { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.accent },
  name:     { fontSize: 13, fontWeight: '700', color: C.textPri },
  meta:     { fontSize: 11, color: C.textSec, marginTop: 1 },
  checkDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green + '60', alignItems: 'center', justifyContent: 'center' },
});

/* ─── Edit modal ─────────────────────────────────────────────────────────── */
const EditModal = ({ visible, assignment, onClose, onSave }) => {
  const [title,   setTitle]   = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title);
      setSubject(assignment.subject);
      setDueDate(assignment.dueDate);
    }
  }, [assignment]);

  if (!assignment) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>Edit Assignment</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Title', val: title, set: setTitle },
              { label: 'Subject', val: subject, set: setSubject },
              { label: 'Due Date', val: dueDate, set: setDueDate },
            ].map(f => (
              <View key={f.label}>
                <Text style={em.label}>{f.label}</Text>
                <TextInput style={em.input} value={f.val} onChangeText={f.set} placeholderTextColor={C.textMuted} />
              </View>
            ))}
            <View style={em.btnRow}>
              <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
                <Text style={em.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={em.saveBtn} onPress={() => onSave(assignment.id, { title, subject, dueDate })}>
                <Text style={em.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const em = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title:      { fontSize: 16, fontWeight: '800', color: C.textPri },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 12, fontWeight: '700', color: C.textSec, marginBottom: 6 },
  input:      { backgroundColor: C.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textPri },
  btnRow:     { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textSec },
  saveBtn:    { flex: 1.5, paddingVertical: 13, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center' },
  saveText:   { fontSize: 14, fontWeight: '700', color: C.white },
});

/* ─── New Assignment modal ───────────────────────────────────────────────── */
const NewAssignmentModal = ({ visible, onClose, onCreate }) => {
  const [title,   setTitle]   = useState('');
  const [subject, setSubject] = useState('');
  const [unit,    setUnit]    = useState('');
  const [total,   setTotal]   = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleCreate = () => {
    if (!title.trim() || !subject.trim()) {
      Alert.alert('Required', 'Please fill in title and subject.');
      return;
    }
    onCreate({ title, subject, unit, total: parseInt(total) || 30, dueDate });
    setTitle(''); setSubject(''); setUnit(''); setTotal(''); setDueDate('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>New Assignment</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Title *',          val: title,   set: setTitle,   ph: 'e.g. Mid-term Quiz'      },
              { label: 'Subject *',        val: subject, set: setSubject, ph: 'e.g. Mathematics'         },
              { label: 'Unit / Topic',     val: unit,    set: setUnit,    ph: 'e.g. Unit 4: Integrals'  },
              { label: 'Total Students',   val: total,   set: setTotal,   ph: '30', kb: 'numeric'        },
              { label: 'Due Date',         val: dueDate, set: setDueDate, ph: 'e.g. Nov 10, 2023'       },
            ].map(f => (
              <View key={f.label}>
                <Text style={em.label}>{f.label}</Text>
                <TextInput
                  style={em.input} value={f.val} onChangeText={f.set}
                  placeholder={f.ph} placeholderTextColor={C.textMuted}
                  keyboardType={f.kb ?? 'default'}
                />
              </View>
            ))}
            <View style={em.btnRow}>
              <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
                <Text style={em.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={em.saveBtn} onPress={handleCreate}>
                <Text style={em.saveText}>Create Assignment</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Assignment card ────────────────────────────────────────────────────── */
const AssignmentCard = ({ item, onEdit, onView, onApprove, onRestore, onResults }) => {
  const meta = STATUS_META[item.status] ?? STATUS_META.ACTIVE;

  return (
    <View style={cd.wrap}>
      {/* Status pill + menu */}
      <View style={cd.topRow}>
        <View style={[cd.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[cd.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity style={cd.menuBtn} activeOpacity={0.7}
          onPress={() => Alert.alert(item.title, 'Options', [
            { text: 'Edit',   onPress: onEdit },
            { text: 'Delete', style: 'destructive', onPress: () => {} },
            { text: 'Cancel', style: 'cancel' },
          ])}>
          <Ionicons name="ellipsis-vertical" size={16} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Title + subject */}
      <Text style={cd.title}>{item.title}</Text>
      <Text style={cd.subject}>{item.subject} · {item.unit}</Text>

      {/* Submission progress */}
      <Text style={cd.progressLabel}>Submissions</Text>
      <ProgressBar submitted={item.submitted} total={item.total} status={item.status} />

      {/* Date + tag row */}
      <View style={cd.metaRow}>
        <View style={cd.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
          <Text style={cd.metaText}>{item.dueDate}</Text>
        </View>
        {item.dueTime && (
          <View style={cd.metaItem}>
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={cd.metaText}>{item.dueTime}</Text>
          </View>
        )}
        {item.tag && (
          <View style={[cd.tagPill, { backgroundColor: item.tag.color + '20' }]}>
            <Ionicons name={item.tag.icon} size={11} color={item.tag.color} />
            <Text style={[cd.tagText, { color: item.tag.color }]}>{item.tag.label}</Text>
          </View>
        )}
      </View>

      {/* Actions — always show Edit + View Submissions */}
      <View style={cd.actions}>

        {/* Edit — always visible (except already-approved) */}
        {item.status !== 'APPROVED' && (
          <TouchableOpacity style={cd.btnOutline} onPress={onEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color={C.textPri} />
            <Text style={cd.btnOutlineText}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* View Submissions — always visible */}
        <TouchableOpacity
          style={[cd.btnFilled, item.status === 'APPROVED' && { backgroundColor: C.teal, shadowColor: C.teal }]}
          onPress={onView}
          activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={13} color={C.white} />
          <Text style={cd.btnFilledText}>View Submissions</Text>
        </TouchableOpacity>

        {/* Approve — only when ALL students have submitted and not yet approved */}
        {item.submitted === item.total && item.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[cd.btnApprove]}
            onPress={onApprove}
            activeOpacity={0.8}>
            <Ionicons name="checkmark-circle-outline" size={13} color={C.white} />
            <Text style={cd.btnFilledText}>Approve</Text>
          </TouchableOpacity>
        )}

        {/* Already approved badge */}
        {item.status === 'APPROVED' && (
          <View style={cd.approvedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={C.teal} />
            <Text style={[cd.btnOutlineText, { color: C.teal }]}>Approved</Text>
          </View>
        )}

      </View>
    </View>
  );
};

const cd = StyleSheet.create({
  wrap:          { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, flex: 1 },
  topRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  statusText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  menuBtn:       { marginLeft: 'auto', padding: 4 },
  title:         { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 4, lineHeight: 22 },
  subject:       { fontSize: 12, color: C.textSec, marginBottom: 14 },
  progressLabel: { fontSize: 11, color: C.textSec, marginBottom: 4 },
  metaRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { fontSize: 11, color: C.textMuted },
  tagPill:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText:       { fontSize: 11, fontWeight: '700' },
  actions:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl, minWidth: 70,
  },
  btnOutlineText: { fontSize: 13, fontWeight: '700', color: C.textPri },
  btnFilled: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 10, backgroundColor: C.accent, minWidth: 110,
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnFilledText: { fontSize: 13, fontWeight: '700', color: C.white },
  btnApprove: {
    flexBasis: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 10, backgroundColor: C.green,
    shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    marginTop: 4,
  },
  approvedBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: C.tealSoft, borderWidth: 1, borderColor: C.teal + '50',
  },
});

/* ─── Create placeholder card ────────────────────────────────────────────── */
const CreateCard = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={cr.wrap}>
    <View style={cr.iconWrap}>
      <Ionicons name="add-circle-outline" size={36} color={C.textMuted} />
    </View>
    <Text style={cr.title}>Create Assignment</Text>
    <Text style={cr.sub}>Draft a new task or project{'\n'}for your students</Text>
  </TouchableOpacity>
);
const cr = StyleSheet.create({
  wrap:    { flex: 1, borderRadius: 16, borderWidth: 2, borderColor: C.borderDash, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, minHeight: 200 },
  iconWrap:{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:   { fontSize: 16, fontWeight: '800', color: C.textPri },
  sub:     { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AssignmentScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;
  const colCount   = width >= 1024 ? 3 : isWide ? 2 : 1;

  const [assignments,  setAssignments]  = useState(INITIAL_ASSIGNMENTS);
  const [search,       setSearch]       = useState('');
  const [selSubject,   setSelSubject]   = useState('All Subjects');
  const [selStatus,    setSelStatus]    = useState('All Statuses');
  const [showFilters,  setShowFilters]  = useState(false);
  const [selClass,     setSelClass]     = useState(null);
  const [selDivision,  setSelDivision]  = useState(null);
  const [viewModal,    setViewModal]    = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [resultsModal, setResultsModal] = useState(false);
  const [newModal,     setNewModal]     = useState(false);
  const [activeItem,   setActiveItem]   = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── Class/division handlers ── */
  const handleClassSelect = (cls) => {
    setSelClass(prev => prev === cls ? null : cls);
    setSelDivision(null);
  };
  const handleDivisionSelect = (div) => setSelDivision(prev => prev === div ? null : div);

  /* ── Assignment actions ── */
  const updateAssignment = (id, changes) =>
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));

  const handleEdit    = (item) => { setActiveItem(item); setEditModal(true);    };
  const handleView    = (item) => { setActiveItem(item); setViewModal(true);    };
  const handleResults = (item) => { setActiveItem(item); setResultsModal(true); };

  const handleApprove = (item) => {
    if (item.status === 'APPROVED') {
      Alert.alert('Already Approved', `"${item.title}" is already approved.`);
      return;
    }
    Alert.alert(
      'Approve Assignment',
      `Approve "${item.title}"? This marks it as complete for all students.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            updateAssignment(item.id, {
              approved: true,
              status: 'APPROVED',
              tag: { label: 'Approved', color: C.teal, icon: 'checkmark-circle-outline' },
            });
            Alert.alert('✅ Approved', `"${item.title}" has been approved.`);
          },
        },
      ],
    );
  };

  const handleRestore = (item) => {
    Alert.alert('Restore Assignment', `Restore "${item.title}" to Active?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => updateAssignment(item.id, { status: 'ACTIVE', approved: false, tag: null }) },
    ]);
  };

  const handleSaveEdit = (id, changes) => {
    updateAssignment(id, changes);
    setEditModal(false);
  };

  const handleCreate = (data) => {
    const newA = {
      id: Date.now(), status: 'ACTIVE',
      title: data.title, subject: data.subject, unit: data.unit || 'General',
      submitted: 0, total: data.total,
      dueDate: data.dueDate || 'TBD', dueTime: null,
      tag: { label: 'New', color: C.accent, icon: 'information-circle-outline' },
      approved: false, submissions: [],
    };
    setAssignments(prev => [newA, ...prev]);
    setNewModal(false);
    Alert.alert('✅ Created', `"${data.title}" has been created.`);
  };

  /* ── Filter ── */
  const filtered = assignments.filter(a => {
    const matchSearch  = a.title.toLowerCase().includes(search.toLowerCase()) ||
                         a.subject.toLowerCase().includes(search.toLowerCase());
    const matchSubject = selSubject === 'All Subjects' || a.subject === selSubject;
    const matchStatus  = selStatus  === 'All Statuses' || a.status === selStatus;
    return matchSearch && matchSubject && matchStatus;
  });

  const rows = [];
  for (let i = 0; i < filtered.length; i += colCount) rows.push(filtered.slice(i, i + colCount));
  const showCreate = selSubject === 'All Subjects' && selStatus === 'All Statuses' && search === '';

  /* ── KPIs (live) ── */
  const kpis = [
    { label: 'Active',         value: assignments.filter(a => a.status === 'ACTIVE').length,   icon: 'clipboard-outline',        color: C.accent, bg: C.accentSoft  },
    { label: 'Pending Approval',value: assignments.filter(a => a.status === 'ACTIVE' && a.submitted === a.total).length, icon: 'hourglass-outline', color: C.yellow, bg: C.yellowSoft },
    { label: 'Approved',       value: assignments.filter(a => a.status === 'APPROVED').length, icon: 'checkmark-circle-outline', color: C.teal,   bg: C.tealSoft    },
    { label: 'Total Students', value: 156,                                                      icon: 'people-outline',           color: C.purple, bg: C.purpleSoft  },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Modals ── */}
      <SubmissionsModal visible={viewModal} assignment={activeItem} onClose={() => setViewModal(false)} />
      <EditModal visible={editModal} assignment={activeItem} onClose={() => setEditModal(false)} onSave={handleSaveEdit} />
      <ResultsModal visible={resultsModal} assignment={activeItem} onClose={() => setResultsModal(false)} />
      <NewAssignmentModal visible={newModal} onClose={() => setNewModal(false)} onCreate={handleCreate} />

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Assignment Dashboard</Text>
              <Text style={s.sub}>
                {selClass && selDivision
                  ? `${selClass}-${selDivision}  ·  Manage and track student progress`
                  : selClass
                    ? `${selClass}  ·  Select a division to narrow results`
                    : 'Select class & division to manage assignments'}
              </Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity style={s.bellBtn}>
                <Ionicons name="notifications-outline" size={20} color={C.textPri} />
                <View style={s.bellDot} />
              </TouchableOpacity>
              <TouchableOpacity style={s.newBtn} onPress={() => setNewModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color={C.white} />
                <Text style={s.newBtnText}>New Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Class & Division Selector ────────────────────────────────── */}
          <View style={s.classDivBlock}>
            {/* Step indicator */}
            <View style={s.classDivRow}>
              <View style={s.classDivStep}>
                <View style={[s.stepDot, selClass && s.stepDotDone]}>
                  {selClass ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={s.stepNum}>1</Text>}
                </View>
                <Text style={[s.stepLabel, selClass && { color: C.textPri }]}>Class</Text>
              </View>
              <View style={s.stepLine} />
              <View style={s.classDivStep}>
                <View style={[s.stepDot, selDivision ? s.stepDotDone : selClass && s.stepDotActive]}>
                  {selDivision ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={s.stepNum}>2</Text>}
                </View>
                <Text style={[s.stepLabel, selDivision && { color: C.textPri }]}>Division</Text>
              </View>
            </View>

            {/* Class chips */}
            <View style={s.classDivSection}>
              <Text style={s.classDivLabel}>
                <Ionicons name="school-outline" size={12} color={C.accent} />{'  '}Select Class
              </Text>
              <View style={s.chipRow}>
                {CLASSES.map(cls => (
                  <TouchableOpacity key={cls} onPress={() => handleClassSelect(cls)} activeOpacity={0.8}
                    style={[s.classChip, selClass === cls && s.classChipActive]}>
                    <Text style={[s.classChipText, selClass === cls && { color: C.accent }]}>{cls}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Division chips */}
            {selClass && (
              <View style={s.classDivSection}>
                <Text style={s.classDivLabel}>
                  <Ionicons name="git-branch-outline" size={12} color={C.teal} />{'  '}Select Division
                </Text>
                <View style={s.chipRow}>
                  {DIVISIONS[selClass].map(div => (
                    <TouchableOpacity key={div} onPress={() => handleDivisionSelect(div)} activeOpacity={0.8}
                      style={[s.divChip, selDivision === div && s.divChipActive]}>
                      <Text style={[s.divChipText, selDivision === div && { color: C.teal }]}>{div}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Context badge */}
            {selClass && selDivision && (
              <View style={s.contextBadge}>
                <Ionicons name="checkmark-circle" size={14} color={C.green} />
                <Text style={s.contextBadgeText}>
                  Showing assignments for <Text style={{ color: C.textPri, fontWeight: '800' }}>{selClass}-{selDivision}</Text>
                </Text>
                <TouchableOpacity onPress={() => { setSelClass(null); setSelDivision(null); }} style={s.clearBadge}>
                  <Ionicons name="close" size={12} color={C.textMuted} />
                  <Text style={s.clearBadgeText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── KPI Cards ────────────────────────────────────────────────── */}
          {isWide ? (
            /* Desktop / tablet: single row, all 4 cards equal width */
            <View style={s.kpiRow}>
              {kpis.map((k, i) => (
                <View key={i} style={[s.kpiCardWide, { backgroundColor: k.bg, borderColor: k.color + '35' }]}>
                  <View style={s.kpiCardInner}>
                    <View style={[s.kpiIconWrap, { backgroundColor: k.color + '20' }]}>
                      <Ionicons name={k.icon} size={20} color={k.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.kpiLabel}>{k.label}</Text>
                      <Text style={[s.kpiVal, { color: k.color }]}>{k.value}</Text>
                    </View>
                  </View>
                  {/* bottom accent line */}
                  <View style={[s.kpiAccentLine, { backgroundColor: k.color }]} />
                </View>
              ))}
            </View>
          ) : (
            /* Mobile: horizontal scroll so all 4 cards are always visible */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.kpiScrollContent}
              style={s.kpiScroll}>
              {kpis.map((k, i) => (
                <View key={i} style={[s.kpiCardMobile, { backgroundColor: k.bg, borderColor: k.color + '35' }]}>
                  <View style={[s.kpiIconWrap, { backgroundColor: k.color + '20' }]}>
                    <Ionicons name={k.icon} size={18} color={k.color} />
                  </View>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                  <Text style={[s.kpiVal, { color: k.color }]}>{k.value}</Text>
                  <View style={[s.kpiAccentLine, { backgroundColor: k.color }]} />
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── Search + Filters ─────────────────────────────────────────── */}
          <View style={[s.filterBar, isWide && s.filterBarWide]}>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput
                style={s.searchInput} placeholder="Search assignments..."
                placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
              <TouchableOpacity style={s.dropdown} onPress={() => setShowFilters(!showFilters)}>
                <Text style={s.dropdownText}>{selSubject === 'All Subjects' ? 'All Subjects' : selSubject.split(' ')[0]}</Text>
                <Ionicons name="chevron-down" size={13} color={C.textSec} />
              </TouchableOpacity>
              <TouchableOpacity style={s.dropdown} onPress={() => setShowFilters(!showFilters)}>
                <Text style={s.dropdownText}>{selStatus}</Text>
                <Ionicons name="chevron-down" size={13} color={C.textSec} />
              </TouchableOpacity>
              <TouchableOpacity style={s.moreBtn} onPress={() => setShowFilters(!showFilters)}>
                <Ionicons name="options-outline" size={14} color={C.textSec} />
                <Text style={s.moreBtnText}>More Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {showFilters && (
            <View style={s.filterExpanded}>
              <Text style={s.filterSection}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {SUBJECTS.map(sub => (
                  <TouchableOpacity key={sub} onPress={() => setSelSubject(sub)}
                    style={[s.filterPill, selSubject === sub && { backgroundColor: C.accentSoft, borderColor: C.accent }]}>
                    <Text style={[s.filterPillText, selSubject === sub && { color: C.accent }]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.filterSection}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {STATUSES.map(st => {
                  const meta = st === 'All Statuses' ? { color: C.accent } : STATUS_META[st];
                  return (
                    <TouchableOpacity key={st} onPress={() => setSelStatus(st)}
                      style={[s.filterPill, selStatus === st && { backgroundColor: meta.color + '20', borderColor: meta.color }]}>
                      <Text style={[s.filterPillText, selStatus === st && { color: meta.color }]}>{st}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Assignment Grid ───────────────────────────────────────────── */}
          <View style={s.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={[s.gridRow, isWide && { flexDirection: 'row', gap: 14 }]}>
                {row.map(item => (
                  <View key={item.id} style={[s.gridCell, isWide && { flex: 1 }]}>
                    <AssignmentCard
                      item={item}
                      onEdit={()     => handleEdit(item)}
                      onView={()     => handleView(item)}
                      onApprove={()  => handleApprove(item)}
                      onRestore={()  => handleRestore(item)}
                      onResults={()  => handleResults(item)}
                    />
                  </View>
                ))}
                {ri === rows.length - 1 && row.length < colCount && <>
                  {showCreate && (
                    <View style={[s.gridCell, isWide && { flex: 1 }]}>
                      <CreateCard onPress={() => setNewModal(true)} />
                    </View>
                  )}
                  {Array.from({ length: colCount - row.length - (showCreate ? 1 : 0) }).map((_, ei) =>
                    isWide ? <View key={ei} style={{ flex: 1 }} /> : null
                  )}
                </>}
              </View>
            ))}
            {showCreate && filtered.length % colCount === 0 && (
              <View style={[s.gridRow, isWide && { flexDirection: 'row', gap: 14 }]}>
                <View style={[s.gridCell, isWide && { flex: 1 }]}>
                  <CreateCard onPress={() => setNewModal(true)} />
                </View>
                {isWide && Array.from({ length: colCount - 1 }).map((_, ei) => <View key={ei} style={{ flex: 1 }} />)}
              </View>
            )}
          </View>

          {filtered.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="search" size={44} color={C.textMuted} />
              <Text style={s.emptyTitle}>No assignments found</Text>
              <Text style={s.emptySub}>Try adjusting your search or filters</Text>
            </View>
          )}

          <Text style={s.footer}>© 2023 Campus360 Educational Systems. All Rights Reserved.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, gap: 14, marginBottom: 4 },
  headerWide: { flexDirection: 'row', alignItems: 'center' },
  title:  { fontSize: 26, fontWeight: '800', color: C.textPri, fontFamily: SERIF, marginBottom: 4 },
  sub:    { fontSize: 13, color: C.textSec },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.bg },
  newBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  /* Class/division */
  classDivBlock:   { marginHorizontal: 20, marginBottom: 18, backgroundColor: C.surfaceEl, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 },
  classDivRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  classDivStep:    { alignItems: 'center', gap: 4 },
  stepDot:         { width: 24, height: 24, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:   { borderColor: C.teal, backgroundColor: 'rgba(20,184,166,0.12)' },
  stepDotDone:     { backgroundColor: C.green, borderColor: C.green },
  stepNum:         { fontSize: 11, fontWeight: '800', color: C.textMuted },
  stepLabel:       { fontSize: 10, fontWeight: '700', color: C.textMuted },
  stepLine:        { flex: 1, height: 1, backgroundColor: C.border, marginHorizontal: 8, marginBottom: 14 },
  classDivSection: { gap: 8 },
  classDivLabel:   { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 0.4 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classChip:       { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, minWidth: 56, alignItems: 'center' },
  classChipActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  classChipText:   { fontSize: 15, fontWeight: '800', color: C.textMuted },
  divChip:         { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, minWidth: 46, alignItems: 'center' },
  divChipActive:   { backgroundColor: C.tealSoft, borderColor: C.teal },
  divChipText:     { fontSize: 14, fontWeight: '700', color: C.textMuted },
  contextBadge:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenSoft, borderRadius: 10, borderWidth: 1, borderColor: C.green + '40', paddingHorizontal: 12, paddingVertical: 9 },
  contextBadgeText:{ flex: 1, fontSize: 12, color: C.textSec },
  clearBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border },
  clearBadgeText:  { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  /* KPIs */
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  kpiCardWide: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  kpiCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiAccentLine: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 3,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    opacity: 0.6,
  },
  kpiScroll: {
    marginBottom: 18,
  },
  kpiScrollContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  kpiCardMobile: {
    width: 130,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    overflow: 'hidden',
  },
  kpiLabel: { fontSize: 12, color: C.textSec, marginBottom: 2 },
  kpiVal:   { fontSize: 28, fontWeight: '900', fontFamily: SERIF },

  /* Filters */
  filterBar:     { paddingHorizontal: 20, gap: 10, marginBottom: 6 },
  filterBarWide: { flexDirection: 'row', alignItems: 'center' },
  searchBox:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  searchInput:   { flex: 1, fontSize: 14, color: C.textPri },
  dropdown:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  dropdownText:  { fontSize: 13, fontWeight: '600', color: C.textSec, maxWidth: 110 },
  moreBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  moreBtnText:   { fontSize: 13, fontWeight: '600', color: C.textSec },
  filterExpanded:{ marginHorizontal: 20, marginBottom: 14, backgroundColor: C.surfaceEl, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  filterSection: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  filterPill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterPillText:{ fontSize: 12, fontWeight: '700', color: C.textSec },

  /* Grid */
  grid:       { paddingHorizontal: 16, gap: 14, marginTop: 10 },
  gridRow:    { gap: 14 },
  gridCell:   { marginBottom: 0 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textSec },
  emptySub:   { fontSize: 13, color: C.textMuted },
  footer:     { textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 24, paddingHorizontal: 20 },
});