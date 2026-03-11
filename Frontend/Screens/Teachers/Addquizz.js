// QuizBuilderScreen.js
// Full React Native Quiz Builder — UniVerse
// First screen: Settings-style panel (Year, Division, Sub-Division optional)
// Then: Quiz builder with MC/TF/SA, strip, points/time, duplicate/delete

import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, Switch, Platform, StatusBar,
  StyleSheet, Animated, KeyboardAvoidingView, ActivityIndicator, // ← added
} from 'react-native';
import axiosInstance from '../../Src/Axios'; // ← added (adjust path if needed)
import { ThemeContext } from './TeacherStack';

/* ─── Theme ── */
const C_DARK = {
  bg:'#0a0e1a', surface:'#111827', card:'#141d2e',
  border:'#1e2d47', borderLight:'#243352',
  accent:'#3b82f6', accentSoft:'rgba(59,130,246,0.14)', accentGlow:'rgba(59,130,246,0.18)',
  green:'#10b981', greenSoft:'rgba(16,185,129,0.14)',
  red:'#ef4444', redSoft:'rgba(239,68,68,0.12)',
  amber:'#f59e0b', amberSoft:'rgba(245,158,11,0.12)',
  text:'#e8f0fe', textSec:'#8ba3cc', textMuted:'#3d5a8a', white:'#ffffff',
};
const C_LIGHT = {
  bg:'#F1F4FD', surface:'#FFFFFF', card:'#FFFFFF',
  border:'#DDE3F4', borderLight:'#CBD5E1',
  accent:'#2563EB', accentSoft:'rgba(37,99,235,0.09)', accentGlow:'rgba(37,99,235,0.12)',
  green:'#059669', greenSoft:'rgba(5,150,105,0.10)',
  red:'#DC2626', redSoft:'rgba(220,38,38,0.10)',
  amber:'#D97706', amberSoft:'rgba(217,119,6,0.10)',
  text:'#0F172A', textSec:'#4B5563', textMuted:'#9CA3AF', white:'#ffffff',
};

/* ─── Data ── */
const FALLBACK_YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

const YEARS = FALLBACK_YEARS;




const FALLBACK_DIVISIONS    = ['A', 'B', 'C', 'D', 'E'];
const FALLBACK_SUB_DIVISIONS = ['1', '2', '3', '4'];
const FALLBACK_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Computer Science',
  'Economics', 'Accountancy', 'Political Science', 'Physical Education',
];

const DIVISIONS = FALLBACK_DIVISIONS;
const SUB_DIVISIONS = FALLBACK_SUB_DIVISIONS;
const SUBJECTS = FALLBACK_SUBJECTS;

let _uid = 1;
const uid = () => _uid++;

const makeQuestion = () => ({
  id:        uid(),
  text:      '',
  type:      'mc',
  options:   [
    { id: uid(), text: '', correct: false },
    { id: uid(), text: '', correct: false },
  ],
  tfAnswer:  null,
  points:    10,
  timeLimit: 2,
});

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS FIRST SCREEN
══════════════════════════════════════════════════════════════════════ */
function QuizSettingsSetup({ onProceed }) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const ss = makeSS(C);
  const navigation = useNavigation();

  const [shuffle,     setShuffle]     = useState(true);
  const [autoGrade,   setAutoGrade]   = useState(true);
  const [lockBrowser, setLockBrowser] = useState(false);
  const [quizTimeLimit, setQuizTimeLimit] = useState(30); // total quiz time in minutes

  const [selYear,     setSelYear]     = useState(null);
  const [selDivision, setSelDivision] = useState(null);
  const [selSubDiv,   setSelSubDiv]   = useState(null);
  const [selSubject,  setSelSubject]  = useState(null);

  const [yearOpen,    setYearOpen]    = useState(false);
  const [divOpen,     setDivOpen]     = useState(false);
  const [subDivOpen,  setSubDivOpen]  = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);

  /* ── Timetable-based data ── */
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [years,          setYears]          = useState([]);
  const [divisions,      setDivisions]      = useState([]);
  const [batches,        setBatches]        = useState([]);
  const [subjects,       setSubjects]       = useState([]);
  const [teacherId,      setTeacherId]      = useState(null);

  const closeAll = () => {
    setYearOpen(false);
    setDivOpen(false);
    setSubDivOpen(false);
    setSubjectOpen(false);
  };

  /* ── Load teacher ID from AsyncStorage ── */
  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('teacherId');
        if (id) setTeacherId(id);
      } catch (err) {
        console.error('Failed to load teacherId:', err);
      }
    })();
  }, []);

  /* ── Load timetable ── */
  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      try {
        const res = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
        const slots = res.data?.data || [];
        setTimetableSlots(slots);
        // Extract unique years
        const yrs = [...new Set(slots.map(s => s.year))].sort();
        const yearObjs = yrs.map(y => ({
          value: y,
          label: `Year ${y}`
        }));
        setYears(yearObjs);
      } catch (err) {
        console.error('Failed to load timetable:', err);
        setYears(FALLBACK_YEARS);
      }
    })();
  }, [teacherId]);

  /* ── Year → Divisions ── */
  useEffect(() => {
    if (!selYear) {
      setDivisions([]);
      setSelDivision(null);
      setBatches([]);
      setSelSubDiv(null);
      return;
    }
    const divs = [...new Set(timetableSlots
      .filter(s => String(s.year) === String(selYear))
      .map(s => s.division?.toUpperCase())
      .filter(Boolean)
    )].sort();
    setDivisions(divs);
    setSelDivision(null);
    setBatches([]);
    setSelSubDiv(null);
  }, [selYear, timetableSlots]);

  /* ── Year + Division → Batches ── */
  useEffect(() => {
    if (!selYear || !selDivision) {
      setBatches([]);
      setSelSubDiv(null);
      return;
    }
    const filtered = timetableSlots.filter(s =>
      String(s.year) === String(selYear) &&
      s.division?.toUpperCase() === selDivision.toUpperCase()
    );
    const batchSet = [...new Set(filtered
      .map(s => s.batch)
      .filter(b => b && b.trim() !== '')
    )].sort();
    setBatches(batchSet);
    setSelSubDiv(null);
  }, [selYear, selDivision, timetableSlots]);

  /* ── Year + Division → Subjects ── */
  useEffect(() => {
    if (!selYear || !selDivision) {
      setSubjects([]);
      setSelSubject(null);
      return;
    }
    const subs = [...new Set(timetableSlots
      .filter(s => String(s.year) === String(selYear) && s.division?.toUpperCase() === selDivision.toUpperCase())
      .map(s => s.subject)
      .filter(Boolean)
    )].sort();
    setSubjects(subs);
    setSelSubject(null);
  }, [selYear, selDivision, timetableSlots]);

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top bar — matches screenshot */}
      <View style={ss.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.closeBtn}>
          <Text style={ss.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={ss.topbarTitle}>⚙️ Quiz Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ss.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* OPTIONS */}
        <Text style={ss.sectionLabel}>OPTIONS</Text>
        <View style={ss.card}>
          <ToggleRow label="Shuffle Questions" sub="Randomize for each student" value={shuffle} onToggle={setShuffle} />
       
          <View style={ss.hr} />
          <ToggleRow label="Lock Browser" sub="Prevent tab switching" value={lockBrowser} onToggle={setLockBrowser} />
        </View>

        {/* CLASS & DIVISION */}
        <Text style={ss.sectionLabel}>CLASS &amp; DIVISION</Text>
        <View style={ss.card}>

          {/* Year — required visually but not blocked */}
          <Text style={ss.fieldLabel}>Year</Text>
          <TouchableOpacity
            style={[ss.picker, yearOpen && ss.pickerOpen, selYear && ss.pickerSelected]}
            onPress={() => { closeAll(); setYearOpen(v => !v); }}
            activeOpacity={0.8}>
            <Text style={[ss.pickerText, !selYear && ss.pickerPlaceholder]}>
              {selYear ? years.find(y => y.value === String(selYear))?.label : '— Select Year —'}
            </Text>
            <View style={ss.pickerRight}>
              {selYear && (
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => { setSelYear(null); }}>
                  <Text style={ss.clearX}>✕</Text>
                </TouchableOpacity>
              )}
              <Text style={ss.arrow}>{yearOpen ? '˅' : '›'}</Text>
            </View>
          </TouchableOpacity>
          {yearOpen && (
            <View style={ss.dropdown}>
              {(years.length > 0 ? years : FALLBACK_YEARS).map(y => (
                <TouchableOpacity
                  key={y.value}
                  style={[ss.dropItem, selYear === y.value && ss.dropItemActive]}
                  onPress={() => { setSelYear(y.value); setYearOpen(false); }}
                  activeOpacity={0.75}>
                  <Text style={[ss.dropText, selYear === y.value && { color: C.accent }]}>{y.label}</Text>
                  {selYear === y.value && <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={ss.hr} />

          {/* Division — optional */}
          <View style={ss.labelRow}>
            <Text style={ss.fieldLabel}>Division</Text>
            <View style={ss.optBadge}><Text style={ss.optBadgeText}>Optional</Text></View>
          </View>
          <TouchableOpacity
            style={[ss.picker, divOpen && ss.pickerOpen, selDivision && ss.pickerSelected]}
            onPress={() => { closeAll(); setDivOpen(v => !v); }}
            activeOpacity={0.8}>
            <Text style={[ss.pickerText, !selDivision && ss.pickerPlaceholder]}>
              {selDivision ? `Division ${selDivision.toUpperCase()}` : '— Select Division —'}
            </Text>
            <View style={ss.pickerRight}>
              {selDivision && (
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setSelDivision(null)}>
                  <Text style={ss.clearX}>✕</Text>
                </TouchableOpacity>
              )}
              <Text style={ss.arrow}>{divOpen ? '˅' : '›'}</Text>
            </View>
          </TouchableOpacity>
          {divOpen && (
            <View style={ss.dropdown}>
              {(divisions.length > 0 ? divisions : FALLBACK_DIVISIONS).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[ss.dropItem, selDivision === d.toUpperCase?.() || selDivision === d && ss.dropItemActive]}
                  onPress={() => { setSelDivision(d); setDivOpen(false); }}
                  activeOpacity={0.75}>
                  <Text style={[ss.dropText, (selDivision === d.toUpperCase?.() || selDivision === d) && { color: C.accent }]}>Division {d}</Text>
                  {(selDivision === d.toUpperCase?.() || selDivision === d) && <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={ss.hr} />

          {/* Sub Division — optional */}
          <View style={ss.labelRow}>
            <Text style={ss.fieldLabel}>Sub Division</Text>
            <View style={ss.optBadge}><Text style={ss.optBadgeText}>Optional</Text></View>
          </View>
          <TouchableOpacity
            style={[ss.picker, subDivOpen && ss.pickerOpen, selSubDiv && ss.pickerSelected]}
            onPress={() => { closeAll(); setSubDivOpen(v => !v); }}
            activeOpacity={0.8}>
            <Text style={[ss.pickerText, !selSubDiv && ss.pickerPlaceholder]}>
              {selSubDiv ? `${batches.length > 0 ? 'Batch' : 'Sub Division'} ${selSubDiv}` : '— Select Sub Division —'}
            </Text>
            <View style={ss.pickerRight}>
              {selSubDiv && (
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setSelSubDiv(null)}>
                  <Text style={ss.clearX}>✕</Text>
                </TouchableOpacity>
              )}
              <Text style={ss.arrow}>{subDivOpen ? '˅' : '›'}</Text>
            </View>
          </TouchableOpacity>
          {subDivOpen && (
            <View style={ss.dropdown}>
              {(batches.length > 0 ? batches : FALLBACK_SUB_DIVISIONS).map(sd => (
                <TouchableOpacity
                  key={sd}
                  style={[ss.dropItem, selSubDiv === sd && ss.dropItemActive]}
                  onPress={() => { setSelSubDiv(sd); setSubDivOpen(false); }}
                  activeOpacity={0.75}>
                  <Text style={[ss.dropText, selSubDiv === sd && { color: C.accent }]}>{batches.length > 0 ? 'Batch ' : 'Sub Division '}{sd}</Text>
                  {selSubDiv === sd && <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Summary badge */}
          {(selYear || selDivision || selSubDiv) && (
            <View style={ss.selBadge}>
              <View style={ss.selDot} />
              <Text style={ss.selBadgeText}>
                {[
                  selYear     ? (years.find(y => y.value === selYear)?.label || `Year ${selYear}`) : null,
                  selDivision ? `Division ${selDivision}` : null,
                  selSubDiv   ? `Sub Div ${selSubDiv}` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>

        {/* SUBJECT */}
        <Text style={ss.sectionLabel}>SUBJECT</Text>
        <View style={ss.card}>
          <View style={ss.labelRow}>
            <Text style={ss.fieldLabel}>Subject</Text>
            <View style={ss.optBadge}><Text style={ss.optBadgeText}>Optional</Text></View>
          </View>
          <TouchableOpacity
            style={[ss.picker, subjectOpen && ss.pickerOpen, selSubject && ss.pickerSelected]}
            onPress={() => { closeAll(); setSubjectOpen(v => !v); }}
            activeOpacity={0.8}>
            <Text style={[ss.pickerText, !selSubject && ss.pickerPlaceholder]}>
              {selSubject || '— Select Subject —'}
            </Text>
            <View style={ss.pickerRight}>
              {selSubject && (
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setSelSubject(null)}>
                  <Text style={ss.clearX}>✕</Text>
                </TouchableOpacity>
              )}
              <Text style={ss.arrow}>{subjectOpen ? '˅' : '›'}</Text>
            </View>
          </TouchableOpacity>
          {subjectOpen && (
            <View style={ss.dropdown}>
              {(subjects.length > 0 ? subjects : FALLBACK_SUBJECTS).map(sub => (
                <TouchableOpacity
                  key={sub}
                  style={[ss.dropItem, selSubject === sub && ss.dropItemActive]}
                  onPress={() => { setSelSubject(sub); setSubjectOpen(false); }}
                  activeOpacity={0.75}>
                  <Text style={[ss.dropText, selSubject === sub && { color: C.accent }]}>{sub}</Text>
                  {selSubject === sub && <Text style={{ color: C.accent, fontSize: 14, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* TIME LIMIT */}
        <Text style={ss.sectionLabel}>TIME LIMIT</Text>
        <View style={ss.card}>
          <View style={ss.labelRow}>
            <Text style={ss.fieldLabel}>Total Quiz Duration</Text>
          </View>
          <View style={ss.timeLimitRow}>
            <TouchableOpacity
              style={ss.timeLimitBtn}
              onPress={() => setQuizTimeLimit(v => Math.max(5, v - 5))}
              activeOpacity={0.7}>
              <Text style={ss.timeLimitBtnText}>−</Text>
            </TouchableOpacity>
            <View style={ss.timeLimitDisplay}>
              <Text style={ss.timeLimitValue}>{quizTimeLimit}</Text>
              <Text style={ss.timeLimitUnit}>min</Text>
            </View>
            <TouchableOpacity
              style={ss.timeLimitBtn}
              onPress={() => setQuizTimeLimit(v => Math.min(180, v + 5))}
              activeOpacity={0.7}>
              <Text style={ss.timeLimitBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {/* Quick presets */}
          <View style={ss.presetRow}>
            {[15, 30, 45, 60, 90].map(preset => (
              <TouchableOpacity
                key={preset}
                style={[ss.presetChip, quizTimeLimit === preset && ss.presetChipActive]}
                onPress={() => setQuizTimeLimit(preset)}
                activeOpacity={0.75}>
                <Text style={[ss.presetChipText, quizTimeLimit === preset && { color: C.accent }]}>
                  {preset}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={ss.proceedBtn}
          onPress={() => onProceed({ selYear, selDivision, selSubDiv, selSubject, shuffle, autoGrade, lockBrowser, quizTimeLimit })}
          activeOpacity={0.85}>
          <Text style={ss.proceedBtnText}>Continue to Quiz Builder →</Text>
        </TouchableOpacity>

        <Text style={ss.skipNote}>
          Division, Sub Division &amp; Subject are optional — you can update them later in ⚙️ Settings
        </Text>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════════ */
export default function QuizBuilderScreen() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const b = makeB(C);
  const ss = makeSS(C);
  const navigation = useNavigation();

  const [setupDone,  setSetupDone]  = useState(false);
  const [publishing, setPublishing] = useState(false); // ← NEW
  const [teacherId, setTeacherId] = useState(null);

  const [questions, setQuestions] = useState([makeQuestion()]);
  const [activeId,  setActiveId]  = useState(() => questions[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [shuffle,     setShuffle]     = useState(true);
  const [autoGrade,   setAutoGrade]   = useState(true);
  const [lockBrowser, setLockBrowser] = useState(false);
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);

  const [selYear,     setSelYear]     = useState(null);
  const [selDivision, setSelDivision] = useState(null);
  const [selSubDiv,   setSelSubDiv]   = useState(null);
  const [selSubject,  setSelSubject]  = useState(null);

  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const stripRef  = useRef(null);

  useEffect(() => {
  const loadTeacherId = async () => {
    const id = await AsyncStorage.getItem('teacherId');
    setTeacherId(id);
  };
  loadTeacherId();
}, []);

  /* ── ALL hooks must be declared before any early return ── */
  const showToast = useCallback((msg, type = 'green') => {
    setToast({ msg, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const updateQuestion = useCallback((id, patch) => {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  }, []);

  /* ── Setup proceed (plain function, not a hook) ── */
  const handleSetupProceed = (data) => {
    setSelYear(data.selYear);
    setSelDivision(data.selDivision);
    setSelSubDiv(data.selSubDiv);
    setSelSubject(data.selSubject);
    setShuffle(data.shuffle);
    setAutoGrade(data.autoGrade);
    setLockBrowser(data.lockBrowser);
    setQuizTimeLimit(data.quizTimeLimit ?? 30);
    setSetupDone(true);
  };

  /* ── Early return AFTER all hooks ── */
  if (!setupDone) {
    return <QuizSettingsSetup onProceed={handleSetupProceed} />;
  }

  const activeQ   = questions.find(q => q.id === activeId) || questions[0];
  const activeIdx = questions.findIndex(q => q.id === activeId);
  const totalPoints = questions.reduce((a, q) => a + q.points, 0);
  const totalTime   = questions.reduce((a, q) => a + q.timeLimit, 0);

  const addQuestion = () => {
    const q = makeQuestion();
    setQuestions(qs => [...qs, q]);
    setActiveId(q.id);
    setTimeout(() => stripRef.current?.scrollToEnd({ animated: true }), 80);
    showToast('➕ New question added');
  };

  const deleteQuestion = (id) => {
    if (questions.length === 1) { showToast('⚠️ Keep at least one question', 'amber'); return; }
    const idx  = questions.findIndex(q => q.id === id);
    const next = questions[idx > 0 ? idx - 1 : 1];
    setQuestions(qs => qs.filter(q => q.id !== id));
    setActiveId(next.id);
    showToast('🗑 Question deleted', 'red');
  };

  const duplicateQuestion = (id) => {
    const orig  = questions.find(q => q.id === id);
    if (!orig) return;
    const clone = {
      ...JSON.parse(JSON.stringify(orig)),
      id: uid(),
      options: orig.options.map(o => ({ ...o, id: uid() })),
    };
    const idx  = questions.findIndex(q => q.id === id);
    const next = [...questions];
    next.splice(idx + 1, 0, clone);
    setQuestions(next);
    setActiveId(clone.id);
    showToast('📋 Question duplicated');
  };

  // ─── CHANGED: now calls POST /api/quizzes ────────────────────────────
  const publishQuiz = async () => {

  // Validate
  const noText = questions.filter(q => !q.text.trim());
  if (noText.length) {
    showToast(`⚠️ ${noText.length} question(s) missing text`, 'amber');
    return;
  }

  const noAns = questions.filter(
    q => q.type === 'mc' && !q.options.some(o => o.correct)
  );
  if (noAns.length) {
    showToast(`⚠️ ${noAns.length} MC question(s) need a correct answer`, 'amber');
    return;
  }

  setPublishing(true);

  try {
    // 🔹 Get teacherId from AsyncStorage
    const teacherId = await AsyncStorage.getItem('teacherId');

    if (!teacherId) {
      showToast('❌ Teacher not authenticated', 'red');
      setPublishing(false);
      return;
    }

    // Strip local-only `id` fields — backend uses Mongoose _id
    const sanitisedQuestions = questions.map(({ id: _lid, ...q }) => ({
      ...q,
      options: (q.options || []).map(({ id: _oid, ...opt }) => opt),
    }));

    const payload = {
      title: selSubject ? `${selSubject} Quiz` : 'New Quiz',
      teacherId: teacherId,
      subject: selSubject || null,
      year: selYear || null,
      division: selDivision || null,
      subDiv: selSubDiv || null,
      questions: sanitisedQuestions,
      duration: quizTimeLimit,
      shuffle,
      autoGrade,
      lockBrowser,
      total: 0,
    };

    const { data } = await axiosInstance.post('/quiz', payload);

    if (!data.success) {
      throw new Error(data.message || 'Publish failed');
    }

    const saved = data.data;

    const newQuiz = {
      _id: saved._id,
      title: saved.title,
      class: saved.class,
      subject: saved.subject,
      questions: saved.questions.length,
      duration: `${saved.duration} min`,
      status: saved.status,
      statusColor: '#F59E0B',
      submissions: 0,
      total: saved.total || 0,
    };

    showToast('🚀 Quiz published!', 'green');

    setTimeout(() => {
      navigation.navigate('QuizzSessionScreen', {
        newQuiz,
        publishedAt: Date.now(),
      });
    }, 1800);

  } catch (err) {
    console.error('Publish error:', err);
    showToast(
      `❌ ${err?.response?.data?.message || err.message || 'Publish failed'}`,
      'red'
    );
  } finally {
    setPublishing(false);
  }
};
  // ─────────────────────────────────────────────────────────────────────

  const metaParts = [
    selSubject,
    selYear ? YEARS.find(y => y.value === selYear)?.label : null,
    selDivision && `Div ${selDivision}`,
    selSubDiv && `Sub ${selSubDiv}`,
    `${totalPoints} pts`,
  ].filter(Boolean);

  return (
    <View style={b.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── TOPBAR ── */}
      <View style={b.topbar}>
        <View style={b.topbarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={b.backBtn} activeOpacity={0.7}>
            <Text style={b.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={b.logoIcon}><Text style={{ fontSize: 14 }}>🎓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={b.logoText}>UniVerse</Text>
            <Text style={b.quizMeta} numberOfLines={1}>{metaParts.join(' · ')}</Text>
          </View>
        </View>
        <View style={b.topbarRight}>
          <TouchableOpacity style={b.btnGhost} onPress={() => setActiveId(questions[questions.length - 1].id)}>
            <Text style={b.btnGhostText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={b.btnGhost} onPress={() => showToast('💾 Draft saved!')}>
            <Text style={b.btnGhostText}>Save</Text>
          </TouchableOpacity>
          {/* ── CHANGED: spinner while publishing ── */}
          <TouchableOpacity
            style={[b.btnPrimary, publishing && { opacity: 0.6 }]}
            onPress={publishQuiz}
            disabled={publishing}
            activeOpacity={0.8}>
            {publishing
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={b.btnPrimaryText}>Publish</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={b.settingsBtn} onPress={() => setSettingsOpen(true)}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── QUESTION STRIP ── */}
      <View style={b.strip}>
        <Text style={b.stripLabel}>QUESTIONS</Text>
        <View style={b.stripDivider} />
        <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={b.stripScroll}>
          {questions.map((q, i) => {
            const isActive   = q.id === activeId;
            const hasCorrect = q.type === 'mc' ? q.options.some(o => o.correct)
                             : q.type === 'tf' ? q.tfAnswer !== null
                             : q.text.trim() !== '';
            return (
              <TouchableOpacity key={q.id} style={[b.pill, isActive && b.pillActive]} onPress={() => setActiveId(q.id)} activeOpacity={0.75}>
                <View style={[b.pillNum, isActive && b.pillNumActive]}>
                  <Text style={[b.pillNumText, isActive && { color: C.white }]}>{i + 1}</Text>
                </View>
                <View>
                  <Text style={[b.pillTitle, isActive && { color: C.accent }]} numberOfLines={1}>
                    {q.text.trim() || 'Untitled'}
                  </Text>
                  <Text style={b.pillMeta}>{q.type === 'mc' ? 'MC' : q.type === 'tf' ? 'T/F' : 'SA'} · {q.points}pts</Text>
                </View>
                <View style={[b.pillDot, { backgroundColor: hasCorrect ? C.green : C.amber }]} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={b.addPill} onPress={addQuestion} activeOpacity={0.75}>
            <Text style={b.addPillText}>＋ Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── EDITOR ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
        <ScrollView style={b.editor} contentContainerStyle={b.editorContent} keyboardShouldPersistTaps="handled">

          <View style={b.card}>
            <View style={b.cardHeader}>
              <View style={b.cardHeaderLeft}>
                <View style={b.qBadge}><Text style={b.qBadgeText}>{activeIdx + 1}</Text></View>
                <Text style={b.cardTitle}>Question Editor</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={b.typeTabs}>
                  {[['mc','Multiple Choice'],['tf','True/False'],['sa','Short Answer']].map(([val, label]) => (
                    <TouchableOpacity key={val} style={[b.typeTab, activeQ.type === val && b.typeTabActive]} onPress={() => updateQuestion(activeQ.id, { type: val })}>
                      <Text style={[b.typeTabText, activeQ.type === val && b.typeTabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={b.cardBody}>
              <Text style={b.fieldLabel}>QUESTION TEXT</Text>
              <TextInput style={b.qTextarea} placeholder="Enter your question here…" placeholderTextColor={C.textMuted} multiline value={activeQ.text} onChangeText={val => updateQuestion(activeQ.id, { text: val })} />
              <View style={b.mediaRow}>
                <TouchableOpacity style={b.mediaBtn} onPress={() => showToast('🖼 Image upload coming soon')}>
                  <Text style={b.mediaBtnText}>🖼 Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={b.mediaBtn} onPress={() => showToast('∑ Equation editor coming soon')}>
                  <Text style={b.mediaBtnText}>∑ Equation</Text>
                </TouchableOpacity>
              </View>
              <View style={b.divider} />
              <Text style={b.answersLabel}>ANSWER OPTIONS</Text>

              {activeQ.type === 'mc' && <AnswersMC question={activeQ} onUpdateQuestion={updateQuestion} showToast={showToast} />}

              {activeQ.type === 'tf' && (
                <View style={b.tfRow}>
                  {[true, false].map(val => (
                    <TouchableOpacity key={String(val)} style={[b.tfCard, activeQ.tfAnswer === val && (val ? b.tfCardTrue : b.tfCardFalse)]} onPress={() => updateQuestion(activeQ.id, { tfAnswer: activeQ.tfAnswer === val ? null : val })}>
                      <Text style={b.tfIcon}>{val ? '✅' : '❌'}</Text>
                      <Text style={b.tfLabel}>{val ? 'True' : 'False'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activeQ.type === 'sa' && (
                <View>
                  <View style={b.saBox}><Text style={b.saBoxText}>Students will type their answer here…</Text></View>
                  <Text style={b.saHint}>Short answer questions are graded manually.</Text>
                </View>
              )}
            </View>

            <View style={b.cardFooter}>
              <View style={b.footerLeft}>
                <Stepper label="POINTS"    value={activeQ.points}    min={1} max={100} onChange={v => updateQuestion(activeQ.id, { points: v })} />
                <Stepper label="TIME (MIN)" value={activeQ.timeLimit} min={1} max={60}  onChange={v => updateQuestion(activeQ.id, { timeLimit: v })} />
              </View>
              <View style={b.footerActions}>
                <TouchableOpacity style={b.iconBtn} onPress={() => duplicateQuestion(activeQ.id)}><Text>📋</Text></TouchableOpacity>
                <TouchableOpacity style={[b.iconBtn, b.iconBtnDanger]} onPress={() => deleteQuestion(activeQ.id)}><Text>🗑</Text></TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={b.navBar}>
            <TouchableOpacity onPress={() => activeIdx > 0 && setActiveId(questions[activeIdx - 1].id)} disabled={activeIdx === 0} style={[b.navBtn, activeIdx === 0 && { opacity: 0.3 }]}>
              <Text style={b.navBtnText}>← Previous</Text>
            </TouchableOpacity>
            <Text style={b.navCount}>{activeIdx + 1} / {questions.length}</Text>
            <TouchableOpacity onPress={() => activeIdx === questions.length - 1 ? addQuestion() : setActiveId(questions[activeIdx + 1].id)} style={b.navBtn}>
              <Text style={[b.navBtnText, { color: C.accent }]}>{activeIdx === questions.length - 1 ? '＋ New →' : 'Next →'}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── IN-BUILDER SETTINGS MODAL ── */}
      <InBuilderSettingsModal
        visible={settingsOpen} onClose={() => setSettingsOpen(false)}
        shuffle={shuffle} setShuffle={setShuffle}
        autoGrade={autoGrade} setAutoGrade={setAutoGrade}
        lockBrowser={lockBrowser} setLockBrowser={setLockBrowser}
        quizTimeLimit={quizTimeLimit} setQuizTimeLimit={setQuizTimeLimit}
        selYear={selYear} setSelYear={setSelYear}
        selDivision={selDivision} setSelDivision={setSelDivision}
        selSubDiv={selSubDiv} setSelSubDiv={setSelSubDiv}
        selSubject={selSubject} setSelSubject={setSelSubject}
        questions={questions} totalPoints={totalPoints} totalTime={totalTime}
        showToast={showToast}
      />

      {/* ── TOAST ── */}
      {toast && (
        <Animated.View style={[b.toast, {
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0,1], outputRange: [40, 0] }) }],
          backgroundColor: toast.type === 'red' ? C.red : toast.type === 'amber' ? C.amber : C.green,
        }]}>
          <Text style={b.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   IN-BUILDER SETTINGS MODAL
══════════════════════════════════════════════════════════════════════ */
function InBuilderSettingsModal({
  visible, onClose,
  shuffle, setShuffle, autoGrade, setAutoGrade, lockBrowser, setLockBrowser,
  quizTimeLimit, setQuizTimeLimit,
  selYear, setSelYear, selDivision, setSelDivision,
  selSubDiv, setSelSubDiv, selSubject, setSelSubject,
  questions, totalPoints, totalTime, showToast,
}) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const b = makeB(C);
  const ss = makeSS(C);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={b.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={b.modalSheet}>
          <View style={b.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={b.modalHeaderRow}>
              <Text style={b.modalTitle}>⚙️ Quiz Settings</Text>
              <TouchableOpacity onPress={onClose} style={b.modalCloseBtn}>
                <Text style={b.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={b.sectionLabel}>OPTIONS</Text>
            <View style={b.settingsCard}>
              <ToggleRow label="Shuffle Questions" sub="Randomize for each student" value={shuffle} onToggle={setShuffle} />
             
              <View style={b.settingsCardDivider} />
              <ToggleRow label="Lock Browser" sub="Prevent tab switching" value={lockBrowser} onToggle={setLockBrowser} />
            </View>

            <Text style={b.sectionLabel}>CLASS &amp; DIVISION</Text>
            <View style={b.settingsCard}>
              <Text style={b.cdLabel}>Year</Text>
              <View style={b.chipRow}>
                {YEARS.map(y => (
                  <TouchableOpacity key={y.value} style={[b.chip, selYear === y.value && b.chipActive]} onPress={() => setSelYear(selYear === y.value ? null : y.value)}>
                    <Text style={[b.chipText, selYear === y.value && { color: C.accent }]}>{y.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={b.settingsCardDivider} />
              <Text style={b.cdLabel}>Division <Text style={b.optTag}>optional</Text></Text>
              <View style={b.chipRow}>
                {DIVISIONS.map(d => (
                  <TouchableOpacity key={d} style={[b.chip, selDivision === d && b.chipActive]} onPress={() => setSelDivision(selDivision === d ? null : d)}>
                    <Text style={[b.chipText, selDivision === d && { color: C.accent }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={b.settingsCardDivider} />
              <Text style={b.cdLabel}>Sub Division <Text style={b.optTag}>optional</Text></Text>
              <View style={b.chipRow}>
                {SUB_DIVISIONS.map(sd => (
                  <TouchableOpacity key={sd} style={[b.chip, selSubDiv === sd && b.chipActive]} onPress={() => setSelSubDiv(selSubDiv === sd ? null : sd)}>
                    <Text style={[b.chipText, selSubDiv === sd && { color: C.accent }]}>{sd}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={b.sectionLabel}>TIME LIMIT</Text>
            <View style={b.settingsCard}>
              <Text style={b.cdLabel}>Total Quiz Duration</Text>
              <View style={b.timeLimitRow}>
                <TouchableOpacity style={b.timeLimitBtn} onPress={() => setQuizTimeLimit(v => Math.max(5, v - 5))} activeOpacity={0.7}>
                  <Text style={b.timeLimitBtnText}>−</Text>
                </TouchableOpacity>
                <View style={b.timeLimitDisplay}>
                  <Text style={b.timeLimitValue}>{quizTimeLimit}</Text>
                  <Text style={b.timeLimitUnit}>min</Text>
                </View>
                <TouchableOpacity style={b.timeLimitBtn} onPress={() => setQuizTimeLimit(v => Math.min(180, v + 5))} activeOpacity={0.7}>
                  <Text style={b.timeLimitBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={b.presetRow}>
                {[15, 30, 45, 60, 90].map(preset => (
                  <TouchableOpacity
                    key={preset}
                    style={[b.chip, quizTimeLimit === preset && b.chipActive]}
                    onPress={() => setQuizTimeLimit(preset)}
                    activeOpacity={0.75}>
                    <Text style={[b.chipText, quizTimeLimit === preset && { color: C.accent }]}>{preset}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={b.sectionLabel}>QUIZ SUMMARY</Text>
            <View style={b.summaryCard}>
              <View style={b.summaryGrid}>
                <View style={b.summaryStat}>
                  <Text style={b.summaryStatLabel}>QUESTIONS</Text>
                  <Text style={b.summaryStatVal}>{questions.length}</Text>
                </View>
                <View style={b.summaryStat}>
                  <Text style={b.summaryStatLabel}>TOTAL POINTS</Text>
                  <Text style={[b.summaryStatVal, { color: C.accent }]}>{totalPoints}</Text>
                </View>
              </View>
              <View style={b.summaryDivider} />
              <Text style={b.summaryStatLabel}>ESTIMATED TIME</Text>
              <Text style={[b.summaryStatVal, { color: C.amber, fontSize: 22 }]}>{totalTime}m</Text>
            </View>

            <TouchableOpacity style={b.printBtn} onPress={() => showToast('🖨️ Sending to printer…')}>
              <Text style={b.printBtnText}>🖨️ Print Worksheet</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ANSWERS MC
══════════════════════════════════════════════════════════════════════ */
function AnswersMC({ question, onUpdateQuestion, showToast }) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const b = makeB(C);
  const addOption = () => {
    if (question.options.length >= 6) { showToast('Max 6 options', 'amber'); return; }
    onUpdateQuestion(question.id, { options: [...question.options, { id: uid(), text: '', correct: false }] });
  };
  const deleteOption = (optId) => {
    if (question.options.length <= 2) { showToast('Minimum 2 options', 'amber'); return; }
    onUpdateQuestion(question.id, { options: question.options.filter(o => o.id !== optId) });
  };
  const markCorrect = (optId) => {
    onUpdateQuestion(question.id, { options: question.options.map(o => ({ ...o, correct: o.id === optId })) });
  };
  const updateText = (optId, text) => {
    onUpdateQuestion(question.id, { options: question.options.map(o => o.id === optId ? { ...o, text } : o) });
  };
  return (
    <View>
      {question.options.map((opt, i) => (
        <View key={opt.id} style={[b.answerItem, opt.correct && b.answerItemCorrect]}>
          <TouchableOpacity style={[b.radio, opt.correct && b.radioCorrect]} onPress={() => markCorrect(opt.id)}>
            {opt.correct && <View style={b.radioDot} />}
          </TouchableOpacity>
          <TextInput style={b.answerInput} placeholder={`Option ${String.fromCharCode(65 + i)}…`} placeholderTextColor={C.textMuted} value={opt.text} onChangeText={t => updateText(opt.id, t)} />
          {opt.correct
            ? <Text style={b.correctBadge}>✓ CORRECT</Text>
            : <TouchableOpacity onPress={() => markCorrect(opt.id)}><Text style={b.markBtn}>MARK</Text></TouchableOpacity>
          }
          <TouchableOpacity onPress={() => deleteOption(opt.id)} style={b.deletOptBtn}>
            <Text style={b.deleteOptText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {question.options.length < 6 && (
        <TouchableOpacity style={b.addOptionBtn} onPress={addOption}>
          <Text style={b.addOptionText}>＋ Add an option…</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STEPPER
══════════════════════════════════════════════════════════════════════ */
function Stepper({ label, value, min, max, onChange }) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const b = makeB(C);
  return (
    <View>
      <Text style={b.stepperLabel}>{label}</Text>
      <View style={b.stepper}>
        <TouchableOpacity style={b.stepperBtn} onPress={() => onChange(Math.max(min, value - 1))}>
          <Text style={b.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={b.stepperVal}>{value}</Text>
        <TouchableOpacity style={b.stepperBtn} onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={b.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TOGGLE ROW
══════════════════════════════════════════════════════════════════════ */
function ToggleRow({ label, sub, value, onToggle }) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: C.border, true: C.accent }} thumbColor={C.white} ios_backgroundColor={C.border} />
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STYLES — SETUP SCREEN
══════════════════════════════════════════════════════════════════════ */
const makeSS = (C) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  topbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 20, paddingBottom: 14, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:{ fontSize: 14, color: C.textSec, fontWeight: '700' },
  topbarTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  scroll:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginBottom: 8, marginTop: 20 },
  card:         { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  hr:           { height: 1, backgroundColor: C.border },

  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel:  { fontSize: 12, fontWeight: '700', color: C.textSec },
  optBadge:    { backgroundColor: C.borderLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  optBadgeText:{ fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerOpen:     { borderColor: C.accent + '70', backgroundColor: C.accentSoft },
  pickerSelected: { borderColor: C.accent + '60' },
  pickerText:     { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  pickerPlaceholder: { color: C.textMuted },
  pickerRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearX:         { fontSize: 12, color: C.textMuted, fontWeight: '700' },
  arrow:          { fontSize: 20, color: C.textSec },

  dropdown:       { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  dropItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  dropItemActive: { backgroundColor: C.accentSoft },
  dropText:       { fontSize: 14, fontWeight: '600', color: C.text },

  selBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accent + '50' },
  selDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  selBadgeText: { fontSize: 12, fontWeight: '600', color: C.accent, flex: 1 },

  proceedBtn:     { marginTop: 26, paddingVertical: 16, borderRadius: 13, backgroundColor: C.accent, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  proceedBtnText: { fontSize: 16, fontWeight: '800', color: C.white },
  skipNote:       { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 17 },

  timeLimitRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  timeLimitBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: C.borderLight, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  timeLimitBtnText:{ fontSize: 22, color: C.text, fontWeight: '700', lineHeight: 28 },
  timeLimitDisplay:{ alignItems: 'center', minWidth: 80 },
  timeLimitValue:  { fontSize: 40, fontWeight: '900', color: C.accent, lineHeight: 46 },
  timeLimitUnit:   { fontSize: 12, fontWeight: '700', color: C.textSec, marginTop: -2 },
  presetRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  presetChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  presetChipActive:{ backgroundColor: C.accentSoft, borderColor: C.accent },
  presetChipText:  { fontSize: 13, fontWeight: '700', color: C.textSec },
});

/* ══════════════════════════════════════════════════════════════════════
   STYLES — BUILDER
══════════════════════════════════════════════════════════════════════ */
const makeB = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  topbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  topbarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn:     { width: 32, height: 32, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: C.textSec, lineHeight: 26, marginTop: -2 },
  logoIcon:    { width: 28, height: 28, backgroundColor: C.accent, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText:    { fontSize: 14, fontWeight: '800', color: C.text },
  quizMeta:    { fontSize: 10, color: C.textSec, marginTop: 1, maxWidth: 200 },
  btnGhost:    { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: C.border },
  btnGhostText:{ fontSize: 11, fontWeight: '700', color: C.textSec },
  btnPrimary:  { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 7, backgroundColor: C.accent, minWidth: 66, alignItems: 'center' }, // ← minWidth for spinner
  btnPrimaryText: { fontSize: 11, fontWeight: '700', color: C.white },
  settingsBtn: { paddingHorizontal: 8, paddingVertical: 6 },

  strip:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, paddingLeft: 14, paddingVertical: 10 },
  stripLabel:  { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, flexShrink: 0 },
  stripDivider:{ width: 1, height: 26, backgroundColor: C.border, marginHorizontal: 10, flexShrink: 0 },
  stripScroll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, position: 'relative' },
  pillActive:  { backgroundColor: C.accentGlow, borderColor: C.accent },
  pillNum:     { width: 20, height: 20, borderRadius: 6, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' },
  pillNumActive: { backgroundColor: C.accent },
  pillNumText: { fontSize: 10, fontWeight: '800', color: C.textSec },
  pillTitle:   { fontSize: 11, fontWeight: '600', color: C.text, maxWidth: 90 },
  pillMeta:    { fontSize: 9, color: C.textMuted, marginTop: 1 },
  pillDot:     { width: 5, height: 5, borderRadius: 3, position: 'absolute', top: 5, right: 5 },
  addPill:     { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderLight },
  addPillText: { fontSize: 12, fontWeight: '700', color: C.textSec },

  editor:        { flex: 1 },
  editorContent: { padding: 16, gap: 14 },
  card:          { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardHeader:    { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  cardHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  qBadge:        { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  qBadgeText:    { fontSize: 14, fontWeight: '800', color: C.white },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: C.text },
  typeTabs:      { flexDirection: 'row', gap: 6 },
  typeTab:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: C.border },
  typeTabActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  typeTabText:   { fontSize: 11, fontWeight: '600', color: C.textSec },
  typeTabTextActive: { color: C.accent },
  cardBody:      { padding: 16 },
  fieldLabel:    { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 8 },
  qTextarea:     { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, color: C.text, fontSize: 14, padding: 12, minHeight: 90, textAlignVertical: 'top' },
  mediaRow:      { flexDirection: 'row', gap: 8, marginTop: 10 },
  mediaBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: C.border },
  mediaBtnText:  { fontSize: 11, fontWeight: '600', color: C.textSec },
  divider:       { borderTopWidth: 1, borderTopColor: C.border, marginVertical: 14 },
  answersLabel:  { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 10 },

  answerItem:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 8 },
  answerItemCorrect: { borderColor: C.green, backgroundColor: C.greenSoft },
  radio:             { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.borderLight, alignItems: 'center', justifyContent: 'center' },
  radioCorrect:      { borderColor: C.green, backgroundColor: C.green },
  radioDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: C.white },
  answerInput:       { flex: 1, color: C.text, fontSize: 13, fontWeight: '500' },
  correctBadge:      { fontSize: 9, fontWeight: '800', color: C.green, letterSpacing: 0.5 },
  markBtn:           { fontSize: 9, fontWeight: '800', color: C.textMuted, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  deletOptBtn:       { paddingHorizontal: 5, paddingVertical: 3 },
  deleteOptText:     { fontSize: 12, color: C.red },
  addOptionBtn:      { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderLight, marginTop: 4 },
  addOptionText:     { fontSize: 13, fontWeight: '600', color: C.textSec },

  tfRow:     { flexDirection: 'row', gap: 12 },
  tfCard:    { flex: 1, padding: 18, borderRadius: 10, borderWidth: 2, borderColor: C.border, backgroundColor: C.surface, alignItems: 'center' },
  tfCardTrue:{ borderColor: C.green, backgroundColor: C.greenSoft },
  tfCardFalse:{ borderColor: C.red, backgroundColor: C.redSoft },
  tfIcon:    { fontSize: 24, marginBottom: 6 },
  tfLabel:   { fontSize: 14, fontWeight: '700', color: C.text },

  saBox:     { padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.surface },
  saBoxText: { fontSize: 13, color: C.textMuted },
  saHint:    { fontSize: 11, color: C.textMuted, marginTop: 8, fontStyle: 'italic' },

  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface, gap: 10 },
  footerLeft:   { flexDirection: 'row', gap: 20, alignItems: 'flex-end' },
  footerActions:{ flexDirection: 'row', gap: 8 },
  stepperLabel: { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1, marginBottom: 5 },
  stepper:      { flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  stepperBtn:   { width: 28, height: 32, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText:{ fontSize: 16, color: C.textSec, fontWeight: '700' },
  stepperVal:   { paddingHorizontal: 12, lineHeight: 32, height: 32, backgroundColor: C.surface, color: C.text, fontSize: 14, fontWeight: '700' },
  iconBtn:      { width: 32, height: 32, borderRadius: 7, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  iconBtnDanger:{ borderColor: C.redSoft },

  navBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  navBtn:    { paddingVertical: 8, paddingHorizontal: 4 },
  navBtnText:{ fontSize: 13, fontWeight: '700', color: C.textSec },
  navCount:  { fontSize: 11, fontWeight: '600', color: C.textMuted },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20, borderTopWidth: 1, borderTopColor: C.border, maxHeight: '92%' },
  modalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle:     { fontSize: 17, fontWeight: '800', color: C.text },
  modalCloseBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  modalCloseTxt:  { fontSize: 13, color: C.textSec, fontWeight: '700' },

  sectionLabel:       { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginBottom: 8, marginTop: 16 },
  settingsCard:       { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, gap: 4 },
  settingsCardDivider:{ height: 1, backgroundColor: C.border, marginVertical: 8 },
  cdLabel:            { fontSize: 11, fontWeight: '700', color: C.textSec, marginBottom: 8 },
  optTag:             { fontSize: 9, color: C.textMuted, fontWeight: '600' },
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:               { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive:         { backgroundColor: C.accentSoft, borderColor: C.accent },
  chipText:           { fontSize: 13, fontWeight: '600', color: C.textSec },

  dueDateRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  dueDateText: { fontSize: 13, fontWeight: '600', color: C.text },
  dueDateArrow:{ fontSize: 18, color: C.textSec },

  timeLimitRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8 },
  timeLimitBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.borderLight, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  timeLimitBtnText:{ fontSize: 20, color: C.text, fontWeight: '700', lineHeight: 26 },
  timeLimitDisplay:{ alignItems: 'center', minWidth: 70 },
  timeLimitValue:  { fontSize: 34, fontWeight: '900', color: C.accent, lineHeight: 40 },
  timeLimitUnit:   { fontSize: 11, fontWeight: '700', color: C.textSec, marginTop: -2 },
  presetRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },

  summaryCard:      { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  summaryGrid:      { flexDirection: 'row', gap: 16, marginBottom: 10 },
  summaryStat:      { flex: 1 },
  summaryStatLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },
  summaryStatVal:   { fontSize: 24, fontWeight: '900', color: C.text, marginTop: 2 },
  summaryDivider:   { height: 1, backgroundColor: C.border, marginBottom: 10 },

  printBtn:     { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  printBtnText: { fontSize: 13, fontWeight: '600', color: C.textSec },

  toast:     { position: 'absolute', bottom: 32, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  toastText: { fontSize: 13, fontWeight: '700', color: C.white },
});