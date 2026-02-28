// Screens/Teacher/Attendance.js

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, useWindowDimensions,
  Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#080A10',
  surface: '#0F1220',
  surfaceEl: '#161C2E',
  border: '#1C2235',
  accent: '#22D3EE',
  accentSoft: 'rgba(34,211,238,0.12)',
  green: '#22C55E',
  greenSoft: 'rgba(34,197,94,0.15)',
  red: '#F43F5E',
  redSoft: 'rgba(244,63,94,0.15)',
  yellow: '#FBBF24',
  textPrimary: '#EEF2FF',
  textSecondary: '#8B96B2',
  textMuted: '#3B4260',
};
const FONTS = {
  heading: Platform.OS === 'ios' ? 'Georgia' : 'serif',
};

/* ─── Data ───────────────────────────────────────────────────────────────── */
const CLASS_OPTIONS = ['FY', 'SY', 'TY'];

const DIVISIONS = {
  FY: ['A', 'B', 'C'],
  SY: ['A', 'B', 'c'],
  TY: ['A', 'B', 'C'],
};

const LAB_BATCHES = ['Batch 1', 'Batch 2', 'Batch 3'];

const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM',
];

const DURATIONS = ['30 min', '45 min', '1 hr', '1.5 hrs', '2 hrs', '3 hrs'];

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
  'English', 'History', 'Data Structures', 'Algorithms',
  'Electronics', 'Thermodynamics', 'Other',
];

const STUDENT_POOL = [
  { name: 'Ananya Sharma',  roll: '001', avg: 96 },
  { name: 'Rohan Mehta',    roll: '002', avg: 82 },
  { name: 'Priya Kulkarni', roll: '003', avg: 74 },
  { name: 'Dev Patel',      roll: '004', avg: 91 },
  { name: 'Sneha Iyer',     roll: '005', avg: 68 },
  { name: 'Arjun Singh',    roll: '006', avg: 88 },
  { name: 'Kavya Nair',     roll: '007', avg: 55 },
  { name: 'Mihir Shah',     roll: '008', avg: 79 },
  { name: 'Ritika Das',     roll: '009', avg: 84 },
  { name: 'Varun Gupta',    roll: '010', avg: 61 },
  { name: 'Pooja Desai',    roll: '011', avg: 77 },
  { name: 'Sameer Khan',    roll: '012', avg: 90 },
];

const BATCH_STUDENTS = {
  'Batch 1': STUDENT_POOL.slice(0, 4),
  'Batch 2': STUDENT_POOL.slice(4, 8),
  'Batch 3': STUDENT_POOL.slice(8, 12),
};

/* ─── Recent Session Modal ───────────────────────────────────────────────── */
// Shows a past session's attendance with option to modify
const RecentSessionModal = ({ visible, onClose, session }) => {
  const [localAttendance, setLocalAttendance] = useState({});
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (session) {
      setLocalAttendance({ ...session.attendance });
      setModified(false);
    }
  }, [session]);

  if (!session) return null;

  const students = session.type === 'Lab' && session.batch
    ? BATCH_STUDENTS[session.batch] || []
    : STUDENT_POOL;

  const toggle = (roll) => {
    setLocalAttendance(prev => ({ ...prev, [roll]: prev[roll] === 'present' ? 'absent' : 'present' }));
    setModified(true);
  };

  const handleSave = () => {
    Alert.alert('✅ Saved', 'Attendance has been updated successfully!');
    setModified(false);
    onClose(localAttendance); // pass back updated attendance
  };

  const present = students.filter(s => localAttendance[s.roll] === 'present').length;
  const absent  = students.filter(s => localAttendance[s.roll] === 'absent').length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => onClose(null)}>
      <View style={rs.overlay}>
        <View style={rs.sheet}>

          {/* Header */}
          <View style={rs.header}>
            <View style={rs.headerLeft}>
              <View style={rs.headerIcon}>
                <Ionicons name="time-outline" size={20} color={COLORS.yellow} />
              </View>
              <View>
                <Text style={rs.headerTitle}>
                  {session.class}-{session.division} · {session.subject}
                </Text>
                <Text style={rs.headerSub}>
                  {session.date} · {session.time} · {session.type}
                  {session.batch ? ` · ${session.batch}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={rs.closeBtn} onPress={() => onClose(null)}>
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary pills */}
          <View style={rs.summaryRow}>
            <View style={[rs.pill, { backgroundColor: COLORS.greenSoft, borderColor: COLORS.green + '50' }]}>
              <Text style={[rs.pillCount, { color: COLORS.green }]}>{present}</Text>
              <Text style={[rs.pillLabel, { color: COLORS.green }]}>Present</Text>
            </View>
            <View style={[rs.pill, { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + '50' }]}>
              <Text style={[rs.pillCount, { color: COLORS.red }]}>{absent}</Text>
              <Text style={[rs.pillLabel, { color: COLORS.red }]}>Absent</Text>
            </View>
            <View style={[rs.pill, { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent + '50' }]}>
              <Text style={[rs.pillCount, { color: COLORS.accent }]}>{students.length}</Text>
              <Text style={[rs.pillLabel, { color: COLORS.accent }]}>Total</Text>
            </View>
          </View>

          {modified && (
            <View style={rs.modifiedBanner}>
              <Ionicons name="pencil" size={13} color={COLORS.yellow} />
              <Text style={rs.modifiedText}>Unsaved changes — tap Save to update</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ paddingHorizontal: 16, gap: 8, marginTop: 8 }}>
              {students.map((student, i) => {
                const isPresent = localAttendance[student.roll] === 'present';
                return (
                  <View key={student.roll} style={rs.studentRow}>
                    <View style={[
                      rs.avatar,
                      {
                        backgroundColor: isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                        borderColor: isPresent ? COLORS.green + '50' : COLORS.red + '50',
                      }
                    ]}>
                      <Text style={[rs.avatarText, { color: isPresent ? COLORS.green : COLORS.red }]}>
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={rs.studentName}>{student.name}</Text>
                      <Text style={rs.studentMeta}>Roll {student.roll} · {student.avg}% avg</Text>
                    </View>
                    {/* Modify toggle */}
                    <TouchableOpacity
                      onPress={() => toggle(student.roll)}
                      style={[
                        rs.toggleBtn,
                        { backgroundColor: isPresent ? COLORS.green : COLORS.red }
                      ]}>
                      <Ionicons name={isPresent ? 'checkmark' : 'close'} size={14} color="#fff" />
                      <Text style={rs.toggleText}>{isPresent ? 'Present' : 'Absent'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={rs.footer}>
            <TouchableOpacity style={rs.cancelBtn} onPress={() => onClose(null)}>
              <Text style={rs.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rs.saveBtn, !modified && rs.saveBtnDisabled]}
              onPress={handleSave}
              activeOpacity={modified ? 0.8 : 1}>
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={rs.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const rs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.surfaceEl, alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  pill: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  pillCount: { fontSize: 20, fontWeight: '900' },
  pillLabel: { fontSize: 11, fontWeight: '700' },
  modifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.yellow + '40',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  modifiedText: { fontSize: 12, fontWeight: '600', color: COLORS.yellow },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surfaceEl, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  avatarText: { fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  studentMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, minWidth: 82, justifyContent: 'center',
  },
  toggleText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  footer: {
    flexDirection: 'row', gap: 10,
    padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.green, paddingVertical: 14, borderRadius: 14,
    shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: COLORS.surfaceEl, shadowOpacity: 0 },
  saveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

/* ─── Create Session Modal ───────────────────────────────────────────────── */
const CreateSessionModal = ({ visible, onClose, onConfirm, initialClass, initialDivision }) => {
  const today = new Date().toISOString().split('T')[0];

  const [sessClass,    setSessClass]    = useState(initialClass    || null);
  const [sessDivision, setSessDivision] = useState(initialDivision || null);
  const [sessType,     setSessType]     = useState(null);
  const [sessBatch,    setSessBatch]    = useState(null);
  const [sessSubject,  setSessSubject]  = useState(null);
  const [sessDate,     setSessDate]     = useState(today);
  const [sessTime,     setSessTime]     = useState(null);
  const [sessDuration, setSessDuration] = useState(null);

  const resetAll = () => {
    setSessClass(initialClass || null); setSessDivision(initialDivision || null); setSessType(null);
    setSessBatch(null); setSessSubject(null); setSessDate(today);
    setSessTime(null);  setSessDuration(null);
  };

  useEffect(() => {
    if (visible) {
      setSessClass(initialClass || null);
      setSessDivision(initialDivision || null);
    }
  }, [visible, initialClass, initialDivision]);

  const canConfirm = sessClass && sessDivision && sessType && sessSubject && sessDate && sessTime && sessDuration
    && (sessType === 'Theory' || (sessType === 'Lab' && sessBatch));

  const handleConfirm = () => {
    if (!canConfirm) {
      Alert.alert('Incomplete', 'Please fill in all session details before confirming.');
      return;
    }
    onConfirm({
      class: sessClass, division: sessDivision, type: sessType,
      batch: sessBatch, subject: sessSubject,
      date: sessDate, time: sessTime, duration: sessDuration,
    });
    resetAll();
    onClose();
  };

  const handleClose = () => { resetAll(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>

          <View style={ms.header}>
            <View style={ms.headerLeft}>
              <View style={ms.headerIcon}>
                <Ionicons name="add-circle" size={20} color={COLORS.accent} />
              </View>
              <View>
                <Text style={ms.headerTitle}>Create Session</Text>
                <Text style={ms.headerSub}>Set up class details &amp; time</Text>
              </View>
            </View>
            <TouchableOpacity style={ms.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

            <View style={ms.section}>
              <Text style={ms.sLabel}><Ionicons name="school-outline" size={12} color={COLORS.accent} />{'  '}Class</Text>
              <View style={ms.chipRow}>
                {['FY', 'SY', 'TY'].map(c => (
                  <TouchableOpacity key={c} onPress={() => { setSessClass(c); setSessDivision(null); setSessBatch(null); }}
                    style={[ms.chip, sessClass === c && ms.chipActive]}>
                    <Text style={[ms.chipText, sessClass === c && ms.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {sessClass && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="git-branch-outline" size={12} color={COLORS.accent} />{'  '}Division</Text>
                <View style={ms.chipRow}>
                  {DIVISIONS[sessClass].map(d => (
                    <TouchableOpacity key={d} onPress={() => { setSessDivision(d); setSessBatch(null); }}
                      style={[ms.chip, sessDivision === d && ms.chipActive]}>
                      <Text style={[ms.chipText, sessDivision === d && ms.chipTextActive]}>Div {d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {sessDivision && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="layers-outline" size={12} color={COLORS.accent} />{'  '}Session Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}>
                  {['Theory', 'Lab'].map(t => (
                    <TouchableOpacity key={t} onPress={() => { setSessType(t); setSessBatch(null); }}
                      style={[ms.typeCard, sessType === t && ms.typeCardActive]}>
                      <Ionicons name={t === 'Theory' ? 'book-outline' : 'flask-outline'} size={22}
                        color={sessType === t ? COLORS.accent : COLORS.textMuted} />
                      <Text style={[ms.typeLabel, sessType === t && { color: COLORS.accent }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {sessType === 'Lab' && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="people-outline" size={12} color={COLORS.yellow} />{'  '}Batch</Text>
                <View style={ms.chipRow}>
                  {LAB_BATCHES.map(b => (
                    <TouchableOpacity key={b} onPress={() => setSessBatch(b)}
                      style={[ms.chip, sessBatch === b && { ...ms.chipActive, borderColor: COLORS.yellow, backgroundColor: COLORS.yellow + '20' }]}>
                      <Text style={[ms.chipText, sessBatch === b && { color: COLORS.yellow }]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {sessType && (sessType === 'Theory' || sessBatch) && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="library-outline" size={12} color={COLORS.accent} />{'  '}Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                  {SUBJECTS.map(sub => (
                    <TouchableOpacity key={sub} onPress={() => setSessSubject(sub)}
                      style={[ms.chip, sessSubject === sub && ms.chipActive]}>
                      <Text style={[ms.chipText, sessSubject === sub && ms.chipTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {sessSubject && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="calendar-outline" size={12} color={COLORS.accent} />{'  '}Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                    const d = new Date(); d.setDate(d.getDate() + offset);
                    const iso = d.toISOString().split('T')[0];
                    const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    const dd = d.getDate();
                    const active = sessDate === iso;
                    return (
                      <TouchableOpacity key={iso} onPress={() => setSessDate(iso)}
                        style={[ms.dateChip, active && ms.dateChipActive]}>
                        <Text style={[ms.dateDay, active && { color: COLORS.accent }]}>{offset === 0 ? 'Today' : day}</Text>
                        <Text style={[ms.dateNum, active && { color: COLORS.accent }]}>{dd}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {sessDate && sessSubject && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="time-outline" size={12} color={COLORS.accent} />{'  '}Start Time</Text>
                <View style={ms.timeGrid}>
                  {TIME_SLOTS.map(t => (
                    <TouchableOpacity key={t} onPress={() => setSessTime(t)}
                      style={[ms.timeChip, sessTime === t && ms.timeChipActive]}>
                      <Text style={[ms.timeText, sessTime === t && ms.timeTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {sessTime && (
              <View style={ms.section}>
                <Text style={ms.sLabel}><Ionicons name="hourglass-outline" size={12} color={COLORS.accent} />{'  '}Duration</Text>
                <View style={ms.chipRow}>
                  {DURATIONS.map(d => (
                    <TouchableOpacity key={d} onPress={() => setSessDuration(d)}
                      style={[ms.chip, sessDuration === d && ms.chipActive]}>
                      <Text style={[ms.chipText, sessDuration === d && ms.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {canConfirm && (
              <View style={ms.preview}>
                <Text style={ms.previewTitle}>Session Summary</Text>
                <View style={ms.previewGrid}>
                  {[
                    { icon: 'school-outline',   label: 'Class',    val: `${sessClass}-${sessDivision}${sessBatch ? ` · ${sessBatch}` : ''}` },
                    { icon: 'book-outline',      label: 'Subject',  val: sessSubject },
                    { icon: 'layers-outline',    label: 'Type',     val: sessType },
                    { icon: 'calendar-outline',  label: 'Date',     val: sessDate },
                    { icon: 'time-outline',      label: 'Time',     val: sessTime },
                    { icon: 'hourglass-outline', label: 'Duration', val: sessDuration },
                  ].map(row => (
                    <View key={row.label} style={ms.previewRow}>
                      <Ionicons name={row.icon} size={13} color={COLORS.accent} />
                      <Text style={ms.previewLabel}>{row.label}</Text>
                      <Text style={ms.previewVal}>{row.val}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </ScrollView>

          <View style={ms.footer}>
            <TouchableOpacity
              style={[ms.confirmBtn, !canConfirm && ms.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={canConfirm ? 0.8 : 1}>
              <Ionicons name="checkmark-circle" size={17} color="#fff" />
              <Text style={ms.confirmText}>Confirm Session</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1, borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  headerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.surfaceEl, alignItems: 'center', justifyContent: 'center',
  },
  section:   { marginTop: 18, gap: 8 },
  sLabel:    { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, paddingHorizontal: 20 },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl,
  },
  chipActive:     { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  chipText:       { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accent },
  typeCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 18, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl,
  },
  typeCardActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  typeLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },
  dateChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl, minWidth: 52,
  },
  dateChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  dateDay: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 3 },
  dateNum: { fontSize: 16, fontWeight: '900', color: COLORS.textSecondary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl,
  },
  timeChipActive:  { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  timeText:        { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  timeTextActive:  { color: COLORS.accent, fontWeight: '800' },
  preview: {
    marginHorizontal: 20, marginTop: 18,
    backgroundColor: COLORS.surfaceEl, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.accent + '40',
    padding: 14, gap: 4,
  },
  previewTitle: { fontSize: 12, fontWeight: '800', color: COLORS.accent, letterSpacing: 0.5, marginBottom: 8 },
  previewGrid:  { gap: 8 },
  previewRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewLabel: { fontSize: 11, color: COLORS.textSecondary, width: 66 },
  previewVal:   { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 14,
    shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  confirmBtnDisabled: { backgroundColor: COLORS.surfaceEl, shadowOpacity: 0 },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

/* ─── Step indicator ─────────────────────────────────────────────────────── */
const StepBadge = ({ num, label, done, active }) => (
  <View style={stepS.wrap}>
    <View style={[stepS.circle, done && stepS.circleDone, active && stepS.circleActive]}>
      {done
        ? <Ionicons name="checkmark" size={13} color="#fff" />
        : <Text style={stepS.num}>{num}</Text>}
    </View>
    <Text style={[stepS.label, (done || active) && stepS.labelActive]}>{label}</Text>
  </View>
);
const stepS = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 5 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceEl, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  circleDone:   { backgroundColor: COLORS.green,  borderColor: COLORS.green  },
  circleActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  num:          { fontSize: 12, fontWeight: '800', color: COLORS.textMuted },
  label:        { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
  labelActive:  { color: COLORS.textPrimary },
});

/* ─── Chip selector ──────────────────────────────────────────────────────── */
const ChipRow = ({ options, selected, onSelect, color = COLORS.accent }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 4 }}>
    {options.map(opt => {
      const active = selected === opt;
      return (
        <TouchableOpacity key={opt} onPress={() => onSelect(opt)} activeOpacity={0.75}
          style={[chip.base, active && { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[chip.text, active && { color }]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);
const chip = StyleSheet.create({
  base: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl,
  },
  text: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
});

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Attendance({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [selClass,    setSelClass]    = useState(null);
  const [selDivision, setSelDivision] = useState(null);
  const [selType,     setSelType]     = useState(null);
  const [selBatch,    setSelBatch]    = useState(null);
  const [attendance,  setAttendance]  = useState({});
  const [sessionModal,   setSessionModal]   = useState(false);
  const [activeSession,  setActiveSession]  = useState(null);
  const [sessionCreated, setSessionCreated] = useState(false);

  // ── NEW: recent sessions list & modal state ──
  const [recentSessions,     setRecentSessions]     = useState([]);
  const [recentModal,        setRecentModal]        = useState(false);
  const [selectedRecent,     setSelectedRecent]     = useState(null);

  const listFadeAnim  = useRef(new Animated.Value(0)).current;
  const listSlideAnim = useRef(new Animated.Value(30)).current;
  const scrollRef     = useRef(null);
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const slideAnim     = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSessionConfirm = (sess) => {
    setActiveSession(sess);
    setSelClass(sess.class);
    setSelDivision(sess.division);
    setSelType(sess.type);
    setSelBatch(sess.batch || null);
    const init = {};
    const students = sess.type === 'Lab' && sess.batch
      ? BATCH_STUDENTS[sess.batch] : STUDENT_POOL;
    students.forEach(s => { init[s.roll] = 'present'; });
    setAttendance(init);
    setSessionCreated(true);
    listFadeAnim.setValue(0);
    listSlideAnim.setValue(30);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(listFadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(listSlideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleClassSelect = (cls) => {
    setSelClass(cls); setSelDivision(null); setSelType(null);
    setSelBatch(null); setAttendance({}); setSessionCreated(false);
    setActiveSession(null); listFadeAnim.setValue(0);
  };
  const handleDivisionSelect = (div) => {
    setSelDivision(div); setSelType(null); setSelBatch(null);
    setAttendance({}); setSessionCreated(false);
    setActiveSession(null); listFadeAnim.setValue(0);
  };

  const toggleStatus = (roll) =>
    setAttendance(prev => ({ ...prev, [roll]: prev[roll] === 'present' ? 'absent' : 'present' }));

  const activeStudents = selType === 'Lab' && selBatch
    ? BATCH_STUDENTS[selBatch]
    : selType === 'Theory' ? STUDENT_POOL : [];

  const counts = {
    present: activeStudents.filter(s => attendance[s.roll] === 'present').length,
    absent:  activeStudents.filter(s => attendance[s.roll] === 'absent').length,
    total:   activeStudents.length,
  };

  const step = !selClass ? 1 : !selDivision ? 2 : !sessionCreated ? 3 : 4;

  // ── UPDATED: handleSubmit saves to recentSessions then resets ──
  const handleSubmit = () => {
    const newRecord = {
      id: Date.now().toString(),
      ...activeSession,
      attendance: { ...attendance },
      submittedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setRecentSessions(prev => [newRecord, ...prev.slice(0, 9)]); // keep last 10

    Alert.alert(
      '✅ Attendance Submitted',
      `${selClass}-${selDivision} ${selType}${selBatch ? ` (${selBatch})` : ''}\nPresent: ${counts.present}/${counts.total}`,
      [
        {
          text: 'New Session',
          onPress: () => {
            // ── Reset everything → back to step 1 ──
            setSelClass(null); setSelDivision(null);
            setSelType(null);  setSelBatch(null);
            setAttendance({}); setSessionCreated(false);
            setActiveSession(null); listFadeAnim.setValue(0);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          },
        },
      ],
      { cancelable: false }
    );
  };

  // ── Open recent session modal ──
  const openRecentSession = (session) => {
    setSelectedRecent(session);
    setRecentModal(true);
  };

  // ── Save modifications from RecentSessionModal ──
  const handleRecentModalClose = (updatedAttendance) => {
    if (updatedAttendance) {
      setRecentSessions(prev =>
        prev.map(s =>
          s.id === selectedRecent.id
            ? { ...s, attendance: updatedAttendance }
            : s
        )
      );
    }
    setRecentModal(false);
    setSelectedRecent(null);
  };

  const selectionLabel = () => {
    if (!selClass) return 'Select your class to begin';
    if (!selDivision) return `${selClass}  ›  Select Division`;
    if (!sessionCreated) return `${selClass}-${selDivision}  ›  Create Session`;
    return `${selClass}-${selDivision} ${selType}${selBatch ? ` · ${selBatch}` : ''}`;
  };

  return (
    <View style={s.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        ref={scrollRef}
        style={s.container}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ── */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Dashboard  ›  Attendance</Text>
              <Text style={s.screenTitle}>Attendance</Text>
              <Text style={s.screenSub}>{selectionLabel()}</Text>
            </View>
            {step === 4 && (
              <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={s.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── NEW: Recent Sessions Section ── */}
          {recentSessions.length > 0 && (
            <View style={s.recentSection}>
              <View style={s.recentHeader}>
                <View style={s.recentHeaderLeft}>
                  <Ionicons name="time-outline" size={15} color={COLORS.yellow} />
                  <Text style={s.recentTitle}>Recent Sessions</Text>
                </View>
                <Text style={s.recentCount}>{recentSessions.length} session{recentSessions.length > 1 ? 's' : ''}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingVertical: 4 }}>
                {recentSessions.map((sess) => {
                  const students = sess.type === 'Lab' && sess.batch
                    ? BATCH_STUDENTS[sess.batch] || [] : STUDENT_POOL;
                  const p = students.filter(st => sess.attendance[st.roll] === 'present').length;
                  const total = students.length;
                  const pct = total > 0 ? Math.round((p / total) * 100) : 0;

                  return (
                    <TouchableOpacity
                      key={sess.id}
                      style={s.recentCard}
                      onPress={() => openRecentSession(sess)}
                      activeOpacity={0.8}>

                      {/* Top row */}
                      <View style={s.recentCardTop}>
                        <View style={s.recentCardBadge}>
                          <Text style={s.recentCardBadgeText}>{sess.type === 'Lab' ? '🔬' : '📖'}</Text>
                        </View>
                        <View style={s.recentCardModify}>
                          <Ionicons name="pencil-outline" size={12} color={COLORS.yellow} />
                          <Text style={s.recentCardModifyText}>Modify</Text>
                        </View>
                      </View>

                      {/* Class info */}
                      <Text style={s.recentCardClass}>
                        {sess.class}-{sess.division} {sess.type}
                        {sess.batch ? ` · ${sess.batch}` : ''}
                      </Text>
                      <Text style={s.recentCardSubject}>{sess.subject}</Text>

                      {/* Attendance bar */}
                      <View style={s.recentCardBarBg}>
                        <View style={[s.recentCardBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={s.recentCardStat}>{p}/{total} present · {pct}%</Text>

                      {/* Time */}
                      <Text style={s.recentCardTime}>{sess.date} · {sess.time}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Active Session Banner ── */}
          {activeSession && (
            <View style={s.sessionBanner}>
              <View style={s.sessionBannerLeft}>
                <View style={s.sessionBannerDot} />
                <View>
                  <Text style={s.sessionBannerTitle}>
                    {activeSession.class}-{activeSession.division} · {activeSession.subject}
                    {activeSession.batch ? ` · ${activeSession.batch}` : ''}
                  </Text>
                  <Text style={s.sessionBannerSub}>
                    {activeSession.type}  ·  {activeSession.date}  ·  {activeSession.time}  ·  {activeSession.duration}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setActiveSession(null); setSelClass(null); setSelDivision(null);
                  setSelType(null); setSelBatch(null); setAttendance({});
                  setSessionCreated(false); listFadeAnim.setValue(0);
                }}
                style={s.sessionBannerClear}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step Progress ── */}
          <View style={s.stepRow}>
            <StepBadge num={1} label="Class"    done={!!selClass}     active={!selClass} />
            <View style={s.stepLine} />
            <StepBadge num={2} label="Division" done={!!selDivision}  active={!!selClass && !selDivision} />
            <View style={s.stepLine} />
            <StepBadge num={3} label="Session"  done={sessionCreated} active={!!selDivision && !sessionCreated} />
          </View>

          {/* ── STEP 1 — Class ── */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>
              <Ionicons name="school-outline" size={13} color={COLORS.accent} />  Select Class
            </Text>
            <ChipRow options={CLASS_OPTIONS} selected={selClass} onSelect={handleClassSelect} />
          </View>

          {/* ── STEP 2 — Division ── */}
          {selClass && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>
                <Ionicons name="git-branch-outline" size={13} color={COLORS.accent} />  Select Division
              </Text>
              <ChipRow options={DIVISIONS[selClass]} selected={selDivision} onSelect={handleDivisionSelect} />
            </View>
          )}

          {/* ── STEP 3 — Create Session CTA ── */}
          {selDivision && !sessionCreated && (
            <View style={[s.sectionBlock, { alignItems: 'center', paddingTop: 8, paddingBottom: 4 }]}>
              <View style={s.createSessionCta}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.accent} />
                <Text style={s.createSessionCtaTitle}>Ready to take attendance?</Text>
                <Text style={s.createSessionCtaSub}>
                  Fill in session details — type, subject, time & duration — then the student list will appear.
                </Text>
                <TouchableOpacity style={s.createSessionCtaBtn} onPress={() => setSessionModal(true)} activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={s.createSessionCtaBtnText}>Create Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 4 — Student attendance list ── */}
          {sessionCreated && activeStudents.length > 0 && (
            <Animated.View style={{ opacity: listFadeAnim, transform: [{ translateY: listSlideAnim }] }}>
              <View style={s.sessionReadyBadge}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.green} />
                <Text style={s.sessionReadyText}>Session created — student list loaded</Text>
              </View>

              <View style={s.summaryRow}>
                {[
                  { label: 'Present', count: counts.present, color: COLORS.green,  bg: 'rgba(34,197,94,0.15)'  },
                  { label: 'Absent',  count: counts.absent,  color: COLORS.red,    bg: 'rgba(244,63,94,0.15)'  },
                  { label: 'Total',   count: counts.total,   color: COLORS.accent, bg: 'rgba(34,211,238,0.12)' },
                ].map((item, i) => (
                  <View key={i} style={[s.summaryCard, { backgroundColor: item.bg, borderColor: item.color + '40' }]}>
                    <Text style={[s.summaryCount, { color: item.color }]}>{item.count}</Text>
                    <Text style={[s.summaryLabel, { color: item.color + 'CC' }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.card, s.mx]}>
                <Text style={s.cardTitle}>Mark Today's Attendance</Text>
                {activeStudents.map((student, i) => {
                  const isPresent = attendance[student.roll] === 'present';
                  return (
                    <View key={student.roll} style={[
                      s.studentRow,
                      i < activeStudents.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
                    ]}>
                      <View style={[s.studentAvatar, {
                        backgroundColor: isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                        borderColor: isPresent ? COLORS.green + '50' : COLORS.red + '50', borderWidth: 1,
                      }]}>
                        <Text style={[s.studentAvatarText, { color: isPresent ? COLORS.green : COLORS.red }]}>
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.studentName}>{student.name}</Text>
                        <Text style={s.studentMeta}>
                          {selClass}{selDivision}-{student.roll}
                          {selBatch ? `  ·  ${selBatch}` : ''}{'  ·  '}{student.avg}% avg
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleStatus(student.roll)}
                        activeOpacity={0.75}
                        style={[s.toggleBtn, isPresent
                          ? { backgroundColor: COLORS.green, borderColor: COLORS.green }
                          : { backgroundColor: COLORS.red,   borderColor: COLORS.red   }]}>
                        <Ionicons name={isPresent ? 'checkmark' : 'close'} size={16} color="#fff" />
                        <Text style={s.toggleBtnText}>{isPresent ? 'Present' : 'Absent'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── Modals ── */}
      <CreateSessionModal
        visible={sessionModal}
        onClose={() => setSessionModal(false)}
        onConfirm={handleSessionConfirm}
        initialClass={selClass}
        initialDivision={selDivision}
      />

      <RecentSessionModal
        visible={recentModal}
        onClose={handleRecentModalClose}
        session={selectedRecent}
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const CARD_BASE = {
  backgroundColor: COLORS.surface,
  borderRadius: 16, borderWidth: 1,
  borderColor: COLORS.border, padding: 16, marginBottom: 14,
};

const s = StyleSheet.create({
  wrapper:   { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  mx:        { marginHorizontal: 20 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, gap: 12,
  },
  headerWide: { alignItems: 'center' },
  breadcrumb:  { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, fontFamily: FONTS.heading, marginBottom: 2 },
  screenSub:   { fontSize: 13, color: COLORS.textSecondary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* ── Recent Sessions ── */
  recentSection: { marginBottom: 16 },
  recentHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  recentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  recentCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  recentCard: {
    width: 180,
    backgroundColor: COLORS.surfaceEl,
    borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, gap: 5,
  },
  recentCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  recentCardBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  recentCardBadgeText: { fontSize: 15 },
  recentCardModify: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.yellow + '40',
  },
  recentCardModifyText: { fontSize: 10, fontWeight: '700', color: COLORS.yellow },
  recentCardClass: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  recentCardSubject: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  recentCardBarBg: {
    height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  recentCardBarFill: {
    height: '100%', borderRadius: 2,
    backgroundColor: COLORS.green,
  },
  recentCardStat: { fontSize: 11, fontWeight: '700', color: COLORS.green, marginTop: 2 },
  recentCardTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  sessionBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.accentSoft, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.accent + '50',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  sessionBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sessionBannerDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.accent, shadowColor: COLORS.accent, shadowOpacity: 0.8, shadowRadius: 4,
  },
  sessionBannerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  sessionBannerSub:   { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sessionBannerClear: { padding: 4 },

  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 4 },
  stepLine: { flex: 1, height: 1, backgroundColor: COLORS.border, marginBottom: 14 },

  sectionBlock: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 8,
  },

  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
  summaryCount: { fontSize: 24, fontWeight: '900', fontFamily: FONTS.heading },
  summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  card:      { ...CARD_BASE },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },

  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  studentMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  sessionReadyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.green + '50',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  sessionReadyText: { fontSize: 13, fontWeight: '700', color: COLORS.green },

  createSessionCta: {
    marginHorizontal: 20, backgroundColor: COLORS.accentSoft,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.accent + '40',
    padding: 24, alignItems: 'center', gap: 10, width: '100%',
  },
  createSessionCtaTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  createSessionCtaSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  createSessionCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, marginTop: 4,
    shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  createSessionCtaBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, minWidth: 88, justifyContent: 'center',
  },
  toggleBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});