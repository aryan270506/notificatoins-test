import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Dimensions, StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const TOTAL_QUESTIONS = 40;
const QUESTIONS = [
  {
    id: 14,
    section: 'Section B: Integral Calculus',
    title: 'Calculate the Definite Integral',
    body: 'What is the value of the integral ∫ from 0 to π/2 of cos(x) dx? Select the most appropriate answer from the options provided below.',
    options: ['A) 0', 'B) 1', 'C) π/2', 'D) -1'],
    correct: 1,
  },
];

// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useTimer(initialSeconds) {
  const secondsRef = useRef(initialSeconds);
  const [display, setDisplay] = useState(() => {
    const m = String(Math.floor(initialSeconds / 60)).padStart(2, '0');
    const s = String(initialSeconds % 60).padStart(2, '0');
    return `${m} : ${s}`;
  });
  useEffect(() => {
    const interval = setInterval(() => {
      if (secondsRef.current > 0) secondsRef.current -= 1;
      const m = String(Math.floor(secondsRef.current / 60)).padStart(2, '0');
      const s = String(secondsRef.current % 60).padStart(2, '0');
      setDisplay(`${m} : ${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return display;
}

// ─── Safe theme getter ────────────────────────────────────────────────────────
// StudentMain theme keys: bg, card, cardAlt, border, accent, accentBg,
// textPrimary, textMuted, textSub, green, orange, red, sidebar,
// moonIcon, statusBar, isDark
// NOTE: NO "surface", "surfaceAlt" — map to "card" / "cardAlt"
// NOTE: NO "textSecondary" — use "textSub" or "textMuted"
const g = (theme, key, fallback) => theme?.[key] ?? fallback;

// ─── Grid Item ────────────────────────────────────────────────────────────────
const GridItem = ({ num, status, onPress, accent }) => {
  const bgColor =
    status === 'answered' ? (accent || '#2563EB')
    : status === 'review'  ? '#F59E0B'
    : status === 'current' ? 'transparent'
    : '#1E3A5F';
  const borderColor = status === 'current' ? (accent || '#2563EB') : 'transparent';
  return (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: bgColor, borderColor, borderWidth: status === 'current' ? 2 : 0 }]}
      onPress={() => onPress(num)}
      activeOpacity={0.75}
    >
      <Text style={[styles.gridText, { color: status === 'unanswered' ? '#6B8BB0' : '#FFF' }]}>
        {String(num).padStart(2, '0')}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Answer Option ────────────────────────────────────────────────────────────
const AnswerOption = ({ label, selected, onPress, theme }) => {
  const accent    = g(theme, 'accent',      '#2563EB');
  const accentBg  = g(theme, 'accentBg',    '#1A3A6E');
  const cardAlt   = g(theme, 'cardAlt',     '#0D1E35');
  const border    = g(theme, 'border',      '#1A3A5C');
  const textPri   = g(theme, 'textPrimary', '#FFFFFF');

  return (
    <TouchableOpacity
      style={[styles.optionRow, {
        backgroundColor: selected ? accentBg : cardAlt,
        borderColor:     selected ? accent   : border,
      }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.radio, {
        borderColor:     selected ? accent : '#3B5F8A',
        backgroundColor: selected ? accent : 'transparent',
      }]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <Text style={[styles.optionText, {
        color:      selected ? textPri : '#A0B8D0',
        fontWeight: selected ? '700'   : '500',
      }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
// ✅ Accepts themeC (from StudentQuiz forwarding StudentMain's C)
export default function QuizFinal({ onBack, themeC, onThemeToggle }) {
  const theme = themeC; // alias for clarity

  const [currentQuestion,  setCurrentQuestion]  = useState(14);
  const [showResults,      setShowResults]       = useState(false);
  const [selectedAnswer,   setSelectedAnswer]    = useState(1);
  const [markedForReview,  setMarkedForReview]   = useState([4]);
  const [answered,         setAnswered]          = useState([1,2,3,4,5,6,7,8,9,11,12,13,14,18]);
  const [overviewExpanded, setOverviewExpanded]  = useState(false);

  const timer = useTimer(44 * 60 + 12);
  const q = QUESTIONS[0];

  // ── Pull colors using CORRECT StudentMain theme keys ──
  const bg        = g(theme, 'bg',          '#0B1E38');
  const surface   = g(theme, 'card',        '#0D2040');   // "surface" → "card"
  const surfAlt   = g(theme, 'cardAlt',     '#1E3A5F');   // "surfaceAlt" → "cardAlt"
  const border    = g(theme, 'border',      '#1A3A5C');
  const accent    = g(theme, 'accent',      '#2563EB');
  const textPri   = g(theme, 'textPrimary', '#FFFFFF');
  const textSec   = g(theme, 'textSub',     '#6B8BB0');   // "textSecondary" → "textSub"
  const textMut   = g(theme, 'textMuted',   '#3B5F8A');
  const moonIcon  = g(theme, 'moonIcon',    '🌙');
  const statusBar = g(theme, 'statusBar',   'light-content');
  const footerBg  = g(theme, 'sidebar',     '#080F1A');

  const getStatus = (num) => {
    if (num === currentQuestion)       return 'current';
    if (markedForReview.includes(num)) return 'review';
    if (answered.includes(num))        return 'answered';
    return 'unanswered';
  };

  const handleSaveNext = () => {
    if (!answered.includes(currentQuestion)) setAnswered(p => [...p, currentQuestion]);
    setCurrentQuestion(p => Math.min(p + 1, TOTAL_QUESTIONS));
    setSelectedAnswer(null);
  };
  const handlePrev = () => {
    setCurrentQuestion(p => Math.max(p - 1, 1));
    setSelectedAnswer(null);
  };
  const toggleReview = () => {
    setMarkedForReview(p =>
      p.includes(currentQuestion) ? p.filter(n => n !== currentQuestion) : [...p, currentQuestion]
    );
  };

  const answeredCount = answered.length;
  const gridNums = Array.from({ length: 25 }, (_, i) => i + 1);

  const Legend = () => (
    <View style={styles.legend}>
      {[
        { color: accent,        label: 'Answered'   },
        { color: '#F59E0B',     label: 'Review'     },
        { color: '#1E3A5F',     label: 'Unanswered' },
        { color: 'transparent', label: 'Current', border: accent },
      ].map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color },
            item.border ? { borderWidth: 2, borderColor: item.border } : null]} />
          <Text style={[styles.legendText, { color: textSec }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  // ── Results Screen ────────────────────────────────────────────────────────
  if (showResults) {
    const totalAnswered = answered.length;
    const percentage    = Math.round((totalAnswered / TOTAL_QUESTIONS) * 100);
    const passed        = percentage >= 60;
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <StatusBar barStyle={statusBar} backgroundColor={bg} />
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.iconCircle, { backgroundColor: passed ? '#22C55E22' : '#EF444422' }]}>
            <Text style={styles.iconText}>{passed ? '🎉' : '😔'}</Text>
          </View>
          <Text style={[styles.heading,    { color: textPri }]}>{passed ? 'Congratulations!' : 'Better Luck Next Time'}</Text>
          <Text style={[styles.subheading, { color: textSec }]}>Advanced Mathematics — Final Exam</Text>

          <View style={[styles.scoreCard, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.scoreValue, { color: passed ? '#22C55E' : '#EF4444' }]}>{percentage}%</Text>
            <Text style={[styles.scoreLabel, { color: textSec }]}>Overall Score</Text>
            <View style={[styles.divider, { backgroundColor: border }]} />
            <View style={styles.statsRow}>
              {[
                { num: totalAnswered,                  label: 'Answered' },
                { num: TOTAL_QUESTIONS - totalAnswered, label: 'Skipped'  },
                { num: markedForReview.length,         label: 'Reviewed' },
                { num: TOTAL_QUESTIONS,                label: 'Total Qs' },
              ].map(({ num, label }) => (
                <View key={label} style={styles.statItem}>
                  <Text style={[styles.statNum,    { color: textPri }]}>{num}</Text>
                  <Text style={[styles.statLabel2, { color: textSec }]}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.progressBar, { backgroundColor: border }]}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: passed ? '#22C55E' : '#EF4444' }]} />
            </View>
          </View>

          <View style={[styles.badge, {
            backgroundColor: passed ? '#22C55E22' : '#EF444422',
            borderColor:     passed ? '#22C55E'   : '#EF4444',
          }]}>
            <Text style={[styles.badgeText, { color: passed ? '#22C55E' : '#EF4444' }]}>
              {passed ? '✅  PASSED' : '❌  FAILED'}
            </Text>
          </View>

          <View style={styles.gradeRow}>
            <Text style={[styles.gradeLabel, { color: textSec }]}>Grade</Text>
            <Text style={[styles.gradeValue, { color: textPri, backgroundColor: surfAlt }]}>
              {percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'F'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: accent }]} onPress={onBack} activeOpacity={0.82}>
            <Text style={styles.retryBtnText}>🏠  Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz Screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={statusBar} backgroundColor={bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.sigmaBox, { backgroundColor: accent }]}>
            <Text style={styles.sigmaText}>Σ</Text>
          </View>
          <View>
            <Text style={[styles.examTitle, { color: textPri }]}>Advanced Mathematics</Text>
            <Text style={[styles.examSub,   { color: textSec }]}>{q.section}</Text>
          </View>
        </View>

        {isTablet && (
          <View style={[styles.timerBox, { backgroundColor: surfAlt }]}>
            <Text style={styles.timerIcon}>⏱</Text>
            <Text style={[styles.timerText,  { color: textPri }]}>{timer}</Text>
            <Text style={[styles.timerLabel, { color: textSec }]}>REMAINING</Text>
          </View>
        )}

        <View style={styles.headerRight}>
          {onThemeToggle && (
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: surfAlt }]}
              onPress={onThemeToggle}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 16 }}>{moonIcon}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: accent }]}
            onPress={() => setShowResults(true)}
            activeOpacity={0.82}
          >
            <Text style={styles.finishBtnText}>Finish Exam</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mobile Question Overview */}
      {!isTablet && (
        <View style={[styles.mobileOverviewPanel, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity
            style={styles.mobileOverviewToggle}
            onPress={() => setOverviewExpanded(p => !p)}
            activeOpacity={0.8}
          >
            <View style={styles.mobileOverviewToggleLeft}>
              <Text style={[styles.sidebarTitle, { color: textSec }]}>QUESTION OVERVIEW</Text>
              <View style={[styles.mobileOverviewBadge, { backgroundColor: accent }]}>
                <Text style={styles.mobileOverviewBadgeText}>{answeredCount}/{TOTAL_QUESTIONS}</Text>
              </View>
            </View>
            <View style={[styles.dropdownBtn, { backgroundColor: surfAlt, borderColor: border }]}>
              <Text style={[styles.dropdownBtnText, { color: textSec }]}>{overviewExpanded ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>

          {!overviewExpanded && (
            <View style={[styles.progressBarSlim, { backgroundColor: border }]}>
              <View style={[styles.progressFillSlim, { width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: accent }]} />
            </View>
          )}

          {overviewExpanded && (
            <View style={styles.mobileOverviewContent}>
              <Legend />
              <View style={styles.mobileGridWrap}>
                {gridNums.map(num => (
                  <GridItem key={num} num={num} status={getStatus(num)} accent={accent}
                    onPress={n => { setCurrentQuestion(n); setOverviewExpanded(false); }} />
                ))}
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: textSec }]}>Progress</Text>
                <Text style={[styles.progressCount, { color: textSec }]}>{answeredCount} / {TOTAL_QUESTIONS} Answered</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: border }]}>
                <View style={[styles.progressFill, { width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: accent }]} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
          {/* Mobile Timer */}
          {!isTablet && (
            <View style={[styles.mobileTimerBar, { backgroundColor: surfAlt, borderColor: border }]}>
              <Text style={styles.mobileTimerIcon}>⏱</Text>
              <Text style={[styles.mobileTimerText,  { color: textPri }]}>{timer}</Text>
              <Text style={[styles.mobileTimerLabel, { color: textSec }]}>TIME REMAINING</Text>
            </View>
          )}

          <Text style={[styles.questionLabel, { color: accent }]}>
            QUESTION {currentQuestion} OF {TOTAL_QUESTIONS}
          </Text>

          <View style={styles.questionTitleRow}>
            <Text style={[styles.questionTitle, { color: textPri }]}>{q.title}</Text>
            <TouchableOpacity
              style={[
                styles.reviewBtn,
                { backgroundColor: surfAlt, borderColor: border },
                markedForReview.includes(currentQuestion) && styles.reviewBtnActive,
              ]}
              onPress={toggleReview}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewBtnIcon}>🔖</Text>
              <Text style={[styles.reviewBtnText, { color: textPri }]}>
                {markedForReview.includes(currentQuestion) ? 'Marked' : 'Mark for Review'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.questionCard, { backgroundColor: surfAlt, borderColor: border }]}>
            <Text style={[styles.questionBody, { color: textSec }]}>{q.body}</Text>
            <View style={styles.optionsList}>
              {q.options.map((opt, i) => (
                <AnswerOption
                  key={i} label={opt}
                  selected={selectedAnswer === i}
                  onPress={() => setSelectedAnswer(i)}
                  theme={theme}
                />
              ))}
            </View>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} activeOpacity={0.8}>
              <Text style={[styles.prevBtnText, { color: textSec }]}>← Previous Question</Text>
            </TouchableOpacity>
            <View style={styles.dots}>
              {[0,1,2].map(i => (
                <View key={i} style={[styles.dot, { backgroundColor: border }, i === 1 && { backgroundColor: accent }]} />
              ))}
            </View>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: accent }]} onPress={handleSaveNext} activeOpacity={0.82}>
              <Text style={styles.nextBtnText}>Save & Next →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sidebar (tablet) */}
        {isTablet && (
          <View style={[styles.sidebar, { backgroundColor: surface, borderLeftColor: border }]}>
            <Text style={[styles.sidebarTitle, { color: textSec }]}>QUESTION OVERVIEW</Text>
            <Legend />
            <View style={styles.grid}>
              {gridNums.map(num => (
                <GridItem key={num} num={num} status={getStatus(num)} accent={accent} onPress={n => setCurrentQuestion(n)} />
              ))}
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: textSec }]}>Progress</Text>
                <Text style={[styles.progressCount, { color: textSec }]}>{answeredCount} / {TOTAL_QUESTIONS} Answered</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: border }]}>
                <View style={[styles.progressFill, { width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: accent }]} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: footerBg }]}>
        <Text style={[styles.footerText, { color: textMut }]}>
          SERVER STATUS: <Text style={styles.footerGreen}>CONNECTED</Text>
          {'  •  '}ENCRYPTION: <Text style={styles.footerBlue}>AES-256</Text>
        </Text>
        <Text style={[styles.footerRight, { color: textMut }]}>
          © 2024 EDU-PRO CERTIFICATION SYSTEMS  •  V 4.2.1-RELEASE
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Results
  container:  { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconText:   { fontSize: 44 },
  heading:    { fontSize: isTablet ? 28 : 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subheading: { fontSize: 13, marginBottom: 28, textAlign: 'center' },
  scoreCard:  { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  scoreValue: { fontSize: isTablet ? 72 : 60, fontWeight: '900', letterSpacing: -2 },
  scoreLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, marginBottom: 20 },
  divider:    { width: '100%', height: 1, marginBottom: 20 },
  statsRow:   { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  statItem:   { alignItems: 'center' },
  statNum:    { fontSize: 22, fontWeight: '800' },
  statLabel2: { fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  badge:      { borderRadius: 12, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginBottom: 16 },
  badgeText:  { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  gradeRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  gradeLabel: { fontSize: 15, fontWeight: '600' },
  gradeValue: { fontSize: 28, fontWeight: '900', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 10 },
  retryBtn:   { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 15, width: '100%', alignItems: 'center' },
  retryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sigmaBox:     { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sigmaText:    { color: '#FFF', fontSize: 18, fontWeight: '800' },
  examTitle:    { fontSize: isTablet ? 16 : 13, fontWeight: '800' },
  examSub:      { fontSize: 11, marginTop: 1 },
  timerBox:     { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  timerIcon:    { fontSize: 14 },
  timerText:    { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  timerLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' },
  themeBtn:     { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  finishBtn:    { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  finishBtnText:{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Mobile Overview
  mobileOverviewPanel:      { borderBottomWidth: 1 },
  mobileOverviewToggle:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  mobileOverviewToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mobileOverviewBadge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  mobileOverviewBadgeText:  { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  dropdownBtn:              { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dropdownBtnText:          { fontSize: 10, fontWeight: '800' },
  progressBarSlim:          { height: 3, overflow: 'hidden' },
  progressFillSlim:         { height: '100%' },
  mobileOverviewContent:    { paddingHorizontal: 14, paddingBottom: 14 },
  mobileGridWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },

  // Mobile Timer
  mobileTimerBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14, gap: 8, borderWidth: 1 },
  mobileTimerIcon:  { fontSize: 16 },
  mobileTimerText:  { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  mobileTimerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  // Body
  body:       { flex: 1, flexDirection: isTablet ? 'row' : 'column' },
  mainScroll: { flex: 1, padding: 16 },

  // Question
  questionLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  questionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  questionTitle:    { fontSize: isTablet ? 22 : 18, fontWeight: '800', flex: 1 },
  reviewBtn:        { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, gap: 6, borderWidth: 1 },
  reviewBtnActive:  { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' },
  reviewBtnIcon:    { fontSize: 14 },
  reviewBtnText:    { fontSize: 13, fontWeight: '600' },
  questionCard:     { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  questionBody:     { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  optionsList:      { gap: 12 },
  optionRow:        { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, gap: 14 },
  radio:            { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  optionText:       { fontSize: 15 },

  // Navigation
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 16 },
  prevBtn:     { paddingVertical: 10, paddingHorizontal: 4 },
  prevBtnText: { fontSize: 14, fontWeight: '600' },
  dots:        { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  nextBtn:     { borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13 },
  nextBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Sidebar
  sidebar:         { width: 220, borderLeftWidth: 1, padding: 16 },
  sidebarTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  legend:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:       { width: 12, height: 12, borderRadius: 3 },
  legendText:      { fontSize: 11 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  gridItem:        { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  gridText:        { fontSize: 11, fontWeight: '700' },

  // Progress
  progressSection:  { marginTop: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:    { fontSize: 12, fontWeight: '600' },
  progressCount:    { fontSize: 12 },
  progressBar:      { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 3 },

  // Footer
  footer:      { flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', alignItems: isTablet ? 'center' : 'flex-start', paddingHorizontal: 16, paddingVertical: 8, gap: 2 },
  footerText:  { fontSize: 10, fontWeight: '600' },
  footerGreen: { color: '#22C55E', fontWeight: '700' },
  footerBlue:  { color: '#60A5FA', fontWeight: '700' },
  footerRight: { fontSize: 10 },
});