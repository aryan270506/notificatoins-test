// Screens/Teachers/MainDash.js
// ✅ Fully Functional Dashboard — Live backend data, Today's Schedule from timetable API,
//    All quick-action buttons navigate to real screens, Dark & Light mode, fully responsive

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  Modal, TouchableWithoutFeedback, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from './TeacherStack';
import axiosInstance from '../../Src/Axios';
import ClassTeacherBatchSettings from '../Admin/DataImportCenter/ClassTeacherBatchSettings';

/* ─── Themes ─────────────────────────────────────────────────────────────── */
const DARK = {
  bg: '#07090F', surface: '#0D1120', surfaceEl: '#111827', card: '#0F1523',
  border: '#1A2035', accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.14)',
  accentBright: '#60A5FA', green: '#10B981', greenSoft: 'rgba(16,185,129,0.14)',
  yellow: '#F59E0B', yellowSoft: 'rgba(245,158,11,0.14)', red: '#EF4444', redSoft: 'rgba(239,68,68,0.14)',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  nowBg: '#0A1F14', nowText: '#10B981', nowBorder: 'rgba(16,185,129,0.30)',
  doubtCardBg: '#0A0F2E', doubtCardBorder: 'rgba(59,130,246,0.35)',
  barSecondary: '#1E2845', notifUnread: 'rgba(59,130,246,0.07)',
  reviewBtnBg: '#3B82F6', reviewBtnColor: '#FFFFFF',
  toggleBg: '#111827', toggleBorder: '#1A2035', toggleIconColor: '#F59E0B',
  shadowColor: '#000000', shadowOpacity: 0, statusBar: 'light-content',
};
const LIGHT = {
  bg: '#F0F4FF', surface: '#FFFFFF', surfaceEl: '#E8EEFB', card: '#FFFFFF',
  border: '#DDE3F4', accent: '#3B6FE8', accentSoft: 'rgba(59,111,232,0.09)',
  accentBright: '#3B6FE8', green: '#059669', greenSoft: 'rgba(5,150,105,0.10)',
  yellow: '#D97706', yellowSoft: 'rgba(217,119,6,0.10)', red: '#DC2626', redSoft: 'rgba(220,38,38,0.10)',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#9CA3AF',
  nowBg: '#ECFDF5', nowText: '#059669', nowBorder: 'rgba(5,150,105,0.25)',
  doubtCardBg: '#EEF2FF', doubtCardBorder: 'rgba(59,111,232,0.28)',
  barSecondary: '#CBD5E1', notifUnread: 'rgba(59,111,232,0.05)',
  reviewBtnBg: '#3B6FE8', reviewBtnColor: '#FFFFFF',
  toggleBg: '#E8EEFB', toggleBorder: '#C5CAF5', toggleIconColor: '#3B6FE8',
  shadowColor: '#8492B4', shadowOpacity: 0.09, statusBar: 'dark-content',
};

/* ─── Timetable slot times — must match backend SLOT_TIMES ───────────────── */
const SLOT_TIMES = {
  t1: { start: '10:30', end: '11:30' },
  t2: { start: '11:30', end: '12:30' },
  t3: { start: '13:15', end: '14:15' },
  t4: { start: '14:15', end: '15:15' },
  t5: { start: '15:30', end: '16:30' },
  t6: { start: '16:30', end: '17:30' },
};

const COLOR_MAP = {
  teal: '#06B6D4', blue: '#3B82F6', purple: '#8B5CF6',
  orange: '#F59E0B', green: '#10B981', pink: '#EC4899',
};

// Map JS Date.getDay() (0=Sun) to timetable short codes
const DAY_SHORT_FROM_JS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Map full day names (Timetable model) to short codes
const DAY_TO_SHORT = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT', Sunday: 'SUN',
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ap}`;
};

/* ─── Quick Actions — all navigating to real screens ─────────────────────── */
const QUICK = [
  { icon: 'cloud-upload-outline',  label: 'Upload Notes',  route: 'PlannerScreen',       color: '#3B82F6' },
  { icon: 'calendar-outline',      label: 'Reschedule',    route: 'TimetableScreen',     color: '#8B5CF6' },
  { icon: 'create-outline',        label: 'Grading Desk',  route: 'TeacherExamScreen',   color: '#10B981' },
  { icon: 'people-outline',        label: 'Advisory',      route: 'MessagesScreen',      color: '#F59E0B' },
];

/* ─── Static bar chart data ───────────────────────────────────────────────── */
const CHART = [
  { label: 'Sec A', b2024: 62, b2023: 48 },
  { label: 'Sec B', b2024: 50, b2023: 60 },
  { label: 'Sec C', b2024: 78, b2023: 55 },
  { label: 'Sec D', b2024: 72, b2023: 65 },
];

/* ─── Default notifications ───────────────────────────────────────────────── */
const INIT_NOTIFS = [
  { id: 1, read: false, icon: 'help-circle',     iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.15)',   tag: 'Urgent',   tagColor: '#EF4444', title: 'New Doubt Submitted',       body: 'Riya Desai asked about entropy in isothermal process — CS201', time: '2 min ago' },
  { id: 2, read: false, icon: 'chatbubble',       iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.15)', tag: 'Message',  tagColor: '#8B5CF6', title: 'Message from Liam Johnson',  body: "Can we reschedule tomorrow's session to 3 PM?",                time: '8 min ago' },
  { id: 3, read: false, icon: 'megaphone',        iconColor: '#F59E0B', iconBg: 'rgba(245,158,11,0.15)', tag: 'Admin',    tagColor: '#F59E0B', title: 'Admin Announcement',         body: 'End-term paper submissions are due by Friday, Oct 27.',        time: '1 hr ago'  },
  { id: 4, read: false, icon: 'calendar',         iconColor: '#22D3EE', iconBg: 'rgba(34,211,238,0.15)', tag: 'Schedule', tagColor: '#22D3EE', title: 'Timetable Updated',          body: 'Your Thursday 2 PM slot has been moved to Friday 10 AM.',      time: '3 hr ago'  },
  { id: 5, read: true,  icon: 'checkmark-circle', iconColor: '#10B981', iconBg: 'rgba(16,185,129,0.15)', tag: 'System',   tagColor: '#10B981', title: 'Grades Submitted',           body: 'Mid-term grades for CS101 Section A submitted successfully.',  time: 'Yesterday' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function MainDash() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 768;

  /* ── Theme ── */
  const { isDark, toggleTheme: ctxToggle } = useContext(ThemeContext);
  const T = isDark ? DARK : LIGHT;

  const themeScale = useRef(new Animated.Value(1)).current;
  const toggleTheme = () => {
    Animated.sequence([
      Animated.timing(themeScale, { toValue: 0.97, duration: 80,  useNativeDriver: true }),
      Animated.timing(themeScale, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();
    ctxToggle();
  };

  /* ── Entrance animations ── */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const barAnims  = useRef(CHART.map(() => new Animated.Value(0))).current;

  /* ── Notification panel ── */
  const [notifs,    setNotifs]    = useState(INIT_NOTIFS);
  const [notifOpen, setNotifOpen] = useState(false);
  const panelAnim   = useRef(new Animated.Value(360)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unreadCount = notifs.filter(n => !n.read).length;

  /* ── Live state ── */
  const [teacherData,     setTeacherData]     = useState(null);
  const [assignmentStats, setAssignmentStats] = useState({ active: 0, pending: 0, approved: 0, closed: 0 });
  const [pendingDoubts,   setPendingDoubts]   = useState(0);
  const [todaySchedule,   setTodaySchedule]   = useState([]);
  const [statsLoading,    setStatsLoading]    = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [batchSettingsModalVisible, setBatchSettingsModalVisible] = useState(false);

  /* ── Notification helpers ── */
  const openPanel = () => {
    setNotifOpen(true);
    Animated.parallel([
      Animated.spring(panelAnim,   { toValue: 0, useNativeDriver: true, tension: 80, friction: 14 }),
      Animated.timing(overlayAnim, { toValue: 1, useNativeDriver: true, duration: 240 }),
    ]).start();
  };
  const closePanel = (onDone) => {
    Animated.parallel([
      Animated.timing(panelAnim,   { toValue: 360, useNativeDriver: true, duration: 270 }),
      Animated.timing(overlayAnim, { toValue: 0,   useNativeDriver: true, duration: 210 }),
    ]).start(() => { setNotifOpen(false); if (onDone) onDone(); });
  };
  const markRead    = id => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = ()  => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const dismissNotif= id  => setNotifs(p => p.filter(n => n.id !== id));

  /* ══════════════════════════════════════════════════════════════════════
   *  TODAY'S SCHEDULE — fetched from GET /api/timetable/teacher/:id
   *  The endpoint returns a flat array of all slots for this teacher.
   *  We filter to today's day, resolve slot times, and sort by start time.
   * ═════════════════════════════════════════════════════════════════════ */
  const fetchTodaySchedule = useCallback(async (teacherId) => {
    if (!teacherId) { setScheduleLoading(false); return; }
    setScheduleLoading(true);
    try {
      const res = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
      // Handle both { data: [...] } and plain array responses
      const apiData = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

      const now        = new Date();
      const todayShort = DAY_SHORT_FROM_JS[now.getDay()];        // e.g. "MON"
      const nowMins    = now.getHours() * 60 + now.getMinutes(); // current time as minutes

      // Keep only today's slots
      const todaySlots = apiData.filter(item => {
        const short = DAY_TO_SHORT[item.day];
        return short === todayShort;
      });

      // Enrich each slot with computed fields
      const withTimes = todaySlots.map(item => {
        // Prefer times sent by backend, fall back to local SLOT_TIMES map
        const times = item.start && item.end
          ? { start: item.start, end: item.end }
          : (SLOT_TIMES[item.slotId] || { start: '09:00', end: '10:00' });

        const startMins = toMinutes(times.start);
        const endMins   = toMinutes(times.end);
        const isNow     = nowMins >= startMins && nowMins < endMins;
        const isPast    = nowMins >= endMins;
        const isLab     = item.subject?.toUpperCase().includes('LAB');

        return {
          id:       item.id || `${item.timetableId}-${item.day}-${item.slotId}`,
          slotId:   item.slotId,
          subject:  item.subject || '—',
          division: item.division || '',
          year:     item.year || '',
          batch:    item.batch || '',
          room:     item.room  || '',
          color:    COLOR_MAP[item.color] || '#3B82F6',
          start:    times.start,
          end:      times.end,
          startMins,
          endMins,
          isNow,
          isPast,
          isLab,
        };
      }).sort((a, b) => a.startMins - b.startMins);

      setTodaySchedule(withTimes);
    } catch (err) {
      console.warn('MainDash: timetable fetch failed —', err.message);
      setTodaySchedule([]); // Show "No classes today" gracefully
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  /* ── Fetch all data ── */
  const fetchDashboardData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const teacherId = await AsyncStorage.getItem('teacherId');
      console.log('🔍 DEBUG: teacherId from storage:', teacherId);

      // 1. Teacher profile
      if (teacherId) {
        try {
          const tRes = await axiosInstance.get(`/teachers/${teacherId}`);
          console.log('🔍 DEBUG: Teacher response:', tRes.data);
          if (tRes.data.success) {
            setTeacherData(tRes.data.data);
            console.log('🔍 DEBUG: classTeacher data:', tRes.data.data?.classTeacher);
          }
        } catch (_) { 
          console.error('🔍 DEBUG: Teacher fetch error:', _);
        }
      }

      // 2. Assignment stats — uses TeacherRoutes GET /api/teachers/stats
      try {
        const params = teacherId ? { teacherId } : {};
        const aRes = await axiosInstance.get('/teachers/stats', { params });
        if (aRes.data.success) setAssignmentStats(aRes.data.data);
      } catch (_) { /* ignore */ }

      // 3. Pending doubts count
      try {
        const dRes = await axiosInstance.get('/doubts/pending/count');
        if (dRes.data.success) setPendingDoubts(dRes.data.count ?? 0);
      } catch (_) {
        setPendingDoubts(0);
      }

      // 4. Today's timetable
      await fetchTodaySchedule(teacherId);

    } catch (err) {
      console.warn('MainDash fetchDashboardData error:', err.message);
    } finally {
      setStatsLoading(false);
    }
  }, [fetchTodaySchedule]);

  /* ── Pull-to-refresh ── */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  /* ── On mount ── */
  useEffect(() => {
    console.log('🔍 MainDash - teacherData updated:', teacherData);
    if (teacherData?.classTeacher) {
      console.log('✅ ClassTeacher found:', {
        year: teacherData.classTeacher.year,
        division: teacherData.classTeacher.division,
        assignedAt: teacherData.classTeacher.assignedAt
      });
      console.log('📊 Will display batch settings:', !!(teacherData.classTeacher.year && teacherData.classTeacher.division));
    } else {
      console.log('❌ No classTeacher object found on teacherData');
    }
  }, [teacherData]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    Animated.stagger(90, barAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 680, delay: 200, useNativeDriver: false })
    )).start();
    fetchDashboardData();
  }, []);

  const cardShadow = {
    shadowColor: T.shadowColor, shadowOpacity: T.shadowOpacity,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: isDark ? 0 : 3,
  };

  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName  = teacherData?.name?.split(' ')[0] || '…';

  const statCards = [
    { label: 'Active',   value: assignmentStats.active,   icon: 'clipboard-outline',        color: T.accentBright, bg: T.accentSoft },
    { label: 'Pending',  value: assignmentStats.pending,  icon: 'hourglass-outline',        color: T.yellow,       bg: T.yellowSoft },
    { label: 'Approved', value: assignmentStats.approved, icon: 'checkmark-circle-outline', color: T.green,        bg: T.greenSoft  },
    { label: 'Closed',   value: assignmentStats.closed,   icon: 'archive-outline',          color: T.textMuted,    bg: T.surfaceEl  },
  ];

  // Add Batches to Quick Actions if teacher is class teacher
  const quickActionsWithBatches = [
    ...QUICK,
    ...(teacherData?.classTeacher?.year && teacherData?.classTeacher?.division 
      ? [{ icon: 'layers-outline', label: 'Batches', route: null, color: '#F97316', action: () => setBatchSettingsModalVisible(true) }]
      : [])
  ];

  /* ─── Schedule item renderer ─────────────────────────────────────────── */
  const renderScheduleItem = (item, i, arr) => {
    const isLast = i === arr.length - 1;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => navigation.navigate('TimetableScreen')}
        activeOpacity={0.75}
        style={s.scheduleItemWrap}>

        {/* Timeline */}
        <View style={s.scheduleTimeline}>
          <View style={[
            s.scheduleDot,
            { backgroundColor: item.isNow ? T.green : item.isPast ? T.border : T.accent },
            item.isNow && { shadowColor: T.green, shadowOpacity: 0.7, shadowRadius: 4, elevation: 3 },
          ]} />
          {!isLast && <View style={[s.scheduleLine, { backgroundColor: T.border }]} />}
        </View>

        {/* Card body */}
        <View style={[
          s.scheduleBody,
          item.isNow && {
            backgroundColor: T.nowBg, borderWidth: 1,
            borderColor: T.nowBorder, borderRadius: 12, padding: 12,
          },
          { opacity: item.isPast ? 0.5 : 1 },
        ]}>
          {/* Row: status / type */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            {item.isNow ? (
              <View style={[s.nowPill, { backgroundColor: T.greenSoft, borderColor: T.green + '50' }]}>
                <View style={[s.nowDot, { backgroundColor: T.green }]} />
                <Text style={[s.nowLabel, { color: T.nowText }]}>NOW HAPPENING</Text>
              </View>
            ) : (
              <Text style={[s.scheduleTime, { color: item.isPast ? T.textMuted : T.textSec }]}>
                {fmt(item.start)} – {fmt(item.end)}
              </Text>
            )}
            <View style={[s.typePill, { backgroundColor: item.isLab ? 'rgba(6,182,212,0.15)' : T.accentSoft }]}>
              <Text style={[s.typeText, { color: item.isLab ? '#06B6D4' : T.accentBright }]}>
                {item.isLab ? 'LAB' : 'LEC'}
              </Text>
            </View>
          </View>

          <Text style={[s.scheduleSubject, { color: item.isNow ? T.textPrimary : T.textSec }]} numberOfLines={1}>
            {item.subject}
          </Text>
          <Text style={[s.scheduleMeta, { color: T.textMuted }]}>
            Yr {item.year} · {item.division}{item.batch ? ` · ${item.batch}` : ''}{item.room ? ` · ${item.room}` : ''}
          </Text>
          {item.isNow && (
            <Text style={[s.scheduleTime, { color: T.nowText, marginTop: 4 }]}>
              {fmt(item.start)} – {fmt(item.end)}
            </Text>
          )}
          {/* Accent color bar */}
          <View style={[s.scheduleColorBar, { backgroundColor: item.color }]} />
        </View>
      </TouchableOpacity>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 52 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} onRefresh={onRefresh}
            tintColor={T.accentBright} colors={[T.accentBright]}
          />
        }>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: themeScale }] }}>

          {/* ══ HEADER ═════════════════════════════════════════════════════ */}
          <View style={[s.header, isDesktop && s.headerDesktop]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.greeting, { color: T.textPrimary }]}>
                {greeting}, {firstName} 👋
              </Text>
              <Text style={[s.subGreeting, { color: T.textSec }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                {teacherData?.id ? `  ·  ID: ${teacherData.id}` : ''}
              </Text>
            </View>
            <View style={s.headerActions}>
              {/* Dark / Light toggle */}
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: T.toggleBg, borderColor: T.toggleBorder }]}
                onPress={toggleTheme} activeOpacity={0.75}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={T.toggleIconColor} />
              </TouchableOpacity>
              {/* Refresh */}
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                onPress={onRefresh} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={18} color={T.textSec} />
              </TouchableOpacity>
              {/* Notifications */}
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                onPress={openPanel} activeOpacity={0.8}>
                <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={19} color={T.textPrimary} />
                {unreadCount > 0 && (
                  <View style={[s.bellDot, { backgroundColor: T.red, borderColor: T.bg }]}>
                    <Text style={s.bellDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ══ STAT CARDS ════════════════════════════════════════════════ */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 4, paddingTop: 2 }}
            style={{ marginBottom: 20 }}>
            {statCards.map((sc, i) => (
              <TouchableOpacity
                key={i}
                style={[s.statCard, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}
                onPress={() => navigation.navigate('AssignmentScreen')}
                activeOpacity={0.75}>
                <View style={[s.statIconWrap, { backgroundColor: sc.bg }]}>
                  <Ionicons name={sc.icon} size={15} color={sc.color} />
                </View>
                {statsLoading
                  ? <ActivityIndicator color={sc.color} size="small" style={{ marginVertical: 6 }} />
                  : <Text style={[s.statVal, { color: sc.color }]}>{sc.value ?? 0}</Text>}
                <Text style={[s.statLabel, { color: T.textSec }]}>{sc.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ══ MAIN GRID ════════════════════════════════════════════════ */}
          <View style={[s.mainGrid, isDesktop && s.mainGridDesktop]}>

            {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
            <View style={[s.leftCol, isDesktop && { flex: 1 }]}>

              {/* Performance Bar Chart */}
              <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                <View style={s.cardHeaderRow}>
                  <View>
                    <Text style={[s.cardTitle, { color: T.textPrimary }]}>Class Performance</Text>
                    <Text style={[s.cardSub, { color: T.textSec }]}>Mid-term comparison · Fall 2024</Text>
                  </View>
                  <View style={s.legendRow}>
                    <View style={[s.legendPill, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}>
                      <View style={[s.legendDot, { backgroundColor: T.accentBright }]} />
                      <Text style={[s.legendText, { color: T.accentBright }]}>2024</Text>
                    </View>
                    <View style={[s.legendPill, { backgroundColor: 'transparent', borderColor: T.border }]}>
                      <View style={[s.legendDot, { backgroundColor: T.barSecondary }]} />
                      <Text style={[s.legendText, { color: T.textSec }]}>2023</Text>
                    </View>
                  </View>
                </View>
                <View style={s.chartArea}>
                  {CHART.map((item, i) => (
                    <View key={i} style={s.barGroup}>
                      <View style={s.barPair}>
                        <Animated.View style={[s.bar, {
                          height: barAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, item.b2024 * 1.3] }),
                          backgroundColor: T.accentBright,
                        }]} />
                        <Animated.View style={[s.bar, {
                          height: barAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, item.b2023 * 1.3] }),
                          backgroundColor: T.barSecondary,
                        }]} />
                      </View>
                      <Text style={[s.barLabel, { color: T.textMuted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Quick Actions — 8 buttons, all navigating to real screens */}
              <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                      <Ionicons name="grid-outline" size={14} color={T.accentBright} />
                    </View>
                    <Text style={[s.cardTitle, { color: T.textPrimary }]}>Quick Actions</Text>
                  </View>
                </View>
                <View style={s.quickGrid}>
                  {quickActionsWithBatches.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.quickItem, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                      onPress={() => q.action ? q.action() : navigation.navigate(q.route)}
                      activeOpacity={0.7}>
                      <View style={[s.quickIconWrap, { backgroundColor: q.color + '22' }]}>
                        <Ionicons name={q.icon} size={21} color={q.color} />
                      </View>
                      <Text style={[s.quickLabel, { color: T.textPrimary }]}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
            <View style={[s.rightCol, isDesktop && { width: 310 }]}>

              {/* Pending Doubts */}
              <View style={[s.card, {
                backgroundColor: T.doubtCardBg, borderColor: T.doubtCardBorder,
                shadowColor: T.accent, shadowOpacity: isDark ? 0.20 : 0.12,
                shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 5,
              }]}>
                <View style={s.cardHeaderRow}>
                  <Text style={[s.cardTitle, { color: T.textPrimary }]}>Pending Doubts</Text>
                  <View style={[s.doubtBellWrap, { backgroundColor: T.accent }]}>
                    <Ionicons name="help-buoy-outline" size={15} color="#fff" />
                  </View>
                </View>
                {statsLoading
                  ? <ActivityIndicator color={T.accent} style={{ marginVertical: 14 }} />
                  : <Text style={[s.doubtCount, { color: T.textPrimary }]}>{pendingDoubts}</Text>}
                <Text style={[s.doubtSub, { color: T.textSec }]}>
                  Unresolved queries from your classes
                </Text>
                <TouchableOpacity
                  style={[s.reviewBtn, { backgroundColor: T.reviewBtnBg }]}
                  onPress={() => navigation.navigate('DoubtScreen')}
                  activeOpacity={0.85}>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={T.reviewBtnColor} />
                  <Text style={[s.reviewBtnText, { color: T.reviewBtnColor }]}>Review Doubts</Text>
                </TouchableOpacity>
              </View>

              {/* ══ TODAY'S SCHEDULE — live fetch from timetable backend ══ */}
              <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                      <Ionicons name="calendar-outline" size={14} color={T.accentBright} />
                    </View>
                    <View>
                      <Text style={[s.cardTitle, { color: T.textPrimary }]}>Today's Schedule</Text>
                      <Text style={[s.cardSub, { color: T.textSec }]}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.dateBadge, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}
                    onPress={() => navigation.navigate('TimetableScreen')}
                    activeOpacity={0.75}>
                    <Text style={[s.dateBadgeText, { color: T.accentBright }]}>
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content: loading / empty / list */}
                {scheduleLoading ? (
                  <View style={s.scheduleLoadingWrap}>
                    <ActivityIndicator color={T.accentBright} />
                    <Text style={[s.scheduleLoadingText, { color: T.textMuted }]}>Fetching schedule…</Text>
                  </View>
                ) : todaySchedule.length === 0 ? (
                  <View style={s.emptySchedule}>
                    <View style={[s.emptyIconWrap, { backgroundColor: T.surfaceEl }]}>
                      <Ionicons name="cafe-outline" size={28} color={T.textMuted} />
                    </View>
                    <Text style={[s.emptyScheduleTitle, { color: T.textPrimary }]}>No Classes Today</Text>
                    <Text style={[s.emptyScheduleSub, { color: T.textMuted }]}>
                      Enjoy your break! Check the full timetable for the week.
                    </Text>
                    <TouchableOpacity
                      style={[s.viewTimetableBtn, { backgroundColor: T.accentSoft, borderColor: T.accent + '44' }]}
                      onPress={() => navigation.navigate('TimetableScreen')}
                      activeOpacity={0.75}>
                      <Ionicons name="calendar-outline" size={14} color={T.accentBright} />
                      <Text style={[s.viewTimetableBtnText, { color: T.accentBright }]}>View Full Timetable</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {todaySchedule.map((item, i, arr) => renderScheduleItem(item, i, arr))}
                    <TouchableOpacity
                      style={[s.viewMoreRow, { borderTopColor: T.border }]}
                      onPress={() => navigation.navigate('TimetableScreen')}
                      activeOpacity={0.75}>
                      <Text style={[s.viewMoreText, { color: T.accentBright }]}>Full Timetable</Text>
                      <Ionicons name="arrow-forward" size={13} color={T.accentBright} />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Teacher profile mini card */}
              {teacherData && (
                <TouchableOpacity
                  style={[s.card, s.profileMiniCard, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}
                  onPress={() => navigation.navigate('AttendanceScreen')}
                  activeOpacity={0.8}>
                  <View style={[s.profileAvatar, { backgroundColor: T.accentSoft }]}>
                    <Text style={[s.profileAvatarText, { color: T.accentBright }]}>
                      {(teacherData.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.profileName, { color: T.textPrimary }]} numberOfLines={1}>
                      {teacherData.name}
                    </Text>
                    <Text style={[s.profileSub, { color: T.textSec }]} numberOfLines={1}>
                      ID: {teacherData.id}
                    </Text>
                    {Array.isArray(teacherData.subjects?.year1) && teacherData.subjects.year1.length > 0 && (
                      <Text style={[s.profileSub, { color: T.textMuted }]} numberOfLines={1}>
                        {teacherData.subjects.year1.slice(0, 2).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                </TouchableOpacity>
              )}

              {/* Class Teacher Assignment Card */}
              {teacherData?.classTeacher?.year && teacherData?.classTeacher?.division ? (
                <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.cardIconBubble, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                        <Ionicons name="people-outline" size={14} color={T.green} />
                      </View>
                      <View>
                        <Text style={[s.cardTitle, { color: T.textPrimary }]}>Class Teacher</Text>
                        <Text style={[s.cardSub, { color: T.textSec }]}>Assignment</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setBatchSettingsModalVisible(true)}
                      style={[{ backgroundColor: T.accentSoft, padding: 8, borderRadius: 8 }]}>
                      <Ionicons name="settings-outline" size={18} color={T.accent} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: T.surfaceEl, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <View>
                        <Text style={[s.ctLabel, { color: T.textMuted }]}>Year</Text>
                        <Text style={[s.ctValue, { color: T.textPrimary }]}>{teacherData.classTeacher.year}</Text>
                      </View>
                      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={[{ fontSize: 18, color: T.textMuted }]}>•</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.ctLabel, { color: T.textMuted }]}>Division</Text>
                        <Text style={[s.ctValue, { color: T.textPrimary }]}>{teacherData.classTeacher.division}</Text>
                      </View>
                    </View>
                    {teacherData.classTeacher.assignedAt && (
                      <Text style={[s.ctAssignedDate, { color: T.textMuted }]}>
                        Assigned on {new Date(teacherData.classTeacher.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={() => setBatchSettingsModalVisible(true)}
                      style={[s.reviewBtn, { backgroundColor: T.accentSoft, marginTop: 6 }]}>
                      <Ionicons name="layers-outline" size={16} color={T.accent} />
                      <Text style={[s.reviewBtnText, { color: T.accent }]}>Manage Batches</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ══ BATCH SETTINGS MODAL ════════════════════════════════════════ */}
      <Modal visible={batchSettingsModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 10 }}>
          <View style={{ flex: 1, backgroundColor: T.bg }}>
            {/* Modal Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }]}>
              <Text style={[{ fontSize: 18, fontWeight: '700', color: T.textPrimary }]}>Batch Settings</Text>
              <TouchableOpacity onPress={() => setBatchSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color={T.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            {teacherData && (
              <ClassTeacherBatchSettings
                teacherId={teacherData._id}
                classInfo={{ year: teacherData.classTeacher.year, division: teacherData.classTeacher.division }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ══ NOTIFICATION SIDE PANEL ════════════════════════════════════════ */}
      <Modal visible={notifOpen} transparent animationType="none" onRequestClose={() => closePanel()}>
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => closePanel()}>
            <Animated.View style={[s.notifOverlay, { opacity: overlayAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[s.notifPanel, {
            backgroundColor: T.surface, borderLeftColor: T.border,
            shadowColor: T.shadowColor, shadowOpacity: isDark ? 0.55 : 0.14,
            transform: [{ translateX: panelAnim }],
          }]}>
            {/* Panel header */}
            <View style={[s.notifPanelHeader, { borderBottomColor: T.border }]}>
              <View>
                <Text style={[s.notifTitle, { color: T.textPrimary }]}>Notifications</Text>
                <Text style={[s.notifSub, { color: T.textSec }]}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up ✓'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <TouchableOpacity style={[s.markAllBtn, { backgroundColor: T.accentSoft }]} onPress={markAllRead}>
                    <Text style={[s.markAllText, { color: T.accentBright }]}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.closePanelBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                  onPress={() => closePanel()}>
                  <Ionicons name="close" size={17} color={T.textSec} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notif list */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {notifs.length === 0 ? (
                <View style={s.emptyNotif}>
                  <Ionicons name="notifications-off-outline" size={44} color={T.textMuted} />
                  <Text style={[s.emptyText, { color: T.textMuted }]}>No notifications</Text>
                </View>
              ) : notifs.map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={[s.notifItem, { borderBottomColor: T.border }, !n.read && { backgroundColor: T.notifUnread }]}
                  onPress={() => markRead(n.id)}
                  activeOpacity={0.75}>
                  {!n.read && <View style={[s.unreadBar, { backgroundColor: n.iconColor }]} />}
                  <View style={[s.notifIconWrap, { backgroundColor: n.iconBg }]}>
                    <Ionicons name={n.icon} size={19} color={n.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <View style={[s.notifTagPill, { backgroundColor: n.iconBg }]}>
                        <Text style={[s.notifTagText, { color: n.tagColor }]}>{n.tag}</Text>
                      </View>
                      <Text style={[s.notifTime, { color: T.textMuted }]}>{n.time}</Text>
                    </View>
                    <Text style={[s.notifItemTitle, { color: n.read ? T.textSec : T.textPrimary }]}>{n.title}</Text>
                    <Text style={[s.notifItemBody, { color: T.textMuted }]} numberOfLines={2}>{n.body}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.dismissBtn} onPress={() => dismissNotif(n.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={T.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* See all */}
            <View style={[s.notifFooter, { borderTopColor: T.border }]}>
              <TouchableOpacity
                style={[s.seeAllBtn, { backgroundColor: T.accentSoft }]}
                onPress={() => closePanel(() => navigation.navigate('MessagesScreen'))}>
                <Text style={[s.seeAllText, { color: T.accentBright }]}>See all activity</Text>
                <Ionicons name="arrow-forward" size={14} color={T.accentBright} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const s = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20 },

  header:        { flexDirection: 'column', gap: 14, marginBottom: 22 },
  headerDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting:      { fontSize: 25, fontWeight: '800', fontFamily: SERIF, marginBottom: 4 },
  subGreeting:   { fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn:     { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:       { position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  bellDotText:   { fontSize: 9, fontWeight: '900', color: '#fff' },

  statCard:     { minWidth: 130, borderRadius: 14, borderWidth: 1, padding: 13, alignItems: 'flex-start', gap: 4 },
  statIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statVal:      { fontSize: 30, fontWeight: '900', fontFamily: SERIF },
  statLabel:    { fontSize: 11, fontWeight: '600' },

  mainGrid:        { flexDirection: 'column', gap: 16 },
  mainGridDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  leftCol:         { gap: 16 },
  rightCol:        { gap: 16 },

  card:          { borderRadius: 16, borderWidth: 1, padding: 18 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardSub:       { fontSize: 12, marginTop: 2 },
  cardIconBubble:{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  legendRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  legendDot:  { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '700' },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 150, paddingTop: 10 },
  barGroup:  { alignItems: 'center', flex: 1, gap: 8 },
  barPair:   { flexDirection: 'row', alignItems: 'flex-end', gap: 5, flex: 1 },
  bar:       { width: 18, borderRadius: 5, minHeight: 4 },
  barLabel:  { fontSize: 10, textAlign: 'center' },

  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem:    { width: '47%', alignItems: 'center', gap: 8, padding: 13, borderRadius: 12, borderWidth: 1 },
  quickIconWrap:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel:   { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  doubtBellWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  doubtCount:    { fontSize: 50, fontWeight: '900', fontFamily: SERIF, lineHeight: 58, marginBottom: 4 },
  doubtSub:      { fontSize: 13, marginBottom: 14 },
  reviewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  reviewBtnText: { fontSize: 14, fontWeight: '700' },

  scheduleLoadingWrap:  { alignItems: 'center', paddingVertical: 24, gap: 10 },
  scheduleLoadingText:  { fontSize: 13 },
  emptySchedule:        { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyIconWrap:        { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyScheduleTitle:   { fontSize: 14, fontWeight: '700' },
  emptyScheduleSub:     { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  viewTimetableBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  viewTimetableBtnText: { fontSize: 13, fontWeight: '600' },

  scheduleItemWrap: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  scheduleTimeline: { alignItems: 'center', width: 14, paddingTop: 5 },
  scheduleDot:      { width: 10, height: 10, borderRadius: 5 },
  scheduleLine:     { width: 2, flex: 1, marginTop: 4, marginBottom: 4, minHeight: 20 },
  scheduleBody:     { flex: 1, paddingBottom: 14, paddingLeft: 4, position: 'relative' },
  nowPill:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  nowDot:           { width: 6, height: 6, borderRadius: 3 },
  nowLabel:         { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scheduleTime:     { fontSize: 11, marginBottom: 3 },
  scheduleSubject:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  scheduleMeta:     { fontSize: 11 },
  scheduleColorBar: { position: 'absolute', top: 0, right: 0, width: 3, height: '80%', borderRadius: 2, opacity: 0.7 },
  typePill:         { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeText:         { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  viewMoreRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  viewMoreText:     { fontSize: 13, fontWeight: '600' },

  dateBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  dateBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  profileMiniCard:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 15, fontWeight: '800' },
  profileName:       { fontSize: 14, fontWeight: '700' },
  profileSub:        { fontSize: 11, marginTop: 1 },

  ctLabel:           { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  ctValue:           { fontSize: 16, fontWeight: '800', marginTop: 3 },
  ctAssignedDate:    { fontSize: 10, marginTop: 2, textAlign: 'center' },

  notifOverlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  notifPanel:       { position: 'absolute', top: 0, right: 0, bottom: 0, width: 340, borderLeftWidth: 1, shadowOffset: { width: -4, height: 0 }, shadowRadius: 22, elevation: 22, paddingTop: Platform.OS === 'ios' ? 56 : 20 },
  notifPanelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, marginBottom: 4 },
  notifTitle:       { fontSize: 18, fontWeight: '800', fontFamily: SERIF },
  notifSub:         { fontSize: 12, marginTop: 2 },
  markAllBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  markAllText:      { fontSize: 11, fontWeight: '700' },
  closePanelBtn:    { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifItem:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, position: 'relative' },
  unreadBar:        { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  notifIconWrap:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTagPill:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  notifTagText:     { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  notifTime:        { fontSize: 10, flex: 1, textAlign: 'right' },
  notifItemTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  notifItemBody:    { fontSize: 12, lineHeight: 17 },
  dismissBtn:       { paddingTop: 2, flexShrink: 0 },
  emptyNotif:       { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:        { fontSize: 14 },
  notifFooter:      { padding: 16, borderTopWidth: 1 },
  seeAllBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  seeAllText:       { fontSize: 13, fontWeight: '700' },
});