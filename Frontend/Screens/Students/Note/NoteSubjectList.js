import React, { useState } from 'react';
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
} from 'react-native';
import NotesData from './NoteData';

const { width } = Dimensions.get('window');
const isTabletOrDesktop = width >= 768;

// ─── Data ─────────────────────────────────────────────────────────────────────

const TABS = ['Theory', 'Electives', 'Lab Materials'];

const COURSES = {
  Theory: [
    {
      id: 'CS201',
      title: 'Data Structures & Algorithms',
      description:
        'Advanced concepts of arrays, linked lists, trees, and algorithm complexity analysis.',
      files: 15,
      icon: '⊞',
      color: '#5B7FFF',
      bg: '#1E2A6E',
    },
    {
      id: 'CS202',
      title: 'Operating Systems',
      description:
        'Process management, memory allocation, file systems and shell scripting essentials.',
      files: 8,
      icon: '⬡',
      color: '#B06EFF',
      bg: '#2A1A55',
    },
    {
      id: 'CS203',
      title: 'Database Management',
      description:
        'Relational algebra, SQL queries, normalization, and transaction management protocols.',
      files: 20,
      icon: '◉',
      color: '#F5A623',
      bg: '#3A2800',
    },
    {
      id: 'CS205',
      title: 'Theory of Computation',
      description:
        'Automata theory, formal languages, Turing machines, and decidability problems.',
      files: 5,
      icon: '◎',
      color: '#00D4AA',
      bg: '#003D32',
    },
  ],
  Electives: [
    {
      id: 'CS301',
      title: 'Machine Learning',
      description:
        'Supervised and unsupervised learning, neural networks, and model evaluation techniques.',
      files: 18,
      icon: '◈',
      color: '#FF6B9D',
      bg: '#3D0020',
    },
    {
      id: 'CS302',
      title: 'Cloud Computing',
      description:
        'AWS, GCP, containerization with Docker, Kubernetes orchestration, and serverless architecture.',
      files: 12,
      icon: '◇',
      color: '#00B4FF',
      bg: '#001A3D',
    },
    {
      id: 'CS303',
      title: 'Cybersecurity',
      description:
        'Cryptography, ethical hacking, network security, and penetration testing fundamentals.',
      files: 9,
      icon: '⬟',
      color: '#FF8C42',
      bg: '#3D1900',
    },
  ],
  'Lab Materials': [
    {
      id: 'CS204',
      title: 'Computer Networks',
      description:
        'OSI model layers, TCP/IP protocols, routing algorithms and network security principles.',
      files: 10,
      icon: '⊕',
      color: '#3DD68C',
      bg: '#003320',
    },
    {
      id: 'MA104',
      title: 'Discrete Mathematics',
      description:
        'Set theory, logic, graph theory, and combinatorics for computer science applications.',
      files: 12,
      icon: 'Σ',
      color: '#FF5C5C',
      bg: '#3D0000',
    },
    {
      id: 'CS401',
      title: 'Software Engineering Lab',
      description:
        'Agile methodology, version control, CI/CD pipelines, and team project management.',
      files: 7,
      icon: '⬡',
      color: '#C875FF',
      bg: '#2D0050',
    },
  ],
};

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
      <Text style={[styles.cardDesc, { color: C.textMuted }]}>{course.description}</Text>

      <View style={styles.cardFooter}>
        <Text style={[styles.fileCount, { color: C.textSub ?? C.textMuted }]}>
          📄 {course.files} PDF Files
        </Text>

        <TouchableOpacity
          style={[
            styles.viewBtn,
            {
              backgroundColor: course.color + '22',
              borderColor: course.color + '55',
            },
          ]}
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

export default function StudentsNotes({ C, onThemeToggle }) {
  const [activeTab, setActiveTab] = useState('Theory');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const courses = COURSES[activeTab] ?? [];
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const numColumns = isWide ? 2 : 1;

  // ── If a course is selected, show the NotesData screen ──
  if (selectedCourse) {
    return (
      <NotesData
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
        C={C}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar ?? 'light-content'} backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>My Study Materials</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>
            Access and download semester-wise academic resources and lecture notes.
          </Text>
        </View>

        {/* Theme Toggle */}
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

      {/* ── Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        // Ensure the scroll view does not clip content on mobile
        bounces={true}
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

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* ── Course Grid ── */}
      <ScrollView
        contentContainerStyle={[styles.grid, isWide && styles.gridDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {numColumns === 2
          ? chunk(courses, 2).map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onPress={() => setSelectedCourse(course)}
                    C={C}
                  />
                ))}
                {row.length === 1 && (
                  <View
                    style={[
                      styles.card,
                      styles.cardDesktop,
                      styles.invisible,
                      { backgroundColor: C.card, borderColor: C.border },
                    ]}
                  />
                )}
              </View>
            ))
          : courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onPress={() => setSelectedCourse(course)}
                C={C}
              />
            ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function chunk(arr, size) {
  if (size <= 0) throw new Error('Size must be greater than 0');
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Header ──
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
    maxWidth: isTabletOrDesktop ? 480 : width * 0.7,
    lineHeight: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  iconBtnText: {
    fontSize: 16,
  },

  // ── Tabs ──
  tabsContainer: {
    paddingHorizontal: 20,
    // KEY FIX: use gap instead of relying on margins, and ensure right padding
    // so the last tab ("Lab Materials") is fully visible before scrolling ends
    gap: 10,
    flexDirection: 'row',
    paddingBottom: 4,
    // Add right padding so last tab is never clipped
    paddingRight: 20,
    alignItems: 'center',
  },
  tab: {
    // KEY FIX: Remove any fixed width. Use paddingHorizontal + let content
    // determine width naturally. Also ensure text cannot be clipped.
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 30,
    borderWidth: 1,
    // Prevent the tab from shrinking below its content size
    flexShrink: 0,
    // Ensure the tab always fits its label text
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B6FDB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    // KEY FIX: never allow text to be truncated inside the tab pill
    includeFontPadding: false,
    // Prevent wrapping — each tab is a single line
    flexShrink: 0,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginTop: 14,
    marginBottom: 16,
    marginHorizontal: 20,
  },

  // ── Grid ──
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  gridDesktop: {
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },

  // ── Card ──
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
  cardDesktop: {
    flex: 1,
  },
  invisible: {
    opacity: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  courseId: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    alignSelf: 'flex-end',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: isTabletOrDesktop ? 17 : 15,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  fileCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});