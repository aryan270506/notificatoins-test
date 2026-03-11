import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import DoubtChatScreen from './DoubtChatScreen';
import axiosInstance from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

// ─────────────────────────────────────────────────────────────────────────────
// Pure utilities — defined OUTSIDE the component so they are always available
// ─────────────────────────────────────────────────────────────────────────────

const getTimeAgo = (dateStr) => {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDoubt = (d) => {
  const badge    = d.status;
  const badgeMap = {
    'RESOLVED':  { color: '#10B981', bg: '#064E3B', bgLight: '#D1FAE5' },
    'PENDING':   { color: '#F59E0B', bg: '#451A03', bgLight: '#FEF3C7' },
    'IN REVIEW': { color: '#60A5FA', bg: '#1E3A5F', bgLight: '#DBEAFE' },
  };
  const bc = badgeMap[badge] || badgeMap['PENDING'];
  const instructorDisplay =
    d.instructorName && d.instructorName !== 'Faculty' && d.instructorName !== 'Unknown'
      ? d.instructorName
      : 'Faculty';
  return {
    id:             d._id,
    _id:            d._id,
    title:          d.title || d.subject,
    subject:        d.subject,
    subtitle:       `${d.subject} • ${instructorDisplay} • ${getTimeAgo(d.updatedAt)}`,
    instructorName: instructorDisplay,
    badge,
    badgeColor:     bc.color,
    badgeBg:        bc.bg,
    badgeBgLight:   bc.bgLight,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Subject accent colour palette
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_ACCENTS = [
  { solid: '#3B82F6', soft: 'rgba(59,130,246,0.10)',  avatarBg: '#1D4ED8' },
  { solid: '#8B5CF6', soft: 'rgba(139,92,246,0.10)',  avatarBg: '#5B21B6' },
  { solid: '#10B981', soft: 'rgba(16,185,129,0.10)',  avatarBg: '#065F46' },
  { solid: '#F59E0B', soft: 'rgba(245,158,11,0.10)',  avatarBg: '#92400E' },
  { solid: '#EF4444', soft: 'rgba(239,68,68,0.10)',   avatarBg: '#991B1B' },
  { solid: '#06B6D4', soft: 'rgba(6,182,212,0.10)',   avatarBg: '#155E75' },
];

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
const StatusBadge = ({ label, color, bg }) => (
  <View style={[styles.statusBadge, { backgroundColor: bg }]}>
    <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Course Card
// ─────────────────────────────────────────────────────────────────────────────
const CourseCard = ({ course, onAskDoubt, C }) => {
  const accent      = SUBJECT_ACCENTS[course.id % SUBJECT_ACCENTS.length];
  const isNoTeacher = course.instructor === 'No Teacher Assigned';
  const initials    = !isNoTeacher
    ? course.instructor.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[
      styles.courseCard,
      isLaptop && styles.courseCardLaptop,
      { backgroundColor: C.card, borderColor: C.border },
    ]}>
      <View style={[styles.cardStripe, { backgroundColor: accent.soft, borderBottomColor: accent.solid + '30' }]}>
        <View style={[styles.cardSubjectBubble, { backgroundColor: accent.solid }]}>
          <Text style={styles.cardSubjectInitialText}>{course.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={[styles.subjectTag, { borderColor: accent.solid + '55', backgroundColor: accent.soft }]}>
          <Text style={[styles.subjectTagText, { color: accent.solid }]}>SUBJECT</Text>
        </View>
      </View>

      <Text style={[styles.courseTitle, { color: C.textPrimary }]} numberOfLines={2}>
        {course.title}
      </Text>

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

      <TouchableOpacity
        style={[styles.askButton, { backgroundColor: accent.solid }]}
        onPress={() => onAskDoubt(course)}
        activeOpacity={0.82}
      >
        <Text style={styles.askButtonText}>＋  Ask Doubt</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Action Sheet
// ─────────────────────────────────────────────────────────────────────────────
const DoubtActionSheet = ({ visible, item, onOpenChat, onDeletePress, onClose, C }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacAnim,  { toValue: 1,   duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0,   friction: 8, tension: 100, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacAnim,  { toValue: 0,   duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !item) return null;

  const bg      = C?.card        ?? '#0D1F36';
  const border  = C?.border      ?? '#1E3A5F';
  const cardAlt = C?.cardAlt     ?? '#112240';
  const textPri = C?.textPrimary ?? '#F1F5F9';
  const textMut = C?.textMuted   ?? '#94A3B8';
  const accent  = C?.accent      ?? '#4F8EF7';
  const badgeBg = C?.isDark ? item.badgeBg : item.badgeBgLight;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetOverlay, { opacity: opacAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[
              styles.sheetContainer,
              { backgroundColor: bg, borderColor: border },
              { transform: [{ translateY: slideAnim }] },
            ]}>
              <View style={[styles.sheetHandle, { backgroundColor: border }]} />
              <View style={[styles.sheetInfo, { backgroundColor: cardAlt, borderColor: border }]}>
                <View style={[styles.sheetInfoIcon, { backgroundColor: accent + '22' }]}>
                  <Text style={{ fontSize: 20 }}>📋</Text>
                </View>
                <View style={styles.sheetInfoText}>
                  <Text style={[styles.sheetInfoTitle, { color: textPri }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.sheetInfoSub,   { color: textMut }]} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <View style={[styles.sheetBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.sheetBadgeTxt, { color: item.badgeColor }]}>{item.badge}</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.sheetAction, { borderColor: border }]} onPress={onOpenChat} activeOpacity={0.8}>
                <View style={[styles.sheetActionIcon, { backgroundColor: accent + '22' }]}>
                  <Text style={styles.sheetActionEmoji}>💬</Text>
                </View>
                <View style={styles.sheetActionText}>
                  <Text style={[styles.sheetActionTitle, { color: textPri }]}>Open Chat</Text>
                  <Text style={[styles.sheetActionSub,   { color: textMut }]}>Continue this doubt thread</Text>
                </View>
                <Text style={[styles.sheetActionArrow, { color: textMut }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetAction, { borderColor: '#EF444433' }]} onPress={onDeletePress} activeOpacity={0.8}>
                <View style={[styles.sheetActionIcon, { backgroundColor: '#EF444422' }]}>
                  <Text style={styles.sheetActionEmoji}>🗑️</Text>
                </View>
                <View style={styles.sheetActionText}>
                  <Text style={[styles.sheetActionTitle, { color: '#EF4444' }]}>Delete Doubt</Text>
                  <Text style={[styles.sheetActionSub,   { color: textMut }]}>Permanently remove this thread</Text>
                </View>
                <Text style={[styles.sheetActionArrow, { color: '#EF4444' }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetCancelBtn, { backgroundColor: cardAlt, borderColor: border }]} onPress={onClose} activeOpacity={0.8}>
                <Text style={[styles.sheetCancelTxt, { color: textMut }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Delete Modal
// ─────────────────────────────────────────────────────────────────────────────
const ConfirmDeleteModal = ({ visible, item, onConfirm, onCancel, C }) => {
  if (!visible || !item) return null;
  const bg      = C?.card        ?? '#0D1F36';
  const border  = C?.border      ?? '#1E3A5F';
  const cardAlt = C?.cardAlt     ?? '#112240';
  const textPri = C?.textPrimary ?? '#F1F5F9';
  const textMut = C?.textMuted   ?? '#94A3B8';
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.confirmCard, { backgroundColor: bg, borderColor: border }]}>
              <View style={styles.confirmIconCircle}>
                <Text style={{ fontSize: 30 }}>🗑️</Text>
              </View>
              <Text style={[styles.confirmTitle, { color: textPri }]}>Delete Doubt?</Text>
              <Text style={[styles.confirmSub,   { color: textMut }]}>
                This will permanently delete the doubt and all its messages. This cannot be undone.
              </Text>
              <View style={[styles.confirmPreview, { backgroundColor: cardAlt, borderColor: '#EF444433' }]}>
                <Text style={{ fontSize: 16 }}>📋</Text>
                <Text style={[styles.confirmPreviewTxt, { color: textMut }]} numberOfLines={2}>{item.title}</Text>
              </View>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity style={[styles.confirmBtn, { borderWidth: 1, borderColor: border }]} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={[styles.confirmBtnTxt, { color: textMut }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]} onPress={onConfirm} activeOpacity={0.8}>
                  <Text style={[styles.confirmBtnTxt, { color: '#fff' }]}>🗑  Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Inquiry Row
// ─────────────────────────────────────────────────────────────────────────────
const InquiryRow = ({ item, onPress, C }) => (
  <TouchableOpacity
    style={[styles.inquiryRow, { borderBottomColor: C.border }]}
    onPress={() => onPress(item)}
    activeOpacity={0.75}
  >
    <View style={[styles.inquiryIcon, { backgroundColor: C.accentBg }]}>
      <Text style={{ color: C.accent, fontSize: 16 }}>📋</Text>
    </View>
    <View style={styles.inquiryTextGroup}>
      <Text style={[styles.inquiryTitle,    { color: C.textPrimary }]}>{item.title}</Text>
      <Text style={[styles.inquirySubtitle, { color: C.textMuted   }]} numberOfLines={1}>{item.subtitle}</Text>
    </View>
    <StatusBadge label={item.badge} color={item.badgeColor} bg={C.isDark ? item.badgeBg : item.badgeBgLight} />
    <Text style={[styles.inquiryChevron, { color: C.textMuted }]}>›</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentDoubt({ C, onThemeToggle, user }) {

  const [searchText,        setSearchText]        = useState('');
  const [activeChatCourse,  setActiveChatCourse]  = useState(null);
  const [activeChatInquiry, setActiveChatInquiry] = useState(null);
  const [courses,           setCourses]           = useState([]);
  const [inquiries,         setInquiries]         = useState([]);
  const [loadingInquiries,  setLoadingInquiries]  = useState(false);
  const [actionSheet,       setActionSheet]       = useState({ visible: false, item: null });
  const [confirmDelete,     setConfirmDelete]     = useState({ visible: false, item: null });

  const normalize = (str) => str.trim().toUpperCase().replace(/\s+/g, ' ');

  // ── Shared fetch helper (used by both initial load and handleChatBack) ──────
  const fetchAndSetDoubts = async () => {
    const studentId = user?._id || user?.id;
    if (!studentId) return;
    setLoadingInquiries(true);
    try {
      const res  = await axiosInstance.get(`/doubts/student/${studentId}`);
      const data = res.data;
      if (data.success && data.doubts) {
        setInquiries(data.doubts.map(formatDoubt));
      }
    } catch (err) {
      console.log('Fetch doubts error:', err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  // ── Fetch subjects with teacher names ──────────────────────────────────────
  useEffect(() => {
    const fetchSubjectsWithTeachers = async () => {
      if (!user?.id && !user?._id) return;
      const studentId = user.id || user._id;
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
          setCourses([]); return;
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
          };
        });

        setCourses(formatted);
      } catch (err) {
        console.log('❌ fetchSubjectsWithTeachers:', err);
      }
    };
    fetchSubjectsWithTeachers();
  }, [user]);

  // ── Fetch existing doubts on mount ────────────────────────────────────────
  useEffect(() => {
    fetchAndSetDoubts();
  }, [user]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInquiryPress         = (item) => setActionSheet({ visible: true, item });
  const handleActionSheetClose     = ()     => setActionSheet({ visible: false, item: null });

  const handleOpenChatFromSheet = () => {
    const item = actionSheet.item;
    setActionSheet({ visible: false, item: null });
    setActiveChatInquiry(item);
  };

  const handleDeletePressFromSheet = () => {
    const item = actionSheet.item;
    setActionSheet({ visible: false, item: null });
    setTimeout(() => setConfirmDelete({ visible: true, item }), 250);
  };

  const handleDeleteConfirmed = async () => {
    const item = confirmDelete.item;
    setConfirmDelete({ visible: false, item: null });
    if (!item?._id) return;
    setInquiries(prev => prev.filter(d => d._id !== item._id));
    try {
      const res = await axiosInstance.delete(`/doubts/${item._id}`);
      if (!res.data.success) setInquiries(prev => [item, ...prev]);
    } catch {
      setInquiries(prev => [item, ...prev]);
    }
  };

  const handleDeleteCancel = () => setConfirmDelete({ visible: false, item: null });
  const handleOpenChat     = (course) => setActiveChatCourse(course);

  // Re-fetch doubts when returning from chat — uses the shared helper
  const handleChatBack = async () => {
    setActiveChatCourse(null);
    setActiveChatInquiry(null);
    await fetchAndSetDoubts();
  };

  // ── Route to chat screens ──────────────────────────────────────────────────
  if (activeChatCourse) {
    return <DoubtChatScreen course={activeChatCourse} mode="new" onBack={handleChatBack} C={C} onThemeToggle={onThemeToggle} user={user} />;
  }
  if (activeChatInquiry) {
    return <DoubtChatScreen inquiry={activeChatInquiry} mode="existing" onBack={handleChatBack} C={C} onThemeToggle={onThemeToggle} user={user} />;
  }

  const filteredInquiries = inquiries.filter(i =>
    i.title.toLowerCase().includes(searchText.toLowerCase()) ||
    i.subtitle.toLowerCase().includes(searchText.toLowerCase())
  );

  const resolvedCount = inquiries.filter(i => i.badge === 'RESOLVED').length;
  const pendingCount  = inquiries.filter(i => i.badge === 'PENDING').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.card} />

      <DoubtActionSheet
        visible={actionSheet.visible} item={actionSheet.item}
        onOpenChat={handleOpenChatFromSheet} onDeletePress={handleDeletePressFromSheet}
        onClose={handleActionSheetClose} C={C}
      />
      <ConfirmDeleteModal
        visible={confirmDelete.visible} item={confirmDelete.item}
        onConfirm={handleDeleteConfirmed} onCancel={handleDeleteCancel} C={C}
      />

      {/* Search bar */}
      <View style={[styles.navbar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.searchBar, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
          <Text style={[styles.searchIcon, { color: C.textMuted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Search doubts, subjects or mentors…"
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
            onPress={onThemeToggle} activeOpacity={0.8}
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
        <View style={[styles.headerRow, isLaptop && styles.headerRowLaptop]}>
          <View style={styles.headerText}>
            <Text style={[styles.pageTitle, { color: C.textPrimary }]}>My Doubts</Text>
            <Text style={[styles.pageSubtitle, { color: C.textSub }]}>
              Ask questions, track answers, and get guidance from your professors.
            </Text>
          </View>
          <View style={styles.statsBadges}>
            <View style={[styles.statBadge, { borderColor: C.green, backgroundColor: C.greenBg }]}>
              <View style={[styles.statDot, { backgroundColor: C.green }]} />
              <Text style={[styles.statText, { color: C.green }]}>{resolvedCount} Resolved</Text>
            </View>
            <View style={[styles.statBadge, { borderColor: C.orange, backgroundColor: C.orangeBg, marginLeft: 8 }]}>
              <View style={[styles.statDot, { backgroundColor: C.orange }]} />
              <Text style={[styles.statText, { color: C.orange }]}>{pendingCount} Pending</Text>
            </View>
          </View>
        </View>

        {/* YOUR SUBJECTS */}
        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>YOUR SUBJECTS</Text>
          <View style={[styles.sectionLine, { backgroundColor: C.border }]} />
        </View>

        {isLaptop ? (
          <View style={styles.courseGrid}>
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} onAskDoubt={handleOpenChat} C={C} />
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseScroll}>
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} onAskDoubt={handleOpenChat} C={C} />
            ))}
          </ScrollView>
        )}

        {/* Recent Inquiries */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Recent Inquiries</Text>
            <Text style={[styles.sectionHint,  { color: C.textMuted  }]}>Tap to open or delete</Text>
          </View>
          {inquiries.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: C.accentBg, borderColor: C.accent + '40' }]}>
              <Text style={[styles.countPillText, { color: C.accent }]}>{inquiries.length}</Text>
            </View>
          )}
        </View>

        <View style={[styles.inquiryList, { backgroundColor: C.card, borderColor: C.border }]}>
          {loadingInquiries ? (
            <View style={styles.emptyInquiries}>
              <Text style={[styles.emptyTxt, { color: C.textMuted }]}>Loading doubts…</Text>
            </View>
          ) : filteredInquiries.length === 0 ? (
            <View style={styles.emptyInquiries}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
              <Text style={[styles.emptyTxtBold, { color: C.textPrimary }]}>No doubts yet</Text>
              <Text style={[styles.emptyTxt, { color: C.textMuted, marginTop: 4 }]}>
                {searchText ? 'No results match your search.' : 'Tap "Ask Doubt" on any subject above.'}
              </Text>
            </View>
          ) : (
            filteredInquiries.map((item) => (
              <InquiryRow key={item.id} item={item} onPress={handleInquiryPress} C={C} />
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const CARD_W_MOBILE = width * 0.64;

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

  headerRow:       { marginBottom: 20, gap: 10 },
  headerRowLaptop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText:      { flex: 1, marginRight: 16 },
  pageTitle:       { fontSize: isLaptop ? 26 : 22, fontWeight: '700', letterSpacing: -0.4, marginBottom: 4 },
  pageSubtitle:    { fontSize: 13, lineHeight: 19 },
  statsBadges:     { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginTop: isLaptop ? 4 : 0 },
  statBadge:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  statDot:         { width: 7, height: 7, borderRadius: 4 },
  statText:        { fontWeight: '600', fontSize: 12 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  sectionLine:     { flex: 1, height: 1 },

  courseGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  courseScroll: { paddingRight: 16, paddingBottom: 4, gap: 12, marginBottom: 24 },

  courseCard:       { width: CARD_W_MOBILE, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseCardLaptop: { flex: 1, minWidth: 200, maxWidth: 280, width: undefined },

  cardStripe: {
    height: 76, borderBottomWidth: 1,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, paddingTop: 14,
  },
  cardSubjectBubble: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  cardSubjectInitialText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subjectTag:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  subjectTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  courseTitle: {
    fontSize: 14, fontWeight: '700', lineHeight: 20,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    minHeight: 54,
  },

  instructorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 12,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  instructorAvatar:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  instructorInitialText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  instructorTextCol:     { flex: 1, minWidth: 0 },
  instructorLabel:       { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginBottom: 1 },
  instructorName:        { fontSize: 12, fontWeight: '600' },
  verifiedDot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  askButton:     { marginHorizontal: 14, marginBottom: 14, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  askButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, marginTop: 4 },
  sectionTitle:    { fontSize: 17, fontWeight: '700' },
  sectionHint:     { fontSize: 11, marginTop: 2 },
  countPill:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countPillText:   { fontSize: 12, fontWeight: '700' },

  inquiryList:      { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  inquiryRow:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  inquiryIcon:      { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  inquiryTextGroup: { flex: 1, minWidth: 0 },
  inquiryTitle:     { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  inquirySubtitle:  { fontSize: 11, lineHeight: 15 },
  inquiryChevron:   { fontSize: 20, fontWeight: '300', flexShrink: 0 },
  statusBadge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  statusBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  emptyInquiries: { alignItems: 'center', paddingVertical: 44 },
  emptyTxtBold:   { fontSize: 15, fontWeight: '700' },
  emptyTxt:       { fontSize: 13 },

  sheetOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetContainer:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 38 : 24, gap: 10 },
  sheetHandle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetInfo:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4 },
  sheetInfoIcon:    { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sheetInfoText:    { flex: 1 },
  sheetInfoTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sheetInfoSub:     { fontSize: 12 },
  sheetBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  sheetBadgeTxt:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sheetAction:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  sheetActionIcon:  { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sheetActionEmoji: { fontSize: 20 },
  sheetActionText:  { flex: 1 },
  sheetActionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sheetActionSub:   { fontSize: 12 },
  sheetActionArrow: { fontSize: 22, fontWeight: '300' },
  sheetCancelBtn:   { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  sheetCancelTxt:   { fontSize: 15, fontWeight: '600' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  confirmCard:       { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: 'center' },
  confirmIconCircle: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  confirmTitle:      { fontSize: 19, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  confirmSub:        { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  confirmPreview:    { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 22 },
  confirmPreviewTxt: { flex: 1, fontSize: 13, lineHeight: 18 },
  confirmBtnRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn:        { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  confirmBtnTxt:     { fontSize: 15, fontWeight: '700' },
});