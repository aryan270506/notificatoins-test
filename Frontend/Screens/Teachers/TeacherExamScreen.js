// Screens/Teachers/TeacherExamScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Exam Marks Entry
//   ✅  Year / Division / Subject / Batch all from teacher's timetable
//   ✅  No "Exam Mode" (Theory/Lab) selector — removed
//   ✅  Batch auto-detected from timetable; selecting B1/B2/etc fetches ALL
//       students whose lab[] array contains that batch string
//   ✅  If a timetable slot has no batch → Theory slot → no batch chip shown
//   ✅  Students from GET /api/exam-marks/students
//   ✅  Saved marks auto-loaded on full selection
//   ✅  Save via POST /api/exam-marks/save
//   ✅  Dark / Light theme, tablet split-view, pull-to-refresh
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useRef, useEffect, useCallback, useMemo, useContext,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, StatusBar, Animated, useWindowDimensions,
  KeyboardAvoidingView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import AsyncStorage  from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Themes ─────────────────────────────────────────────────────────────── */
const DARK = {
  bg: '#0B0E1A', surface: '#131929', surfaceEl: '#1A2235',
  card: '#151C2E', border: '#1E2740',
  accent: '#5B5FEF', accentSoft: 'rgba(91,95,239,0.18)', accentBright: '#6C6FF5',
  green: '#22C55E', greenSoft: 'rgba(34,197,94,0.15)',
  yellow: '#FBBF24', yellowSoft: 'rgba(251,191,36,0.15)',
  red: '#F43F5E', redSoft: 'rgba(244,63,94,0.15)',
  cyan: '#06B6D4',
  orange: '#F97316',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  toggleBg: '#1A2235', toggleBorder: '#2A3260', toggleIconColor: '#FBBF24',
  shadowColor: '#000', shadowOpacity: 0, statusBar: 'light-content',
};
const LIGHT = {
  bg: '#F1F4FD', surface: '#FFFFFF', surfaceEl: '#EAEEf9',
  card: '#FFFFFF', border: '#DDE3F4',
  accent: '#4A4EE8', accentSoft: 'rgba(74,78,232,0.09)', accentBright: '#4A4EE8',
  green: '#16A34A', greenSoft: 'rgba(22,163,74,0.10)',
  yellow: '#D97706', yellowSoft: 'rgba(217,119,6,0.10)',
  red: '#DC2626', redSoft: 'rgba(220,38,38,0.10)',
  cyan: '#0891B2',
  orange: '#EA580C',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#9CA3AF',
  toggleBg: '#E8EBFF', toggleBorder: '#C5CAF5', toggleIconColor: '#4A4EE8',
  shadowColor: '#8492B4', shadowOpacity: 0.08, statusBar: 'dark-content',
};

/* ─── Static config ──────────────────────────────────────────────────────── */
const EXAM_TYPES = ['CAT 1', 'CAT 2', 'FET'];

const MAX_MARKS = {
  'CAT 1': { Theory: 20, Lab: 25 },
  'CAT 2': { Theory: 20, Lab: 25 },
  'FET':   { Theory: 60, Lab: 50 },
};

const EXAM_COLORS = {
  'CAT 1': '#5B5FEF',
  'CAT 2': '#06B6D4',
  'FET':   '#F97316',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const isValidMark = (val) => {
  if (val === '' || val === 'AB') return true;
  const n = Number(val);
  return !isNaN(n) && n >= 0;
};

const getMarkColor = (val, max, T) => {
  if (val === '' || val === 'AB') return T.textMuted;
  const pct = Number(val) / max;
  if (pct >= 0.8) return T.green;
  if (pct >= 0.5) return T.yellow;
  return T.red;
};

// Derive class type from a timetable slot:
//   slot.batch present & non-empty → Lab, else Theory
const slotClassType = (slot) =>
  slot.batch && slot.batch.trim() !== '' ? 'Lab' : 'Theory';

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function TeacherExamScreen() {
  const { width } = useWindowDimensions();
  const isWide    = width >= 768;

  const { isDark, toggleTheme } = useContext(ThemeContext);
  const T = isDark ? DARK : LIGHT;

  /* ── Teacher ── */
  const [teacherId,   setTeacherId]   = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [maxMark, setMaxMark] = useState(0);

  /* ── Screen navigation ── */
  const [currentScreen, setCurrentScreen] = useState('examList'); // examList, createExam, marksEntry

  /* ── Exams list ── */
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);

  /* ── Create exam form ── */
  const [newExamName, setNewExamName] = useState('');
  const [newExamTheory, setNewExamTheory] = useState('');
  const [newExamLab, setNewExamLab] = useState('');

  /* ── Selected exam ── */
  const [selectedExam, setSelectedExam] = useState(null);

  /* ── Timetable (single source of truth) ── */
  const [timetableSlots,   setTimetableSlots]   = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  /* ── Derived filter options ── */
  const [years,     setYears]     = useState([]);
  const [divisions, setDivisions] = useState([]);
  // subjects: [{ code, name, classType, batch }]  — batch may be null for Theory
  const [subjects,  setSubjects]  = useState([]);
  // batches for the selected year+division (Lab slots only)
  const [batches,   setBatches]   = useState([]);

  /* ── Selections ── */
  const [selYear,     setSelYear]     = useState(null);
  const [selDivision, setSelDivision] = useState(null);
  const [selSubject,  setSelSubject]  = useState(null); // { code, name, classType, batch }
  // selBatch is derived from selSubject.batch automatically (no user picker)

  /* ── Data ── */
  const [students, setStudents] = useState([]);
  const [marks,    setMarks]    = useState({});
  const [saved,    setSaved]    = useState(false);

  /* ── Loading ── */
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSaved,    setLoadingSaved]    = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [error,           setError]           = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  /* ── Derived ── */
  // classType and batch come straight from the selected subject's timetable slot
  const selClassType = selSubject?.classType ?? null;
  const selBatch     = selSubject?.batch     ?? null;

useEffect(() => {
  if (selectedExam && selClassType) {
    const maxMarks = selClassType === 'Lab' ? selectedExam.maxMarksLab : selectedExam.maxMarksTheory;
    setMaxMark(Number(maxMarks) || 0);
  }
}, [selectedExam, selClassType]);

  const allSelected = selYear && selDivision && selectedExam && selSubject;

  /* ─────────────────────────────────────────────────────────────────────
     Load timetable
     ─────────────────────────────────────────────────────────────────── */
  const loadTimetable = useCallback(async (tid) => {
    setLoadingTimetable(true);
    setError(null);
    try {
      const res   = await axiosInstance.get(`/timetable/teacher/${tid}`);
      const slots = res.data?.data ?? [];
      setTimetableSlots(slots);

      const yearSet = [...new Set(slots.map(s => String(s.year)))].sort();
      setYears(yearSet);

      console.log('[ExamScreen] timetable —', slots.length, 'slots');
    } catch (err) {
      setError(`Failed to load timetable: ${err.message}`);
    } finally {
      setLoadingTimetable(false);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     Fetch all exams for teacher
     ─────────────────────────────────────────────────────────────────── */
  const fetchExams = useCallback(async (tid) => {
    setLoadingExams(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/exam-marks/my-exams', { params: { teacherId: tid } });
      setExams(res.data?.data ?? []);
      console.log('[ExamScreen] exams —', res.data?.data?.length, 'found');
    } catch (err) {
      setError(`Failed to load exams: ${err.message}`);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────
     BOOT
     ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();

    (async () => {
      try {
        let tid = await AsyncStorage.getItem('teacherId')
               || await AsyncStorage.getItem('_id');
        if (!tid) {
          const raw = await AsyncStorage.getItem('userData')
                   || await AsyncStorage.getItem('user');
          if (raw) {
            try { const p = JSON.parse(raw); tid = p._id || p.id || null; } catch (_) {}
          }
        }
        if (!tid) { setError('Teacher session not found. Please log in again.'); return; }
        setTeacherId(tid);

        try {
          const res = await axiosInstance.get(`/teachers/${tid}`);
          if (res.data?.success) setTeacherName(res.data.data?.name || '');
        } catch (_) {}

        await loadTimetable(tid);
        await fetchExams(tid);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [loadTimetable, fetchExams]);

  /* ─────────────────────────────────────────────────────────────────────
     Create new exam
     ─────────────────────────────────────────────────────────────────── */
  const handleCreateExam = async () => {
    if (!newExamName.trim()) {
      alert('Please enter exam name');
      return;
    }
    if (!newExamTheory.trim() || !newExamLab.trim()) {
      alert('Please enter max marks for Theory and Lab');
      return;
    }

    setSaving(true);
    try {
      // Reset form
      setNewExamName('');
      setNewExamTheory('');
      setNewExamLab('');

      // Refresh exams list
      await fetchExams(teacherId);

      // Navigate to marks entry with newly created exam
      setCurrentScreen('marksEntry');
    } catch (err) {
      setError(`Failed to create exam: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────
     Year → Divisions
     ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selYear) { setDivisions([]); return; }
    const divSet = [
      ...new Set(
        timetableSlots
          .filter(s => String(s.year) === String(selYear))
          .map(s => s.division?.toUpperCase())
          .filter(Boolean)
      ),
    ].sort();
    setDivisions(divSet);
  }, [selYear, timetableSlots]);

  /* ─────────────────────────────────────────────────────────────────────
     Year + Division → Subjects + Batches
     Each subject entry carries its classType and batch so the screen
     knows exactly how to fetch students without an Exam Mode picker.
     ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selYear || !selDivision) { setSubjects([]); setBatches([]); return; }

    const filtered = timetableSlots.filter(s =>
      String(s.year)            === String(selYear) &&
      s.division?.toUpperCase() === selDivision.toUpperCase()
    );

    // Deduplicate by "subject + batch" combo
    const seen    = new Set();
    const subList = [];

    filtered.forEach(s => {
      if (!s.subject) return;
      const ct      = slotClassType(s);
      const batch   = ct === 'Lab' ? (s.batch || null) : null;
      const key     = `${s.subject.trim().toUpperCase()}__${batch || 'THEORY'}`;
      if (seen.has(key)) return;
      seen.add(key);
      subList.push({
        code:      s.subject.trim().toUpperCase(),
        name:      s.subject.trim().toUpperCase(),
        classType: ct,
        batch,            // null for Theory, e.g. "B1" / "B2" for Lab
      });
    });

    // Sort: Theory first, then Lab (alphabetical within each group)
    subList.sort((a, b) => {
      if (a.classType !== b.classType) return a.classType === 'Theory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    setSubjects(subList);

    // Unique lab batches for display info (not used as a filter selector)
    const batchSet = [
      ...new Set(filtered.map(s => s.batch).filter(b => b && b.trim() !== '')),
    ].sort();
    setBatches(batchSet);
  }, [selYear, selDivision, timetableSlots]);

  /* ─────────────────────────────────────────────────────────────────────
     All selections ready → fetch students + saved marks
     ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!allSelected) { setStudents([]); setMarks({}); setSaved(false); return; }
    loadStudentsAndMarks();
  }, [selYear, selDivision, selectedExam, selSubject, allSelected]);

  const loadStudentsAndMarks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoadingStudents(true);

    setError(null);
    setMarks({});
    setSaved(false);

    try {
      // For Lab: backend derives division from batch prefix (A1→A, B1→B, C1→C)
      // For Theory: use selDivision as normal
      const divUpper = selDivision?.toUpperCase();

      const params = {
        year:      selYear,
        division:  divUpper,
        classType: selClassType,
        subject:   selSubject?.name || '',
      };
      if (selClassType === 'Lab' && selBatch) {
        params.batch = selBatch;
        // Backend will override division using batch prefix — no need to change here
      }

      console.log('[ExamScreen] fetching students with params:', params);
      const stuRes = await axiosInstance.get('/exam-marks/students', { params });
      const studs  = stuRes.data?.data ?? [];
      setStudents(studs);

      if (studs.length === 0) {
        console.warn('[ExamScreen] 0 students for params:', params);
      }

      // Load saved marks
      if (teacherId && selSubject) {
        setLoadingSaved(true);
        try {
          const marksRes = await axiosInstance.get('/exam-marks', {
            params: {
              teacherId,
              examName:    selectedExam?.examName,
              classType:   selClassType,
              division:    divUpper,
              year:        selYear,
              subjectCode: selSubject.code,
              ...(selBatch ? { batch: selBatch } : {}),
            },
          });
          const docs = marksRes.data?.data ?? [];
          if (docs.length > 0) {
            const savedMap = {};
            docs[0].marks.forEach(m => {
              savedMap[m.studentId] = m.isAbsent ? 'AB' : String(m.mark ?? '');
            });
            setMarks(savedMap);
            setSaved(true);
          }
        } catch (e) {
          console.warn('[ExamScreen] saved marks error:', e.message);
        } finally {
          setLoadingSaved(false);
        }
      }
    } catch (err) {
      setError(`Failed to load students: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingStudents(false);
      setRefreshing(false);
    }
  }, [selYear, selDivision, selectedExam, selSubject, selClassType, selBatch, teacherId]);

  /* ─────────────────────────────────────────────────────────────────────
     Mark helpers
     ─────────────────────────────────────────────────────────────────── */
  const updateMark   = (id, val) => { setMarks(p => ({ ...p, [id]: val })); setSaved(false); };
  const toggleAbsent = (id)      => { setMarks(p => ({ ...p, [id]: p[id] === 'AB' ? '' : 'AB' })); setSaved(false); };
  const markAllPresent = () => { const c = {}; students.forEach(s => { c[s.id] = ''; }); setMarks(c); setSaved(false); };

  /* ─────────────────────────────────────────────────────────────────────
     Save
     ─────────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
  if (!teacherId) {
    Alert.alert('Error', 'Teacher session expired.');
    return;
  }

  const pending = students.filter(s => (marks[s.id] ?? '') === '').length;

  if (pending > 0) {
    let go = false;

    if (Platform.OS === 'web') {
      // Web confirmation
      go = window.confirm(`${pending} student(s) have no mark.\nSave anyway?`);
    } else {
      // Android / iOS confirmation
      go = await new Promise(resolve =>
        Alert.alert(
          'Partial Entry',
          `${pending} student(s) have no mark.\nSave anyway?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Save', onPress: () => resolve(true) },
          ]
        )
      );
    }

    if (!go) return;
  }

  setSaving(true);

  try {
    const saveDivision =
      selClassType === 'Lab' && selBatch
        ? selBatch[0]?.toUpperCase() || selDivision?.toUpperCase()
        : selDivision?.toUpperCase();

    await axiosInstance.post('/exam-marks/save', {
      teacherId,
      examName: selectedExam?.examName,
      maxMarksTheory: selectedExam?.maxMarksTheory,
      maxMarksLab: selectedExam?.maxMarksLab,
      classType: selClassType,
      division: saveDivision,
      year: selYear,
      subjectCode: selSubject.code,
      subjectName: selSubject.name,
      batch: selBatch || null,
      maxMarks: maxMark,
      marks: students.map(stu => {
        const val = marks[stu.id] ?? '';
        return {
          studentId: stu.id,
          rollNo: stu.rollNo,
          name: stu.name,
          mark: val === 'AB' ? '' : val,
          isAbsent: val === 'AB'
        };
      }),
    });

    setSaved(true);

    const displayDiv =
      selClassType === 'Lab' && selBatch
        ? selBatch[0]?.toUpperCase()
        : selDivision;

    if (Platform.OS === 'web') {
      window.alert(
        `Saved ✓\nYear ${selYear} – Div ${displayDiv}${selBatch ? ` (${selBatch})` : ''}\n${selectedExam?.examName} · ${selClassType} saved.`
      );
    } else {
      Alert.alert(
        'Saved ✓',
        `Year ${selYear} – Div ${displayDiv}${selBatch ? ` (${selBatch})` : ''}\n${selectedExam?.examName} · ${selClassType} saved.`
      );
    }

  } catch (err) {
    if (Platform.OS === 'web') {
      window.alert(err.response?.data?.message || err.message);
    } else {
      Alert.alert('Save Failed', err.response?.data?.message || err.message);
    }
  } finally {
    setSaving(false);
  }
};

  /* ─────────────────────────────────────────────────────────────────────
     Stats
     ─────────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total   = students.length;
    const absent  = students.filter(s => marks[s.id] === 'AB').length;
    const entered = students.filter(s => (marks[s.id] ?? '') !== '').length;
    const pending = total - entered;
    const pct     = total ? Math.round((entered / total) * 100) : 0;
    const vals    = students.map(s => marks[s.id]).filter(v => v && v !== '' && v !== 'AB').map(Number).filter(n => !isNaN(n));
    const avg     = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
    return { total, absent, entered, pending, pct, avg };
  }, [students, marks]);

  const shadow = { shadowColor: T.shadowColor, shadowOpacity: T.shadowOpacity, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: isDark ? 0 : 3 };

  /* ─── Reset helpers ── */
  const resetFromYear     = () => { setSelDivision(null); setSelSubject(null); setStudents([]); setMarks({}); setSaved(false); };
  const resetFromDivision = () => { setSelSubject(null); setStudents([]); setMarks({}); setSaved(false); };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Exam List Screen
     ═══════════════════════════════════════════════════════════════════ */
  const renderExamListScreen = () => (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.headerRow]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.pageTitle, { color: T.textPrimary }]}>Exams</Text>
          <Text style={[s.pageSub, { color: T.textSec }]}>
            {teacherName ? `${teacherName}  ·  Manage exams and marks` : 'Select an exam to enter marks'}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: T.toggleBg, borderColor: T.toggleBorder }]}
          onPress={toggleTheme}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={T.toggleIconColor} />
        </TouchableOpacity>
      </View>

      {loadingExams ? (
        <View style={[s.loadingBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <ActivityIndicator color={T.accentBright} size="large" />
          <Text style={[s.loadingText, { color: T.textSec }]}>Loading exams...</Text>
        </View>
      ) : exams.length === 0 ? (
        <View style={[s.emptyState, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={[s.emptyIconWrap, { backgroundColor: T.accentSoft }]}>
            <Ionicons name="document-outline" size={38} color={T.accentBright} />
          </View>
          <Text style={[s.emptyTitle, { color: T.textPrimary }]}>No Exams Yet</Text>
          <Text style={[s.emptySub, { color: T.textSec }]}>Create your first exam to get started</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {exams.map((exam, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setSelectedExam(exam);
                setCurrentScreen('marksEntry');
                setSelYear(null);
                setSelDivision(null);
                setSelSubject(null);
              }}
              activeOpacity={0.7}
            >
              <View style={[s.examCard, { backgroundColor: T.card, borderColor: T.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.examName, { color: T.textPrimary }]}>{exam.examName}</Text>
                    <Text style={[s.examMeta, { color: T.textSec }]}>
                      {exam.totalSheets} section(s) • {exam.classTypes?.join(', ') || 'Theory & Lab'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={T.textSec} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[s.createBtn, { backgroundColor: T.accent }]}
        onPress={() => setCurrentScreen('createExam')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={s.createBtnText}>Create New Exam</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Create Exam Screen
     ═══════════════════════════════════════════════════════════════════ */
  const renderCreateExamScreen = () => (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => setCurrentScreen('examList')} style={{ marginBottom: 16 }}>
        <Text style={[s.backLink, { color: T.accentBright }]}>← Back to Exams</Text>
      </TouchableOpacity>

      <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={[s.cardLabel, { color: T.textPrimary, marginBottom: 20 }]}>Create New Exam</Text>

        <View style={s.inputGroup}>
          <Text style={[s.label, { color: T.textSec }]}>Exam Name *</Text>
          <TextInput
            style={[s.input, { backgroundColor: T.surfaceEl, borderColor: T.border, color: T.textPrimary }]}
            placeholder="e.g., CAT 1, Midterm, Final"
            placeholderTextColor={T.textMuted}
            value={newExamName}
            onChangeText={setNewExamName}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={[s.inputGroup, { flex: 1 }]}>
            <Text style={[s.label, { color: T.textSec }]}>Max Marks Theory *</Text>
            <TextInput
              style={[s.input, { backgroundColor: T.surfaceEl, borderColor: T.border, color: T.textPrimary }]}
              placeholder="e.g., 20, 30"
              placeholderTextColor={T.textMuted}
              value={newExamTheory}
              onChangeText={setNewExamTheory}
              keyboardType="numeric"
            />
          </View>
          <View style={[s.inputGroup, { flex: 1 }]}>
            <Text style={[s.label, { color: T.textSec }]}>Max Marks Lab *</Text>
            <TextInput
              style={[s.input, { backgroundColor: T.surfaceEl, borderColor: T.border, color: T.textPrimary }]}
              placeholder="e.g., 25, 50"
              placeholderTextColor={T.textMuted}
              value={newExamLab}
              onChangeText={setNewExamLab}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <TouchableOpacity
            style={[s.cancelBtn, { borderColor: T.border, flex: 1 }]}
            onPress={() => {
              setNewExamName('');
              setNewExamTheory('');
              setNewExamLab('');
              setCurrentScreen('examList');
            }}
            disabled={saving}
          >
            <Text style={[s.cancelBtnText, { color: T.textSec }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: T.accent, flex: 1 }, saving && { opacity: 0.6 }]}
            onPress={handleCreateExam}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.submitBtnText}>Create Exam</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Filter Panel
     ═══════════════════════════════════════════════════════════════════ */
  const renderFilters = () => (
    <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, shadow]}>

      <View style={s.cardLabelRow}>
        <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
          <Ionicons name="options-outline" size={14} color={T.accentBright} />
        </View>
        <Text style={[s.cardLabel, { color: T.textPrimary }]}>Exam Entry Filters</Text>
        {(selYear || selDivision || selectedExam || selSubject) && (
          <TouchableOpacity
            style={[s.clearAllBtn, { backgroundColor: T.redSoft, borderColor: T.red + '44' }]}
            onPress={() => { setSelYear(null); setSelDivision(null); setCurrentScreen('examList'); setSelSubject(null); setStudents([]); setMarks({}); setSaved(false); }}
          >
            <Ionicons name="close-circle-outline" size={12} color={T.red} />
            <Text style={[s.clearAllText, { color: T.red }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── YEAR ── */}
      <Text style={[s.filterTitle, { color: T.textMuted }]}>YEAR</Text>
      {loadingTimetable ? (
        <ActivityIndicator color={T.accentBright} style={{ marginBottom: 14 }} />
      ) : (
        <View style={s.chipRow}>
          {years.length === 0
            ? <Text style={[s.emptyHint, { color: T.textMuted }]}>No classes in your timetable</Text>
            : years.map(yr => {
                const active = selYear === yr;
                const labels = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
                return (
                  <TouchableOpacity
                    key={yr}
                    style={[s.chip, active ? { backgroundColor: T.cyan, borderColor: T.cyan } : { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                    onPress={() => { setSelYear(yr); resetFromYear(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, { color: active ? '#fff' : T.textSec }]}>{labels[yr] || `Year ${yr}`}</Text>
                  </TouchableOpacity>
                );
              })}
        </View>
      )}

      {/* ── DIVISION ── */}
      <Text style={[s.filterTitle, { color: T.textMuted }]}>CLASS DIVISION</Text>
      <View style={s.chipRow}>
        {divisions.length === 0
          ? <Text style={[s.emptyHint, { color: T.textMuted }]}>{selYear ? 'No divisions in timetable for this year' : 'Select year first'}</Text>
          : divisions.map(div => {
              const active = selDivision === div;
              return (
                <TouchableOpacity
                  key={div}
                  style={[s.chip, active ? { backgroundColor: T.accent, borderColor: T.accent } : { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                  onPress={() => { setSelDivision(div); resetFromDivision(); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : T.textSec }]}>Div {div}</Text>
                </TouchableOpacity>
              );
            })}
      </View>

      {/* ── SUBJECT (includes Theory + Lab, auto-tagged) ── */}
      {selYear && selDivision && (
        <>
          <Text style={[s.filterTitle, { color: T.textMuted }]}>SUBJECT</Text>
          {subjects.length === 0
            ? <Text style={[s.emptyHint, { color: T.textMuted }]}>No subjects in timetable for this selection.</Text>
            : (
              <View style={s.subjectList}>
                {subjects.map((sub, i) => {
                  const active = selSubject?.code === sub.code && selSubject?.batch === sub.batch;
                  return (
                    <TouchableOpacity
                      key={`${sub.code}_${sub.batch || 'th'}_${i}`}
                      style={[s.subjectChip,
                        active
                          ? { backgroundColor: T.accentSoft, borderColor: T.accent }
                          : { backgroundColor: T.surfaceEl,  borderColor: T.border },
                      ]}
                      onPress={() => { setSelSubject(sub); setSaved(false); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.subjectName, { color: active ? T.textPrimary : T.textSec }]} numberOfLines={2}>
                        {sub.name}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={16} color={T.accentBright} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
        </>
      )}

      {/* ── Checklist ── */}
      <View style={[s.checklistBox, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
        {[
          { label: selectedExam?.examName || 'Exam', done: !!selectedExam },
          { label: 'Year',      done: !!selYear      },
          { label: 'Division',  done: !!selDivision  },
          { label: 'Subject',   done: !!selSubject   },
        ].map(item => (
          <View key={item.label} style={s.checkRow}>
            <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={item.done ? T.green : T.textMuted} />
            <Text style={[s.checkLabel, { color: item.done ? T.textPrimary : T.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Marks Table
     ═══════════════════════════════════════════════════════════════════ */
  const renderMarksTable = () => {
    if (!allSelected) return null;

    return (
      <>
        {/* Info banner with editable Max Marks */}
        <View style={[s.infoBanner, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: T.textPrimary }]}>{selSubject.name}</Text>
            <Text style={[s.bannerSub, { color: T.textSec }]}>Year {selYear} · Div {selDivision}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[s.progressPill, { backgroundColor: isDark ? T.surfaceEl : '#fff', borderColor: T.border }]}> 
              <Text style={[s.progressText, { color: T.accentBright }]}>{stats.entered}/{stats.total}</Text>
            </View>
            {saved && (
              <View style={[s.savedPill, { backgroundColor: T.greenSoft }]}> 
                <Ionicons name="checkmark" size={10} color={T.green} />
                <Text style={[s.savedPillText, { color: T.green }]}>Saved</Text>
              </View>
            )}
          </View>
        </View>
        {/* Editable Max Marks input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: T.textSec, fontWeight: '700', marginRight: 8 }}>Total Marks:</Text>
          <TextInput
            style={{ width: 60, height: 32, borderRadius: 7, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceEl, color: T.textPrimary, textAlign: 'center', fontSize: 15, fontWeight: '700' }}
            value={String(maxMark)}
           onChangeText={(text) => {
  if (/^\d{0,3}$/.test(text)) {
    setMaxMark(Number(text));
  }
}}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Progress bar */}
        <View style={[s.progressBarBg, { backgroundColor: T.border }]}>
          <View style={[s.progressBarFill, {
            backgroundColor: stats.pct === 100 ? T.green : T.accentBright,
            width: `${stats.pct}%`,
          }]} />
        </View>

        {/* Loading / Empty */}
        {loadingStudents || loadingSaved ? (
          <View style={[s.loadingBox, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
            <ActivityIndicator color={T.accentBright} size="large" />
            <Text style={[s.loadingText, { color: T.textSec }]}>
              {loadingStudents ? 'Loading students…' : 'Loading saved marks…'}
            </Text>
          </View>
        ) : students.length === 0 ? (
          <View style={[s.loadingBox, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
            <Ionicons name="people-outline" size={40} color={T.textMuted} />
            <Text style={[s.loadingText, { color: T.textMuted }]}>No students found for this selection.</Text>
            <TouchableOpacity
              style={[s.retryBtn, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}
              onPress={() => loadStudentsAndMarks()}
            >
              <Ionicons name="refresh" size={14} color={T.accentBright} />
              <Text style={[s.retryText, { color: T.accentBright }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick actions */}
            <View style={s.quickActions}>
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]} onPress={markAllPresent}>
                <Ionicons name="people-circle-outline" size={14} color={T.textSec} />
                <Text style={[s.quickBtnText, { color: T.textSec }]}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]} onPress={() => loadStudentsAndMarks(true)}>
                <Ionicons name="refresh-outline" size={14} color={T.textSec} />
                <Text style={[s.quickBtnText, { color: T.textSec }]}>Refresh</Text>
              </TouchableOpacity>
              <View style={[s.quickBtn, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}>
                <Ionicons name="people-outline" size={14} color={T.accentBright} />
                <Text style={[s.quickBtnText, { color: T.accentBright }]}>{stats.total} Students</Text>
              </View>
            </View>

            {/* Table header */}
            <View style={[s.tableHeader, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
              <Text style={[s.thRoll,   { color: T.textMuted }]}>ROLL</Text>
              <Text style={[s.thName,   { color: T.textMuted }]}>STUDENT NAME</Text>
              <Text style={[s.thMarks,  { color: T.textMuted }]}>MARKS /{maxMark}</Text>
              <Text style={[s.thAbsent, { color: T.textMuted }]}>ABS</Text>
            </View>

            {/* Rows */}
            <View style={[s.tableBody, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
              {students.map((stu, idx) => {
                const val      = marks[stu.id] ?? '';
                const isAbsent = val === 'AB';
                const isErr    = val !== '' && val !== 'AB' && !isValidMark(val, maxMark);
                const markCol  = isErr ? T.red : getMarkColor(val, maxMark, T);

                return (
                  <View
                    key={stu.id}
                    style={[
                      s.tableRow, { borderTopColor: T.border },
                      idx % 2 === 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.018)' },
                      isAbsent && { backgroundColor: isDark ? 'rgba(244,63,94,0.07)' : 'rgba(244,63,94,0.05)' },
                    ]}
                  >
                    <View style={s.cellRoll}>
                      <View style={[s.rollBadge, { backgroundColor: T.accentSoft }]}>
                        <Text style={[s.rollText, { color: T.accentBright }]}>{stu.rollNo}</Text>
                      </View>
                    </View>

                    <View style={s.cellName}>
                      <Text style={[s.stuName, { color: isAbsent ? T.textMuted : T.textPrimary }]} numberOfLines={1}>{stu.name}</Text>
                      <Text style={[s.stuSub, { color: T.textMuted }]}>{stu.prn || stu.id}</Text>
                    </View>

                    <View style={s.cellMarks}>
                      {isAbsent ? (
                        <View style={[s.absentBadge, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
                          <Text style={[s.absentBadgeText, { color: T.red }]}>ABSENT</Text>
                        </View>
                      ) : (
                  <TextInput
  style={[
    s.markInput,
    {
      backgroundColor: T.surfaceEl,
      borderColor: isErr ? T.red : val !== '' ? T.accent + '99' : T.border,
      color: markCol,
    }
  ]}
  value={val}
  onChangeText={(text) => {
    if (text === '') {
      updateMark(stu.id, '');
      return;
    }

    const num = Number(text);

    if (!isNaN(num) && num <= maxMark) {
      updateMark(stu.id, text);
    }
  }}
  keyboardType="numeric"
  placeholder="—"
  placeholderTextColor={T.textMuted}
  maxLength={3}
  returnKeyType="next"
  selectTextOnFocus
/>
                                        )}
                    </View>

                    <View style={s.cellAbsent}>
                      <TouchableOpacity
                        style={[s.absentBtn, isAbsent
                          ? { backgroundColor: T.red,       borderColor: T.red    }
                          : { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                        onPress={() => toggleAbsent(stu.id)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={isAbsent ? 'close' : 'person-remove-outline'} size={14} color={isAbsent ? '#fff' : T.textSec} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              {[
                { val: stats.total,                  lbl: 'Total',   col: T.accentBright },
                { val: stats.entered - stats.absent, lbl: 'Entered', col: T.green        },
                { val: stats.absent,                 lbl: 'Absent',  col: T.red          },
                { val: stats.pending,                lbl: 'Pending', col: T.yellow       },
                { val: stats.avg,                    lbl: 'Avg',     col: T.cyan         },
              ].map(sc => (
                <View key={sc.lbl} style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                  <Text style={[s.statVal, { color: sc.col }]}>{sc.val}</Text>
                  <Text style={[s.statLbl, { color: T.textSec }]}>{sc.lbl}</Text>
                </View>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[s.saveBtn,
                saved ? { backgroundColor: T.green, borderColor: T.green } : { backgroundColor: T.accent, borderColor: T.accent },
                { shadowColor: T.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                : <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="#fff" style={{ marginRight: 8 }} />
              }
              <Text style={s.saveBtnText}>
                {saving ? 'Saving…' : saved ? 'Marks Saved ✓' : `Save Marks — ${selectedExam?.examName}`}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.root, { backgroundColor: T.bg }]}>
        <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

        {currentScreen === 'examList' && renderExamListScreen()}
        {currentScreen === 'createExam' && renderCreateExamScreen()}
        {currentScreen === 'marksEntry' && (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.content, isWide && s.contentWide]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => allSelected ? loadStudentsAndMarks(true) : teacherId && loadTimetable(teacherId)}
                tintColor={T.accentBright}
                colors={[T.accentBright]}
              />
            }
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* HEADER */}
              <View style={[s.headerRow, { marginBottom: 16 }]}>
                <TouchableOpacity onPress={() => setCurrentScreen('examList')} style={{ marginRight: 12 }}>
                  <Ionicons name="chevron-back" size={24} color={T.accentBright} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[s.pageTitle, { color: T.textPrimary }]}>Enter Marks</Text>
                  <Text style={[s.pageSub, { color: T.textSec }]}>
                    {selectedExam?.examName || 'Select exam'} • {teacherName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.iconBtn, { backgroundColor: T.toggleBg, borderColor: T.toggleBorder }]}
                  onPress={toggleTheme}
                >
                  <Ionicons name={isDark ? 'sunny' : 'moon'} size={17} color={T.toggleIconColor} />
                </TouchableOpacity>
              </View>

            {/* ERROR */}
            {error && (
              <View style={[s.errorBanner, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
                <Ionicons name="alert-circle-outline" size={15} color={T.red} />
                <Text style={[s.errorText, { color: T.red }]}>{error}</Text>
                <TouchableOpacity onPress={() => setError(null)}>
                  <Ionicons name="close" size={15} color={T.red} />
                </TouchableOpacity>
              </View>
            )}

            {/* NO TIMETABLE */}
            {!loadingTimetable && timetableSlots.length === 0 && !error && (
              <View style={[s.infoBanner, { backgroundColor: T.yellowSoft, borderColor: T.yellow + '44', marginBottom: 12 }]}>
                <Ionicons name="calendar-outline" size={16} color={T.yellow} />
                <Text style={[s.bannerSub, { color: T.yellow, flex: 1 }]}>
                  No timetable assigned yet. Contact admin to schedule your classes.
                </Text>
              </View>
            )}

            {/* LAYOUT */}
            {isWide ? (
              <View style={s.wideGrid}>
                <View style={s.wideLeft}>{renderFilters()}</View>
                <View style={s.wideRight}>
                  {allSelected ? renderMarksTable() : (
                    <View style={[s.emptyState, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                      <View style={[s.emptyIconWrap, { backgroundColor: T.accentSoft }]}>
                        <Ionicons name="clipboard-outline" size={38} color={T.accentBright} />
                      </View>
                      <Text style={[s.emptyTitle, { color: T.textPrimary }]}>Ready to Enter Marks</Text>
                      <Text style={[s.emptySub, { color: T.textSec }]}>Complete all selections on the left to load students.</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {renderFilters()}
                {renderMarksTable()}
                {!allSelected && (
                  <View style={[s.emptyState, { backgroundColor: T.card, borderColor: T.border }, shadow]}>
                    <View style={[s.emptyIconWrap, { backgroundColor: T.accentSoft }]}>
                      <Ionicons name="clipboard-outline" size={38} color={T.accentBright} />
                    </View>
                    <Text style={[s.emptyTitle, { color: T.textPrimary }]}>Select All Filters</Text>
                    <Text style={[s.emptySub, { color: T.textSec }]}>Choose exam type, year, division and subject above.</Text>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 60 }} />
          </Animated.View>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { flex: 1 },
  content:       { padding: 18, paddingTop: Platform.OS === 'ios' ? 58 : 18 },
  contentWide:   { padding: 24, paddingTop: Platform.OS === 'ios' ? 58 : 24 },

  wideGrid:      { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  wideLeft:      { width: 360 },
  wideRight:     { flex: 1 },

  headerRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 12 },
  headerRowWide:  { alignItems: 'center' },
  pageTitle:      { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  pageSub:        { fontSize: 13 },
  iconBtn:        { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  errorBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  errorText:      { flex: 1, fontSize: 13 },

  card:           { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16 },
  cardLabelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardIconBubble: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel:      { fontSize: 15, fontWeight: '700', flex: 1 },
  clearAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  clearAllText:   { fontSize: 11, fontWeight: '700' },

  filterTitle:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8, marginTop: 4 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText:       { fontSize: 13, fontWeight: '600' },
  emptyHint:      { fontSize: 12, fontStyle: 'italic', marginBottom: 14 },

  subjectList:    { gap: 8, marginBottom: 14 },
  subjectChip:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  subjectName:    { fontSize: 13, fontWeight: '500', flex: 1 },

  checklistBox:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  checkRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkLabel:     { fontSize: 12, fontWeight: '500' },

  infoBanner:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  bannerTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bannerSub:      { fontSize: 12 },
  progressPill:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  progressText:   { fontSize: 11, fontWeight: '700' },
  savedPill:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  savedPillText:  { fontSize: 10, fontWeight: '700' },

  progressBarBg:  { height: 4, borderRadius: 4, marginBottom: 14, overflow: 'hidden' },
  progressBarFill:{ height: 4, borderRadius: 4 },

  loadingBox:     { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12, marginBottom: 16 },
  loadingText:    { fontSize: 14, textAlign: 'center' },
  retryBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, borderWidth: 1, marginTop: 4 },
  retryText:      { fontSize: 13, fontWeight: '600' },

  quickActions:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  quickBtnText:   { fontSize: 12, fontWeight: '600' },

  tableHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  thRoll:         { width: 52, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thName:         { flex: 1,   fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thMarks:        { width: 86, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  thAbsent:       { width: 44, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },

  tableBody:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  tableRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },

  cellRoll:        { width: 52 },
  cellName:        { flex: 1, paddingRight: 8 },
  cellMarks:       { width: 86, alignItems: 'center' },
  cellAbsent:      { width: 44, alignItems: 'center' },

  rollBadge:       { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' },
  rollText:        { fontSize: 11, fontWeight: '800' },
  stuName:         { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  stuSub:          { fontSize: 10 },

  markInput: {
    width: 68, height: 36, borderRadius: 9, borderWidth: 1.5,
    textAlign: 'center', fontSize: 15, fontWeight: '700', paddingHorizontal: 4,
  },
  absentBadge:     { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  absentBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  absentBtn:       { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:        { flex: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  statVal:         { fontSize: 18, fontWeight: '900', marginBottom: 2 },
  statLbl:         { fontSize: 10 },

  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  saveBtnText:     { fontSize: 15, fontWeight: '800', color: '#fff' },

  emptyState:      { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', marginTop: 8 },
  emptyIconWrap:   { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub:        { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  examCard:        { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  examName:        { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  examMeta:        { fontSize: 12 },
  createBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  createBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  backLink:        { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  inputGroup:      { marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input:           { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  cancelBtn:       { borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText:   { fontSize: 14, fontWeight: '700' },
  submitBtn:       { borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  loadingBox:      { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12, marginTop: 100 },
  loadingText:     { fontSize: 14, textAlign: 'center' },
});