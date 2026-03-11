// Screens/Teachers/AssignmentScreen.js
// Fully responsive — live backend — Year / Division / Subdivision + Description + Date & Time
// ✅ Year, Division, Subject fetched from timetable API (same as Attendance screen)

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Cross-platform alert helper ───────────────────────────────────────── */
// On web: window.confirm (for confirm dialogs) / window.alert (for info)
// On native: React Native Alert
const showAlert = (title, message, buttons = []) => {
  if (Platform.OS === 'web') {
    // buttons = [{ text, style, onPress }]
    const confirmBtn  = buttons.find(b => b.style !== 'cancel');
    const hasConfirm  = buttons.length > 1 && confirmBtn;
    if (hasConfirm) {
      const msg = [title, message].filter(Boolean).join('\n\n');
      if (window.confirm(msg)) confirmBtn?.onPress?.();
    } else {
      window.alert([title, message].filter(Boolean).join('\n\n'));
      const anyBtn = buttons.find(b => b.style !== 'cancel' && b.style !== 'destructive');
      anyBtn?.onPress?.();
    }
  } else {
    showAlert(title, message, buttons.length ? buttons : undefined);
  }
};

/* ─── Colors ─────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:          '#0B0E1C',
  surface:     '#111827',
  surfaceEl:   '#1A2236',
  card:        '#141D2E',
  border:      '#1E2A40',
  borderDash:  '#2A3650',
  accent:      '#3B6EF5',
  accentSoft:  'rgba(59,110,245,0.15)',
  green:       '#22C55E',
  greenSoft:   'rgba(34,197,94,0.15)',
  yellow:      '#F59E0B',
  yellowSoft:  'rgba(245,158,11,0.15)',
  red:         '#EF4444',
  redSoft:     'rgba(239,68,68,0.15)',
  purple:      '#8B5CF6',
  purpleSoft:  'rgba(139,92,246,0.15)',
  teal:        '#14B8A6',
  tealSoft:    'rgba(20,184,166,0.15)',
  orange:      '#F97316',
  orangeSoft:  'rgba(249,115,22,0.15)',
  textPri:     '#EEF2FF',
  textSec:     '#8B96B2',
  textMuted:   '#3D4A6A',
  white:       '#FFFFFF',
};
const C_LIGHT = {
  bg:          '#F1F4FD',
  surface:     '#FFFFFF',
  surfaceEl:   '#EAEEf9',
  card:        '#FFFFFF',
  border:      '#DDE3F4',
  borderDash:  '#CBD5E1',
  accent:      '#2563EB',
  accentSoft:  'rgba(37,99,235,0.09)',
  green:       '#059669',
  greenSoft:   'rgba(5,150,105,0.10)',
  yellow:      '#D97706',
  yellowSoft:  'rgba(217,119,6,0.10)',
  red:         '#DC2626',
  redSoft:     'rgba(220,38,38,0.10)',
  purple:      '#7C3AED',
  purpleSoft:  'rgba(124,58,237,0.10)',
  teal:        '#0D9488',
  tealSoft:    'rgba(13,148,136,0.10)',
  orange:      '#EA580C',
  orangeSoft:  'rgba(234,88,12,0.10)',
  textPri:     '#0F172A',
  textSec:     '#4B5563',
  textMuted:   '#9CA3AF',
  white:       '#FFFFFF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Year accent colors (for chips — not tied to hardcoded structure) ─── */
const YEAR_COLORS = (C) => ({
  FY: { color: C.accent,  bg: C.accentSoft  },
  SY: { color: C.teal,    bg: C.tealSoft    },
  TY: { color: C.purple,  bg: C.purpleSoft  },
});

const STATUS_META_FN = (C) => ({
  ACTIVE:   { color: C.green,     bg: C.greenSoft,           label: 'Active'   },
  APPROVED: { color: C.teal,      bg: C.tealSoft,            label: 'Approved' },
  CLOSED:   { color: C.textMuted, bg: 'rgba(61,74,106,0.3)', label: 'Closed'   },
});

const STATUSES = ['All Statuses', 'ACTIVE', 'APPROVED', 'CLOSED'];

/* ─── Helper: format backend document ───────────────────────────────────── */
const fmt = (a) => ({
  id:           a._id,
  status:       a.status,
  title:        a.title,
  subject:      a.subject,
  unit:         a.unit        || 'General',
  description:  a.description || '',
  year:         a.year        || null,
  division:     a.division    || null,
  subdivision:  a.subdivision || null,
  submitted:    a.submissions?.length ?? 0,
  total:        a.total       ?? 30,
  dueDate:      a.dueDate     || 'TBD',
  dueTime:      a.dueTime     || null,
  tag:          a.tag         || null,
  approved:     a.approved    || false,
  submissions: (a.submissions || []).map(s => ({
    name:        s.name,
    roll:        s.roll || '',
    submittedAt: s.submittedAt
      ? new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
  })),
});

/* ─────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────── */

/* ── Progress bar ── */
const ProgressBar = ({ submitted, total, status }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const pct    = Math.min(100, Math.round((submitted / total) * 100));
  const barClr = status === 'APPROVED' ? C.teal : status === 'CLOSED' ? C.textMuted : C.accent;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: barClr, textAlign: 'right', marginBottom: 5 }}>{submitted} / {total}</Text>
      <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barClr, borderRadius: 3 }} />
      </View>
    </View>
  );
};

/* ── Submissions modal ── */
const SubmissionsModal = ({ visible, assignment, onClose }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const mo = makeMo(C);
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
                <View style={mo.avatar}><Text style={mo.avatarText}>{sub.name.split(' ').map(n => n[0]).join('')}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={mo.name}>{sub.name}</Text>
                  <Text style={mo.meta}>{sub.roll} · Submitted {sub.submittedAt}</Text>
                </View>
                <View style={mo.checkDot}><Ionicons name="checkmark" size={13} color={C.green} /></View>
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
const makeMo = (C) => StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header:     { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title:      { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 3 },
  sub:        { fontSize: 12, color: C.textSec },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  avatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.accent },
  name:       { fontSize: 13, fontWeight: '700', color: C.textPri },
  meta:       { fontSize: 11, color: C.textSec, marginTop: 1 },
  checkDot:   { width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green + '60', alignItems: 'center', justifyContent: 'center' },
});

/* ── Shared modal shell styles ── */
const makeEm = (C) => StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '95%' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  titleCol:       { flex: 1 },
  title:          { fontSize: 17, fontWeight: '800', color: C.textPri },
  titleSub:       { fontSize: 11, color: C.textSec, marginTop: 2 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  section:        { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  divider:        { height: 1, backgroundColor: C.border, marginHorizontal: 20, marginVertical: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionIcon:    { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionLabel:   { fontSize: 12, fontWeight: '800', color: C.textPri, letterSpacing: 0.3 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 6, letterSpacing: 0.3 },
  input:          { backgroundColor: C.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textPri },
  textarea:       { backgroundColor: C.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textPri, minHeight: 88, textAlignVertical: 'top' },
  btnRow:         { flexDirection: 'row', gap: 10, padding: 20, paddingTop: 12 },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl, alignItems: 'center' },
  cancelText:     { fontSize: 14, fontWeight: '700', color: C.textSec },
  saveBtn:        { flex: 1.5, paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  saveText:       { fontSize: 14, fontWeight: '700', color: C.white },
  // Chip styles for timetable picker inside modals
  configLabel:    { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 0.6, marginBottom: 10 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:           { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl },
  chipActive:     { borderColor: C.accent, backgroundColor: C.accentSoft },
  chipText:       { fontSize: 13, fontWeight: '700', color: C.textSec },
  chipTextActive: { color: C.accent },
  placeholderTxt: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', paddingVertical: 6 },
});

/* ── Compact Calendar + Time Picker ─────────────────────────────────────── */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES   = ['S','M','T','W','T','F','S'];
const TIME_SLOTS  = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','04:00 PM','06:00 PM','08:00 PM'];

// AFTER
const DateTimePicker = ({ onDateChange, onTimeChange, initialDate, initialTime }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;

  const today = new Date();
  today.setHours(0,0,0,0);

  const parsedInit = React.useMemo(() => {
    if (!initialDate || initialDate === 'TBD') return null;
    const d = new Date(initialDate);
    if (isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, [initialDate]);

const [viewYear,  setViewYear]  = useState(parsedInit?.year  ?? today.getFullYear());
const [viewMonth, setViewMonth] = useState(parsedInit?.month ?? today.getMonth());
const [selDay,    setSelDay]    = useState(parsedInit?.day   ?? null);
const [selTime,   setSelTime]   = useState(initialTime || null);

useEffect(() => {
  if (parsedInit) {
    setViewYear(parsedInit.year);
    setViewMonth(parsedInit.month);
    setSelDay(parsedInit.day);
  } else {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelDay(null);
  }
  setSelTime(initialTime || null);
}, [initialDate, initialTime]);

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const goNext = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y=>y+1)) : setViewMonth(m=>m+1);
  const goPrev = () => {
    const prevIsBeforeToday = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (prevIsBeforeToday) return; // don't go to past months
    viewMonth === 0 ? (setViewMonth(11), setViewYear(y=>y-1)) : setViewMonth(m=>m-1);
  };

const isExistingDate = (d) => d === parsedInit?.day && viewMonth === parsedInit?.month && viewYear === parsedInit?.year;
const isPast = (d) => d && new Date(viewYear, viewMonth, d) < today && !isExistingDate(d);

const pickDay = (d) => {
  if (!d) return;
  const picked = new Date(viewYear, viewMonth, d);
  if (picked < today && !isExistingDate(d)) return;  // ← allow existing date
  setSelDay(d);
  onDateChange(`${MONTH_SHORT[viewMonth]} ${String(d).padStart(2,'0')}, ${viewYear}`);
};


  const isToday    = (d) => d && new Date(viewYear, viewMonth, d).getTime() === today.getTime();
  const isSelected = (d) => d === selDay;

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  return (
    <View style={{ gap: 8 }}>
      {/* Calendar card */}
      <View style={{ backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10 }}>
        {/* Nav row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={goPrev} disabled={!canGoPrev}
            style={{ padding: 4, opacity: canGoPrev ? 1 : 0.25 }}>
            <Ionicons name="chevron-back" size={14} color={C.textPri} />
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.textPri }}>
            {MONTH_SHORT[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={goNext} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={14} color={C.textPri} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          {DAY_NAMES.map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '700', color: C.textMuted }}>{d}</Text>
          ))}
        </View>

        {/* Date grid */}
        {Array.from({ length: cells.length / 7 }, (_, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {cells.slice(ri*7, ri*7+7).map((d, ci) => {
              const sel  = isSelected(d);
              const tod  = isToday(d);
              const past = isPast(d);
              return (
                <TouchableOpacity key={ci} onPress={() => pickDay(d)} disabled={!d || past}
                  style={{ flex: 1, height: 28, alignItems: 'center', justifyContent: 'center', margin: 1,
                    borderRadius: 6,
                    backgroundColor: sel ? C.accent : 'transparent',
                    borderWidth: tod && !sel ? 1 : 0,
                    borderColor: C.accent,
                  }}>
                  <Text style={{
                    fontSize: 11, fontWeight: sel ? '800' : '500',
                    color: sel ? '#fff' : tod ? C.accent : past ? C.textMuted : C.textPri,
                    opacity: (!d || past) ? 0.3 : 1,
                  }}>{d || ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Time chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TIME_SLOTS.map(t => (
          <TouchableOpacity key={t} onPress={() => { setSelTime(t); onTimeChange(t); }}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
              borderColor: selTime === t ? C.teal : C.border,
              backgroundColor: selTime === t ? C.tealSoft : C.surfaceEl }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: selTime === t ? C.teal : C.textMuted }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      {(selDay || selTime) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: C.accentSoft, borderRadius: 8, borderWidth: 1,
          borderColor: C.accent + '40', paddingHorizontal: 10, paddingVertical: 6 }}>
          <Ionicons name="calendar-outline" size={12} color={C.accent} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.accent }}>
            {selDay ? `${MONTH_SHORT[viewMonth]} ${String(selDay).padStart(2,'0')}, ${viewYear}` : '—'}
            {selTime ? `  ·  ${selTime}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   TimetableAcademicPicker
   Replaces the old hardcoded AcademicPicker.
   Receives already-fetched timetableData + derived options from parent.
   Renders Year → Division → Subject chips, same pattern as Attendance.
────────────────────────────────────────────────────────────────────────── */
const TimetableAcademicPicker = ({
  timetableData,
  classOptions,
  divisionOptions,
  subjectOptions,
  year, division, subject,
  onYearChange, onDivisionChange, onSubjectChange,
  accentColors,
}) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const em = makeEm(C);

  // Derive filtered subjects for the current year+division selection
  const filteredSubjects = React.useMemo(() => {
    if (year && division && timetableData.length > 0) {
      const subs = [...new Set(
        timetableData
          .filter(item => item.year === year && item.division === division)
          .map(item => item.subject)
      )].sort();
      return subs.length > 0 ? subs : subjectOptions;
    }
    return subjectOptions;
  }, [year, division, timetableData, subjectOptions]);

  const yearMeta = accentColors[year] || { color: C.accent, bg: C.accentSoft };

  return (
    <View style={{ gap: 16 }}>
      {/* Step indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {['Year', 'Division', 'Subject'].map((lbl, i) => {
          const done = i === 0 ? !!year : i === 1 ? !!division : !!subject;
          return (
            <React.Fragment key={lbl}>
              {i > 0 && <View style={{ flex: 1, height: 1.5, backgroundColor: done ? C.green : C.border, marginHorizontal: 6, marginBottom: 14 }} />}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: done ? C.green : C.card,
                  borderWidth: 1.5,
                  borderColor: done ? C.green : (i === 0 || (i === 1 && !!year) || (i === 2 && !!division)) ? (yearMeta.color) : C.border,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <Ionicons name="checkmark" size={10} color="#fff" />
                    : <Text style={{ fontSize: 10, fontWeight: '800', color: C.textMuted }}>{i + 1}</Text>
                  }
                </View>
                <Text style={{ fontSize: 9, fontWeight: '700', color: done ? C.textPri : C.textMuted }}>{lbl}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* Year */}
      <View>
        <Text style={em.configLabel}>Class (Year)</Text>
        <View style={em.chipRow}>
          {classOptions.length > 0 ? classOptions.map(c => {
            const meta = accentColors[c] || { color: C.accent, bg: C.accentSoft };
            return (
              <TouchableOpacity key={c}
                onPress={() => { onYearChange(year === c ? null : c); onDivisionChange(null); onSubjectChange(null); }}
                style={[em.chip, year === c && { borderColor: meta.color, backgroundColor: meta.bg }]}>
                <Text style={[em.chipText, year === c && { color: meta.color }]}>{c}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={em.placeholderTxt}>Loading…</Text>}
        </View>
      </View>

      {/* Division */}
      <View>
        <Text style={em.configLabel}>Division</Text>
        <View style={em.chipRow}>
          {year ? (
            (divisionOptions[year] || []).map(d => (
              <TouchableOpacity key={d}
                onPress={() => { onDivisionChange(division === d ? null : d); onSubjectChange(null); }}
                style={[em.chip, division === d && { borderColor: C.teal, backgroundColor: C.tealSoft }]}>
                <Text style={[em.chipText, division === d && { color: C.teal }]}>Div {d}</Text>
              </TouchableOpacity>
            ))
          ) : <Text style={em.placeholderTxt}>Select a class first</Text>}
        </View>
      </View>

      {/* Subject */}
      <View>
        <Text style={em.configLabel}>Subject</Text>
        <View style={em.chipRow}>
          {year && division ? (
            filteredSubjects.length > 0 ? filteredSubjects.map(sub => (
              <TouchableOpacity key={sub}
                onPress={() => onSubjectChange(subject === sub ? null : sub)}
                style={[em.chip, subject === sub && em.chipActive]}>
                <Text style={[em.chipText, subject === sub && em.chipTextActive]}>{sub}</Text>
              </TouchableOpacity>
            )) : <Text style={em.placeholderTxt}>No subjects found</Text>
          ) : <Text style={em.placeholderTxt}>Select class and division first</Text>}
        </View>
      </View>

      {/* Active badge */}
      {year && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenSoft, borderRadius: 10, borderWidth: 1, borderColor: C.green + '40', paddingHorizontal: 12, paddingVertical: 9 }}>
          <Ionicons name="school-outline" size={13} color={C.green} />
          <Text style={{ flex: 1, fontSize: 12, color: C.textSec }}>
            {year}{division ? `  ›  Div ${division}` : ''}{subject ? `  ›  ${subject}` : ''}
          </Text>
          <TouchableOpacity onPress={() => { onYearChange(null); onDivisionChange(null); onSubjectChange(null); }}
            style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={11} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/* ── Edit Modal ── */
const EditModal = ({ visible, assignment, onClose, onSave, saving, timetableData, classOptions, divisionOptions, subjectOptions, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const em = makeEm(C);
  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState(null);
  const [unit,        setUnit]        = useState('');
  const [description, setDescription] = useState('');
  const [dueDate,     setDueDate]     = useState('TBD');
  const [dueTime,     setDueTime]     = useState('');
  const [year,        setYear]        = useState(null);
  const [division,    setDivision]    = useState(null);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title || '');
      setSubject(assignment.subject || null);
      setUnit(assignment.unit || '');
      setDescription(assignment.description || '');
      setDueDate(assignment.dueDate || 'TBD');
      setDueTime(assignment.dueTime || '');
      setYear(assignment.year || null);
      setDivision(assignment.division || null);
    }
  }, [assignment]);

  if (!assignment) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <View style={em.titleCol}>
              <Text style={em.title}>Edit Assignment</Text>
              <Text style={em.titleSub}>Update the details below</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>

            {/* Basic info */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.accentSoft }]}>
                  <Ionicons name="document-text-outline" size={14} color={C.accent} />
                </View>
                <Text style={em.sectionLabel}>Basic Information</Text>
              </View>
              <View><Text style={em.fieldLabel}>Title *</Text><TextInput style={em.input} value={title} onChangeText={setTitle} placeholderTextColor={C.textMuted} /></View>
              <View><Text style={em.fieldLabel}>Unit / Topic</Text><TextInput style={em.input} value={unit} onChangeText={setUnit} placeholderTextColor={C.textMuted} /></View>
              <View>
                <Text style={em.fieldLabel}>Description</Text>
                <TextInput style={em.textarea} value={description} onChangeText={setDescription}
                  placeholder="Objectives, instructions, requirements…" placeholderTextColor={C.textMuted} multiline numberOfLines={4} />
              </View>
            </View>

            <View style={em.divider} />

            {/* Target class — timetable-driven */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.purpleSoft }]}>
                  <Ionicons name="school-outline" size={14} color={C.purple} />
                </View>
                <Text style={em.sectionLabel}>Target Class & Subject</Text>
              </View>
              <TimetableAcademicPicker
                timetableData={timetableData}
                classOptions={classOptions}
                divisionOptions={divisionOptions}
                subjectOptions={subjectOptions}
                year={year} division={division} subject={subject}
                onYearChange={setYear} onDivisionChange={setDivision} onSubjectChange={setSubject}
                accentColors={accentColors}
              />
            </View>

            <View style={em.divider} />

            {/* Date & time */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.yellowSoft }]}>
                  <Ionicons name="calendar-outline" size={14} color={C.yellow} />
                </View>
                <Text style={em.sectionLabel}>Due Date & Time</Text>
              </View>
              <DateTimePicker
  onDateChange={setDueDate}
  onTimeChange={setDueTime}
  initialDate={dueDate}
  initialTime={dueTime}
/>
            </View>

            <View style={em.btnRow}>
              <TouchableOpacity style={em.cancelBtn} onPress={onClose}><Text style={em.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[em.saveBtn, saving && { opacity: 0.6 }]} disabled={saving}
                onPress={() => onSave(assignment.id, { title, subject, unit, description, dueDate, dueTime, year, division })}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ── New Assignment Modal ── */
const NewAssignmentModal = ({ visible, onClose, onCreate, creating, defaultYear, defaultDivision, timetableData, classOptions, divisionOptions, subjectOptions, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const em = makeEm(C);
  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState(null);
  const [unit,        setUnit]        = useState('');
  const [description, setDescription] = useState('');
  const [year,        setYear]        = useState(null);
  const [division,    setDivision]    = useState(null);
  const [dueDate,     setDueDate]     = useState('TBD');
  const [dueTime,     setDueTime]     = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle(''); setSubject(null); setUnit(''); setDescription('');
      setYear(null); setDivision(null);
    }
  }, [visible]);

  useEffect(() => { setYear(defaultYear || null); },     [defaultYear]);
  useEffect(() => { setDivision(defaultDivision || null); }, [defaultDivision]);

  const handleCreate = () => {
    if (!title.trim())   { showAlert('Required', 'Please fill in the title.');               return; }
    if (!year || !division) { showAlert('Required', 'Please select Year and Division.');     return; }
    if (!subject)           { showAlert('Required', 'Please select a subject.');             return; }
    onCreate({ title, subject, unit, description, year, division, dueDate, dueTime });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <View style={em.titleCol}>
              <Text style={em.title}>New Assignment</Text>
              <Text style={em.titleSub}>Fill in all details below</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}><Ionicons name="close" size={18} color={C.textSec} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>

            {/* Basic info */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.accentSoft }]}>
                  <Ionicons name="document-text-outline" size={14} color={C.accent} />
                </View>
                <Text style={em.sectionLabel}>Assignment Details</Text>
              </View>
              <View><Text style={em.fieldLabel}>Title *</Text><TextInput style={em.input} value={title} onChangeText={setTitle} placeholder="e.g. Mid-term Calculus Quiz" placeholderTextColor={C.textMuted} /></View>
              <View><Text style={em.fieldLabel}>Unit / Topic</Text><TextInput style={em.input} value={unit} onChangeText={setUnit} placeholder="e.g. Unit 4: Integrals" placeholderTextColor={C.textMuted} /></View>
              <View>
                <Text style={em.fieldLabel}>Description</Text>
                <TextInput style={em.textarea} value={description} onChangeText={setDescription}
                  placeholder="Objectives, instructions, requirements…" placeholderTextColor={C.textMuted} multiline numberOfLines={4} />
              </View>
            </View>

            <View style={em.divider} />

            {/* Target class & subject — timetable-driven */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.purpleSoft }]}>
                  <Ionicons name="school-outline" size={14} color={C.purple} />
                </View>
                <Text style={em.sectionLabel}>Target Class & Subject *</Text>
              </View>
              <TimetableAcademicPicker
                timetableData={timetableData}
                classOptions={classOptions}
                divisionOptions={divisionOptions}
                subjectOptions={subjectOptions}
                year={year} division={division} subject={subject}
                onYearChange={setYear} onDivisionChange={setDivision} onSubjectChange={setSubject}
                accentColors={accentColors}
              />
            </View>

            <View style={em.divider} />

            {/* Date & time */}
            <View style={em.section}>
              <View style={em.sectionHeading}>
                <View style={[em.sectionIcon, { backgroundColor: C.yellowSoft }]}>
                  <Ionicons name="calendar-outline" size={14} color={C.yellow} />
                </View>
                <Text style={em.sectionLabel}>Due Date & Time</Text>
              </View>
              <DateTimePicker onDateChange={setDueDate} onTimeChange={setDueTime} />
            </View>

            <View style={em.btnRow}>
              <TouchableOpacity style={em.cancelBtn} onPress={onClose}><Text style={em.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[em.saveBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveText}>Create Assignment</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ── Assignment Card ── */
const AssignmentCard = ({ item, onEdit, onView, onApprove, onDelete, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const cd = makeCd(C);
  const STATUS_META = STATUS_META_FN(C);
  const meta     = STATUS_META[item.status] ?? STATUS_META.ACTIVE;
  const yearMeta = item.year ? (accentColors[item.year] || { color: C.accent, bg: C.accentSoft }) : null;
  const [expanded, setExpanded] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  return (
    <View style={cd.wrap}>
      <View style={cd.topRow}>
        <View style={[cd.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[cd.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {item.year && (
          <View style={[cd.yearPill, { backgroundColor: yearMeta?.bg || C.accentSoft, borderColor: (yearMeta?.color || C.accent) + '60' }]}>
            <Text style={[cd.yearText, { color: yearMeta?.color || C.accent }]}>
              {item.year}{item.division ? `-${item.division}` : ''}
            </Text>
          </View>
        )}
        <View>
          <TouchableOpacity style={cd.menuBtn} activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS === 'web') {
                setMenuOpen(o => !o);
              } else {
                showAlert(item.title, 'Options', [
                  { text: 'Edit',   onPress: onEdit },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }
            }}>
            <Ionicons name="ellipsis-vertical" size={16} color={C.textMuted} />
          </TouchableOpacity>
          {menuOpen && Platform.OS === 'web' && (
            <View style={cd.dropMenu}>
              <TouchableOpacity style={cd.dropItem} onPress={() => { setMenuOpen(false); onEdit(); }}>
                <Ionicons name="create-outline" size={13} color={C.textPri} />
                <Text style={cd.dropItemTxt}>Edit</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: C.border }} />
              <TouchableOpacity style={cd.dropItem} onPress={() => { setMenuOpen(false); onDelete(); }}>
                <Ionicons name="trash-outline" size={13} color={C.red} />
                <Text style={[cd.dropItemTxt, { color: C.red }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Text style={cd.title}>{item.title}</Text>
      <Text style={cd.subject}>{item.subject}{item.unit !== 'General' ? ` · ${item.unit}` : ''}</Text>

      {item.description ? (
        <TouchableOpacity onPress={() => setExpanded(p => !p)} activeOpacity={0.85} style={cd.descBox}>
          <Text style={cd.descText} numberOfLines={expanded ? undefined : 2}>{item.description}</Text>
          <View style={cd.descToggle}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={11} color={C.textMuted} />
            <Text style={cd.descToggleTxt}>{expanded ? 'Show less' : 'Read more'}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <Text style={cd.progressLabel}>Submissions</Text>
      <ProgressBar submitted={item.submitted} total={item.total} status={item.status} />

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

      <View style={cd.actions}>
        {item.status !== 'APPROVED' && (
          <TouchableOpacity style={cd.btnOutline} onPress={onEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color={C.textPri} />
            <Text style={cd.btnOutlineText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[cd.btnFilled, item.status === 'APPROVED' && { backgroundColor: C.teal, shadowColor: C.teal }]}
          onPress={onView} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={13} color={C.white} />
          <Text style={cd.btnFilledText}>View Submissions</Text>
        </TouchableOpacity>
        {item.submitted === item.total && item.status === 'ACTIVE' && (
          <TouchableOpacity style={cd.btnApprove} onPress={onApprove} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle-outline" size={13} color={C.white} />
            <Text style={cd.btnFilledText}>Approve</Text>
          </TouchableOpacity>
        )}
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
const makeCd = (C) => StyleSheet.create({
  wrap:           { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, flex: 1 },
  topRow:         { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  yearPill:       { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  yearText:       { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  menuBtn:        { marginLeft: 'auto', padding: 4 },
  dropMenu:       { position: 'absolute', top: 28, right: 0, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, zIndex: 99, minWidth: 130, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  dropItem:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  dropItemTxt:    { fontSize: 13, fontWeight: '700', color: C.textPri },
  title:          { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 4, lineHeight: 22 },
  subject:        { fontSize: 12, color: C.textSec, marginBottom: 10 },
  descBox:        { backgroundColor: C.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, marginBottom: 12 },
  descText:       { fontSize: 12, color: C.textSec, lineHeight: 18 },
  descToggle:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  descToggleTxt:  { fontSize: 10, color: C.textMuted, fontWeight: '600' },
  progressLabel:  { fontSize: 11, color: C.textSec, marginBottom: 4 },
  metaRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:       { fontSize: 11, color: C.textMuted },
  tagPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText:        { fontSize: 11, fontWeight: '700' },
  actions:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnOutline:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl, minWidth: 70 },
  btnOutlineText: { fontSize: 13, fontWeight: '700', color: C.textPri },
  btnFilled:      { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: C.accent, minWidth: 110, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnFilledText:  { fontSize: 13, fontWeight: '700', color: C.white },
  btnApprove:     { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: C.green, shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4, marginTop: 4 },
  approvedBadge:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: C.tealSoft, borderWidth: 1, borderColor: C.teal + '50' },
});

/* ── Create placeholder card ── */
const CreateCard = ({ onPress }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const cr = makeCr(C);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={cr.wrap}>
      <View style={cr.iconWrap}><Ionicons name="add-circle-outline" size={36} color={C.textMuted} /></View>
      <Text style={cr.title}>Create Assignment</Text>
      <Text style={cr.sub}>Draft a new task or project{'\n'}for your students</Text>
    </TouchableOpacity>
  );
};
const makeCr = (C) => StyleSheet.create({
  wrap:     { flex: 1, borderRadius: 16, borderWidth: 2, borderColor: C.borderDash, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, minHeight: 200 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:    { fontSize: 16, fontWeight: '800', color: C.textPri },
  sub:      { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════════════ */
export default function AssignmentScreen() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const STATUS_META = STATUS_META_FN(C);
  const s = makeS(C);
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;
  const colCount   = width >= 1024 ? 3 : isWide ? 2 : 1;

  // ── Timetable-derived options (same pattern as Attendance) ──
  const [timetableData,    setTimetableData]    = useState([]);
  const [classOptions,     setClassOptions]     = useState([]);
  const [divisionOptions,  setDivisionOptions]  = useState({});
  const [subjectOptions,   setSubjectOptions]   = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // ── Outer filter state ──
  const [selYear,   setSelYear]   = useState(null);
  const [selDiv,    setSelDiv]    = useState(null);
  const [selSubject, setSelSubject] = useState(null); // null = "all"

  // Subjects visible for the current year+division filter
  const filteredOuterSubjects = React.useMemo(() => {
    if (selYear && selDiv && timetableData.length > 0) {
      const subs = [...new Set(
        timetableData
          .filter(item => item.year === selYear && item.division === selDiv)
          .map(item => item.subject)
      )].sort();
      return subs.length > 0 ? subs : subjectOptions;
    }
    return subjectOptions;
  }, [selYear, selDiv, timetableData, subjectOptions]);

  const [assignments,  setAssignments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [selStatus,    setSelStatus]    = useState('All Statuses');
  const [showFilters,  setShowFilters]  = useState(false);

  // Modals
  const [viewModal,   setViewModal]   = useState(false);
  const [editModal,   setEditModal]   = useState(false);
  const [newModal,    setNewModal]    = useState(false);
  const [activeItem,  setActiveItem]  = useState(null);
  const [teacherId,   setTeacherId]   = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  /* ── Accent colors per year key (dynamic, fallback palette) ── */
  const accentColors = React.useMemo(() => {
    const palette = [
      { color: C.accent, bg: C.accentSoft },
      { color: C.teal,   bg: C.tealSoft   },
      { color: C.purple, bg: C.purpleSoft },
      { color: C.orange, bg: C.orangeSoft },
    ];
    const map = {};
    classOptions.forEach((yr, i) => { map[yr] = palette[i % palette.length]; });
    return map;
  }, [classOptions, C]);

  /* ── Fetch timetable options (same as Attendance) ── */
  const fetchTimetableOptions = useCallback(async (tId) => {
    if (!tId) return;
    setTimetableLoading(true);
    try {
      const res  = await axiosInstance.get(`/timetable/teacher/${tId}`);
      const data = res.data?.data || [];
      setTimetableData(data);

      const years = [...new Set(data.map(item => item.year))].sort();
      setClassOptions(years);

      const divs = {};
      years.forEach(year => {
        divs[year] = [...new Set(data.filter(item => item.year === year).map(item => item.division))].sort();
      });
      setDivisionOptions(divs);

      const subjects = [...new Set(data.map(item => item.subject))].sort();
      setSubjectOptions(subjects);
    } catch (error) {
      console.error('Failed to fetch timetable options:', error);
      // Fallback: leave options empty — user can still type subject manually in modals
      setTimetableData([]);
      setClassOptions([]);
      setDivisionOptions({});
      setSubjectOptions([]);
    } finally {
      setTimetableLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    (async () => {
      const id = await AsyncStorage.getItem('teacherId');
      setTeacherId(id);
      await fetchTimetableOptions(id);
      fetchAssignments(id);
    })();
  }, []);

  const fetchAssignments = useCallback(async (tId, opts = {}) => {
    try {
      const params = {};
      if (tId)           params.teacherId  = tId;
      if (opts.year)     params.year       = opts.year;
      if (opts.division) params.division   = opts.division;
      if (opts.subject)  params.subject    = opts.subject;
      const res = await axiosInstance.get('/assignments', { params });
      if (res.data.success) setAssignments(res.data.data.map(fmt));
    } catch (err) { console.warn('fetchAssignments:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(teacherId, {
      year:     selYear    || undefined,
      division: selDiv     || undefined,
      subject:  selSubject || undefined,
    });
  };

  // Re-fetch when outer filters change
  useEffect(() => {
    if (teacherId !== null) {
      fetchAssignments(teacherId, {
        year:     selYear    || undefined,
        division: selDiv     || undefined,
        subject:  selSubject || undefined,
      });
    }
  }, [selYear, selDiv, selSubject]);

  // Cascade resets
  const pickYear    = (v) => { setSelYear(v); setSelDiv(null); setSelSubject(null); };
  const pickDiv     = (v) => { setSelDiv(v);  setSelSubject(null); };
  const pickSubject = (v) => setSelSubject(v);

  // CRUD
  const handleEdit    = (item) => { setActiveItem(item); setEditModal(true); };
  const handleView    = (item) => { setActiveItem(item); setViewModal(true); };

  const handleApprove = (item) => {
    if (item.status === 'APPROVED') { showAlert('Already Approved'); return; }
    showAlert('Approve Assignment', `Approve "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try {
          const res = await axiosInstance.patch(`/assignments/${item.id}/approve`);
          if (res.data.success) setAssignments(prev => prev.map(a => a.id === item.id ? fmt(res.data.data) : a));
        } catch { showAlert('Error', 'Failed to approve.'); }
      }},
    ]);
  };

  const handleDelete = (item) => {
    showAlert('Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await axiosInstance.delete(`/assignments/${item.id}`);
          setAssignments(prev => prev.filter(a => a.id !== item.id));
        } catch { showAlert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const handleSaveEdit = async (id, changes) => {
    setSaving(true);
    try {
      const res = await axiosInstance.put(`/assignments/${id}`, {
        title:       changes.title,
        subject:     changes.subject,
        unit:        changes.unit        || '',
        description: changes.description || '',
        dueDate:     changes.dueDate     || 'TBD',
        dueTime:     changes.dueTime     || '',
        year:        changes.year,
        division:    changes.division,
      });
      if (res.data.success) {
        setAssignments(prev => prev.map(a => a.id === id ? fmt(res.data.data) : a));
        setEditModal(false);
      }
    } catch { showAlert('Error', 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleCreate = async (data) => {
    setCreating(true);
    try {
      const payload = {
        title:       data.title,
        subject:     data.subject,
        unit:        data.unit        || '',
        description: data.description || '',
        dueDate:     data.dueDate     || 'TBD',
        dueTime:     data.dueTime     || '',
        year:        data.year,
        division:    data.division,
        teacherId,
      };
      const res = await axiosInstance.post('/assignments', payload);
      if (res.data.success) {
        setAssignments(prev => [fmt(res.data.data), ...prev]);
        setNewModal(false);
        showAlert('✅ Created', `"${data.title}" created.`);
      }
    } catch { showAlert('Error', 'Failed to create.'); }
    finally { setCreating(false); }
  };

  // Client-side filter (search + status only; year/div/subject handled server-side)
  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return (a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q))
        && (selStatus === 'All Statuses' || a.status === selStatus);
  });

  const rows = [];
  for (let i = 0; i < filtered.length; i += colCount) rows.push(filtered.slice(i, i + colCount));
  const showCreate = selStatus === 'All Statuses' && search === '';

  // KPIs
  const kpis = [
    { label: 'Active',           value: assignments.filter(a => a.status === 'ACTIVE').length,                                icon: 'clipboard-outline',        color: C.accent,  bg: C.accentSoft  },
    { label: 'Pending Approval', value: assignments.filter(a => a.status === 'ACTIVE' && a.submitted === a.total).length,    icon: 'hourglass-outline',        color: C.yellow,  bg: C.yellowSoft  },
    { label: 'Approved',         value: assignments.filter(a => a.status === 'APPROVED').length,                              icon: 'checkmark-circle-outline', color: C.teal,    bg: C.tealSoft    },
    { label: 'Total',            value: assignments.length,                                                                    icon: 'albums-outline',           color: C.purple,  bg: C.purpleSoft  },
  ];

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={{ color: C.textSec, marginTop: 14, fontSize: 14 }}>Loading assignments…</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <SubmissionsModal visible={viewModal} assignment={activeItem} onClose={() => setViewModal(false)} />
      <EditModal
        visible={editModal} assignment={activeItem} onClose={() => setEditModal(false)}
        onSave={handleSaveEdit} saving={saving}
        timetableData={timetableData} classOptions={classOptions}
        divisionOptions={divisionOptions} subjectOptions={subjectOptions}
        accentColors={accentColors}
      />
      <NewAssignmentModal
        visible={newModal} onClose={() => setNewModal(false)}
        onCreate={handleCreate} creating={creating}
        defaultYear={selYear} defaultDivision={selDiv}
        timetableData={timetableData} classOptions={classOptions}
        divisionOptions={divisionOptions} subjectOptions={subjectOptions}
        accentColors={accentColors}
      />

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 52 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ── */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>Assignment Dashboard</Text>
              <Text style={s.pageSub}>
                {selYear && selDiv
                  ? `${selYear} · Div ${selDiv}${selSubject ? ` · ${selSubject}` : ''}`
                  : selYear ? `${selYear} · Select a division`
                  : 'Select year & division to filter'}
              </Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity style={s.bellBtn}><Ionicons name="notifications-outline" size={20} color={C.textPri} /></TouchableOpacity>
              <TouchableOpacity style={s.newBtn} onPress={() => setNewModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color={C.white} />
                <Text style={s.newBtnText}>New Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Timetable-driven Academic Selector ── */}
          <View style={s.pickerPanel}>
            {timetableLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={{ fontSize: 13, color: C.textSec }}>Loading your timetable…</Text>
              </View>
            ) : (
              <>
                {/* Step indicator */}
                <View style={s.pickerSteps}>
                  {['Year', 'Division', 'Subject'].map((lbl, i) => {
                    const done = i === 0 ? !!selYear : i === 1 ? !!selDiv : !!selSubject;
                    const yearMeta = accentColors[selYear] || { color: C.accent };
                    return (
                      <React.Fragment key={lbl}>
                        {i > 0 && <View style={[s.stepLine, done && { backgroundColor: C.green }]} />}
                        <View style={s.stepItem}>
                          <View style={[s.stepDot, done && { backgroundColor: C.green, borderColor: C.green },
                            !done && (i === 0 || (i === 1 && !!selYear) || (i === 2 && !!selDiv)) && { borderColor: yearMeta.color }]}>
                            {done ? <Ionicons name="checkmark" size={10} color="#fff" /> : <Text style={s.stepNum}>{i + 1}</Text>}
                          </View>
                          <Text style={[s.stepLabel, done && { color: C.textPri }]}>{lbl}</Text>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* Year chips */}
                <View style={s.pickerSection}>
                  <Text style={s.pickerSectionLabel}>
                    <Ionicons name="school-outline" size={11} color={C.accent} />{'  '}Select Year
                  </Text>
                  {classOptions.length > 0 ? (
                    <View style={s.chipRowWide}>
                      {classOptions.map(key => {
                        const meta = accentColors[key] || { color: C.accent, bg: C.accentSoft };
                        return (
                          <TouchableOpacity key={key} onPress={() => pickYear(selYear === key ? null : key)} activeOpacity={0.8}
                            style={[s.yearChip, selYear === key && { backgroundColor: meta.bg, borderColor: meta.color }]}>
                            <Text style={[s.yearChipAbr,  selYear === key && { color: meta.color }]}>{key}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={s.placeholderTxt}>No timetable data found</Text>
                  )}
                </View>

                {/* Division chips */}
                {selYear && (
                  <View style={s.pickerSection}>
                    <Text style={s.pickerSectionLabel}>
                      <Ionicons name="git-branch-outline" size={11} color={C.teal} />{'  '}Division
                    </Text>
                    <View style={s.chipRowWide}>
                      {(divisionOptions[selYear] || []).map(d => (
                        <TouchableOpacity key={d} onPress={() => pickDiv(selDiv === d ? null : d)} activeOpacity={0.8}
                          style={[s.divChip, selDiv === d && { backgroundColor: C.tealSoft, borderColor: C.teal }]}>
                          <Text style={[s.divChipText, selDiv === d && { color: C.teal }]}>Div {d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Subject chips (filtered by year+division from timetable) */}
                {selYear && selDiv && (
                  <View style={s.pickerSection}>
                    <Text style={s.pickerSectionLabel}>
                      <Ionicons name="book-outline" size={11} color={C.purple} />{'  '}Subject (optional)
                    </Text>
                    <View style={s.chipRowWide}>
                      {filteredOuterSubjects.length > 0 ? filteredOuterSubjects.map(sub => (
                        <TouchableOpacity key={sub} onPress={() => pickSubject(selSubject === sub ? null : sub)} activeOpacity={0.8}
                          style={[s.subChip, selSubject === sub && { backgroundColor: C.purpleSoft, borderColor: C.purple }]}>
                          <Text style={[s.subChipText, selSubject === sub && { color: C.purple }]}>{sub}</Text>
                        </TouchableOpacity>
                      )) : (
                        <Text style={s.placeholderTxt}>No subjects found for this class</Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Active filter badge */}
                {selYear && (
                  <View style={s.filterBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={C.green} />
                    <Text style={s.filterBadgeTxt}>
                      {selYear}
                      {selDiv     ? <Text style={{ color: C.teal,   fontWeight: '800' }}>  ›  Div {selDiv}</Text>  : null}
                      {selSubject ? <Text style={{ color: C.purple, fontWeight: '800' }}>  ›  {selSubject}</Text>  : null}
                    </Text>
                    <TouchableOpacity onPress={() => pickYear(null)} style={s.filterBadgeClear}>
                      <Ionicons name="close" size={11} color={C.textMuted} />
                      <Text style={s.filterBadgeClearTxt}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── KPI Cards ── */}
          {isWide ? (
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
                  <View style={[s.kpiAccentLine, { backgroundColor: k.color }]} />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.kpiScrollContent} style={s.kpiScroll}>
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

          {/* ── Search + Status filter ── */}
          <View style={[s.filterBar, isWide && s.filterBarWide]}>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput style={s.searchInput} placeholder="Search assignments…" placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch} />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={15} color={C.textMuted} /></TouchableOpacity>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
              <TouchableOpacity style={s.dropdown} onPress={() => setShowFilters(p => !p)}>
                <Text style={s.dropdownText}>{selStatus}</Text>
                <Ionicons name="chevron-down" size={13} color={C.textSec} />
              </TouchableOpacity>
              <TouchableOpacity style={s.moreBtn} onPress={() => setShowFilters(p => !p)}>
                <Ionicons name="options-outline" size={14} color={C.textSec} />
                <Text style={s.moreBtnText}>Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {showFilters && (
            <View style={s.filterExpanded}>
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

          {/* ── Grid ── */}
          <View style={s.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={[s.gridRow, isWide && { flexDirection: 'row', gap: 14 }]}>
                {row.map(item => (
                  <View key={item.id} style={[s.gridCell, isWide && { flex: 1 }]}>
                    <AssignmentCard
                      item={item}
                      onEdit={() => handleEdit(item)} onView={() => handleView(item)}
                      onApprove={() => handleApprove(item)} onDelete={() => handleDelete(item)}
                      accentColors={accentColors}
                    />
                  </View>
                ))}
                {ri === rows.length - 1 && row.length < colCount && (
                  <>
                    {showCreate && <View style={[s.gridCell, isWide && { flex: 1 }]}><CreateCard onPress={() => setNewModal(true)} /></View>}
                    {Array.from({ length: colCount - row.length - (showCreate ? 1 : 0) }).map((_, ei) => isWide ? <View key={ei} style={{ flex: 1 }} /> : null)}
                  </>
                )}
              </View>
            ))}
            {showCreate && filtered.length % colCount === 0 && (
              <View style={[s.gridRow, isWide && { flexDirection: 'row', gap: 14 }]}>
                <View style={[s.gridCell, isWide && { flex: 1 }]}><CreateCard onPress={() => setNewModal(true)} /></View>
                {isWide && Array.from({ length: colCount - 1 }).map((_, ei) => <View key={ei} style={{ flex: 1 }} />)}
              </View>
            )}
          </View>

          {filtered.length === 0 && !loading && (
            <View style={s.emptyState}>
              <Ionicons name="search" size={44} color={C.textMuted} />
              <Text style={s.emptyTitle}>No assignments found</Text>
              <Text style={s.emptySub}>Try adjusting your search or filters</Text>
            </View>
          )}

          <Text style={s.footer}>© 2024 UniVerse Educational Systems. All Rights Reserved.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeS = (C) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header:        { padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, gap: 14, marginBottom: 4 },
  headerWide:    { flexDirection: 'row', alignItems: 'center' },
  pageTitle:     { fontSize: 26, fontWeight: '800', color: C.textPri, fontFamily: SERIF, marginBottom: 4 },
  pageSub:       { fontSize: 13, color: C.textSec },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn:       { width: 42, height: 42, borderRadius: 12, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  newBtn:        { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  newBtnText:    { fontSize: 13, fontWeight: '700', color: C.white },

  pickerPanel:        { marginHorizontal: 20, marginBottom: 18, backgroundColor: C.surfaceEl, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 16 },
  pickerSteps:        { flexDirection: 'row', alignItems: 'center' },
  stepItem:           { alignItems: 'center', gap: 4 },
  stepLine:           { flex: 1, height: 1.5, backgroundColor: C.border, marginHorizontal: 6, marginBottom: 14 },
  stepDot:            { width: 22, height: 22, borderRadius: 11, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepNum:            { fontSize: 10, fontWeight: '800', color: C.textMuted },
  stepLabel:          { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.3 },
  pickerSection:      { gap: 8 },
  pickerSectionLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, letterSpacing: 0.4 },
  chipRowWide:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  placeholderTxt:     { fontSize: 12, color: C.textMuted, fontStyle: 'italic', paddingVertical: 6 },

  yearChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', minWidth: 72 },
  yearChipAbr:  { fontSize: 17, fontWeight: '900', color: C.textMuted, fontFamily: SERIF },
  divChip:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, minWidth: 76, alignItems: 'center' },
  divChipText:  { fontSize: 13, fontWeight: '700', color: C.textMuted },
  subChip:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center' },
  subChipText:  { fontSize: 12, fontWeight: '700', color: C.textMuted },

  filterBadge:         { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenSoft, borderRadius: 10, borderWidth: 1, borderColor: C.green + '40', paddingHorizontal: 12, paddingVertical: 9 },
  filterBadgeTxt:      { flex: 1, fontSize: 12, color: C.textSec },
  filterBadgeClear:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border },
  filterBadgeClearTxt: { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  kpiRow:           { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 18 },
  kpiCardWide:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, overflow: 'hidden' },
  kpiCardInner:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  kpiIconWrap:      { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kpiAccentLine:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, opacity: 0.6 },
  kpiScroll:        { marginBottom: 18 },
  kpiScrollContent: { gap: 12, paddingHorizontal: 20, paddingVertical: 2 },
  kpiCardMobile:    { width: 130, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, overflow: 'hidden' },
  kpiLabel:         { fontSize: 12, color: C.textSec, marginBottom: 2 },
  kpiVal:           { fontSize: 28, fontWeight: '900', fontFamily: SERIF },

  filterBar:      { paddingHorizontal: 20, gap: 10, marginBottom: 6 },
  filterBarWide:  { flexDirection: 'row', alignItems: 'center' },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  searchInput:    { flex: 1, fontSize: 14, color: C.textPri },
  dropdown:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  dropdownText:   { fontSize: 13, fontWeight: '600', color: C.textSec, maxWidth: 100 },
  moreBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 11 },
  moreBtnText:    { fontSize: 13, fontWeight: '600', color: C.textSec },
  filterExpanded: { marginHorizontal: 20, marginBottom: 14, backgroundColor: C.surfaceEl, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  filterSection:  { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  filterPill:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterPillText: { fontSize: 12, fontWeight: '700', color: C.textSec },

  grid:       { paddingHorizontal: 16, gap: 14, marginTop: 10 },
  gridRow:    { gap: 14 },
  gridCell:   {},
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textSec },
  emptySub:   { fontSize: 13, color: C.textMuted },
  footer:     { textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 24, paddingHorizontal: 20 },
});