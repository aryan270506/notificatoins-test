// QuizzSessionScreen.js — Campus360
// Teacher view: publish quizzes, start live timer, students see OPEN state, end quiz

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Quizresultscreen from './Quizresultscreen';

const { width: W } = Dimensions.get('window');

/* ─── Theme ─────────────────────────────────────────────────────────────── */
const C = {
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
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

/* ─── Seed data ─────────────────────────────────────────────────────────── */
const INITIAL_QUIZZES = [
  { id: 1, title: 'Thermodynamics Mid-Term Quiz', class: 'TY-B', subject: 'Physics',      questions: 20, duration: '30 min', status: 'ACTIVE',    statusColor: C.green,     submissions: 38, total: 45 },
  { id: 2, title: 'Quantum Mechanics Chapter 3',  class: 'SY-A', subject: 'Physics',      questions: 15, duration: '20 min', status: 'SCHEDULED', statusColor: C.accent,    submissions: 0,  total: 52 },
  { id: 3, title: 'Applied Mechanics Unit Test',  class: 'FY-C', subject: 'Engineering',  questions: 25, duration: '45 min', status: 'COMPLETED', statusColor: C.textMuted, submissions: 61, total: 61 },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const pad = n => String(n).padStart(2, '0');
const formatElapsed = secs => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* ─── Pulsing live dot ───────────────────────────────────────────────────── */
const PulseDot = ({ color = C.green, size = 10 }) => {
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
const EndQuizModal = ({ visible, quiz, elapsed, onConfirm, onCancel }) => (
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
          <TouchableOpacity style={em.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={em.cancelText}>Keep Running</Text>
          </TouchableOpacity>
          <TouchableOpacity style={em.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Ionicons name="stop-circle-outline" size={16} color={C.white} />
            <Text style={em.confirmText}>End Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

/* ─── Quiz Card ─────────────────────────────────────────────────────────── */
const QuizCard = ({ quiz, elapsed, onStart, onEndPress, onEdit, onResults }) => {
  const navigation = useNavigation();
  const isActive    = quiz.status === 'ACTIVE';
  const isScheduled = quiz.status === 'SCHEDULED';
  const isDone      = quiz.status === 'COMPLETED';
  const pct         = quiz.total > 0 ? (quiz.submissions / quiz.total) * 100 : 0;

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
      {/* Green top accent bar when ACTIVE */}
      {isActive && <View style={qc.activeBar} />}

      {/* ── Title row ── */}
      <View style={qc.titleRow}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={qc.title} numberOfLines={2}>{quiz.title}</Text>
          <View style={qc.metaRow}>
            <Ionicons name="school-outline" size={11} color={C.textMuted} />
            <Text style={qc.meta}>{quiz.class}</Text>
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

        <View style={[qc.statusPill, { backgroundColor: quiz.statusColor + '20', borderColor: quiz.statusColor + '55' }]}>
          {isActive ? <PulseDot color={C.green} size={8} /> : <View style={[qc.statusDot, { backgroundColor: quiz.statusColor }]} />}
          <Text style={[qc.statusText, { color: quiz.statusColor }]}>{quiz.status}</Text>
        </View>
      </View>

      {/* ── ACTIVE: live timer + open indicator ── */}
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
            <Text style={qc.progressLabel}>
              Submissions
            </Text>
            <Text style={qc.progressFraction}>{quiz.submissions} / {quiz.total}</Text>
          </View>
          <View style={qc.track}>
            <Animated.View style={[qc.fill, { width: `${pct}%` }]} />
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
            { icon: 'checkmark-circle-outline', val: quiz.submissions,                                     label: 'Submitted', color: C.green  },
            { icon: 'close-circle-outline',     val: Math.max(0, quiz.total - quiz.submissions),           label: 'Missed',    color: C.red    },
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
          <TouchableOpacity style={qc.startBtn} onPress={onStart} activeOpacity={0.8}>
            <Ionicons name="play-circle-outline" size={15} color={C.white} />
            <Text style={qc.startBtnText}>Start Now</Text>
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
  const navigation = useNavigation();
  const route      = useRoute();

  const [quizList,        setQuizList]        = useState(INITIAL_QUIZZES);
  const [elapsedMap,      setElapsedMap]       = useState({ 1: 8 * 60 }); // seed quiz 1 = 8 min in
  const [endModalQuizId,  setEndModalQuizId]   = useState(null);

  const intervalRefs = useRef({});
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  /* ── Start seed quiz 1 timer immediately ── */
  useEffect(() => {
    intervalRefs.current[1] = setInterval(() => {
      setElapsedMap(prev => ({ ...prev, 1: (prev[1] ?? 0) + 1 }));
    }, 1000);
    return () => clearInterval(intervalRefs.current[1]);
  }, []);

  /* ── Receive new quiz published from QuizBuilderScreen ── */
  useEffect(() => {
    if (route.params?.newQuiz) {
      const nq = {
        ...route.params.newQuiz,
        id:      route.params.publishedAt ?? Date.now(),
        subject: route.params.newQuiz.subject || 'General',
      };
      setQuizList(prev => [nq, ...prev]);
    }
  }, [route.params?.publishedAt]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => Object.values(intervalRefs.current).forEach(clearInterval);
  }, []);

  /* ── Fade in screen ── */
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  /* ── Start quiz ── */
  const startQuiz = useCallback((id) => {
    setQuizList(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'ACTIVE', statusColor: C.green } : q)
    );
    setElapsedMap(prev => ({ ...prev, [id]: 0 }));
    intervalRefs.current[id] = setInterval(() => {
      setElapsedMap(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    }, 1000);
  }, []);

  /* ── End quiz ── */
  const endQuiz = useCallback((id) => {
    clearInterval(intervalRefs.current[id]);
    delete intervalRefs.current[id];
    setQuizList(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'COMPLETED', statusColor: C.textMuted } : q)
    );
    setEndModalQuizId(null);
  }, []);

  /* ── Derived KPIs ── */
  const activeCount    = quizList.filter(q => q.status === 'ACTIVE').length;
  const scheduledCount = quizList.filter(q => q.status === 'SCHEDULED').length;
  const completedCount = quizList.filter(q => q.status === 'COMPLETED').length;

  const endingQuiz = quizList.find(q => q.id === endModalQuizId) ?? null;

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

          {/* ── Quiz cards ── */}
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {quizList.map(quiz => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                elapsed={elapsedMap[quiz.id] ?? 0}
                onStart={() => startQuiz(quiz.id)}
                onEndPress={() => setEndModalQuizId(quiz.id)}
                onEdit={() => navigation.navigate('QuizBuilderScreen')}
              />
              
            ))}
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── End-quiz modal ── */}
      <EndQuizModal
        visible={endModalQuizId !== null}
        quiz={endingQuiz}
        elapsed={elapsedMap[endModalQuizId] ?? 0}
        onConfirm={() => endQuiz(endModalQuizId)}
        onCancel={() => setEndModalQuizId(null)}
      />
    </View>
  );
}

/* ─── Main screen styles ─────────────────────────────────────────────────── */
const s = StyleSheet.create({
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
});

/* ─── Quiz card styles ───────────────────────────────────────────────────── */
const qc = StyleSheet.create({
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

  /* Live timer block */
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

  /* Progress */
  progressWrap: { paddingHorizontal: 16, marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel:  { fontSize: 12, color: C.textSecondary },
  progressFraction: { fontSize: 12, fontWeight: '800', color: C.textPrimary },
  track: { height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 4, backgroundColor: C.green },
  progressPct: { fontSize: 10, color: C.textMuted, marginTop: 5, fontWeight: '700' },

  /* Scheduled hint */
  hintRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.accentSoft, borderRadius: 10,
    borderWidth: 1, borderColor: C.accent + '40',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  hintText: { fontSize: 12, color: C.accent, flex: 1, lineHeight: 18 },

  /* Completed stats */
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

  /* Action buttons */
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3,
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
const em = StyleSheet.create({
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