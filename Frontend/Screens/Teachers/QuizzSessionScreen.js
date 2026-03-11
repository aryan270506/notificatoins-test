// QuizzSessionScreen.js — UniVerse
// Teacher view: publish quizzes, start live timer, students see OPEN state, end quiz
// Backend integrated: GET /api/quizzes, PATCH /api/quizzes/:id/start, PATCH /api/quizzes/:id/end

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios'; // adjust path as needed
import { ThemeContext } from './TeacherStack';

const { width: W } = Dimensions.get('window');

/* ─── Theme ─────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:           '#07080F',
  surface:      '#0E1020',
  surfaceEl:    '#141728',
  border:       '#1A1F35',
  accent:       '#F59E0B',
  accentSoft:   'rgba(245,158,11,0.15)',
  green:        '#10B981',
  greenSoft:    'rgba(16,185,129,0.12)',
  greenGlow:    'rgba(16,185,129,0.20)',
  red:          '#EF4444',
  redSoft:      'rgba(239,68,68,0.12)',
  blue:         '#6366F1',
  purple:       '#8B5CF6',
  textPrimary:  '#F0F2FF',
  textSecondary:'#8B93B3',
  textMuted:    '#383F60',
  white:        '#ffffff',
};
const C_LIGHT = {
  bg:           '#F1F4FD',
  surface:      '#FFFFFF',
  surfaceEl:    '#EAEEf9',
  border:       '#DDE3F4',
  accent:       '#D97706',
  accentSoft:   'rgba(217,119,6,0.10)',
  green:        '#059669',
  greenSoft:    'rgba(5,150,105,0.10)',
  greenGlow:    'rgba(5,150,105,0.12)',
  red:          '#DC2626',
  redSoft:      'rgba(220,38,38,0.10)',
  blue:         '#4F46E5',
  purple:       '#7C3AED',
  textPrimary:  '#0F172A',
  textSecondary:'#4B5563',
  textMuted:    '#9CA3AF',
  white:        '#ffffff',
};
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const pad = n => String(n).padStart(2, '0');
const formatElapsed = secs => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** Map raw DB status → UI color */
const statusColorFn = (C, status) => ({
  ACTIVE:    C.green,
  SCHEDULED: C.accent,
  COMPLETED: C.textMuted,
}[status] ?? C.textMuted);

/* ─── Pulsing live dot ───────────────────────────────────────────────────── */
const PulseDot = ({ color = '#059669', size = 10 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: size + 6, height: size + 6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale }],
        shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6,
      }} />
    </View>
  );
};

/* ─── End-Quiz Confirmation Modal ───────────────────────────────────────── */
const EndQuizModal = ({ visible, quiz, elapsed, onConfirm, onCancel, loading }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const em = makeEm(C);
  return (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={em.overlay}>
      <View style={em.sheet}>
        <View style={em.iconWrap}>
          <Ionicons name="stop-circle" size={38} color={C.red} />
        </View>
        <Text style={em.title}>End Quiz?</Text>
        <Text style={em.sub}>
          This will close the quiz for all students immediately.
          No more answers will be accepted.
        </Text>

        {quiz && (
          <View style={em.statsRow}>
            <View style={em.statBox}>
              <Text style={[em.statVal, { color: C.green }]}>{quiz.submissions}</Text>
              <Text style={em.statLabel}>Submitted</Text>
            </View>
            <View style={[em.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }]}>
              <Text style={[em.statVal, { color: C.red }]}>
                {Math.max(0, (quiz.total || 0) - (quiz.submissions || 0))}
              </Text>
              <Text style={em.statLabel}>Pending</Text>
            </View>
            <View style={em.statBox}>
              <Text style={[em.statVal, { color: C.accent }]}>{formatElapsed(elapsed ?? 0)}</Text>
              <Text style={em.statLabel}>Elapsed</Text>
            </View>
          </View>
        )}

        <View style={em.btnRow}>
          <TouchableOpacity style={em.cancelBtn} onPress={onCancel} activeOpacity={0.8} disabled={loading}>
            <Text style={em.cancelText}>Keep Running</Text>
          </TouchableOpacity>
          <TouchableOpacity style={em.confirmBtn} onPress={onConfirm} activeOpacity={0.8} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={C.white} />
              : <>
                  <Ionicons name="stop-circle-outline" size={16} color={C.white} />
                  <Text style={em.confirmText}>End Quiz</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  );
};

/* ─── Quiz Card ─────────────────────────────────────────────────────────── */
const QuizCard = ({ quiz, elapsed, onStart, onEndPress, onEdit, startLoading }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const qc = makeQc(C);
  const statusColor = (status) => statusColorFn(C, status);
  const navigation = useNavigation();
  const isActive    = quiz.status === 'ACTIVE';
  const isScheduled = quiz.status === 'SCHEDULED';
  const isDone      = quiz.status === 'COMPLETED';
  const pct         = quiz.total > 0 ? (quiz.submissions / quiz.total) * 100 : 0;
  const color       = statusColor(quiz.status);

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 55, friction: 10, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[
      qc.card,
      isActive && qc.cardActive,
      {
        opacity: cardAnim,
        transform: [{ translateY: cardAnim.interpolate({ inputRange: [0,1], outputRange: [16,0] }) }],
      },
    ]}>
      {isActive && <View style={qc.activeBar} />}

      {/* ── Title row ── */}
      <View style={qc.titleRow}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={qc.title} numberOfLines={2}>{quiz.title}</Text>
          <View style={qc.metaRow}>
            <Ionicons name="school-outline" size={11} color={C.textMuted} />
            <Text style={qc.meta}>{quiz.class || '—'}</Text>
            {quiz.subject
              ? <><Text style={qc.dot}>·</Text><Text style={qc.meta}>{quiz.subject}</Text></>
              : null}
            <Text style={qc.dot}>·</Text>
            <Ionicons name="help-circle-outline" size={11} color={C.textMuted} />
            <Text style={qc.meta}>{quiz.questions} Qs</Text>
            <Text style={qc.dot}>·</Text>
            <Ionicons name="time-outline" size={11} color={C.textMuted} />
            <Text style={qc.meta}>{quiz.duration}</Text>
          </View>
        </View>

        <View style={[qc.statusPill, { backgroundColor: color + '20', borderColor: color + '55' }]}>
          {isActive ? <PulseDot color={C.green} size={8} /> : <View style={[qc.statusDot, { backgroundColor: color }]} />}
          <Text style={[qc.statusText, { color }]}>{quiz.status}</Text>
        </View>
      </View>

      {/* ── ACTIVE: live timer ── */}
      {isActive && (
        <View style={qc.timerBlock}>
          <View style={qc.timerSide}>
            <Text style={qc.blockLabel}>ELAPSED TIME</Text>
            <Text style={qc.timerDigits}>{formatElapsed(elapsed)}</Text>
          </View>
          <View style={qc.timerSep} />
          <View style={qc.timerSide}>
            <Text style={qc.blockLabel}>STUDENT STATUS</Text>
            <View style={qc.openBadge}>
              <PulseDot color={C.green} size={7} />
              <Text style={qc.openBadgeText}>QUIZ OPEN</Text>
            </View>
            <Text style={qc.openSub}>Students can submit now</Text>
          </View>
        </View>
      )}

      {/* ── ACTIVE: submission progress ── */}
      {isActive && (
        <View style={qc.progressWrap}>
          <View style={qc.progressHeader}>
            <Text style={qc.progressLabel}>Submissions</Text>
            <Text style={qc.progressFraction}>{quiz.submissions} / {quiz.total}</Text>
          </View>
          <View style={qc.track}>
            <View style={[qc.fill, { width: `${pct}%` }]} />
          </View>
          <Text style={qc.progressPct}>{Math.round(pct)}% of students submitted</Text>
        </View>
      )}

      {/* ── SCHEDULED: hint ── */}
      {isScheduled && (
        <View style={qc.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={C.accent} />
          <Text style={qc.hintText}>
            Press <Text style={{ fontWeight: '800' }}>Start Now</Text> to open this quiz — students will be able to start solving immediately
          </Text>
        </View>
      )}

      {/* ── COMPLETED: summary stats ── */}
      {isDone && (
        <View style={qc.doneBlock}>
          {[
            { icon: 'checkmark-circle-outline', val: quiz.submissions, label: 'Submitted', color: C.green  },
            { icon: 'close-circle-outline',     val: Math.max(0, quiz.total - quiz.submissions), label: 'Missed', color: C.red },
            { icon: 'analytics-outline',        val: `${quiz.total > 0 ? Math.round((quiz.submissions/quiz.total)*100) : 0}%`, label: 'Rate', color: C.purple },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={qc.doneSep} />}
              <View style={qc.doneStat}>
                <Ionicons name={s.icon} size={14} color={s.color} />
                <Text style={[qc.doneVal, { color: s.color }]}>{s.val}</Text>
                <Text style={qc.doneLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── Actions ── */}
      <View style={qc.actions}>
        {isActive && (
          <TouchableOpacity style={qc.endBtn} onPress={onEndPress} activeOpacity={0.8}>
            <Ionicons name="stop-circle-outline" size={15} color={C.white} />
            <Text style={qc.endBtnText}>End Quiz</Text>
          </TouchableOpacity>
        )}
        {isScheduled && (
          <TouchableOpacity style={[qc.startBtn, startLoading && { opacity: 0.6 }]} onPress={onStart} activeOpacity={0.8} disabled={startLoading}>
            {startLoading
              ? <ActivityIndicator size="small" color={C.white} />
              : <>
                  <Ionicons name="play-circle-outline" size={15} color={C.white} />
                  <Text style={qc.startBtnText}>Start Now</Text>
                </>
            }
          </TouchableOpacity>
        )}
        <TouchableOpacity style={qc.ghostBtn} onPress={() => navigation.navigate('QuizResultScreen', { quiz })}>
          <Ionicons name="bar-chart-outline" size={13} color={C.textSecondary} />
          <Text style={qc.ghostBtnText}>Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={qc.ghostBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={13} color={C.textSecondary} />
          <Text style={qc.ghostBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════════════ */
export default function QuizSession() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const s = makeS(C);
  const statusColor = (status) => statusColorFn(C, status);
  const navigation = useNavigation();
  const route      = useRoute();

  const [quizList,        setQuizList]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [elapsedMap,      setElapsedMap]       = useState({});
  const [endModalQuizId,  setEndModalQuizId]   = useState(null);
  const [endLoading,      setEndLoading]       = useState(false);
  const [startLoadingId,  setStartLoadingId]   = useState(null);

  const intervalRefs = useRef({});
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  /* ── Fetch quizzes from backend ── */
  const fetchQuizzes = useCallback(async () => {
  try {
    const { data } = await axiosInstance.get('/quiz');

    if (data.success) {
      const quizzes = data.data;
      setQuizList(quizzes);

      // Start timers for ACTIVE quizzes
      quizzes.forEach(q => {
        if (q.status === 'ACTIVE') {

          const startedAt = q.startedAt
            ? new Date(q.startedAt).getTime()
            : Date.now();

          const elapsed = Math.floor((Date.now() - startedAt) / 1000);

          // duration in seconds
          const durationSeconds = (q.duration || 0) * 60;

          // If already expired → end immediately
          if (elapsed >= durationSeconds) {
            endQuiz(q._id);
            return;
          }

          setElapsedMap(prev => ({
            ...prev,
            [q._id]: elapsed
          }));

          if (!intervalRefs.current[q._id]) {

            intervalRefs.current[q._id] = setInterval(() => {

              setElapsedMap(prev => {

                const newElapsed = (prev[q._id] ?? elapsed) + 1;

                // Check if duration completed
                if (newElapsed >= durationSeconds) {

                  clearInterval(intervalRefs.current[q._id]);
                  delete intervalRefs.current[q._id];

                  endQuiz(q._id);

                  return prev;
                }

                return {
                  ...prev,
                  [q._id]: newElapsed
                };

              });

            }, 1000);

          }
        }
      });
    }

  } catch (err) {
    console.error('Fetch quizzes error:', err);
  } finally {
    setLoading(false);
  }
}, []);

  /* ── Reload when screen comes into focus (e.g. after publishing) ── */
  useFocusEffect(
    useCallback(() => {
      fetchQuizzes();
      // cleanup timers on blur
      return () => {};
    }, [fetchQuizzes])
  );

  /* ── Handle newly published quiz navigated from QuizBuilderScreen ── */
  useEffect(() => {
    if (route.params?.newQuiz) {
      // Refetch to get the saved quiz from DB (includes _id)
      fetchQuizzes();
    }
  }, [route.params?.publishedAt]);

  /* ── Fade in screen ── */
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    return () => Object.values(intervalRefs.current).forEach(clearInterval);
  }, []);

  /* ── PATCH /api/quizzes/:id/start ── */
  const startQuiz = useCallback(async (id) => {
    setStartLoadingId(id);
    try {
      const { data } = await axiosInstance.patch(`/quiz/${id}/start`);
      if (data.success) {
        setQuizList(prev =>
          prev.map(q => q._id === id ? { ...q, status: 'ACTIVE', startedAt: data.data.startedAt } : q)
        );
        setElapsedMap(prev => ({ ...prev, [id]: 0 }));
        intervalRefs.current[id] = setInterval(() => {
          setElapsedMap(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
        }, 1000);
      }
    } catch (err) {
      console.error('Start quiz error:', err);
    } finally {
      setStartLoadingId(null);
    }
  }, []);

  /* ── PATCH /api/quizzes/:id/end ── */
  const endQuiz = useCallback(async (id) => {
    setEndLoading(true);
    try {
      const { data } = await axiosInstance.patch(`/quiz/${id}/end`);
      if (data.success) {
        clearInterval(intervalRefs.current[id]);
        delete intervalRefs.current[id];
        setQuizList(prev =>
          prev.map(q => q._id === id ? { ...q, status: 'COMPLETED' } : q)
        );
        setEndModalQuizId(null);
      }
    } catch (err) {
      console.error('End quiz error:', err);
    } finally {
      setEndLoading(false);
    }
  }, []);

  /* ── Derived KPIs ── */
  const activeCount    = quizList.filter(q => q.status === 'ACTIVE').length;
  const scheduledCount = quizList.filter(q => q.status === 'SCHEDULED').length;
  const completedCount = quizList.filter(q => q.status === 'COMPLETED').length;

  const endingQuiz = quizList.find(q => q._id === endModalQuizId) ?? null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Dashboard  ›  Quiz Sessions</Text>
              <Text style={s.title}>Quiz Sessions</Text>
              <Text style={s.sub}>
                {activeCount > 0
                  ? `${activeCount} live quiz${activeCount > 1 ? 'zes' : ''} running · students can submit`
                  : 'Create and manage quizzes for your class'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('QuizBuilderScreen')}
              style={s.newBtn}>
              <Ionicons name="add-circle-outline" size={17} color={C.white} />
              <Text style={s.newBtnText}>New Quiz</Text>
            </TouchableOpacity>
          </View>

          {/* ── KPI strip ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 20, marginBottom: 18 }}
            contentContainerStyle={{ gap: 10 }}>
            {[
              { label: 'Total',     val: String(quizList.length), color: C.blue,   icon: 'layers-outline'               },
              { label: 'Live Now',  val: String(activeCount),     color: C.green,  icon: 'radio-button-on-outline'      },
              { label: 'Scheduled', val: String(scheduledCount),  color: C.accent, icon: 'time-outline'                 },
              { label: 'Completed', val: String(completedCount),  color: C.purple, icon: 'checkmark-done-circle-outline'},
            ].map((k, i) => (
              <View key={i} style={[s.kpiCard, { borderColor: k.color + '40' }]}>
                <Ionicons name={k.icon} size={18} color={k.color} style={{ marginBottom: 5 }} />
                <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* ── Live banner ── */}
          {activeCount > 0 && (
            <View style={s.liveBanner}>
              <PulseDot color={C.green} size={9} />
              <Text style={s.liveBannerText}>
                {activeCount} quiz{activeCount > 1 ? 'zes are' : ' is'} open right now — students can see and submit
              </Text>
            </View>
          )}

          {/* ── Loading state ── */}
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: 13 }}>Loading quizzes…</Text>
            </View>
          )}

          {/* ── Quiz cards ── */}
          {!loading && (
            <View style={{ paddingHorizontal: 20, gap: 14 }}>
              {quizList.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="clipboard-outline" size={48} color={C.textMuted} />
                  <Text style={s.emptyTitle}>No Quizzes Yet</Text>
                  <Text style={s.emptySub}>Tap "New Quiz" to create your first quiz</Text>
                </View>
              ) : (
                quizList.map(quiz => (
                  <QuizCard
                    key={quiz._id}
                    quiz={quiz}
                    elapsed={elapsedMap[quiz._id] ?? 0}
                    onStart={() => startQuiz(quiz._id)}
                    onEndPress={() => setEndModalQuizId(quiz._id)}
                    onEdit={() => navigation.navigate('QuizBuilderScreen')}
                    startLoading={startLoadingId === quiz._id}
                  />
                ))
              )}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── End-quiz modal ── */}
      <EndQuizModal
        visible={endModalQuizId !== null}
        quiz={endingQuiz}
        elapsed={elapsedMap[endModalQuizId] ?? 0}
        onConfirm={() => endQuiz(endModalQuizId)}
        onCancel={() => setEndModalQuizId(null)}
        loading={endLoading}
      />
    </View>
  );
}

/* ─── Main screen styles ─────────────────────────────────────────────────── */
const makeS = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: W >= 768 ? 'row' : 'column',
    alignItems: W >= 768 ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 28,
    gap: 12,
  },
  breadcrumb: { fontSize: 11, color: C.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  title:      { fontSize: 30, fontWeight: '800', color: C.textPrimary, fontFamily: FONTS.heading, marginBottom: 3 },
  sub:        { fontSize: 13, color: C.textSecondary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  newBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  kpiCard: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1,
    width: 112, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
  },
  kpiVal:   { fontSize: 26, fontWeight: '900', fontFamily: FONTS.heading },
  kpiLabel: { fontSize: 10, color: C.textSecondary, textAlign: 'center', marginTop: 2, fontWeight: '700' },
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.greenGlow, borderRadius: 12,
    borderWidth: 1, borderColor: C.green + '45',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  liveBannerText: { fontSize: 13, fontWeight: '700', color: C.green, flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textSecondary },
  emptySub:   { fontSize: 13, color: C.textMuted },
});

/* ─── Quiz card styles ───────────────────────────────────────────────────── */
const makeQc = (C) => StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardActive: {
    borderColor: C.green + '55',
    shadowColor: C.green, shadowOpacity: 0.18, shadowRadius: 18, elevation: 6,
  },
  activeBar: { height: 3, backgroundColor: C.green },
  titleRow:  { flexDirection: 'row', padding: 16, gap: 10, alignItems: 'flex-start' },
  title:     { fontSize: 15, fontWeight: '800', color: C.textPrimary, lineHeight: 22 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  meta:      { fontSize: 11, color: C.textSecondary },
  dot:       { fontSize: 11, color: C.textMuted, marginHorizontal: 1 },
  statusPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  timerBlock: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surfaceEl, borderRadius: 14,
    borderWidth: 1, borderColor: C.green + '30', overflow: 'hidden',
  },
  timerSide:   { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  timerSep:    { width: 1, backgroundColor: C.border, marginVertical: 10 },
  blockLabel:  { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2 },
  timerDigits: { fontSize: 28, fontWeight: '900', color: C.green, fontVariant: ['tabular-nums'], fontFamily: FONTS.heading },
  openBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.greenSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.green + '40' },
  openBadgeText: { fontSize: 12, fontWeight: '800', color: C.green },
  openSub:     { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  progressWrap: { paddingHorizontal: 16, marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel:  { fontSize: 12, color: C.textSecondary },
  progressFraction: { fontSize: 12, fontWeight: '800', color: C.textPrimary },
  track: { height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 4, backgroundColor: C.green },
  progressPct: { fontSize: 10, color: C.textMuted, marginTop: 5, fontWeight: '700' },
  hintRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.accentSoft, borderRadius: 10,
    borderWidth: 1, borderColor: C.accent + '40',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  hintText: { fontSize: 12, color: C.accent, flex: 1, lineHeight: 18 },
  doneBlock: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surfaceEl, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, paddingVertical: 12,
  },
  doneStat:  { flex: 1, alignItems: 'center', gap: 3 },
  doneSep:   { width: 1, height: 36, backgroundColor: C.border },
  doneVal:   { fontSize: 20, fontWeight: '900', fontFamily: FONTS.heading },
  doneLabel: { fontSize: 10, color: C.textMuted, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3,
    minWidth: 100, justifyContent: 'center',
  },
  startBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.red, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    shadowColor: C.red, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  endBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  ghostBtnText: { fontSize: 12, fontWeight: '700', color: C.textSecondary },
});

/* ─── End modal styles ───────────────────────────────────────────────────── */
const makeEm = (C) => StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet:      { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', gap: 10 },
  iconWrap:   { width: 66, height: 66, borderRadius: 33, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:      { fontSize: 21, fontWeight: '900', color: C.textPrimary, fontFamily: FONTS.heading },
  sub:        { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  statsRow:   { flexDirection: 'row', width: '100%', marginTop: 6, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: 13, backgroundColor: C.surfaceEl, gap: 3 },
  statVal:    { fontSize: 20, fontWeight: '900', fontFamily: FONTS.heading },
  statLabel:  { fontSize: 10, fontWeight: '700', color: C.textMuted },
  btnRow:     { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
  cancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: C.red, shadowColor: C.red, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  confirmText:{ fontSize: 14, fontWeight: '800', color: C.white },
});