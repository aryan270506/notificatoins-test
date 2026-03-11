// Screens/Teacher/Attendance.js
// ✅ Redesigned UI — All selections visible upfront with confirm button

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Colors ─────────────────────────────────────────────────────────────────── */
const COLORS_DARK = {
  bg:            '#080A10',
  surface:       '#0F1220',
  surfaceEl:     '#161C2E',
  border:        '#1C2235',
  accent:        '#22D3EE',
  accentSoft:    'rgba(34,211,238,0.12)',
  green:         '#22C55E',
  greenSoft:     'rgba(34,197,94,0.15)',
  red:           '#F43F5E',
  redSoft:       'rgba(244,63,94,0.15)',
  yellow:        '#FBBF24',
  purple:        '#A78BFA',
  textPrimary:   '#EEF2FF',
  textSecondary: '#8B96B2',
  textMuted:     '#3B4260',
};
const COLORS_LIGHT = {
  bg:            '#F1F4FD',
  surface:       '#FFFFFF',
  surfaceEl:     '#EAEEf9',
  border:        '#DDE3F4',
  accent:        '#0891B2',
  accentSoft:    'rgba(8,145,178,0.10)',
  green:         '#16A34A',
  greenSoft:     'rgba(22,163,74,0.10)',
  red:           '#DC2626',
  redSoft:       'rgba(220,38,38,0.10)',
  yellow:        '#D97706',
  purple:        '#7C3AED',
  textPrimary:   '#0F172A',
  textSecondary: '#4B5563',
  textMuted:     '#9CA3AF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const CLASS_TO_YEAR = { FY: '1', SY: '2', TY: '3' };
const LAB_BATCHES   = ['Batch 1', 'Batch 2', 'Batch 3'];

/* ─── RECENT sessions key for AsyncStorage ──────────────────────────────── */
const RECENT_SESSIONS_KEY = 'recentAttendanceSessions';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fetchStudentsAPI = async ({ year, division, batch }) => {
  const params = { year, division };
  if (batch) params.batch = batch;
  const res = await axiosInstance.get('/students', { params });
  const studentsList = res.data?.data || [];
  return studentsList.map(s => ({
    name:     s.name,
    roll:     s.roll_no,
    roll_no:  s.roll_no,
    _id:      s._id,
    id:       s.id,
    prn:      s.prn,
    subjects: s.subjects || [],
    lab:      s.lab || [],
  }));
};

/* ─── Persist recent session to AsyncStorage ──────────────────────────────── */
const saveRecentSession = async (session) => {
  try {
    const raw  = await AsyncStorage.getItem(RECENT_SESSIONS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(s => s._id !== session._id);
    const updated  = [session, ...filtered].slice(0, 50);
    await AsyncStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updated));
  } catch (_) {}
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Attendance() {
  const { isDark } = useContext(ThemeContext);
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const s = makeStyles(COLORS);
  const navigation = useNavigation();
  const route      = useRoute();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;

  // ── Resolve teacherId from every possible route param shape
  const [teacherId, setTeacherId] = useState(
    route?.params?.teacherId      ||
    route?.params?.teacher?._id   ||
    route?.params?.user?._id      ||
    route?.params?.userData?._id  ||
    null
  );

  // Fallback: load from AsyncStorage if not in params
  useEffect(() => {
    if (!teacherId) {
      AsyncStorage.getItem('teacherId').then(id => { if (id) setTeacherId(id); }).catch(() => {});
    }
  }, []);

  // Selection states
  const [selClass,        setSelClass]        = useState(null);
  const [selDivision,     setSelDivision]      = useState(null);
  const [selType,         setSelType]          = useState(null);
  const [selBatch,        setSelBatch]         = useState(null);
  const [selSubject,      setSelSubject]       = useState(null);
  
  // Session & students
  const [attendance,      setAttendance]       = useState({});
  const [activeSession,   setActiveSession]    = useState(null);
  const [sessionCreated,  setSessionCreated]   = useState(false);
  const [submitCount,     setSubmitCount]      = useState(0);
  const [submitting,      setSubmitting]       = useState(false);
  const [students,        setStudents]         = useState([]);
  const [loadingStudents, setLoadingStudents]  = useState(false);
  const [fetchError,      setFetchError]       = useState(null);

  // Timetable-based options
  const [timetableData,   setTimetableData]    = useState([]);
  const [classOptions,    setClassOptions]     = useState([]);
  const [divisionOptions, setDivisionOptions]  = useState({});
  const [subjectOptions,  setSubjectOptions]   = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);

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

  /* ── Fetch timetable options ── */
  const fetchTimetableOptions = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
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
      setTimetableData([]);
      setClassOptions(['FY', 'SY', 'TY']);
      setDivisionOptions({ FY: ['A', 'B', 'C'], SY: ['A', 'B', 'C'], TY: ['A', 'B', 'C'] });
      setSubjectOptions([
        'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
        'English', 'Data Structures', 'Algorithms', 'Electronics',
        'Thermodynamics', 'Database Management', 'Operating Systems', 'Other',
      ]);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTimetableOptions();
  }, [fetchTimetableOptions]);

  // Update filtered subjects when class and division change
  useEffect(() => {
    if (selClass && selDivision && timetableData.length > 0) {
      const subjects = [...new Set(
        timetableData
          .filter(item => item.year === selClass && item.division === selDivision)
          .map(item => item.subject)
      )].sort();
      setFilteredSubjects(subjects.length > 0 ? subjects : subjectOptions);
    } else {
      setFilteredSubjects(subjectOptions);
    }
  }, [selClass, selDivision, timetableData, subjectOptions]);

  /* ── Load students ── */
  const loadStudents = useCallback(async (sess) => {
    setLoadingStudents(true);
    setFetchError(null);
    try {
      let fetched = await fetchStudentsAPI({
        year:     sess.class,
        division: sess.division,
        batch:    null, // Backend doesn't filter by batch yet
      });

      // Filter by batch on frontend if Lab session
      if (sess.type === 'Lab' && sess.batch) {
        const batchNum = sess.batch.replace('Batch ', ''); // "Batch 1" → "1"
        const batchPattern = `${sess.division}${batchNum}`; // "A" + "1" → "A1"
        fetched = fetched.filter(s => s.roll.includes(batchPattern));
      }

      setStudents(fetched);
      const init = {};
      fetched.forEach(s => { init[s.roll] = 'absent'; }); // Start with absent
      setAttendance(init);
    } catch (err) {
      setFetchError(err.response?.data?.message || err.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  /* ── Handle confirm session ── */
  const handleConfirmSession = async () => {
    // Validation
    if (!selClass) {
      Alert.alert('Missing Selection', 'Please select a class.');
      return;
    }
    if (!selDivision) {
      Alert.alert('Missing Selection', 'Please select a division.');
      return;
    }
    if (!selType) {
      Alert.alert('Missing Selection', 'Please select session type (Theory or Lab).');
      return;
    }
    if (selType === 'Lab' && !selBatch) {
      Alert.alert('Missing Selection', 'Please select a lab batch.');
      return;
    }
    if (!selSubject) {
      Alert.alert('Missing Selection', 'Please select a subject.');
      return;
    }

    const session = {
      class: selClass,
      division: selDivision,
      type: selType,
      batch: selBatch || null,
      subject: selSubject,
    };

    setActiveSession(session);
    setSessionCreated(true);
    listFadeAnim.setValue(0);
    listSlideAnim.setValue(30);
    
    await loadStudents(session);
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(listFadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(listSlideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const resetForm = () => {
    setSelClass(null); setSelDivision(null); setSelType(null); 
    setSelBatch(null); setSelSubject(null);
    setAttendance({}); setSessionCreated(false); setActiveSession(null);
    setStudents([]); setFetchError(null);
    listFadeAnim.setValue(0);
  };

  /* ── Mark all present / all absent shortcuts ── */
  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.roll] = status; });
    setAttendance(updated);
  };

  const toggleStatus = (roll) =>
    setAttendance(prev => ({ ...prev, [roll]: prev[roll] === 'present' ? 'absent' : 'present' }));

  const counts = {
    present: students.filter(s => attendance[s.roll] === 'present').length,
    absent:  students.filter(s => attendance[s.roll] === 'absent').length,
    total:   students.length,
  };

  /* ── Submit attendance ── */
  const handleSubmit = async () => {
    if (!activeSession || students.length === 0) {
      Alert.alert('Error', 'No active session or students loaded.');
      return;
    }
    setSubmitting(true);
    try {
      const studentsPayload = students.map(s => ({
        studentId: s._id,
        status:    attendance[s.roll] === 'present' ? 'Present' : 'Absent',
      }));

      const payload = {
        subject:  activeSession.subject,
        year:     activeSession.class,
        division: activeSession.division,
        batch:    activeSession.batch || null,
        date:     new Date().toISOString(),
        students: studentsPayload,
      };
      if (teacherId) payload.teacherId = teacherId;

      const res = await axiosInstance.post('/attendance/mark', payload);
      const savedSession = res.data.session;

      await saveRecentSession(savedSession);

      setSubmitCount(c => c + 1);
      resetForm();

      Alert.alert(
        '✅ Attendance Submitted',
        `${counts.present} present, ${counts.absent} absent recorded.`,
        [
          { text: 'Done', style: 'cancel' },
          { text: 'View Records', onPress: () => navigation.navigate('AttendanceRecord', { teacherId, newAttendanceRecord: savedSession }) },
        ]
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Submit failed';
      if (err.response?.status === 409) {
        Alert.alert(
          'Already Submitted',
          'Attendance for this session was already marked today.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Records', onPress: () => navigation.navigate('AttendanceRecord', { teacherId }) },
          ]
        );
      } else {
        Alert.alert('Submit Failed', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Check if session can be confirmed
  const canConfirm = selClass && selDivision && selType && selSubject && 
                     (selType === 'Theory' || (selType === 'Lab' && selBatch));

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
              <Text style={s.screenTitle}>Take Attendance</Text>
              <Text style={s.screenSub}>Configure session and mark attendance</Text>
            </View>
            <View style={s.headerBtns}>
              {/* Recent button */}
              <TouchableOpacity
                style={s.recentBtn}
                onPress={() => navigation.navigate('AttendanceRecord', { teacherId })}
                activeOpacity={0.8}>
                <Ionicons name="time-outline" size={14} color={COLORS.accent} />
                <Text style={s.recentBtnText}>Recent</Text>
                {submitCount > 0 && (
                  <View style={s.recentBadge}>
                    <Text style={s.recentBadgeText}>{submitCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Header submit button (visible only when list is ready) */}
              {sessionCreated && !loadingStudents && students.length > 0 && (
                <TouchableOpacity
                  style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}>
                  {submitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={s.submitBtnText}>Submit</Text></>}
                </TouchableOpacity>
              )}
            </View>
          </View>

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
                    {activeSession.type}  ·  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={resetForm} style={s.sessionBannerClear}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── SESSION CONFIGURATION (Always visible until confirmed) ── */}
          {!sessionCreated && (
            <View style={s.configCard}>
              <View style={s.configHeader}>
                <View style={s.configHeaderIcon}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.accent} />
                </View>
                <Text style={s.configHeaderTitle}>Session Configuration</Text>
              </View>

              {/* Class Selection */}
              <View style={s.configSection}>
                <Text style={s.configLabel}>Class (Year)</Text>
                <View style={s.chipRow}>
                  {classOptions.map(c => (
                    <TouchableOpacity key={c}
                      onPress={() => {
                        setSelClass(c);
                        setSelDivision(null);
                        setSelSubject(null);
                      }}
                      style={[s.chip, selClass === c && s.chipActive]}>
                      <Text style={[s.chipText, selClass === c && s.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Division Selection */}
              <View style={s.configSection}>
                <Text style={s.configLabel}>Division</Text>
                <View style={s.chipRow}>
                  {selClass ? (
                    (divisionOptions[selClass] || []).map(d => (
                      <TouchableOpacity key={d}
                        onPress={() => {
                          setSelDivision(d);
                          setSelSubject(null);
                        }}
                        style={[s.chip, selDivision === d && s.chipActive]}>
                        <Text style={[s.chipText, selDivision === d && s.chipTextActive]}>Div {d}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={s.placeholderText}>Select a class first</Text>
                  )}
                </View>
              </View>

              {/* Session Type Selection */}
              <View style={s.configSection}>
                <Text style={s.configLabel}>Session Type</Text>
                <View style={s.typeCardRow}>
                  {['Theory', 'Lab'].map(t => (
                    <TouchableOpacity key={t}
                      onPress={() => {
                        setSelType(t);
                        if (t === 'Theory') setSelBatch(null);
                      }}
                      style={[s.typeCard, selType === t && s.typeCardActive]}>
                      <Ionicons 
                        name={t === 'Theory' ? 'book-outline' : 'flask-outline'} 
                        size={24}
                        color={selType === t ? COLORS.accent : COLORS.textMuted} 
                      />
                      <Text style={[s.typeLabel, selType === t && { color: COLORS.accent }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Batch Selection (Lab only) */}
              {selType === 'Lab' && (
                <View style={s.configSection}>
                  <Text style={s.configLabel}>Lab Batch</Text>
                  <View style={s.chipRow}>
                    {LAB_BATCHES.map(b => (
                      <TouchableOpacity key={b}
                        onPress={() => setSelBatch(b)}
                        style={[
                          s.chip, 
                          selBatch === b && { 
                            ...s.chipActive, 
                            borderColor: COLORS.yellow, 
                            backgroundColor: COLORS.yellow + '20' 
                          }
                        ]}>
                        <Text style={[
                          s.chipText, 
                          selBatch === b && { color: COLORS.yellow }
                        ]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Subject Selection */}
              <View style={s.configSection}>
                <Text style={s.configLabel}>Subject</Text>
                <View style={s.chipRow}>
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map(sub => (
                      <TouchableOpacity key={sub}
                        onPress={() => setSelSubject(sub)}
                        style={[s.chip, selSubject === sub && s.chipActive]}>
                        <Text style={[s.chipText, selSubject === sub && s.chipTextActive]}>{sub}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={s.placeholderText}>Select class and division first</Text>
                  )}
                </View>
              </View>

              {/* Preview Summary */}
              {canConfirm && (
                <View style={s.preview}>
                  <Text style={s.previewTitle}>Session Summary</Text>
                  <View style={s.previewGrid}>
                    {[
                      { icon: 'school-outline', label: 'Class',   val: `${selClass}-${selDivision}${selBatch ? ` · ${selBatch}` : ''}` },
                      { icon: 'book-outline',   label: 'Subject', val: selSubject },
                      { icon: 'layers-outline', label: 'Type',    val: selType },
                    ].map(row => (
                      <View key={row.label} style={s.previewRow}>
                        <Ionicons name={row.icon} size={14} color={COLORS.accent} />
                        <Text style={s.previewLabel}>{row.label}</Text>
                        <Text style={s.previewVal}>{row.val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Confirm Session Button */}
              <TouchableOpacity
                style={[s.confirmSessionBtn, !canConfirm && s.confirmSessionBtnDisabled]}
                onPress={handleConfirmSession}
                disabled={!canConfirm}
                activeOpacity={canConfirm ? 0.8 : 1}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.confirmSessionBtnText}>Confirm Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STUDENT LIST (After session confirmed) ── */}
          {sessionCreated && (
            <Animated.View style={{ opacity: listFadeAnim, transform: [{ translateY: listSlideAnim }] }}>

              {/* Loading */}
              {loadingStudents && (
                <View style={s.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={s.loadingText}>Fetching students…</Text>
                </View>
              )}

              {/* Error */}
              {!loadingStudents && fetchError && (
                <View style={s.errorContainer}>
                  <Ionicons name="cloud-offline-outline" size={32} color={COLORS.red} />
                  <Text style={s.errorTitle}>Could not load students</Text>
                  <Text style={s.errorMsg}>{fetchError}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={() => loadStudents(activeSession)} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={15} color="#fff" />
                    <Text style={s.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Empty */}
              {!loadingStudents && !fetchError && students.length === 0 && (
                <View style={s.errorContainer}>
                  <Ionicons name="people-outline" size={32} color={COLORS.textMuted} />
                  <Text style={s.errorTitle}>No students found</Text>
                  <Text style={s.errorMsg}>
                    No students match {selClass}-{selDivision}
                    {selBatch ? ` · ${selBatch}` : ''} in the database.
                  </Text>
                </View>
              )}

              {/* Student list */}
              {!loadingStudents && !fetchError && students.length > 0 && (
                <>
                  {/* Loaded badge */}
                  <View style={s.sessionReadyBadge}>
                    <Ionicons name="checkmark-circle" size={15} color={COLORS.green} />
                    <Text style={s.sessionReadyText}>
                      {students.length} students loaded  ·  {activeSession.class}-{activeSession.division} {activeSession.type}
                    </Text>
                  </View>

                  {/* Summary cards */}
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

                  {/* Mark All shortcuts */}
                  <View style={s.markAllRow}>
                    <TouchableOpacity style={[s.markAllBtn, { backgroundColor: COLORS.greenSoft, borderColor: COLORS.green + '50' }]}
                      onPress={() => markAll('present')} activeOpacity={0.8}>
                      <Ionicons name="checkmark-done" size={14} color={COLORS.green} />
                      <Text style={[s.markAllText, { color: COLORS.green }]}>All Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.markAllBtn, { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + '50' }]}
                      onPress={() => markAll('absent')} activeOpacity={0.8}>
                      <Ionicons name="close-circle" size={14} color={COLORS.red} />
                      <Text style={[s.markAllText, { color: COLORS.red }]}>All Absent</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Student cards */}
                  <View style={[s.card, s.mx]}>
                    <Text style={s.cardTitle}>Mark Attendance</Text>
                    {students.map((student, i) => {
                      const isPresent = attendance[student.roll] === 'present';
                      return (
                        <View key={student._id || student.roll} style={[
                          s.studentRow,
                          i < students.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
                        ]}>
                          <View style={[s.studentAvatar, {
                            backgroundColor: isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                            borderColor: isPresent ? COLORS.green + '50' : COLORS.red + '50', borderWidth: 1,
                          }]}>
                            <Text style={[s.studentAvatarText, { color: isPresent ? COLORS.green : COLORS.red }]}>
                              {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.studentName}>{student.name}</Text>
                            <Text style={s.studentMeta}>
                              Roll {student.roll_no}{selBatch ? `  ·  ${selBatch}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleStatus(student.roll)}
                            activeOpacity={0.75}
                            style={[s.toggleBtn,
                              isPresent
                                ? { backgroundColor: COLORS.green, borderColor: COLORS.green }
                                : { backgroundColor: COLORS.red,   borderColor: COLORS.red   }]}>
                            <Ionicons name={isPresent ? 'checkmark' : 'close'} size={16} color="#fff" />
                            <Text style={s.toggleBtnText}>{isPresent ? 'Present' : 'Absent'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  {/* Bottom Submit button */}
                  <TouchableOpacity
                    style={[s.submitBtnBottom, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}>
                    {submitting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.submitBtnBottomText}>Submit Attendance</Text></>}
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeStyles = (COLORS) => {
const CARD_BASE = {
  backgroundColor: COLORS.surface, borderRadius: 16,
  borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14,
};
return StyleSheet.create({
  wrapper:   { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  mx:        { marginHorizontal: 20 },

  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, gap: 12 },
  headerWide:  { alignItems: 'center' },
  breadcrumb:  { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, fontFamily: SERIF, marginBottom: 2 },
  screenSub:   { fontSize: 13, color: COLORS.textSecondary },

  headerBtns:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  recentBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: COLORS.accent + '50', backgroundColor: COLORS.accentSoft },
  recentBtnText:   { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  recentBadge:     { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  recentBadgeText: { fontSize: 10, fontWeight: '900', color: '#000' },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4, minWidth: 90, justifyContent: 'center' },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  submitBtnBottom:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.green, marginHorizontal: 20, marginTop: 8, marginBottom: 4, paddingVertical: 15, borderRadius: 14, shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  submitBtnBottomText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  sessionBanner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 14, backgroundColor: COLORS.accentSoft, borderRadius: 12, borderWidth: 1, borderColor: COLORS.accent + '50', paddingHorizontal: 14, paddingVertical: 11 },
  sessionBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sessionBannerDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  sessionBannerTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  sessionBannerSub:   { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sessionBannerClear: { padding: 4 },

  // Configuration Card
  configCard:       { ...CARD_BASE, marginHorizontal: 20 },
  configHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  configHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  configHeaderTitle:{ fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },

  configSection:    { marginBottom: 20 },
  configLabel:      { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 10 },
  
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl },
  chipActive:       { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  chipText:         { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive:   { color: COLORS.accent },

  typeCardRow:      { flexDirection: 'row', gap: 10 },
  typeCard:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl },
  typeCardActive:   { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  typeLabel:        { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },

  placeholderText:  { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 8 },

  preview:          { marginTop: 4, marginBottom: 16, backgroundColor: COLORS.surfaceEl, borderRadius: 14, borderWidth: 1, borderColor: COLORS.accent + '40', padding: 14 },
  previewTitle:     { fontSize: 12, fontWeight: '800', color: COLORS.accent, letterSpacing: 0.5, marginBottom: 10 },
  previewGrid:      { gap: 8 },
  previewRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewLabel:     { fontSize: 11, color: COLORS.textSecondary, width: 70 },
  previewVal:       { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },

  confirmSessionBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 14, shadowColor: COLORS.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  confirmSessionBtnDisabled: { backgroundColor: COLORS.surfaceEl, shadowOpacity: 0, elevation: 0 },
  confirmSessionBtnText:     { fontSize: 15, fontWeight: '800', color: '#fff' },

  summaryRow:   { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard:  { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 4 },
  summaryCount: { fontSize: 24, fontWeight: '900', fontFamily: SERIF },
  summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  markAllRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  markAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  markAllText:{ fontSize: 12, fontWeight: '700' },

  card:      { ...CARD_BASE },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },

  studentRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  studentAvatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontWeight: '800', fontSize: 13 },
  studentName:       { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  studentMeta:       { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  toggleBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 88, justifyContent: 'center' },
  toggleBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  sessionReadyBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10, borderWidth: 1, borderColor: COLORS.green + '50', paddingHorizontal: 14, paddingVertical: 10 },
  sessionReadyText:  { fontSize: 13, fontWeight: '700', color: COLORS.green },

  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  loadingText:      { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  errorContainer:   { alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, paddingVertical: 36, backgroundColor: COLORS.surfaceEl, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  errorTitle:       { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  errorMsg:         { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
  retryBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText:     { fontSize: 13, fontWeight: '700', color: '#fff' },
});
};