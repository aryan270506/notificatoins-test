// Screens/Teacher/DoubtSessionScreen.js  (Hub — Teacher View)
// ONE card per subject + year.  Division is irrelevant for room identity.

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import AsyncStorage  from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Themes ──────────────────────────────────────────────────────────────── */
const DARK = {
  bg: '#07090F', surface: '#0D1120', surfaceEl: '#111827', card: '#0F1523',
  border: '#1A2035',
  accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.14)', accentBright: '#60A5FA',
  green: '#10B981', greenSoft: 'rgba(16,185,129,0.14)',
  yellow: '#F59E0B', yellowSoft: 'rgba(245,158,11,0.14)',
  purple: '#8B5CF6', purpleSoft: 'rgba(139,92,246,0.14)',
  cyan: '#06B6D4',   cyanSoft: 'rgba(6,182,212,0.14)',
  orange: '#F97316', orangeSoft: 'rgba(249,115,22,0.14)',
  pink: '#EC4899',   pinkSoft: 'rgba(236,72,153,0.14)',
  teal: '#14B8A6',   tealSoft: 'rgba(20,184,166,0.14)',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  statusBar: 'light-content', shadow: '#000',
};
const LIGHT = {
  bg: '#F5F7FF', surface: '#FFFFFF', surfaceEl: '#EEF2FF', card: '#FFFFFF',
  border: '#E2E8F4',
  accent: '#3B6FE8', accentSoft: 'rgba(59,111,232,0.09)', accentBright: '#3B6FE8',
  green: '#059669', greenSoft: 'rgba(5,150,105,0.10)',
  yellow: '#D97706', yellowSoft: 'rgba(217,119,6,0.10)',
  purple: '#7C3AED', purpleSoft: 'rgba(124,58,237,0.10)',
  cyan: '#0891B2',   cyanSoft: 'rgba(8,145,178,0.10)',
  orange: '#EA580C', orangeSoft: 'rgba(234,88,12,0.10)',
  pink: '#DB2777',   pinkSoft: 'rgba(219,39,119,0.10)',
  teal: '#0D9488',   tealSoft: 'rgba(13,148,136,0.10)',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#94A3B8',
  statusBar: 'dark-content', shadow: '#8492B4',
};

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const ACCENTS = (T) => [
  { solid: T.accentBright, soft: T.accentSoft,  avatarBg: T.accent  },
  { solid: T.purple,       soft: T.purpleSoft,   avatarBg: '#5B21B6' },
  { solid: T.cyan,         soft: T.cyanSoft,     avatarBg: '#155E75' },
  { solid: T.green,        soft: T.greenSoft,    avatarBg: '#065F46' },
  { solid: T.yellow,       soft: T.yellowSoft,   avatarBg: '#92400E' },
  { solid: T.orange,       soft: T.orangeSoft,   avatarBg: '#9A3412' },
  { solid: T.pink,         soft: T.pinkSoft,     avatarBg: '#831843' },
  { solid: T.teal,         soft: T.tealSoft,     avatarBg: '#134E4A' },
];

const getInitials = (name = '') => {
  const p = name.trim().split(' ');
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

/* ─── Subject Card ────────────────────────────────────────────────────────── */
const SubjectCard = ({ subject, index, onOpen, T, cardShadow }) => {
  const accent   = ACCENTS(T)[index % ACCENTS(T).length];
  const initials = subject.name.charAt(0).toUpperCase();
  const hasMsg   = (subject.messageCount || 0) > 0;

  return (
    <TouchableOpacity
      onPress={() => onOpen(subject, index)}
      activeOpacity={0.85}
      style={[
        s.card,
        { backgroundColor: T.card, borderColor: T.border },
        cardShadow,
        { borderTopWidth: 3, borderTopColor: accent.solid },
      ]}
    >
      {/* Stripe */}
      <View style={[s.cardStripe, { backgroundColor: accent.soft }]}>
        <View style={[s.cardBubble, { backgroundColor: accent.solid }]}>
          <Text style={s.cardBubbleText}>{initials}</Text>
        </View>
        <View style={[s.subjectTag, { borderColor: accent.solid + '55', backgroundColor: accent.soft }]}>
          <Text style={[s.subjectTagText, { color: accent.solid }]}>SUBJECT ROOM</Text>
        </View>
      </View>

      {/* Name */}
      <Text style={[s.cardTitle, { color: T.textPrimary }]} numberOfLines={2}>
        {subject.name}
      </Text>

      {/* Year row — no division shown since room spans all divisions */}
      <View style={[s.metaRow, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
        <View style={[s.metaAvatar, { backgroundColor: accent.avatarBg }]}>
          <Text style={s.metaAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.metaLabel, { color: T.textMuted }]}>Year · All Divisions</Text>
          <Text style={[s.metaValue, { color: T.textPrimary }]}>Year {subject.year}</Text>
        </View>
        <View style={[s.yearBadge, { backgroundColor: accent.soft, borderColor: accent.solid + '44' }]}>
          <Text style={[s.yearBadgeText, { color: accent.solid }]}>Y{subject.year}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statPill, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
          <Ionicons name="chatbubbles-outline" size={12} color={T.textMuted} />
          <Text style={[s.statPillText, { color: T.textSec }]}>
            {subject.messageCount || 0} messages
          </Text>
        </View>
        <View style={[s.statPill, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
          <Ionicons name="people-outline" size={12} color={T.textMuted} />
          <Text style={[s.statPillText, { color: T.textSec }]}>All divisions</Text>
        </View>
      </View>

      {/* Live dot */}
      <View style={[s.liveRow, { borderTopColor: T.border }]}>
        <View style={[s.liveDot, { backgroundColor: hasMsg ? accent.solid : T.textMuted }]} />
        <Text style={[s.liveText, { color: T.textMuted }]}>
          {hasMsg ? 'Active discussions' : 'No messages yet'}
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[s.openBtn, { backgroundColor: accent.solid }]}
        onPress={() => onOpen(subject, index)}
        activeOpacity={0.82}
      >
        <Ionicons name="chatbubbles-outline" size={15} color="#fff" />
        <Text style={s.openBtnText}>Open Class Room</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function DoubtSessionScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const { isDark } = useContext(ThemeContext);
  const T          = isDark ? DARK : LIGHT;
  const numCols    = width >= 900 ? 3 : width >= 600 ? 2 : 1;

  const [teacherId,   setTeacherId]   = useState(null);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [teacherRole, setTeacherRole] = useState('Senior Faculty');
  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    initLoad();
  }, []);

  useFocusEffect(useCallback(() => {
    if (teacherId) fetchSubjectsAndRooms(teacherId);
  }, [teacherId]));

  const initLoad = async () => {
    try {
      let tid = await AsyncStorage.getItem('teacherId') || await AsyncStorage.getItem('_id');
      if (!tid) {
        const raw = await AsyncStorage.getItem('userData') || await AsyncStorage.getItem('user');
        if (raw) { try { const p = JSON.parse(raw); tid = p._id || p.id || null; } catch (_) {} }
      }
      const name = await AsyncStorage.getItem('teacherName');
      const role = await AsyncStorage.getItem('teacherRole');
      if (name) setTeacherName(name);
      if (role) setTeacherRole(role);
      if (tid) { setTeacherId(tid); await fetchSubjectsAndRooms(tid); }
    } catch (e) {
      console.warn('initLoad:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndRooms = useCallback(async (tid) => {
    if (!tid) return;
    setLoading(true);
    try {
      const ttRes = await axiosInstance.get(`/timetable/teacher/${tid}`);
      const slots = ttRes.data?.data ?? [];

      // ── Deduplicate by subject + year ONLY (ignore division) ──────────────
      const seen        = new Set();
      const subjectList = [];

      slots.forEach((slot) => {
        if (!slot.subject) return;
        const name = slot.subject.trim();
        const year = String(slot.year ?? '').trim();
        if (!name || !year) return;

        const key = `${name.toUpperCase()}__${year}`;
        if (seen.has(key)) return;
        seen.add(key);

        subjectList.push({ name, year, messageCount: 0 });
      });

      subjectList.sort((a, b) => {
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        return a.name.localeCompare(b.name);
      });

      // ── Enrich with live message counts ───────────────────────────────────
      try {
        const roomsRes = await axiosInstance.get('/subject-rooms/teacher-rooms', {
          params: { teacherId: tid },
        });
        const rooms = roomsRes.data?.rooms || [];
        rooms.forEach((room) => {
          const match = subjectList.find(
            (sub) =>
              sub.name.trim().toLowerCase() === (room.subject || '').trim().toLowerCase() &&
              String(sub.year).trim()        === String(room.year || '').trim()
          );
          if (match) match.messageCount = room.messageCount || 0;
        });
      } catch (e) {
        console.warn('fetchRooms (non-fatal):', e.message);
      }

      setSubjects(subjectList);
    } catch (err) {
      console.warn('fetchSubjectsAndRooms:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const tid = teacherId || await AsyncStorage.getItem('teacherId') || await AsyncStorage.getItem('_id');
      if (tid) await fetchSubjectsAndRooms(tid);
    } catch (_) {}
    setRefreshing(false);
  };

  // Navigate — pass subject + year ONLY (no division)
  const handleOpenRoom = (subject, index) => {
    navigation.navigate('DoubtSolveScreen', {
      teacherId,
      teacherName,
      teacherRole,
      subjectName: subject.name,
      year:        subject.year,
      // division intentionally omitted
      accentIndex: index,
    });
  };

  const filtered = subjects.filter((sub) => {
    const q = search.toLowerCase().trim();
    return !q ||
      sub.name.toLowerCase().includes(q) ||
      `year ${sub.year}`.toLowerCase().includes(q);
  });

  const totalMessages = subjects.reduce((a, b) => a + (b.messageCount || 0), 0);
  const activeRooms   = subjects.filter(s => (s.messageCount || 0) > 0).length;

  const cardShadow = isDark ? {} : {
    shadowColor: T.shadow, shadowOpacity: 0.07,
    shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  };

  const chunk = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.surface} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Top bar */}
        <View style={[s.topBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
          <Text style={[s.topBarTitle, { color: T.textPrimary, fontFamily: SERIF }]}>Class Chat Rooms</Text>
          <View style={[s.searchBox, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
            <Ionicons name="search-outline" size={13} color={T.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={[s.searchInput, { color: T.textPrimary }]}
              placeholder="Search subjects or year…"
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={14} color={T.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.profileChip}>
            <View style={[s.profileAvatar, { backgroundColor: T.accentBright }]}>
              <Text style={s.profileAvatarTxt}>{getInitials(teacherName)}</Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={[s.profileName, { color: T.textPrimary }]}>{teacherName}</Text>
              <Text style={[s.profileRole, { color: T.textMuted }]}>{teacherRole}</Text>
            </View>
          </View>
        </View>

        {/* Page header */}
        <View style={[s.pageHead, { backgroundColor: T.bg }]}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={[s.pageTitle, { color: T.textPrimary, fontFamily: SERIF }]}>Your Subject Rooms</Text>
            <Text style={[s.pageSub, { color: T.textSec }]}>
              One shared room per subject · All divisions see the same chat
            </Text>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.centerState}>
            <ActivityIndicator color={T.accentBright} size="large" />
            <Text style={[s.centerTxt, { color: T.textMuted, marginTop: 12 }]}>Loading your subjects…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.centerState}>
            <View style={[s.emptyBox, { backgroundColor: T.surfaceEl }]}>
              <Ionicons name="book-outline" size={32} color={T.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: T.textPrimary }]}>
              {search ? 'No Matches' : 'No Subjects Assigned'}
            </Text>
            <Text style={[s.centerTxt, { color: T.textMuted }]}>
              {search ? `No subjects match "${search}"` : 'No timetable slots found.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accentBright} colors={[T.accentBright]} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 14 }}
          >
            {/* Summary chips */}
            <View style={s.summaryRow}>
              {[
                { val: subjects.length, label: 'Subjects',       color: T.accentBright },
                { val: activeRooms,     label: 'Active Rooms',   color: T.green        },
                { val: totalMessages,   label: 'Total Messages', color: T.purple       },
              ].map((chip) => (
                <View key={chip.label} style={[s.summaryChip, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
                  <Text style={[s.summaryChipVal, { color: chip.color, fontFamily: SERIF }]}>{chip.val}</Text>
                  <Text style={[s.summaryChipLabel, { color: T.textMuted }]}>{chip.label}</Text>
                </View>
              ))}
            </View>

            <View style={s.sectionLabelRow}>
              <Text style={[s.sectionLabel, { color: T.textMuted }]}>YOUR SUBJECT ROOMS</Text>
              <View style={[s.sectionLine, { backgroundColor: T.border }]} />
            </View>

            {chunk(filtered, numCols).map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 14 }}>
                {row.map((subject, ci) => (
                  <View key={`${subject.name}-${subject.year}`} style={{ flex: 1 }}>
                    <SubjectCard
                      subject={subject}
                      index={ri * numCols + ci}
                      onOpen={handleOpenRoom}
                      T={T}
                      cardShadow={cardShadow}
                    />
                  </View>
                ))}
                {Array.from({ length: numCols - row.length }).map((_, i) => (
                  <View key={`ph-${i}`} style={{ flex: 1 }} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 0 : 10, paddingBottom: 10, borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 17, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 120, maxWidth: 320,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  searchInput:      { flex: 1, fontSize: 13, padding: 0 },
  profileChip:      { flexDirection: 'row', alignItems: 'center' },
  profileAvatar:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileAvatarTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  profileName:      { fontSize: 12, fontWeight: '700' },
  profileRole:      { fontSize: 10, marginTop: 1 },
  pageHead: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 14, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10,
  },
  pageTitle: { fontSize: 24, fontWeight: '900' },
  pageSub:   { fontSize: 13, marginTop: 4, lineHeight: 18, maxWidth: 440 },
  summaryRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  summaryChip:      { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: 80 },
  summaryChipVal:   { fontSize: 22, fontWeight: '900' },
  summaryChipLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  sectionLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  sectionLine:      { flex: 1, height: 1 },
  card: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardStripe: {
    height: 80, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, paddingTop: 14,
  },
  cardBubble: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  cardBubbleText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  subjectTag:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  subjectTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 22, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, minHeight: 56 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 10, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  metaAvatar:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metaAvatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  metaLabel:      { fontSize: 9, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  metaValue:      { fontSize: 12, fontWeight: '600' },
  yearBadge:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  yearBadgeText:  { fontSize: 11, fontWeight: '800' },
  statsRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 8, flexWrap: 'wrap' },
  statPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statPillText: { fontSize: 11, fontWeight: '500' },
  liveRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, marginBottom: 2 },
  liveDot:  { width: 7, height: 7, borderRadius: 4, opacity: 0.8 },
  liveText: { fontSize: 11, fontWeight: '500' },
  openBtn:      { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openBtnText:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  centerState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  centerTxt:    { fontSize: 13, textAlign: 'center' },
  emptyBox:     { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle:   { fontSize: 18, fontWeight: '700' },
});