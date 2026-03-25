import React, { useState, useEffect } from 'react';
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
import axiosInstance from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

// ─────────────────────────────────────────────────────────────────────────────
// Subject accent colour palette
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_ACCENTS = [
  { solid: '#3B82F6', soft: 'rgba(59,130,246,0.10)',  avatarBg: '#1D4ED8', glow: 'rgba(59,130,246,0.25)' },
  { solid: '#8B5CF6', soft: 'rgba(139,92,246,0.10)',  avatarBg: '#5B21B6', glow: 'rgba(139,92,246,0.25)' },
  { solid: '#10B981', soft: 'rgba(16,185,129,0.10)',  avatarBg: '#065F46', glow: 'rgba(16,185,129,0.25)' },
  { solid: '#F59E0B', soft: 'rgba(245,158,11,0.10)',  avatarBg: '#92400E', glow: 'rgba(245,158,11,0.25)' },
  { solid: '#EF4444', soft: 'rgba(239,68,68,0.10)',   avatarBg: '#991B1B', glow: 'rgba(239,68,68,0.25)'  },
  { solid: '#06B6D4', soft: 'rgba(6,182,212,0.10)',   avatarBg: '#155E75', glow: 'rgba(6,182,212,0.25)'  },
  { solid: '#EC4899', soft: 'rgba(236,72,153,0.10)',  avatarBg: '#831843', glow: 'rgba(236,72,153,0.25)' },
  { solid: '#14B8A6', soft: 'rgba(20,184,166,0.10)',  avatarBg: '#134E4A', glow: 'rgba(20,184,166,0.25)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// normalize helper
// ─────────────────────────────────────────────────────────────────────────────
const normalize = (str) => str.trim().toUpperCase().replace(/\s+/g, ' ');

// ─────────────────────────────────────────────────────────────────────────────
// Subject Chat Room Card
// ─────────────────────────────────────────────────────────────────────────────
const SubjectCard = ({ course, onEnter, C }) => {
  const accent      = SUBJECT_ACCENTS[course.id % SUBJECT_ACCENTS.length];
  const isNoTeacher = course.instructor === 'No Teacher Assigned';
  const initials    = !isNoTeacher
    ? course.instructor.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[
      styles.subjectCard,
      isLaptop && styles.subjectCardLaptop,
      { backgroundColor: C.card, borderColor: C.border },
    ]}>
      {/* Top stripe */}
      <View style={[styles.cardStripe, { backgroundColor: accent.soft, borderBottomColor: accent.solid + '30' }]}>
        <View style={[styles.cardBubble, { backgroundColor: accent.solid, shadowColor: accent.glow }]}>
          <Text style={styles.cardBubbleText}>{course.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={[styles.subjectTag, { borderColor: accent.solid + '55', backgroundColor: accent.soft }]}>
          <Text style={[styles.subjectTagText, { color: accent.solid }]}>SUBJECT</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.courseTitle, { color: C.textPrimary }]} numberOfLines={2}>
        {course.title}
      </Text>

      {/* Instructor row */}
      <View style={[
        styles.instructorRow,
        {
          backgroundColor: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          borderColor: C.border,
        },
      ]}>
        <View style={[styles.instructorAvatar, { backgroundColor: isNoTeacher ? '#374151' : accent.avatarBg }]}>
          <Text style={styles.instructorInitialText}>{initials}</Text>
        </View>
        <View style={styles.instructorTextCol}>
          <Text style={[styles.instructorLabel, { color: C.textMuted }]}>Instructor</Text>
          <Text style={[styles.instructorName, { color: isNoTeacher ? C.textMuted : C.textPrimary }]} numberOfLines={1}>
            {course.instructor}
          </Text>
        </View>
        {!isNoTeacher
          ? <View style={[styles.verifiedDot, { backgroundColor: accent.solid }]} />
          : <Text style={{ fontSize: 13 }}>⚠️</Text>
        }
      </View>

      {/* Live chat indicator */}
      <View style={[styles.liveBadgeRow, { borderTopColor: C.border }]}>
        <View style={[styles.liveDot, { backgroundColor: accent.solid }]} />
        <Text style={[styles.liveText, { color: C.textMuted }]}>Shared class room</Text>
      </View>

      {/* Enter Chat Room Button */}
      <TouchableOpacity
        style={[styles.enterButton, { backgroundColor: accent.solid }]}
        onPress={() => onEnter(course)}
        activeOpacity={0.82}
      >
        <Text style={styles.enterButtonIcon}>💬</Text>
        <Text style={styles.enterButtonText}>Enter Chat Room</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentDoubt({ C, onThemeToggle, user }) {
  const [searchText,       setSearchText]       = useState('');
  const [activeChatCourse, setActiveChatCourse] = useState(null);
  const [courses,          setCourses]          = useState([]);
  const [loading,          setLoading]          = useState(true);

  // ── Fetch subjects with teacher names ──────────────────────────────────────
  useEffect(() => {
    const fetchSubjectsWithTeachers = async () => {
      if (!user?.id && !user?._id) return;
      const studentId = user.id || user._id;
      setLoading(true);
      try {
        let studentData = null;
        try {
          const stored = await AsyncStorage.getItem('studentData');
          if (stored) studentData = JSON.parse(stored);
        } catch (e) { /* ignore */ }

        if (!studentData || !studentData.year) {
          const res   = await axiosInstance.get(`/students/${studentId}`);
          const raw   = res.data;
          studentData = raw?.student || raw?.data || raw;
        }

        if (!studentData.subjects || !Array.isArray(studentData.subjects) || studentData.subjects.length === 0) {
          setCourses([]); setLoading(false); return;
        }

        const subjectTeacherMap = {};
        if (studentData.year && studentData.division && studentData.batch) {
          try {
            const res = await axiosInstance.get('/timetable', {
              params: { year: studentData.year, division: studentData.division, batch: studentData.batch },
            });
            if (res.data.success && res.data.data) {
              const timetable = res.data.data;
              ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].forEach((day) => {
                if (!timetable[day]) return;
                ['t1','t2','t3','t4','t5','t6'].forEach((slot) => {
                  const s = timetable[day][slot];
                  if (s && s.subject && s.teacherName) {
                    const key = normalize(s.subject);
                    if (!subjectTeacherMap[key]) {
                      subjectTeacherMap[key] = { name: s.teacherName, teacherId: s.teacherId || null };
                    }
                  }
                });
              });
            }
          } catch (e) { /* timetable fetch failed */ }
        }

        const formatted = studentData.subjects.map((sub, index) => {
          const norm  = normalize(sub);
          let entry   = subjectTeacherMap[norm];
          if (!entry) {
            const match = Object.keys(subjectTeacherMap).find(
              k => k.includes(norm) || norm.includes(k)
            );
            if (match) entry = subjectTeacherMap[match];
          }
          return {
            id:         index,
            title:      sub,
            instructor: entry?.name      || 'No Teacher Assigned',
            teacherId:  entry?.teacherId || null,
            year:       studentData.year,
            division:   studentData.division,
            batch:      studentData.batch,
          };
        });

        setCourses(formatted);
      } catch (err) {
        console.log('❌ fetchSubjectsWithTeachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjectsWithTeachers();
  }, [user]);

  // ── Route to chat room ─────────────────────────────────────────────────────
  if (activeChatCourse) {
    return (
      <DoubtChatScreen
        course={activeChatCourse}
        user={user}
        onBack={() => setActiveChatCourse(null)}
        C={C}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchText.toLowerCase()) ||
    c.instructor.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.card} />

      {/* Search bar */}
      <View style={[styles.navbar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.searchBar, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
          <Text style={[styles.searchIcon, { color: C.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search subjects or instructors…"
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
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
        contentContainerStyle={[styles.scrollContent, isLaptop && styles.scrollContentLaptop]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <View style={[styles.headerBlock, isLaptop && styles.headerBlockLaptop]}>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>Class Chat Rooms</Text>
            <Text style={[styles.pageSubtitle, { color: C.textSub }]}>
              Join your subject's shared chat room. All classmates can see and participate in the discussion.
            </Text>
          </View>
          <View style={[styles.infoBadge, { backgroundColor: C.isDark ? 'rgba(79,142,247,0.12)' : 'rgba(59,130,246,0.08)', borderColor: C.isDark ? 'rgba(79,142,247,0.3)' : 'rgba(59,130,246,0.2)' }]}>
            <Text style={{ fontSize: 20 }}>🏫</Text>
            <View>
              <Text style={[styles.infoBadgeTitle, { color: C.accent }]}>{courses.length} Subjects</Text>
              <Text style={[styles.infoBadgeSub, { color: C.textMuted }]}>available rooms</Text>
            </View>
          </View>
        </View>

        {/* Section label */}
        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>YOUR SUBJECT ROOMS</Text>
          <View style={[styles.sectionLine, { backgroundColor: C.border }]} />
        </View>

        {/* Cards */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading your subjects…</Text>
          </View>
        ) : filteredCourses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
              {searchText ? 'No matches found' : 'No subjects yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
              {searchText ? 'Try a different search term.' : 'Your subjects will appear here once assigned.'}
            </Text>
          </View>
        ) : isLaptop ? (
          <View style={styles.courseGrid}>
            {filteredCourses.map((c) => (
              <SubjectCard key={c.id} course={c} onEnter={setActiveChatCourse} C={C} />
            ))}
          </View>
        ) : (
          <View style={styles.courseStack}>
            {filteredCourses.map((c) => (
              <SubjectCard key={c.id} course={c} onEnter={setActiveChatCourse} C={C} />
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  navbar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  searchBar:      { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 8, borderWidth: 1, gap: 8 },
  searchIcon:     { fontSize: 14 },
  searchInput:    { flex: 1, fontSize: 14, outlineStyle: 'none' },
  clearBtn:       { padding: 2 },
  themeToggleBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  scroll:              { flex: 1 },
  scrollContent:       { padding: 16, paddingBottom: 48 },
  scrollContentLaptop: { paddingHorizontal: 28, paddingTop: 20 },

  headerBlock:       { marginBottom: 24, gap: 12 },
  headerBlockLaptop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTextGroup:   { flex: 1, marginRight: 16 },
  pageTitle:         { fontSize: isLaptop ? 26 : 22, fontWeight: '700', letterSpacing: -0.4, marginBottom: 6 },
  pageSubtitle:      { fontSize: 13, lineHeight: 20 },

  infoBadge:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexShrink: 0 },
  infoBadgeTitle: { fontSize: 15, fontWeight: '700' },
  infoBadgeSub:   { fontSize: 11, marginTop: 1 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  sectionLine:     { flex: 1, height: 1 },

  courseGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  courseStack: { gap: 14 },

  // Subject Card
  subjectCard:       { borderRadius: 18, borderWidth: 1, overflow: 'hidden', width: '100%' },
  subjectCardLaptop: { flex: 1, minWidth: 200, maxWidth: 300, width: undefined },

  cardStripe: {
    height: 80, borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 16,
  },
  cardBubble: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  cardBubbleText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },

  subjectTag:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  subjectTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  courseTitle: {
    fontSize: 15, fontWeight: '700', lineHeight: 22,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    minHeight: 58,
  },

  instructorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  instructorAvatar:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  instructorInitialText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  instructorTextCol:     { flex: 1, minWidth: 0 },
  instructorLabel:       { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 1 },
  instructorName:        { fontSize: 12, fontWeight: '600' },
  verifiedDot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  liveBadgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, marginBottom: 4 },
  liveDot:       { width: 7, height: 7, borderRadius: 4, opacity: 0.7 },
  liveText:      { fontSize: 11, fontWeight: '500' },

  enterButton:     { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  enterButtonIcon: { fontSize: 16 },
  enterButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  loadingWrap:  { alignItems: 'center', paddingVertical: 60 },
  loadingText:  { fontSize: 14 },

  emptyWrap:     { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});