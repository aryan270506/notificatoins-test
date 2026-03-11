import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
import QuizFinal from "./QuizFinal";

// ─── Safe theme getter ────────────────────────────────────────────────────────
const g = (theme, key, fallback) => theme?.[key] ?? fallback;

// ─── EMOJI MAP for subjects ───────────────────────────────────────────────────
const EMOJI_MAP = {
  'Mathematics': '🧮',
  'Physics': '⚛️',
  'Chemistry': '🧪',
  'Computer Science': '💻',
  'History': '📚',
  'English': '📖',
  'Networks': '🖧',
  'Database': '🗄️',
  'Engineering': '⚙️',
  'Biology': '🧬',
  'default': '📝',
};

const COLOR_MAP = [
  '#2A4A3E', '#1A3A4A', '#3A2A4A', '#4A2A3A',
  '#2A4A2A', '#3A2A2A', '#2A2A4A', '#4A4A2A',
];

const getEmoji = (subject) => EMOJI_MAP[subject] || EMOJI_MAP.default;
const getColor = (index) => COLOR_MAP[index % COLOR_MAP.length];

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

const QuizCard = ({ item, onPress, theme }) => {
  const statusColor = item.status === 'ACTIVE' ? '#4ECDC4' : item.status === 'SCHEDULED' ? '#F7C948' : '#667788';
  const submitted = item.submitted;
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.82}
      disabled={!item.status || item.status !== 'ACTIVE' || item.submitted}
    >
      <View style={[
        styles.quizCard, 
        { backgroundColor: getColor(item.index) },
        !item.status || item.status !== 'ACTIVE' ? styles.quizCardDisabled : {},
        isTablet && styles.quizCardTablet
      ]}>
        <View style={styles.quizHeader}>
          <View style={styles.quizEmoji}>
            <Text style={{ fontSize: 36 }}>{getEmoji(item.subject)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {item.submitted ? '✓ Done' : item.status === 'ACTIVE' ? 'LIVE' : 'Soon'}
            </Text>
          </View>
        </View>
        <Text style={styles.quizTitle}>{item.title}</Text>
        {item.subject && <Text style={styles.quizSub}>{item.subject}</Text>}
        <View style={styles.quizMeta}>
          <Text style={styles.quizMetaText}>📝 {Array.isArray(item.questions) ? item.questions.length : (item.questions ?? 0)} Qs</Text>
          <Text style={styles.quizMetaText}>⏱ {item.duration} Mins</Text>
        </View>
        {item.submitted && item.score !== null && (
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreText}>Score: {item.score}/{item.totalMarks}</Text>
          </View>
        )}
      <TouchableOpacity 
  style={[
    styles.startBtn,
    (item.status !== 'ACTIVE' || item.submitted) && styles.startBtnDisabled
  ]} 
  onPress={onPress} 
  activeOpacity={0.8}
  disabled={item.status !== 'ACTIVE' || item.submitted}
>
  <Text style={styles.startBtnText}>
    {item.submitted ? '✅ Already Submitted' : item.status === 'ACTIVE' ? 'Start Quiz →' : 'Coming Soon'}
  </Text>
</TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ResultRow = ({ item, theme }) => (
  <View style={[styles.resultRow, { borderBottomColor: g(theme, 'border', '#1A2535') }]}>
    <View style={styles.resultInfo}>
      <Text style={[styles.resultTitle, { color: g(theme, 'textPrimary', '#FFFFFF') }]}>{item.title}</Text>
      <Text style={[styles.resultDate,  { color: g(theme, 'textMuted',   '#667788') }]}>Score: {item.score}</Text>
    </View>
    {item.subject && <Text style={[styles.resultSubject, { color: g(theme, 'textSub', '#8A9BB0') }]}>{item.subject}</Text>}
    <View style={[styles.passBadge, { backgroundColor: parseFloat(item.score) >= 60 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
      <Text style={[
        styles.passBadgeText, 
        { color: parseFloat(item.score) >= 60 ? '#22C55E' : '#EF4444' }
      ]}>
        {parseFloat(item.score) >= 60 ? 'PASS' : 'FAIL'}
      </Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentQuiz({ C, themeC, onThemeToggle, user }) {
  const theme = themeC || C;

  const [search,     setSearch]     = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizzes,    setQuizzes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [stats,      setStats]      = useState({ total: 0, active: 0, completed: 0, avgScore: 0 });

  // Fetch quizzes when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchQuizzes();
    }, [user])
  );

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get student data from user prop or AsyncStorage
      let studentData = null;

      if (user && (user._id || user.id)) {
        studentData = user;
        console.log('📚 Using user prop for student data:', studentData.name);
      } else {
        const storedData = await AsyncStorage.getItem('studentData');
        if (storedData) {
          studentData = JSON.parse(storedData);
          console.log('📚 Using stored student data:', studentData.name);
        }
      }

      if (!studentData) {
        setError('Student data not found. Please login again.');
        setLoading(false);
        return;
      }

      // Get the MongoDB _id for quiz API call
      const mongoId = studentData._id || studentData.id;
      if (!mongoId) {
        setError('Student ID not found. Please login again.');
        setLoading(false);
        return;
      }

      console.log('📚 Student MongoDB _id:', mongoId);
      console.log('📋 Student details - Year:', studentData.year, 'Division:', studentData.division, 'Roll:', studentData.roll_no);

      // Step 2: Build query params based on available student data
      const params = {};
      if (studentData.year && String(studentData.year).trim() !== '') {
        params.year = studentData.year;
      }
      if (studentData.division && String(studentData.division).trim() !== '') {
        params.division = studentData.division;
      }
      if (studentData.roll_no) {
        const parts = studentData.roll_no.split('-');
        if (parts[1]) {
          const subDivNum = parts[1].replace(/^[A-Za-z]+/, '');
          if (subDivNum) params.subDiv = subDivNum;
        }
      }
      
      console.log('📋 Query params:', params);

      // Step 3: Fetch quizzes from backend
      const res = await axiosInstance.get(`/quiz/student/${mongoId}`, {
        params,
      });

      // Step 4: Handle response and update state
      if (res.data?.success) {
        console.log('✅ Fetched quizzes:', res.data.data.length);
        console.log('📄 Quiz data:', res.data.data);
        const quizzesData = res.data.data;
        setQuizzes(quizzesData);

        // Calculate stats
        const active = quizzesData.filter(q => q.status === 'ACTIVE').length;
        const completed = quizzesData.filter(q => q.submitted).length;
        const total = quizzesData.length;
        const scores = quizzesData.filter(q => q.score !== null).map(q => (q.score / q.totalMarks) * 100);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        setStats({ total, active, completed, avgScore });
      } else {
        setError('Failed to fetch quizzes');
      }
    } catch (err) {
      console.error('❌ Error fetching quizzes:', err.message);
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  if (activeQuiz) {
    return (
      <QuizFinal
        quiz={activeQuiz}
        onBack={() => { setActiveQuiz(null); fetchQuizzes(); }}
        onQuizSubmitted={() => fetchQuizzes()}
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

  const STATS_DATA = [
    { label: 'Total Quizzes', value: String(stats.total), sub: 'Assigned',   icon: '📋', accent: '#FF6B35' },
    { label: 'Active Now',    value: String(stats.active), sub: 'Ready',     icon: '⚡', accent: '#F7C948' },
    { label: 'Avg. Score',    value: `${stats.avgScore}%`, sub: 'Performance', icon: '📈', accent: '#4ECDC4' },
    { label: 'Completed',     value: String(stats.completed), sub: 'Done', icon: '✅', accent: '#45B7D1' },
  ];

  const activeQuizzes = quizzes.filter(q => q.status === 'ACTIVE');
  const submittedQuizzes = quizzes.filter(q => q.submitted);
  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.subject && q.subject.toLowerCase().includes(search.toLowerCase()))
  );

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

      {loading ? (
        <View style={[styles.centerContainer, { backgroundColor: bg }]}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.loadingText, { color: textMut }]}>Fetching your quizzes...</Text>
        </View>
      ) : error ? (
        <View style={[styles.centerContainer, { backgroundColor: bg }]}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>⚠️ {error}</Text>
          <TouchableOpacity 
            style={[styles.retryBtn, { backgroundColor: accent }]}
            onPress={fetchQuizzes}
          >
            <Text style={{ color: textPri, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
            {STATS_DATA.map((item, i) => <StatCard key={i} item={item} theme={theme} />)}
          </View>

          {/* Active Quizzes */}
          {activeQuizzes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.activeDot, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: textPri }]}>🔴 Active Quizzes ({activeQuizzes.length})</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quizScroll}>
                {activeQuizzes.map((quiz, idx) => (
                  <QuizCard 
                    key={quiz._id} 
                    item={{ ...quiz, index: idx }} 
                    onPress={() => !quiz.submitted && setActiveQuiz(quiz)}
                    theme={theme}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* All Quizzes */}
          {quizzes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPri }]}>📋 All Quizzes</Text>
              </View>

              <View style={[styles.quizList, { backgroundColor: card }]}>
                {filteredQuizzes.length > 0 ? (
                  filteredQuizzes.map((quiz, idx) => (
                    <QuizCard 
                      key={quiz._id}
                      item={{ ...quiz, index: idx }}
                     onPress={() => quiz.status === 'ACTIVE' && !quiz.submitted && setActiveQuiz(quiz)}
                      theme={theme}
                    />
                  ))
                ) : (
                  <Text style={[styles.noResultsText, { color: textMut }]}>No quizzes match your search</Text>
                )}
              </View>
            </>
          )}

          {/* Completed Quizzes */}
          {submittedQuizzes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textPri }]}>✅ Completed Quizzes ({submittedQuizzes.length})</Text>
              </View>
              <View style={[styles.resultHeader, { borderBottomColor: border, marginHorizontal: 16 }]}>
                <Text style={[styles.resultHeaderText, { flex: 2, color: textMut }]}>QUIZ TITLE</Text>
                <Text style={[styles.resultHeaderText, { color: textMut }]}>SUBJECT</Text>
                <Text style={[styles.resultHeaderText, { color: textMut }]}>SCORE</Text>
              </View>
              {submittedQuizzes.map(quiz => (
                <ResultRow 
                  key={quiz._id}
                  item={{
                    title: quiz.title,
                    subject: quiz.subject,
                    score: quiz.score && quiz.totalMarks ? `${quiz.score}/${quiz.totalMarks}` : 'N/A'
                  }}
                  theme={theme}
                />
              ))}
            </>
          )}

          {quizzes.length === 0 && (
            <View style={[styles.centerContainer, { backgroundColor: bg }]}>
              <Text style={[styles.emptyText, { color: textMut }]}>📭 No quizzes assigned yet</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flex: 1 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { fontSize: 16, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  noResultsText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },

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

  quizScroll:     { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  quizList:       { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 8 },
  quizCard:       { borderRadius: 16, padding: 18, width: isTablet ? 280 : SCREEN_WIDTH * 0.72, minHeight: 220 },
  quizCardTablet: { width: 300 },
  quizCardDisabled: { opacity: 0.6 },
  quizHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  quizEmoji:      { fontSize: 36 },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  quizTitle:      { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  quizSub:        { color: '#A0B4C8', fontSize: 12, marginBottom: 12, lineHeight: 17 },
  quizMeta:       { flexDirection: 'row', gap: 16, marginBottom: 8 },
  quizMetaText:   { color: '#C0D0E0', fontSize: 12, fontWeight: '600' },
  scoreDisplay:   { marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6 },
  scoreText:      { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  startBtn:       { backgroundColor: '#FF6B35', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  resultHeader:     { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, gap: 4 },
  resultHeaderText: { flex: 1, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  resultRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, marginHorizontal: 16, gap: 4 },
  resultInfo:       { flex: 2 },
  resultTitle:      { fontSize: 13, fontWeight: '600' },
  resultDate:       { fontSize: 10, marginTop: 2 },
  resultSubject:    { flex: 1, fontSize: 12 },
  passBadge:        { backgroundColor: 'rgba(78,205,196,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  passBadgeText:    { color: '#4ECDC4', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});