// Screens/Teachers/TeacherExamScreen.js
// Teacher Marks Entry — CAT 1 / CAT 2 / FET  |  Dark & Light via ThemeContext

import React, { useState, useRef, useEffect,createContext, useContext, useCallback  } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, StatusBar, Animated, useWindowDimensions,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';




const DARK = {
  mode:            'dark',
  // backgrounds
  bg:              '#0B0E1A',
  surface:         '#131929',
  surfaceEl:       '#1A2235',
  card:            '#151C2E',
  border:          '#1E2740',
  // accent / brand
  accent:          '#5B5FEF',
  accentSoft:      'rgba(91,95,239,0.18)',
  accentBright:    '#6C6FF5',
  // semantic colours
  green:           '#22C55E',
  greenSoft:       'rgba(34,197,94,0.15)',
  yellow:          '#FBBF24',
  yellowSoft:      'rgba(251,191,36,0.15)',
  red:             '#F43F5E',
  redSoft:         'rgba(244,63,94,0.15)',
  blue:            '#3B82F6',
  blueSoft:        'rgba(59,130,246,0.15)',
  cyan:            '#06B6D4',
  cyanSoft:        'rgba(6,182,212,0.15)',
  orange:          '#F97316',
  orangeSoft:      'rgba(249,115,22,0.15)',
  purple:          '#A855F7',
  purpleSoft:      'rgba(168,85,247,0.15)',
  // text
  textPrimary:     '#EEF2FF',
  textSec:         '#8B96BE',
  textMuted:       '#3D4A6A',
  white:           '#FFFFFF',
  // MainDash extras
  nowBg:           '#1C2B1E',
  nowText:         '#4ADE80',
  nowBorder:       'rgba(34,197,94,0.30)',
  doubtCardBg:     '#0F1336',
  doubtCardBorder: 'rgba(91,95,239,0.40)',
  barSecondary:    '#2A3260',
  notifUnread:     'rgba(91,95,239,0.06)',
  reviewBtnBg:     '#FFFFFF',
  reviewBtnColor:  '#0B0E1A',
  toggleBg:        '#1A2235',
  toggleBorder:    '#2A3260',
  toggleIconColor: '#FBBF24',
  shadowColor:     '#000000',
  shadowOpacity:   0,
  statusBar:       'light-content',
  // Sidebar
  sidebarBg:            '#0f0f23',
  sidebarBorder:        'rgba(99,102,241,0.15)',
  sidebarActiveBg:      'rgba(99,102,241,0.14)',
  sidebarActiveBorder:  '#6366f1',
  sidebarNavText:       '#64748b',
  sidebarNavTextActive: '#a5b4fc',
  sidebarLogoBg:        '#6366f1',
  topBarBg:             '#0f0f23',
  topBarBorder:         'rgba(99,102,241,0.2)',
  hamburgerColor:       '#a5b4fc',
  screenBg:             '#0d0d20',
  appBg:                '#080818',
  userNameColor:        '#e2e8f0',
  userRoleColor:        '#475569',
  logoTextColor:        '#e2e8f0',
};


 const LIGHT = {
  mode:            'light',
  // backgrounds
  bg:              '#F1F4FD',
  surface:         '#FFFFFF',
  surfaceEl:       '#EAEEf9',
  card:            '#FFFFFF',
  border:          '#DDE3F4',
  // accent / brand
  accent:          '#4A4EE8',
  accentSoft:      'rgba(74,78,232,0.09)',
  accentBright:    '#4A4EE8',
  // semantic colours
  green:           '#16A34A',
  greenSoft:       'rgba(22,163,74,0.10)',
  yellow:          '#D97706',
  yellowSoft:      'rgba(217,119,6,0.10)',
  red:             '#DC2626',
  redSoft:         'rgba(220,38,38,0.10)',
  blue:            '#2563EB',
  blueSoft:        'rgba(37,99,235,0.09)',
  cyan:            '#0891B2',
  cyanSoft:        'rgba(8,145,178,0.09)',
  orange:          '#EA580C',
  orangeSoft:      'rgba(234,88,12,0.09)',
  purple:          '#7C3AED',
  purpleSoft:      'rgba(124,58,237,0.09)',
  // text
  textPrimary:     '#0F172A',
  textSec:         '#4B5563',
  textMuted:       '#9CA3AF',
  white:           '#FFFFFF',
  // MainDash extras
  nowBg:           '#F0FDF4',
  nowText:         '#15803D',
  nowBorder:       'rgba(22,163,74,0.22)',
  doubtCardBg:     '#EDEEFF',
  doubtCardBorder: 'rgba(74,78,232,0.28)',
  barSecondary:    '#CBD1F4',
  notifUnread:     'rgba(74,78,232,0.05)',
  reviewBtnBg:     '#4A4EE8',
  reviewBtnColor:  '#FFFFFF',
  toggleBg:        '#E8EBFF',
  toggleBorder:    '#C5CAF5',
  toggleIconColor: '#4A4EE8',
  shadowColor:     '#8492B4',
  shadowOpacity:   0.08,
  statusBar:       'dark-content',
  // Sidebar
  sidebarBg:            '#FFFFFF',
  sidebarBorder:        '#E2E8F5',
  sidebarActiveBg:      'rgba(74,78,232,0.08)',
  sidebarActiveBorder:  '#4A4EE8',
  sidebarNavText:       '#64748B',
  sidebarNavTextActive: '#4A4EE8',
  sidebarLogoBg:        '#4A4EE8',
  topBarBg:             '#FFFFFF',
  topBarBorder:         '#E2E8F5',
  hamburgerColor:       '#4A4EE8',
  screenBg:             '#F1F4FD',
  appBg:                '#E8ECF8',
  userNameColor:        '#0F172A',
  userRoleColor:        '#64748B',
  logoTextColor:        '#0F172A',
};


const ThemeContext = createContext({
  theme:       DARK,
  isDark:      true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = useCallback(() => setIsDark(v => !v), []);
  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}


export function useTheme() {
  return useContext(ThemeContext);
}

/* ─── Static Config ──────────────────────────────────────────────────────── */
const DIVISIONS  = ['A', 'B', 'C', 'D'];
const TYPES      = ['Theory', 'Lab'];
const EXAM_TYPES = ['CAT 1', 'CAT 2', 'FET'];

// Max marks per exam × type
const MAX_MARKS = {
  'CAT 1': { Theory: 20, Lab: 25 },
  'CAT 2': { Theory: 20, Lab: 25 },
  'FET':   { Theory: 60, Lab: 50 },
};

// Subjects per type
const SUBJECTS = {
  Theory: [
    { code: 'CS101', name: 'Advanced Mathematics' },
    { code: 'CS102', name: 'Quantum Physics' },
    { code: 'CS103', name: 'Programming in Python' },
    { code: 'CS104', name: 'Database Systems' },
    { code: 'CS105', name: 'Data Structures & Algorithms' },
  ],
  Lab: [
    { code: 'CSL101', name: 'Python Lab' },
    { code: 'CSL102', name: 'Database Lab' },
    { code: 'CSL103', name: 'Network Lab' },
  ],
};

// Mock student lists per division
const STUDENTS_BY_DIV = {
  A: [
    { id: 'STU-001', name: 'Aarav Mehta',    rollNo: 'A01' },
    { id: 'STU-002', name: 'Priya Sharma',   rollNo: 'A02' },
    { id: 'STU-003', name: 'Riya Desai',     rollNo: 'A03' },
    { id: 'STU-004', name: 'Karan Patel',    rollNo: 'A04' },
    { id: 'STU-005', name: 'Sneha Joshi',    rollNo: 'A05' },
    { id: 'STU-006', name: 'Aryan Singh',    rollNo: 'A06' },
  ],
  B: [
    { id: 'STU-007', name: 'Liam Johnson',   rollNo: 'B01' },
    { id: 'STU-008', name: 'Emma Davis',     rollNo: 'B02' },
    { id: 'STU-009', name: 'Noah Wilson',    rollNo: 'B03' },
    { id: 'STU-010', name: 'Olivia Brown',   rollNo: 'B04' },
    { id: 'STU-011', name: 'James Taylor',   rollNo: 'B05' },
  ],
  C: [
    { id: 'STU-012', name: 'Sofia Nair',     rollNo: 'C01' },
    { id: 'STU-013', name: 'Aditya Kumar',   rollNo: 'C02' },
    { id: 'STU-014', name: 'Pooja Verma',    rollNo: 'C03' },
    { id: 'STU-015', name: 'Raj Khanna',     rollNo: 'C04' },
  ],
  D: [
    { id: 'STU-016', name: 'Chen Wei',       rollNo: 'D01' },
    { id: 'STU-017', name: 'Hana Tanaka',    rollNo: 'D02' },
    { id: 'STU-018', name: 'Ali Hassan',     rollNo: 'D03' },
    { id: 'STU-019', name: 'Sara López',     rollNo: 'D04' },
    { id: 'STU-020', name: 'David Osei',     rollNo: 'D05' },
    { id: 'STU-021', name: 'Mia Rossi',      rollNo: 'D06' },
    { id: 'STU-022', name: 'Yuki Yamamoto',  rollNo: 'D07' },
  ],
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const isValidMark = (val, max) => {
  if (val === '' || val === 'AB') return true; // blank or absent
  const n = Number(val);
  return !isNaN(n) && n >= 0 && n <= max;
};

const getMarkColor = (val, max, T) => {
  if (val === '' || val === 'AB') return T.textMuted;
  const pct = Number(val) / max;
  if (pct >= 0.8) return T.green;
  if (pct >= 0.5) return T.yellow;
  return T.red;
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function TeacherExamScreen() {
  const navigation = useNavigation();
  const { theme: T, isDark, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  /* ── Selection state ── */
  const [division,  setDivision]  = useState(null);
  const [examType,  setExamType]  = useState(null);
  const [classType, setClassType] = useState(null);
  const [subject,   setSubject]   = useState(null);

  /* ── Marks state: { [studentId]: markValue } ── */
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);

  /* ── Derived ── */
  const students    = division ? STUDENTS_BY_DIV[division] : [];
  const subjectList = classType ? SUBJECTS[classType] : [];
  const maxMark     = examType && classType ? MAX_MARKS[examType][classType] : 0;
  const allSelected = division && examType && classType && subject;

  /* ── Entrance animation ── */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── Reset when selections change ── */
  useEffect(() => { setMarks({}); setSaved(false); }, [division, examType, classType, subject]);
  useEffect(() => { setSubject(null); }, [classType]);

  /* ── Handlers ── */
  const updateMark = (studentId, val) => {
    setMarks(p => ({ ...p, [studentId]: val }));
    setSaved(false);
  };

  const markAbsent = (studentId) => {
    setMarks(p => ({ ...p, [studentId]: 'AB' }));
    setSaved(false);
  };

  const handleSave = () => {
    // Validate
    for (const stu of students) {
      const val = marks[stu.id] ?? '';
      if (val === '') continue; // blank = not entered yet (warn but allow partial save)
      if (!isValidMark(val, maxMark)) {
        Alert.alert('Invalid Mark', `Mark for ${stu.name} must be 0–${maxMark} or "AB" for absent.`);
        return;
      }
    }
    setSaved(true);
    Alert.alert('Saved!', `Marks for Section ${division} — ${examType} (${classType}) saved successfully.`);
  };

  /* ── Completion stats ── */
  const entered    = students.filter(s => (marks[s.id] ?? '') !== '').length;
  const absent     = students.filter(s => marks[s.id] === 'AB').length;
  const pctDone    = students.length ? Math.round((entered / students.length) * 100) : 0;

  /* ── Shadow helper ── */
  const shadow = {
    shadowColor:   T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 3 },
    elevation:     isDark ? 0 : 3,
  };

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ══ HEADER ═════════════════════════════════════════════════ */}
            <View style={[s.headerRow, isWide && s.headerRowWide]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.pageTitle, { color: T.textPrimary }]}>Exam Marks Entry</Text>
                <Text style={[s.pageSub,   { color: T.textSec }]}>
                  Enter student marks • CAT 1 / CAT 2 / FET
                </Text>
              </View>
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: T.toggleBg, borderColor: T.toggleBorder }]}
                onPress={toggleTheme}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={T.toggleIconColor} />
              </TouchableOpacity>
            </View>

            {/* ══ FILTER SECTION ══════════════════════════════════════════ */}
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
              <View style={s.cardLabelRow}>
                <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                  <Ionicons name="options-outline" size={14} color={T.accentBright} />
                </View>
                <Text style={[s.cardLabel, { color: T.textPrimary }]}>Select Filters</Text>
              </View>

              {/* Row 1: Exam Type */}
              <Text style={[s.filterTitle, { color: T.textSec }]}>Exam Type</Text>
              <View style={s.chipRow}>
                {EXAM_TYPES.map(et => {
                  const active = examType === et;
                  return (
                    <TouchableOpacity
                      key={et}
                      style={[s.chip,
                        active
                          ? { backgroundColor: T.accent, borderColor: T.accent }
                          : { backgroundColor: T.surfaceEl, borderColor: T.border }
                      ]}
                      onPress={() => setExamType(et)}
                      activeOpacity={0.75}>
                      <Text style={[s.chipText, { color: active ? '#fff' : T.textSec }]}>{et}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Row 2: Division */}
              <Text style={[s.filterTitle, { color: T.textSec }]}>Class Division</Text>
              <View style={s.chipRow}>
                {DIVISIONS.map(div => {
                  const active = division === div;
                  return (
                    <TouchableOpacity
                      key={div}
                      style={[s.chip,
                        active
                          ? { backgroundColor: T.accent, borderColor: T.accent }
                          : { backgroundColor: T.surfaceEl, borderColor: T.border }
                      ]}
                      onPress={() => setDivision(div)}
                      activeOpacity={0.75}>
                      <Text style={[s.chipText, { color: active ? '#fff' : T.textSec }]}>
                        Section {div}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Row 3: Theory / Lab */}
              <Text style={[s.filterTitle, { color: T.textSec }]}>Exam Mode</Text>
              <View style={s.chipRow}>
                {TYPES.map(tp => {
                  const active = classType === tp;
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[s.chip,
                        active
                          ? { backgroundColor: T.accent, borderColor: T.accent }
                          : { backgroundColor: T.surfaceEl, borderColor: T.border }
                      ]}
                      onPress={() => setClassType(tp)}
                      activeOpacity={0.75}>
                      <Ionicons
                        name={tp === 'Theory' ? 'book-outline' : 'flask-outline'}
                        size={13}
                        color={active ? '#fff' : T.textSec}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[s.chipText, { color: active ? '#fff' : T.textSec }]}>{tp}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Row 4: Subject (depends on classType) */}
              {classType && (
                <>
                  <Text style={[s.filterTitle, { color: T.textSec }]}>Subject</Text>
                  <View style={s.subjectList}>
                    {subjectList.map(sub => {
                      const active = subject?.code === sub.code;
                      return (
                        <TouchableOpacity
                          key={sub.code}
                          style={[s.subjectChip,
                            active
                              ? { backgroundColor: T.accentSoft, borderColor: T.accent }
                              : { backgroundColor: T.surfaceEl, borderColor: T.border }
                          ]}
                          onPress={() => setSubject(sub)}
                          activeOpacity={0.75}>
                          <Text style={[s.subjectCode, { color: active ? T.accentBright : T.textMuted }]}>
                            {sub.code}
                          </Text>
                          <Text style={[s.subjectName, { color: active ? T.textPrimary : T.textSec }]}>
                            {sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {/* ══ MARKS TABLE ═════════════════════════════════════════════ */}
            {allSelected ? (
              <>
                {/* Info Banner */}
                <View style={[s.infoBanner, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bannerTitle, { color: T.textPrimary }]}>
                      {subject.code} — {subject.name}
                    </Text>
                    <Text style={[s.bannerSub, { color: T.textSec }]}>
                      Section {division}  •  {classType}  •  {examType}  •  Max: {maxMark} marks
                    </Text>
                  </View>
                  {/* Progress pill */}
                  <View style={[s.progressPill, { backgroundColor: isDark ? T.surfaceEl : '#fff', borderColor: T.border }]}>
                    <Text style={[s.progressText, { color: T.accentBright }]}>
                      {entered}/{students.length} entered
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={[s.progressBarBg, { backgroundColor: T.border }]}>
                  <Animated.View style={[s.progressBarFill, {
                    backgroundColor: T.accentBright,
                    width: `${pctDone}%`,
                  }]} />
                </View>

                {/* Table Header */}
                <View style={[s.tableHeader, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
                  <Text style={[s.thRoll,    { color: T.textMuted }]}>ROLL</Text>
                  <Text style={[s.thName,    { color: T.textMuted }]}>STUDENT NAME</Text>
                  <Text style={[s.thMarks,   { color: T.textMuted }]}>MARKS / {maxMark}</Text>
                  <Text style={[s.thAbsent,  { color: T.textMuted }]}>ABSENT</Text>
                </View>

                {/* Student Rows */}
                <View style={[s.tableBody, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                  {students.map((stu, idx) => {
                    const val     = marks[stu.id] ?? '';
                    const isAbsent = val === 'AB';
                    const isError  = val !== '' && val !== 'AB' && !isValidMark(val, maxMark);
                    const markCol  = isError ? T.red : getMarkColor(val, maxMark, T);

                    return (
                      <View
                        key={stu.id}
                        style={[
                          s.tableRow,
                          { borderTopColor: T.border },
                          idx % 2 === 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.018)' },
                          isAbsent && { backgroundColor: isDark ? 'rgba(244,63,94,0.05)' : 'rgba(244,63,94,0.04)' },
                        ]}>

                        {/* Roll No */}
                        <View style={s.cellRoll}>
                          <View style={[s.rollBadge, { backgroundColor: T.accentSoft }]}>
                            <Text style={[s.rollText, { color: T.accentBright }]}>{stu.rollNo}</Text>
                          </View>
                        </View>

                        {/* Name */}
                        <View style={s.cellName}>
                          <Text style={[s.stuName, { color: isAbsent ? T.textMuted : T.textPrimary }]}
                            numberOfLines={1}>
                            {stu.name}
                          </Text>
                          <Text style={[s.stuId, { color: T.textMuted }]}>{stu.id}</Text>
                        </View>

                        {/* Marks Input */}
                        <View style={s.cellMarks}>
                          {isAbsent ? (
                            <View style={[s.absentBadge, { backgroundColor: 'rgba(244,63,94,0.12)', borderColor: T.red + '55' }]}>
                              <Text style={[s.absentBadgeText, { color: T.red }]}>ABSENT</Text>
                            </View>
                          ) : (
                            <TextInput
                              style={[s.markInput, {
                                backgroundColor: T.surfaceEl,
                                borderColor: isError ? T.red : (val !== '' ? T.accent + '88' : T.border),
                                color: markCol,
                              }]}
                              value={val}
                              onChangeText={text => updateMark(stu.id, text)}
                              keyboardType="numeric"
                              placeholder="—"
                              placeholderTextColor={T.textMuted}
                              maxLength={3}
                              returnKeyType="next"
                            />
                          )}
                        </View>

                        {/* Absent Toggle */}
                        <View style={s.cellAbsent}>
                          <TouchableOpacity
                            style={[s.absentBtn,
                              isAbsent
                                ? { backgroundColor: T.red,        borderColor: T.red }
                                : { backgroundColor: T.surfaceEl,  borderColor: T.border }
                            ]}
                            onPress={() => {
                              if (isAbsent) {
                                updateMark(stu.id, '');
                              } else {
                                markAbsent(stu.id);
                              }
                            }}
                            activeOpacity={0.75}>
                            <Ionicons
                              name={isAbsent ? 'close' : 'person-remove-outline'}
                              size={14}
                              color={isAbsent ? '#fff' : T.textSec}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* ── Stats Row ── */}
                <View style={s.statsRow}>
                  <View style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                    <Text style={[s.statVal, { color: T.accentBright }]}>{students.length}</Text>
                    <Text style={[s.statLbl, { color: T.textSec }]}>Total</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                    <Text style={[s.statVal, { color: T.green }]}>{entered - absent}</Text>
                    <Text style={[s.statLbl, { color: T.textSec }]}>Entered</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                    <Text style={[s.statVal, { color: T.red }]}>{absent}</Text>
                    <Text style={[s.statLbl, { color: T.textSec }]}>Absent</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                    <Text style={[s.statVal, { color: T.yellow }]}>{students.length - entered}</Text>
                    <Text style={[s.statLbl, { color: T.textSec }]}>Pending</Text>
                  </View>
                </View>

                {/* ── Save Button ── */}
                <TouchableOpacity
                  style={[s.saveBtn,
                    saved
                      ? { backgroundColor: T.green,  borderColor: T.green }
                      : { backgroundColor: T.accent,  borderColor: T.accent },
                    { shadowColor: T.accent, shadowOpacity: 0.35, shadowRadius: 12,
                      shadowOffset: { width: 0, height: 5 }, elevation: 6 }
                  ]}
                  onPress={handleSave}
                  activeOpacity={0.85}>
                  <Ionicons
                    name={saved ? 'checkmark-circle' : 'save-outline'}
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={s.saveBtnText}>
                    {saved ? 'Marks Saved ✓' : `Save Marks — ${examType}`}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Empty state ── */
              <View style={[s.emptyState, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                <View style={[s.emptyIconWrap, { backgroundColor: T.accentSoft }]}>
                  <Ionicons name="clipboard-outline" size={38} color={T.accentBright} />
                </View>
                <Text style={[s.emptyTitle, { color: T.textPrimary }]}>Select Filters Above</Text>
                <Text style={[s.emptySub,   { color: T.textSec }]}>
                  Choose exam type, class division, exam mode{'\n'}and subject to load the student list.
                </Text>

                {/* Checklist */}
                <View style={s.checkList}>
                  {[
                    { label: 'Exam Type',      done: !!examType  },
                    { label: 'Class Division', done: !!division  },
                    { label: 'Exam Mode',      done: !!classType },
                    { label: 'Subject',        done: !!subject   },
                  ].map(item => (
                    <View key={item.label} style={s.checkRow}>
                      <Ionicons
                        name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={item.done ? T.green : T.textMuted}
                      />
                      <Text style={[s.checkLabel, { color: item.done ? T.textPrimary : T.textMuted }]}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 60 }} />
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 20 },

  /* Header */
  headerRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  headerRowWide: { alignItems: 'center' },
  pageTitle:     { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  pageSub:       { fontSize: 13 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Card */
  card: {
    borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16,
  },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardIconBubble: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel:    { fontSize: 15, fontWeight: '700' },

  /* Filters */
  filterTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  /* Subject chips */
  subjectList:  { gap: 8, marginBottom: 4 },
  subjectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  subjectCode:  { fontSize: 12, fontWeight: '800', width: 64 },
  subjectName:  { fontSize: 13, fontWeight: '500', flex: 1 },

  /* Info Banner */
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bannerSub:   { fontSize: 12 },
  progressPill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, alignItems: 'center',
  },
  progressText: { fontSize: 11, fontWeight: '700' },

  /* Progress Bar */
  progressBarBg: {
    height: 4, borderRadius: 4, marginBottom: 14, overflow: 'hidden',
  },
  progressBarFill: { height: 4, borderRadius: 4 },

  /* Table */
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, marginBottom: 4,
  },
  thRoll:   { width: 52, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thName:   { flex: 1,   fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thMarks:  { width: 90, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  thAbsent: { width: 52, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },

  tableBody: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1,
  },

  /* Cells */
  cellRoll:   { width: 52 },
  cellName:   { flex: 1, paddingRight: 8 },
  cellMarks:  { width: 90, alignItems: 'center' },
  cellAbsent: { width: 52, alignItems: 'center' },

  rollBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  rollText:     { fontSize: 11, fontWeight: '800' },
  stuName:      { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  stuId:        { fontSize: 10 },

  markInput: {
    width: 72, height: 36, borderRadius: 9, borderWidth: 1.5,
    textAlign: 'center', fontSize: 15, fontWeight: '700',
    paddingHorizontal: 6,
  },

  absentBadge: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, borderWidth: 1,
  },
  absentBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  absentBtn: {
    width: 32, height: 32, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 12, alignItems: 'center',
  },
  statVal: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLbl: { fontSize: 11 },

  /* Save */
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  /* Empty State */
  emptyState: {
    borderRadius: 16, borderWidth: 1, padding: 36,
    alignItems: 'center', marginTop: 8,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  checkList:  { gap: 10, alignSelf: 'stretch' },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: 13, fontWeight: '600' },
});