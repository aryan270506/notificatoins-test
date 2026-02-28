import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import DoubtChatScreen from './DoubtChatScreen';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

// ── Mock Data ──────────────────────────────────────────────────────────────────
const COURSES = [
  {
    id: 1,
    tag: 'CORE',
    tagColor: '#4F8EF7',
    title: 'Data Structures',
    instructor: 'Prof. Aristhanes',
    status: '3 new responses',
    statusColor: '#4F8EF7',
    statusIcon: '💬',
  },
  {
    id: 2,
    tag: 'ELECTIVE',
    tagColor: '#A78BFA',
    title: 'Operating Systems',
    instructor: 'Prof. Sarah Jenkins',
    status: 'No active doubts',
    statusColor: '#6B7280',
    statusIcon: null,
  },
  {
    id: 3,
    tag: 'CORE',
    tagColor: '#4F8EF7',
    title: 'Database Systems',
    instructor: 'Prof. Mike Ross',
    status: '1 pending reply',
    statusColor: '#F59E0B',
    statusIcon: '🕐',
  },
  {
    id: 4,
    tag: 'CORE',
    tagColor: '#4F8EF7',
    title: 'Computer Networks',
    instructor: 'Prof. Elena Gilbert',
    status: 'Last activity: 2h ago',
    statusColor: '#6B7280',
    statusIcon: '🕐',
  },
];

const INQUIRIES = [
  {
    id: 1,
    title: 'Complexity of Merge Sort vs Quick Sort',
    subtitle: 'Data Structures • 3 responses • Updated 12m ago',
    badge: 'RESOLVED',
    badgeColor: '#10B981',
    badgeBg: '#064E3B',
    badgeBgLight: '#D1FAE5',
  },
  {
    id: 2,
    title: 'Explain Semaphore implementation in Linux',
    subtitle: 'Operating Systems • 0 responses • Updated 1h ago',
    badge: 'PENDING',
    badgeColor: '#F59E0B',
    badgeBg: '#451A03',
    badgeBgLight: '#FEF3C7',
  },
  {
    id: 3,
    title: 'SQL Join Optimization techniques',
    subtitle: 'Database Systems • 1 response • Updated 5h ago',
    badge: 'IN REVIEW',
    badgeColor: '#60A5FA',
    badgeBg: '#1E3A5F',
    badgeBgLight: '#DBEAFE',
  },
];

// ── Components ─────────────────────────────────────────────────────────────────
const TagBadge = ({ label, color }) => (
  <View style={[styles.tagBadge, { backgroundColor: color + '33' }]}>
    <Text style={[styles.tagText, { color }]}>{label}</Text>
  </View>
);

const StatusBadge = ({ label, color, bg }) => (
  <View style={[styles.statusBadge, { backgroundColor: bg }]}>
    <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
  </View>
);

const CourseCard = ({ course, onAskDoubt, onInstructorPress, C }) => (
  <View style={[
    styles.courseCard,
    isLaptop && styles.courseCardLaptop,
    { backgroundColor: C.card, borderColor: C.border },
  ]}>
    <View style={[styles.courseCardHeader, { backgroundColor: C.bg }]}>
      <View style={[styles.courseImagePlaceholder, { backgroundColor: C.cardAlt }]} />
      <TagBadge label={course.tag} color={course.tagColor} />
    </View>

    <Text style={[styles.courseTitle, { color: C.textPrimary }]}>{course.title}</Text>

    <TouchableOpacity
      style={styles.instructorRow}
      onPress={() => onInstructorPress(course)}
      activeOpacity={0.75}
    >
      <View style={[styles.instructorAvatar, { backgroundColor: C.accent }]} />
      <View>
        <Text style={[styles.instructorLabel, { color: C.textMuted }]}>Instructor</Text>
        <Text style={[styles.instructorName, styles.instructorNameLink, { color: C.accent }]}>
          {course.instructor} ›
        </Text>
      </View>
    </TouchableOpacity>

    <Text style={[styles.courseStatus, { color: course.statusColor }]}>
      {course.statusIcon ? `${course.statusIcon} ` : ''}{course.status}
    </Text>

    <TouchableOpacity
      style={[styles.askButton, { backgroundColor: C.accent }]}
      onPress={() => onAskDoubt(course)}
      activeOpacity={0.75}
    >
      <Text style={[styles.askButtonText, { color: '#FFFFFF' }]}>＋  Ask Doubt</Text>
    </TouchableOpacity>
  </View>
);

const InquiryRow = ({ item, onPress, C }) => {
  const isDark = C.isDark;
  return (
    <TouchableOpacity
      style={[styles.inquiryRow, { borderBottomColor: C.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.inquiryIcon, { backgroundColor: C.accentBg }]}>
        <Text style={{ color: C.accent, fontSize: 16 }}>📋</Text>
      </View>
      <View style={styles.inquiryTextGroup}>
        <Text style={[styles.inquiryTitle, { color: C.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.inquirySubtitle, { color: C.textMuted }]}>{item.subtitle}</Text>
      </View>
      <StatusBadge
        label={item.badge}
        color={item.badgeColor}
        bg={isDark ? item.badgeBg : item.badgeBgLight}
      />
    </TouchableOpacity>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function StudentDoubt({ C, onThemeToggle }) {
  const [searchText, setSearchText] = useState('');
  const [activeChatCourse, setActiveChatCourse] = useState(null);

  const handleOpenChat  = (course) => setActiveChatCourse(course);
  const handleCloseChat = () => setActiveChatCourse(null);
  const handleInquiryPress = (item) => console.log('Open inquiry:', item.title);

  // ── Render DoubtChatScreen if a course is selected ──
  if (activeChatCourse) {
    return (
      <DoubtChatScreen
        course={activeChatCourse}
        onBack={handleCloseChat}
        C={C}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.card} />

      {/* ── Top Nav ── */}
      <View style={[styles.navbar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.searchBar, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
          <Text style={[styles.searchIcon, { color: C.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search for doubts, subjects or mentors..."
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Theme toggle */}
        {onThemeToggle && (
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
            onPress={onThemeToggle}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{C.moonIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isLaptop && styles.scrollContentLaptop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>My Doubts</Text>
            <Text style={[styles.pageSubtitle, { color: C.textSub }]}>
              Centralized hub for all your academic queries. Get expert guidance
              from your professors and track progress in real-time.
            </Text>
          </View>
          <View style={styles.statsBadges}>
            <View style={[styles.statBadge, { borderColor: C.green }]}>
              <Text style={{ color: C.green, fontSize: 14 }}>✅ </Text>
              <Text style={[styles.statText, { color: C.green }]}>24 Resolved</Text>
            </View>
            <View style={[styles.statBadge, { borderColor: C.orange, marginLeft: 8 }]}>
              <Text style={{ color: C.orange, fontSize: 14 }}>🟡 </Text>
              <Text style={[styles.statText, { color: C.orange }]}>3 Pending</Text>
            </View>
          </View>
        </View>

        {/* ── Course Cards ── */}
        {isLaptop ? (
          <View style={styles.courseGrid}>
            {COURSES.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                onAskDoubt={handleOpenChat}
                onInstructorPress={handleOpenChat}
                C={C}
              />
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.courseScroll}
          >
            {COURSES.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                onAskDoubt={handleOpenChat}
                onInstructorPress={handleOpenChat}
                C={C}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Recent Inquiries ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Recent Inquiries</Text>
        </View>

        <View style={[styles.inquiryList, { backgroundColor: C.card, borderColor: C.border }]}>
          {INQUIRIES.map((item) => (
            <InquiryRow
              key={item.id}
              item={item}
              onPress={handleInquiryPress}
              C={C}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const CARD_W = isLaptop ? (width - 80) / 4 : width * 0.62;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
  },
  searchIcon:   { fontSize: 14, marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 14 },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll:              { flex: 1 },
  scrollContent:       { padding: 20, paddingBottom: 40 },
  scrollContentLaptop: { paddingHorizontal: 32 },

  // Header
  headerRow: {
    flexDirection: isLaptop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isLaptop ? 'flex-start' : 'stretch',
    marginBottom: 24,
    gap: 12,
  },
  headerText:   { flex: isLaptop ? 1 : undefined, marginRight: isLaptop ? 32 : 0 },
  pageTitle:    { fontSize: isLaptop ? 28 : 22, fontWeight: '700', marginBottom: 4, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, lineHeight: 18 },
  statsBadges:  { flexDirection: 'row', alignItems: 'center', marginTop: isLaptop ? 4 : 0 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent',
  },
  statText: { fontWeight: '600', fontSize: 13 },

  // Course grid / scroll
  courseGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 32 },
  courseScroll: { paddingRight: 20, marginBottom: 32, gap: 14 },

  // Course Card
  courseCard: {
    width: CARD_W,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  courseCardLaptop: { flex: 1, minWidth: 180 },
  courseCardHeader: {
    height: 80,
    borderRadius: 10,
    marginBottom: 12,
    justifyContent: 'flex-end',
    padding: 8,
    overflow: 'hidden',
  },
  courseImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  tagBadge:          { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:           { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  courseTitle:       { fontSize: 16, fontWeight: '700', marginBottom: 10, lineHeight: 22 },
  instructorRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  instructorAvatar:  { width: 30, height: 30, borderRadius: 15 },
  instructorLabel:   { fontSize: 10 },
  instructorName:    { fontSize: 12, fontWeight: '600' },
  instructorNameLink:{ textDecorationLine: 'underline' },
  courseStatus:      { fontSize: 12, fontWeight: '500', marginBottom: 14 },
  askButton:         { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  askButtonText:     { fontSize: 13, fontWeight: '700' },

  // Inquiries
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontWeight: '700' },
  inquiryList:   { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  inquiryRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 12 },
  inquiryIcon:   { width: 38, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  inquiryTextGroup:  { flex: 1 },
  inquiryTitle:      { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  inquirySubtitle:   { fontSize: 12 },
  statusBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});