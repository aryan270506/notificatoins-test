import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
import QuizFinal from "./QuizFinal";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Total Quizzes', value: '24', sub: '+2 this week',   icon: '📋', accent: '#FF6B35' },
  { label: 'Active Now',    value: '03', sub: 'Expiring soon',  icon: '⚡', accent: '#F7C948' },
  { label: 'Avg. Score',    value: '88%',sub: 'Above average',  icon: '📈', accent: '#4ECDC4' },
  { label: 'Completed',     value: '18', sub: '75% completion', icon: '✅', accent: '#45B7D1' },
];

const ACTIVE_QUIZZES = [
  { id: '1', title: 'Advanced Mathematics',  sub: 'Calculus III & Differential Equations',   questions: 45, mins: 60, color: '#2A4A3E', emoji: '🧮' },
  { id: '2', title: 'Computer Networks',     sub: 'TCP/IP Protocol Suite & Network Security', questions: 30, mins: 45, color: '#1A3A4A', emoji: '🖧'  },
  { id: '3', title: 'Software Engineering',  sub: 'Agile Methodologies & UML Modeling',       questions: 25, mins: 30, color: '#3A2A4A', emoji: '💻' },
];

const UPCOMING = [
  { id: '1', day: '24', month: 'OCT', title: 'Database Management',  time: '10:00 AM' },
  { id: '2', day: '26', month: 'OCT', title: 'Discrete Systems',     time: '02:30 PM' },
  { id: '3', day: '29', month: 'OCT', title: 'UX Design Principles', time: '09:00 AM' },
];

const RECENT = [
  { id: '1', title: 'Mid-term Examination', date: 'Oct 12, 2023', subject: 'Physics II',   score: '92%', pass: true },
  { id: '2', title: 'Programming Logic',    date: 'Oct 10, 2023', subject: 'Comp Science', score: '88%', pass: true },
  { id: '3', title: 'Algorithm Analysis',   date: 'Oct 05, 2023', subject: 'Algorithms',   score: '74%', pass: true },
];

// ─── Safe theme getter ────────────────────────────────────────────────────────
// StudentMain theme keys: bg, card, cardAlt, border, accent, textPrimary,
// textMuted, textSub, green, orange, red, sidebar, moonIcon, statusBar, isDark
// NOTE: NO "textSecondary" — use "textSub" instead.
const g = (theme, key, fallback) => theme?.[key] ?? fallback;

// ─── Components ───────────────────────────────────────────────────────────────
const StatCard = ({ item, theme }) => (
  <View style={[styles.statCard, isTablet && styles.statCardTablet, { backgroundColor: g(theme, 'card', '#1A2535') }]}>
    <View style={styles.statTop}>
      <Text style={[styles.statLabel, { color: g(theme, 'textMuted', '#8A9BB0') }]}>{item.label}</Text>
      <Text style={styles.statIcon}>{item.icon}</Text>
    </View>
    <Text style={[styles.statValue, { color: item.accent }]}>{item.value}</Text>
    <Text style={[styles.statSub, { color: g(theme, 'textMuted', '#8A9BB0') }]}>{item.sub}</Text>
  </View>
);

const QuizCard = ({ item, onPress }) => (
  <View style={[styles.quizCard, { backgroundColor: item.color }, isTablet && styles.quizCardTablet]}>
    <View style={styles.quizEmoji}><Text style={{ fontSize: 36 }}>{item.emoji}</Text></View>
    <Text style={styles.quizTitle}>{item.title}</Text>
    <Text style={styles.quizSub}>{item.sub}</Text>
    <View style={styles.quizMeta}>
      <Text style={styles.quizMetaText}>📝 {item.questions} Qs</Text>
      <Text style={styles.quizMetaText}>⏱ {item.mins} Mins</Text>
    </View>
    <TouchableOpacity style={styles.startBtn} onPress={onPress} activeOpacity={0.82}>
      <Text style={styles.startBtnText}>Start Quiz ▶</Text>
    </TouchableOpacity>
  </View>
);

const UpcomingCard = ({ item, theme }) => (
  <View style={[styles.upcomingCard, { backgroundColor: g(theme, 'card', '#1A2535') }]}>
    <View style={styles.upcomingDate}>
      <Text style={styles.upcomingMonth}>{item.month}</Text>
      <Text style={styles.upcomingDay}>{item.day}</Text>
    </View>
    <View style={styles.upcomingInfo}>
      <Text style={[styles.upcomingTitle, { color: g(theme, 'textPrimary', '#FFFFFF') }]}>{item.title}</Text>
      <Text style={[styles.upcomingTime,  { color: g(theme, 'textMuted',   '#8A9BB0') }]}>🕙 {item.time}</Text>
    </View>
    <TouchableOpacity style={[styles.bellBtn, { backgroundColor: g(theme, 'bg', '#0D1B2A') }]} activeOpacity={0.75}>
      <Text style={{ fontSize: 18 }}>🔔</Text>
    </TouchableOpacity>
  </View>
);

const ResultRow = ({ item, theme }) => (
  <View style={[styles.resultRow, { borderBottomColor: g(theme, 'border', '#1A2535') }]}>
    <View style={styles.resultInfo}>
      <Text style={[styles.resultTitle, { color: g(theme, 'textPrimary', '#FFFFFF') }]}>{item.title}</Text>
      <Text style={[styles.resultDate,  { color: g(theme, 'textMuted',   '#667788') }]}>Taken on {item.date}</Text>
    </View>
    <Text style={[styles.resultSubject, { color: g(theme, 'textSub', '#8A9BB0') }]}>{item.subject}</Text>
    <Text style={[styles.resultScore, { color: parseFloat(item.score) >= 80 ? '#4ECDC4' : '#F7C948' }]}>
      {item.score}
    </Text>
    <View style={styles.passBadge}>
      <Text style={styles.passBadgeText}>PASS</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
// ✅ Accepts BOTH C={C} (StudentMain style) and themeC={C} — either works
export default function StudentQuiz({ C, themeC, onThemeToggle }) {
  const theme = themeC || C; // support both prop names

  const [search,     setSearch]     = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);

  if (activeQuiz) {
    return (
      <QuizFinal
        quiz={activeQuiz}
        onBack={() => setActiveQuiz(null)}
        themeC={theme}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  const bg       = g(theme, 'bg',          '#0D1B2A');
  const card     = g(theme, 'card',        '#1A2535');
  const cardAlt  = g(theme, 'cardAlt',     '#1E2D3D');
  const border   = g(theme, 'border',      '#1E2D3D');
  const textPri  = g(theme, 'textPrimary', '#FFFFFF');
  const textMut  = g(theme, 'textMuted',   '#667788');
  const accent   = g(theme, 'accent',      '#3B6FE8');
  const moonIcon = g(theme, 'moonIcon',    '🌙');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: textPri }]}>Quiz & Assessments</Text>
        <View style={styles.headerRight}>
          {onThemeToggle && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: card, borderColor: border, borderWidth: 1 }]}
              onPress={onThemeToggle}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 16 }}>{moonIcon}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={[styles.scroll, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: cardAlt }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: textPri }]}
            placeholder="Search quizzes..."
            placeholderTextColor={textMut}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((item, i) => <StatCard key={i} item={item} theme={theme} />)}
        </View>

        {/* Active Quizzes */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.activeDot, { backgroundColor: accent }]} />
            <Text style={[styles.sectionTitle, { color: textPri }]}>Active Quizzes</Text>
          </View>
          <TouchableOpacity activeOpacity={0.75}>
            <Text style={[styles.viewAll, { color: accent }]}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quizScroll}>
          {ACTIVE_QUIZZES.map(item => (
            <QuizCard key={item.id} item={item} onPress={() => setActiveQuiz(item)} />
          ))}
        </ScrollView>

        {/* Bottom */}
        <View style={isTablet ? styles.bottomGrid : styles.bottomStack}>
          <View style={[styles.section, isTablet && styles.sectionHalf]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPri }]}>📅 Upcoming Tests</Text>
            </View>
            {UPCOMING.map(item => <UpcomingCard key={item.id} item={item} theme={theme} />)}
          </View>

          <View style={[styles.section, isTablet && styles.sectionHalf]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textPri }]}>🕐 Recent Results</Text>
            </View>
            <View style={[styles.resultHeader, { borderBottomColor: border, marginHorizontal: 16 }]}>
              <Text style={[styles.resultHeaderText, { flex: 2, color: textMut }]}>QUIZ TITLE</Text>
              <Text style={[styles.resultHeaderText, { color: textMut }]}>SUBJECT</Text>
              <Text style={[styles.resultHeaderText, { color: textMut }]}>SCORE</Text>
              <Text style={[styles.resultHeaderText, { color: textMut }]}>STATUS</Text>
            </View>
            {RECENT.map(item => <ResultRow key={item.id} item={item} theme={theme} />)}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: isTablet ? 22 : 18, fontWeight: '700', letterSpacing: 0.4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, marginBottom: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon:      { fontSize: 16, marginRight: 8 },
  searchInput:     { flex: 1, fontSize: 14 },

  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  statCard:       { borderRadius: 14, padding: 14, width: (SCREEN_WIDTH - 40) / 2, minWidth: 140 },
  statCardTablet: { width: (SCREEN_WIDTH - 56) / 4 },
  statTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statLabel:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statIcon:       { fontSize: 18 },
  statValue:      { fontSize: 28, fontWeight: '800', marginVertical: 2 },
  statSub:        { fontSize: 11 },

  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot:       { width: 10, height: 10, borderRadius: 5 },
  sectionTitle:    { fontSize: isTablet ? 18 : 16, fontWeight: '700' },
  viewAll:         { fontSize: 13, fontWeight: '600' },

  quizScroll:     { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  quizCard:       { borderRadius: 16, padding: 18, width: isTablet ? 280 : SCREEN_WIDTH * 0.72, minHeight: 220 },
  quizCardTablet: { width: 300 },
  quizEmoji:      { marginBottom: 10 },
  quizTitle:      { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  quizSub:        { color: '#A0B4C8', fontSize: 12, marginBottom: 12, lineHeight: 17 },
  quizMeta:       { flexDirection: 'row', gap: 16, marginBottom: 16 },
  quizMetaText:   { color: '#C0D0E0', fontSize: 12, fontWeight: '600' },
  startBtn:       { backgroundColor: '#FF6B35', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  startBtnText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  bottomGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  bottomStack: { flexDirection: 'column' },
  section:     { flex: 1 },
  sectionHalf: { width: '50%' },

  upcomingCard:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, gap: 12 },
  upcomingDate:  { backgroundColor: '#FF6B35', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48 },
  upcomingMonth: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  upcomingDay:   { color: '#FFF', fontSize: 20, fontWeight: '900' },
  upcomingInfo:  { flex: 1 },
  upcomingTitle: { fontSize: 14, fontWeight: '700' },
  upcomingTime:  { fontSize: 12, marginTop: 3 },
  bellBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  resultHeader:     { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, gap: 4 },
  resultHeaderText: { flex: 1, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  resultRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, marginHorizontal: 16, gap: 4 },
  resultInfo:       { flex: 2 },
  resultTitle:      { fontSize: 13, fontWeight: '600' },
  resultDate:       { fontSize: 10, marginTop: 2 },
  resultSubject:    { flex: 1, fontSize: 12 },
  resultScore:      { flex: 1, fontSize: 15, fontWeight: '800' },
  passBadge:        { backgroundColor: 'rgba(78,205,196,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  passBadgeText:    { color: '#4ECDC4', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});