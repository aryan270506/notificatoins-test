import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import NotesData from './NoteData';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTabletOrDesktop = SCREEN_WIDTH >= 768;

const normalizeYearValue = (y) => {
  if (y === null || y === undefined) return null;
  const raw = String(y).trim().toUpperCase();
  if (!raw) return null;
  const yearMap = { FY: '1', SY: '2', TY: '3', LY: '4' };
  if (yearMap[raw]) return yearMap[raw];
  const match = raw.match(/^(\d)/);
  return match ? match[1] : raw;
};

// ─── Subject colour palette ───────────────────────────────────────────────────
const SUBJECT_COLORS = [
  { icon: '⊞', color: '#5B7FFF', bg: '#1E2A6E' },
  { icon: '⬡', color: '#B06EFF', bg: '#2A1A55' },
  { icon: '◉', color: '#F5A623', bg: '#3A2800' },
  { icon: '◎', color: '#00D4AA', bg: '#003D32' },
  { icon: '◈', color: '#FF6B9D', bg: '#3D0020' },
  { icon: '◇', color: '#00B4FF', bg: '#001A3D' },
  { icon: '⬟', color: '#FF8C42', bg: '#3D1900' },
  { icon: '⊕', color: '#3DD68C', bg: '#003320' },
  { icon: 'Σ', color: '#FF5C5C', bg: '#3D0000' },
  { icon: '⬡', color: '#C875FF', bg: '#2D0050' },
];

// ─── CourseCard ───────────────────────────────────────────────────────────────
const CourseCard = ({ course, onPress, C }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isWide && styles.cardDesktop,
        { backgroundColor: C.card, borderColor: C.border },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={[styles.courseId, { color: C.textMuted }]}>{course.id}</Text>

      <View style={[styles.iconWrapper, { backgroundColor: course.bg }]}>
        <Text style={[styles.iconText, { color: course.color }]}>{course.icon}</Text>
      </View>

      <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{course.title}</Text>
      <Text style={[styles.cardDesc,  { color: C.textMuted  }]}>{course.description}</Text>

      <View style={styles.cardFooter}>
        {/* Type badge */}
        <View style={[
          styles.typeBadge,
          { backgroundColor: course.color + '18', borderColor: course.color + '44' },
        ]}>
          <Text style={[styles.typeBadgeText, { color: course.color }]}>
            {course.type === 'Lab' ? '🧪 Lab' : '📖 Theory'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: course.color + '22', borderColor: course.color + '55' }]}
          onPress={onPress}
          activeOpacity={0.75}
        >
          <Text style={[styles.viewBtnText, { color: course.color }]}>View Notes</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentsNotes({ C, onThemeToggle, user }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [subjects,       setSubjects]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('All');

  const TABS = [];

  const { width } = useWindowDimensions();
  const isWide     = width >= 768;
  const numColumns = isWide ? 2 : 1;

  // ── Build course objects from subjects ──
  const courses = subjects.map((subject, index) => {
    const sc   = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    const name = typeof subject === 'string' ? subject : (subject.name || '');
    // If backend sends { name, type } honour it; otherwise default Theory
    const type = typeof subject === 'object' && subject.type
      ? subject.type
      : 'Theory';

    return {
      id:          name.substring(0, 6).toUpperCase() || `SUB${index}`,
      title:       name,
      description: 'Course materials and notes',
      files:       typeof subject === 'object' ? (subject.resourceCount || 0) : 0,
      icon:        sc.icon,
      color:       sc.color,
      bg:          sc.bg,
      type,
    };
  });

  // ── Filter by active tab (case-insensitive, default Theory) ──
  const filteredCourses = activeTab === 'All'
    ? courses
    : courses.filter(c =>
        (c.type || 'Theory').toLowerCase() === activeTab.toLowerCase()
      );

  // ── Fetch subjects ──
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const normalizedYear = normalizeYearValue(user?.year ?? user?.academicYear ?? user?.academic_year);

        if (normalizedYear) {
          const res = await axiosInstance.get(`/configuration/subjects/${normalizedYear}`);
          const cfg = res.data?.data || {};
          const theory = Array.isArray(cfg.subjects) ? cfg.subjects.map((name) => ({ name, type: 'Theory' })) : [];
          const practical = Array.isArray(cfg.labs) ? cfg.labs.map((name) => ({ name, type: 'Lab' })) : [];
          setSubjects([...theory, ...practical]);
          return;
        }

        const res = await axiosInstance.get(`/students/subjects/${user.id}`);
        const data = res.data;
        setSubjects(data.subjects || []);
      } catch (error) {
        console.log('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchSubjects();
  }, [user]);

  // ── If a course is selected, render NotesData ──
  if (selectedCourse) {
    return (
      <NotesData
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
        C={C}
        onThemeToggle={onThemeToggle}
        user={user}
      />
    );
  }

  // ── Subject list ──
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar ?? 'light-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Study Materials</Text>
          <Text style={[styles.headerSub,   { color: C.textMuted  }]}>
            Access and download semester-wise academic resources and lecture notes.
          </Text>
        </View>

        {onThemeToggle && (
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
            onPress={onThemeToggle}
          >
            <Text style={styles.iconBtnText}>{C.moonIcon ?? '🌙'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        bounces
        decelerationRate="fast"
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              { backgroundColor: C.card, borderColor: C.border },
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                { color: C.textMuted },
                activeTab === tab && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Course grid */}
      <ScrollView
        contentContainerStyle={[styles.grid, isWide && styles.gridDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#5B7FFF" style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>Loading subjects…</Text>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              No subjects found for your class.
            </Text>
          </View>
        ) : numColumns === 2 ? (
          chunk(filteredCourses, 2).map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onPress={() => setSelectedCourse(course)}
                  C={C}
                />
              ))}
              {/* Ghost card to keep grid even */}
              {row.length === 1 && (
                <View style={[styles.card, styles.cardDesktop, styles.invisible]} />
              )}
            </View>
          ))
        ) : (
          filteredCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onPress={() => setSelectedCourse(course)}
              C={C}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: isTabletOrDesktop ? 28 : 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
    maxWidth: isTabletOrDesktop ? 480 : SCREEN_WIDTH * 0.7,
    lineHeight: 18,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  iconBtnText: { fontSize: 16 },

  // Tabs
  tabsContainer: {
    paddingHorizontal: 20,
    paddingRight: 20,
    gap: 10,
    flexDirection: 'row',
    paddingBottom: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 30,
    borderWidth: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive:     { backgroundColor: '#1E3A8A', borderColor: '#3B6FDB' },
  tabText:       { fontSize: 14, fontWeight: '600', includeFontPadding: false, flexShrink: 0 },
  tabTextActive: { color: '#FFFFFF' },

  // Divider
  divider: { height: 1, marginTop: 14, marginBottom: 16, marginHorizontal: 20 },

  // Grid
  grid:        { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  gridDesktop: { paddingHorizontal: 24 },
  row:         { flexDirection: 'row', gap: 14 },

  // Card
  card: {
    borderRadius: CARD_RADIUS,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDesktop: { flex: 1 },
  invisible:   { opacity: 0, elevation: 0, shadowOpacity: 0 },

  courseId: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 12, alignSelf: 'flex-end',
  },
  iconWrapper: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  iconText:  { fontSize: 22, fontWeight: '700' },
  cardTitle: {
    fontSize: isTabletOrDesktop ? 17 : 15,
    fontWeight: '700', marginBottom: 8, letterSpacing: -0.3,
  },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 16, flex: 1 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 'auto',
  },

  // Type badge on card
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  viewBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  viewBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty / loading
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, width: '100%',
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
});