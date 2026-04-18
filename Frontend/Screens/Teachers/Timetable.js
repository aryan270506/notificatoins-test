// Screens/Teacher/TimetableScreen.js
// Full Weekly Timetable — Teacher View (fetched from DB, cancel/postpone synced)

import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, Modal,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import axiosInstance from "../../Src/Axios";
import { ThemeContext } from './TeacherStack';

/* ─── Colors ─────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:           '#07090F',
  surface:      '#0D1120',
  surfaceEl:    '#111827',
  card:         '#0F1523',
  border:       '#1A2035',
  borderLight:  '#1E2845',
  accent:       '#3B82F6',
  accentSoft:   'rgba(59,130,246,0.14)',
  accentGlow:   'rgba(59,130,246,0.06)',
  cyan:         '#06B6D4',
  cyanSoft:     'rgba(6,182,212,0.14)',
  green:        '#10B981',
  greenSoft:    'rgba(16,185,129,0.14)',
  purple:       '#8B5CF6',
  purpleSoft:   'rgba(139,92,246,0.14)',
  orange:       '#F59E0B',
  orangeSoft:   'rgba(245,158,11,0.14)',
  red:          '#EF4444',
  redSoft:      'rgba(239,68,68,0.14)',
  textPrimary:  '#EEF2FF',
  textSec:      '#8B96BE',
  textMuted:    '#3D4A6A',
  cancelled:    '#EF4444',
  cancelledSoft:'rgba(239,68,68,0.14)',
  postponed:    '#F59E0B',
  postponedSoft:'rgba(245,158,11,0.14)',
  nowLine:      '#10B981',
  lunchBg:      'rgba(245,158,11,0.06)',
  breakBg:      'rgba(59,130,246,0.05)',
  white:        '#FFFFFF',
};
const C_LIGHT = {
  bg:           '#F1F4FD',
  surface:      '#FFFFFF',
  surfaceEl:    '#EAEEf9',
  card:         '#FFFFFF',
  border:       '#DDE3F4',
  borderLight:  '#CBD5E1',
  accent:       '#2563EB',
  accentSoft:   'rgba(37,99,235,0.09)',
  accentGlow:   'rgba(37,99,235,0.06)',
  cyan:         '#0891B2',
  cyanSoft:     'rgba(8,145,178,0.10)',
  green:        '#059669',
  greenSoft:    'rgba(5,150,105,0.10)',
  purple:       '#7C3AED',
  purpleSoft:   'rgba(124,58,237,0.10)',
  orange:       '#D97706',
  orangeSoft:   'rgba(217,119,6,0.10)',
  red:          '#DC2626',
  redSoft:      'rgba(220,38,38,0.10)',
  textPrimary:  '#0F172A',
  textSec:      '#4B5563',
  textMuted:    '#9CA3AF',
  cancelled:    '#DC2626',
  cancelledSoft:'rgba(220,38,38,0.10)',
  postponed:    '#D97706',
  postponedSoft:'rgba(217,119,6,0.10)',
  nowLine:      '#059669',
  lunchBg:      'rgba(217,119,6,0.06)',
  breakBg:      'rgba(37,99,235,0.05)',
  white:        '#FFFFFF',
};

/* ─── Color map: Timetable schema enum → hex ────────────────────────────── */
// These must match the `color` enum in the Timetable model exactly:
// ["teal", "blue", "purple", "orange", "green", "pink"]
const COLOR_MAP = {
  teal:   '#06B6D4',
  blue:   '#3B82F6',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  green:  '#10B981',
  pink:   '#EC4899',
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DAY_LABELS = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
};

// Map full day names (as stored in Timetable model) to short codes used in UI
const DAY_TO_SHORT = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT',
};

// Default slot times (fallback if template fetch fails)
const DEFAULT_SLOT_TIMES = {
  t1: { start: '10:30', end: '11:30' },
  t2: { start: '11:30', end: '12:30' },
  t3: { start: '13:15', end: '14:15' },
  t4: { start: '14:15', end: '15:15' },
  t5: { start: '15:30', end: '16:30' },
  t6: { start: '16:30', end: '17:30' },
};

const TYPE_LABELS_FN = (C) => ({
  LECTURE: { label: 'Lecture', icon: 'book-outline',        bg: C.accentSoft,  color: C.accent  },
  LAB:     { label: 'Lab',     icon: 'flask-outline',       bg: C.cyanSoft,    color: C.cyan    },
  MEETING: { label: 'Meeting', icon: 'people-outline',      bg: C.orangeSoft,  color: C.orange  },
  DOUBT:   { label: 'Doubt',   icon: 'help-circle-outline', bg: C.greenSoft,   color: C.green   },
});

const BREAKS = [
  { start: '12:30', end: '13:15', label: '🍽  LUNCH BREAK  (12:30 – 1:15 PM)', type: 'lunch' },
  { start: '15:15', end: '15:30', label: 'SHORT BREAK  (3:15 – 3:30)', type: 'short' },
];

const GRID_START  = 10 * 60 + 30;  // 10:30 AM
const GRID_END    = 18 * 60;       // 6:00 PM
const PX_PER_MIN  = 1.8;

const TIME_SLOTS = [];
for (let h = 10; h <= 18; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

const POSTPONE_DATE_OPTIONS = ['Mon, Oct 30', 'Tue, Oct 31', 'Wed, Nov 1', 'Thu, Nov 2', 'Fri, Nov 3'];
const POSTPONE_TIME_OPTIONS = ['08:00 AM', '09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM'];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ap}`;
};

// Get current ISO week start (Monday)
function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Transform the flat array returned by GET /api/timetable/teacher/:teacherId
 * into the grouped schedule shape: { MON: [cls, ...], TUE: [...], ... }
 *
 * Each item from the API looks like:
 * {
 *   id, timetableId, year, division, batch,
 *   day,      // "Monday" | "Tuesday" | ...  (full name from Timetable model)
 *   slotId,   // "t1" | "t2" | ... | "t6"
 *   subject,  // uppercase string from Timetable schema
 *   room,     // string | null
 *   color,    // "teal" | "blue" | "purple" | "orange" | "green" | "pink"
 *   teacherName,
 *   start,    // "10:30"  (added by backend from SLOT_TIMES)
 *   end,      // "11:30"
 * }
 */
function transformSchedule(apiData, slotTimesMap = {}) {
  const grouped = {};
  DAYS.forEach((d) => { grouped[d] = []; });

  // Use provided slot times, fallback to defaults
  const slotTimes = Object.keys(slotTimesMap).length > 0 ? slotTimesMap : DEFAULT_SLOT_TIMES;

  apiData.forEach((item) => {
    const short = DAY_TO_SHORT[item.day];
    if (!short) return; // skip unknown days

    // Resolve hex color from the Timetable model enum value
    const cardColor = COLOR_MAP[item.color] || C_DARK.accent;

    // Detect LAB by subject name convention (subject contains "LAB")
    // This mirrors how the admin assigns subjects vs labs from the Student collection
    const isLab = item.subject.toUpperCase().includes('LAB');
    const type  = isLab ? 'LAB' : 'LECTURE';

    // Use start/end provided by the backend (which come from its own SLOT_TIMES),
    // falling back to our local slotTimes as a safety net.
    const times = slotTimes[item.slotId] || { start: '09:00', end: '10:00' };

    grouped[short].push({
      id:          item.id,          // composite key: "<timetableId>-<day>-<slotId>"
      timetableId: item.timetableId,
      year:        item.year,
      division:    item.division,
      batch:       item.batch,
      day:         item.day,         // full name, e.g. "Monday" — used by lecture-status API
      slotId:      item.slotId,      // e.g. "t1"
      subject:     item.subject,
      code:        `${item.division}-${item.batch}`,
      section:     `${item.division}${item.batch}`,
      room:        item.room || '—',
      start:       item.start || times.start,
      end:         item.end   || times.end,
      type,
      color: cardColor,
    });
  });

  return grouped;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function TimetableScreen({ navigation, route, user }) {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const styles = makeStyles(C);
  const TYPE_LABELS = TYPE_LABELS_FN(C);
  const teacherId   = user?._id || route?.params?.teacherId || route?.params?.user?._id;
  const teacherName = user?.name || route?.params?.user?.name || 'Teacher';

  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 768;

  const [view, setView]                 = useState('weekly');
  const [activeDay, setActiveDay]       = useState('MON');
  const [selectedClass, setSelectedClass] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [uploadState, setUploadState]     = useState('idle');
  const [uploadedFile, setUploadedFile]   = useState(null);
  const [exportState, setExportState]     = useState('idle');
  const uploadProgressAnim = useRef(new Animated.Value(0)).current;

  // DB-sourced data
  const [schedule, setSchedule]   = useState({});   // { MON: [cls, ...], TUE: [...] }
  const [statusMap, setStatusMap] = useState({});   // { "day-slotId": { status, postponedTo } }
  const [loading, setLoading]     = useState(true); // starts true — fixed bug where it was set false before fetch
  const [template, setTemplate]   = useState(null); // ✅ Template with slot times

  // Postpone modal state
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [postponeDate, setPostponeDate] = useState(POSTPONE_DATE_OPTIONS[0]);
  const [postponeTime, setPostponeTime] = useState(POSTPONE_TIME_OPTIONS[0]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const weekStart = getWeekStart();

  /* ── Fetch timetable template with slot times from backend ────────────────
   *
   * Route: GET /api/timetable/template
   *
   * This fetch gets the current institution's slot configuration, including
   * start/end times for each slot (t1-t6). These times are used to render the
   * timetable grid accurately based on the institution's actual schedule.
   * ────────────────────────────────────────────────────────────────────────── */
  const fetchTemplate = useCallback(async () => {
    try {
      console.log('📋 TimetableScreen: Fetching template for slot times');
      const { data } = await axiosInstance.get(`/timetable/template`);
      if (data.success && data.data?.slots) {
        const slotMap = {};
        data.data.slots.forEach((slot) => {
          if (slot.id && slot.startTime && slot.endTime) {
            slotMap[slot.id] = {
              start: slot.startTime,
              end: slot.endTime,
            };
          }
        });
        console.log('✅ Template fetched successfully:', slotMap);
        setTemplate(slotMap);
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch template, using defaults:', err?.message);
      setTemplate(DEFAULT_SLOT_TIMES);
    }
  }, []);

  /* ── Fetch teacher's assigned classes from the Timetable collection ────────
   *
   * Route: GET /api/timetable/teacher/:teacherId
   *
   * This backend route scans every Timetable document (year/division/batch)
   * and collects every slot whose `teacherId` matches, returning a flat array.
   * The Timetable model is the single source of truth — nothing is fetched
   * from a separate teacher-specific collection.
   * ────────────────────────────────────────────────────────────────────────── */
  const fetchSchedule = useCallback(async () => {
    if (!teacherId) {
      console.warn('⚠️ TimetableScreen: teacherId is undefined, cannot fetch schedule');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log(`📅 TimetableScreen: Fetching timetable for teacherId: ${teacherId}`);
      const { data } = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
      console.log(`✅ TimetableScreen: Fetch successful, received ${data.data?.length || 0} classes`, data.data);
      if (data.success) {
        const transformed = transformSchedule(data.data, template || DEFAULT_SLOT_TIMES);
        console.log('🔄 Transformed schedule:', transformed);
        setSchedule(transformed);
      }
    } catch (err) {
      console.error('❌ fetchSchedule error:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, [teacherId, template]);

  /* ── Fetch cancel/postpone statuses for this teacher's week ── */
  const fetchStatuses = useCallback(async () => {
    if (!teacherId) {
      console.warn('⚠️ TimetableScreen: teacherId is undefined, cannot fetch statuses');
      return;
    }
    try {
      console.log(`📊 Fetching lecture statuses for weekStart: ${weekStart}`);
      const { data } = await axiosInstance.get(`/lecture-status/teacher/${teacherId}`, {
        params: { weekStart },
      });
      if (data.success) {
        console.log(`✅ Fetched ${data.data?.length || 0} lecture statuses`, data.data);
        // Build lookup map: "<fullDayName>-<slotId>" → status doc
        // e.g. "Monday-t1" → { status: "cancelled", postponedTo: {...} }
        const map = {};
        data.data.forEach((s) => {
          map[`${s.day}-${s.slotId}`] = s;
        });
        console.log('🗺️ Status map:', map);
        setStatusMap(map);
      }
    } catch (err) {
      console.error('❌ fetchStatuses error:', err?.response?.data || err.message);
    }
  }, [teacherId, weekStart]);

  // Debug: log when teacherId changes
  useEffect(() => {
    console.log('🎓 TimetableScreen mounted/updated - teacherId:', teacherId, 'teacherName:', teacherName);
  }, [teacherId, teacherName]);

  useEffect(() => {
    fetchTemplate();
    fetchSchedule();
    fetchStatuses();
  }, [fetchTemplate, fetchSchedule, fetchStatuses]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ── Derived helpers ── */
  // Status key: "<fullDayName>-<slotId>", e.g. "Monday-t1"
  // cls.day is the full name from the Timetable model (e.g. "Monday")
  const getStatusKey    = (cls) => `${cls.day}-${cls.slotId}`;
  const isCancelled     = (cls) => statusMap[getStatusKey(cls)]?.status === 'cancelled';
  const isPostponed     = (cls) => statusMap[getStatusKey(cls)]?.status === 'postponed';
  const getPostponeInfo = (cls) => statusMap[getStatusKey(cls)]?.postponedTo;

  const totalClasses = useMemo(() =>
    Object.values(schedule).reduce((acc, day) => acc + day.length, 0),
  [schedule]);

  const todayClasses = schedule[activeDay] || [];

  /* ── Class card press ── */
  const handleClassPress = (cls) => {
    setSelectedClass(cls);
    setModalVisible(true);
  };

  /* ── Cancel Lecture (toggle) ── */
  const handleCancelLecture = async () => {
    if (!selectedClass) return;
    const cls    = selectedClass;
    const key    = getStatusKey(cls);
    const cur    = statusMap[key];
    const isNowCancelled = cur?.status === 'cancelled';

    try {
      if (isNowCancelled) {
        // Revert to active
        await axiosInstance.delete('/lecture-status', {
          data: {
            year:      cls.year,
            division:  cls.division,
            batch:     cls.batch,
            day:       cls.day,   // full day name, e.g. "Monday"
            slotId:    cls.slotId,
            weekStart,
          },
        });
        setStatusMap(prev => { const n = { ...prev }; delete n[key]; return n; });
      } else {
        // Set cancelled
        const { data } = await axiosInstance.put('/lecture-status', {
          year:          cls.year,
          division:      cls.division,
          batch:         cls.batch,
          day:           cls.day,
          slotId:        cls.slotId,
          weekStart,
          teacherId,
          subject:       cls.subject,
          status:        'cancelled',
          updatedByRole: 'Teacher',
        });
        if (data.success) {
          setStatusMap(prev => ({ ...prev, [key]: data.data }));
        }
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
    setModalVisible(false);
  };

  /* ── Open postpone picker ── */
  const openPostponeModal = () => {
    setPostponeDate(POSTPONE_DATE_OPTIONS[0]);
    setPostponeTime(POSTPONE_TIME_OPTIONS[0]);
    setPostponeModalVisible(true);
  };

  /* ── Confirm postpone ── */
  const confirmPostpone = async () => {
    if (!selectedClass) return;
    const cls = selectedClass;
    const key = getStatusKey(cls);
    try {
      const { data } = await axiosInstance.put('/lecture-status', {
        year:          cls.year,
        division:      cls.division,
        batch:         cls.batch,
        day:           cls.day,
        slotId:        cls.slotId,
        weekStart,
        teacherId,
        subject:       cls.subject,
        status:        'postponed',
        postponedTo:   { date: postponeDate, time: postponeTime },
        updatedByRole: 'Teacher',
      });
      if (data.success) {
        setStatusMap(prev => ({ ...prev, [key]: data.data }));
      }
    } catch (err) {
      console.error('Postpone error:', err);
    }
    setPostponeModalVisible(false);
    setModalVisible(false);
  };

  /* ── Upload Material ── */
  const handleUploadMaterial = async () => {
    try {
      setUploadState('picking');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'image/*', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) { setUploadState('idle'); return; }

      const file = result.assets[0];
      setUploadedFile(file);
      setUploadState('uploading');
      uploadProgressAnim.setValue(0);
      Animated.timing(uploadProgressAnim, { toValue: 1, duration: 1800, useNativeDriver: false }).start();

      // TODO: replace with real API call
      await new Promise(r => setTimeout(r, 2000));
      setUploadState('success');
      setTimeout(() => { setUploadState('idle'); setUploadedFile(null); uploadProgressAnim.setValue(0); }, 3000);
    } catch (err) {
      setUploadState('error');
      setTimeout(() => { setUploadState('idle'); setUploadedFile(null); }, 2500);
    }
  };

  const getFileSizeLabel = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'document-outline';
    if (mimeType.includes('pdf'))   return 'document-text-outline';
    if (mimeType.includes('image')) return 'image-outline';
    return 'document-outline';
  };

  /* ── Weekly grid ── */
  const renderWeeklyGrid = () => {
    const COL_W = Math.max((width - (isDesktop ? 290 : 260)) / DAYS.length, 100);
    const gridH  = (GRID_END - GRID_START) * PX_PER_MIN;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {/* Time column */}
            <View style={[styles.timeCol, { height: gridH + 40 }]}>
              {TIME_SLOTS.map((slot) => {
                const top = (toMinutes(slot) - GRID_START) * PX_PER_MIN;
                return (
                  <View key={slot} style={[styles.timeSlotLabel, { top }]}>
                    <Text style={styles.timeText}>{formatTime(slot)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Day columns */}
            {DAYS.map((day) => {
              const isActive = day === activeDay;
              const dayCls   = schedule[day] || [];
              return (
                <View key={day} style={[styles.dayCol, { width: COL_W }]}>
                  <View style={[styles.dayHeader, isActive && styles.dayHeaderActive]}>
                    <Text style={[styles.dayName, isActive && { color: C.accent }]}>{day}</Text>
                    {isActive && <View style={styles.todayUnderline} />}
                  </View>
                  <View style={{ height: gridH, position: 'relative' }}>
                    {TIME_SLOTS.map((slot) => {
                      const top = (toMinutes(slot) - GRID_START) * PX_PER_MIN;
                      return <View key={slot} style={[styles.hourLine, { top }]} />;
                    })}
                    {BREAKS.map((brk, bi) => {
                      const top = (toMinutes(brk.start) - GRID_START) * PX_PER_MIN;
                      const h   = (toMinutes(brk.end) - toMinutes(brk.start)) * PX_PER_MIN;
                      return <View key={bi} style={[styles.breakStripe, { top, height: h, backgroundColor: brk.type === 'lunch' ? C.lunchBg : C.breakBg }]} />;
                    })}
                    {dayCls.map((cls) => {
                      const top       = (toMinutes(cls.start) - GRID_START) * PX_PER_MIN;
                      const h         = (toMinutes(cls.end)   - toMinutes(cls.start)) * PX_PER_MIN;
                      const cancelled = isCancelled(cls);
                      const postponed = isPostponed(cls);
                      const pInfo     = getPostponeInfo(cls);
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          style={[styles.classCard, {
                            top, height: h - 4,
                            backgroundColor: cancelled ? C.cancelledSoft : postponed ? C.postponedSoft : cls.color + '18',
                            borderLeftColor: cancelled ? C.cancelled     : postponed ? C.postponed     : cls.color,
                            width: COL_W - 8,
                            opacity: cancelled ? 0.6 : 1,
                          }]}
                          onPress={() => handleClassPress(cls)}
                          activeOpacity={0.85}>
                          <View style={[styles.classTypePill, { backgroundColor: (cancelled ? C.cancelled : postponed ? C.postponed : cls.color) + '30' }]}>
                            <Text style={[styles.classTypeText, { color: cancelled ? C.cancelled : postponed ? C.postponed : cls.color }]}>
                              {cancelled ? '✕ CANCELLED' : postponed ? '↪ POSTPONED' : cls.type}
                            </Text>
                          </View>
                          <Text style={[styles.classSubject, cancelled && { textDecorationLine: 'line-through', color: C.textMuted }]} numberOfLines={2}>{cls.subject}</Text>
                          <Text style={[styles.classYear, { color: cancelled ? C.textMuted : C.textSec }]}>{cls.division}-{cls.batch}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <Ionicons name="clock-outline" size={10} color={cancelled ? C.textMuted : C.textSec} />
                            <Text style={[styles.classTime, { color: cancelled ? C.textMuted : C.textSec }]}>{formatTime(cls.start)} • {formatTime(cls.end)}</Text>
                          </View>
                          {h > 80 && <Text style={styles.classRoom} numberOfLines={1}>📍 {cls.room}</Text>}
                          {postponed && pInfo && h > 60 && (
                            <Text style={[styles.classRoom, { color: C.postponed, marginTop: 2 }]} numberOfLines={1}>
                              ↪ {pInfo.date}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  };

  /* ── Daily view ── */
  const renderDailyView = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.daySelectorPill, activeDay === day && styles.daySelectorPillActive]}
              onPress={() => setActiveDay(day)}>
              <Text style={[styles.daySelectorText, activeDay === day && { color: C.white }]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {todayClasses.length === 0 ? (
        <View style={styles.emptyDay}>
          <Ionicons name="calendar-outline" size={44} color={C.textMuted} />
          <Text style={styles.emptyText}>No classes on {DAY_LABELS[activeDay]}</Text>
        </View>
      ) : (
        todayClasses
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
          .map((cls) => {
            const cancelled   = isCancelled(cls);
            const postponed   = isPostponed(cls);
            const pInfo       = getPostponeInfo(cls);
            const duration    = toMinutes(cls.end) - toMinutes(cls.start);
            const statusColor = cancelled ? C.cancelled : postponed ? C.postponed : cls.color;
            const typeMeta    = TYPE_LABELS[cls.type] || TYPE_LABELS.LECTURE;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.dailyCard, { borderLeftColor: statusColor, opacity: cancelled ? 0.65 : 1 }]}
                onPress={() => handleClassPress(cls)}
                activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                  {/* Time Block — visual timeline */}
                  <View style={styles.dailyTimeBlock}>
                    <Text style={styles.dailyTimeStart}>{formatTime(cls.start)}</Text>
                    <View style={[styles.dailyTimeLine, { backgroundColor: statusColor }]} />
                    <Text style={styles.dailyTimeEnd}>{formatTime(cls.end)}</Text>
                  </View>
                  
                  {/* Main content */}
                  <View style={{ flex: 1 }}>
                    {/* Status pill + Duration */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={[styles.typeChip, { backgroundColor: statusColor + '22' }]}>
                        <Ionicons name={cancelled ? 'close-circle-outline' : postponed ? 'arrow-forward-circle-outline' : typeMeta.icon} size={11} color={statusColor} />
                        <Text style={[styles.typeChipText, { color: statusColor }]}>
                          {cancelled ? 'CANCELLED' : postponed ? 'POSTPONED' : typeMeta.label}
                        </Text>
                      </View>
                      <Text style={styles.durationText}>({duration} mins)</Text>
                    </View>
                    
                    {/* Subject (main highlight) */}
                    <Text style={[styles.dailySubject, cancelled && { textDecorationLine: 'line-through', color: C.textMuted }]}>{cls.subject}</Text>
                    
                    {/* Class info (Year • Division • Batch) */}
                    <Text style={[styles.dailyYear, { color: cancelled ? C.textMuted : C.textSec }]}>Year {cls.year} • {cls.division}-{cls.batch}</Text>
                    
                    {/* Reschedule info if postponed */}
                    {postponed && pInfo && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border }}>
                        <Ionicons name="arrow-forward-circle-outline" size={12} color={C.postponed} />
                        <Text style={{ fontSize: 11, color: C.postponed, fontWeight: '600' }}>
                          Rescheduled: {pInfo.date} • {pInfo.time}
                        </Text>
                      </View>
                    )}
                    
                    {/* Location */}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={12} color={C.textMuted} />
                        <Text style={styles.dailyMeta}>{cls.room}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
      )}
    </ScrollView>
  );

  /* ── List view ── */
  const renderListView = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {DAYS.map((day) => {
        const classes = schedule[day] || [];
        return (
          <View key={day} style={{ marginBottom: 20 }}>
            <View style={styles.listDayHeader}>
              <Text style={styles.listDayName}>{DAY_LABELS[day]}</Text>
              <View style={styles.listDayCount}>
                <Text style={styles.listDayCountText}>{classes.length} classes</Text>
              </View>
            </View>
            {classes.length === 0 ? (
              <Text style={styles.listEmpty}>Free day</Text>
            ) : (
              classes
                .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
                .map((cls) => {
                  const cancelled = isCancelled(cls);
                  const postponed = isPostponed(cls);
                  const color = cancelled ? C.cancelled : postponed ? C.postponed : cls.color;
                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={styles.listCard}
                      onPress={() => handleClassPress(cls)}
                      activeOpacity={0.8}>
                      <View style={[styles.listColorDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listSubject, cancelled && { textDecorationLine: 'line-through', color: C.textMuted }]}>{cls.subject}</Text>
                        <Text style={styles.listMeta}>Year {cls.year} • Div {cls.division} • Batch {cls.batch} • {formatTime(cls.start)} – {formatTime(cls.end)} • {cls.room}</Text>
                      </View>
                      <View style={[styles.listTypePill, { backgroundColor: color + '22' }]}>
                        <Text style={[styles.listTypeText, { color }]}>
                          {cancelled ? 'CANCELLED' : postponed ? 'POSTPONED' : cls.type}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  /* ── Class detail modal ── */
  const renderModal = () => {
    if (!selectedClass) return null;
    const cls         = selectedClass;
    const typeMeta    = TYPE_LABELS[cls.type] || TYPE_LABELS.LECTURE;
    const duration    = toMinutes(cls.end) - toMinutes(cls.start);
    const cancelled   = isCancelled(cls);
    const postponed   = isPostponed(cls);
    const pInfo       = getPostponeInfo(cls);
    const statusColor = cancelled ? C.cancelled : postponed ? C.postponed : cls.color;

    return (
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeader, { borderLeftColor: statusColor }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={[styles.typeChip, { backgroundColor: statusColor + '22' }]}>
                    <Ionicons name={cancelled ? 'close-circle-outline' : postponed ? 'arrow-forward-circle-outline' : typeMeta.icon} size={12} color={statusColor} />
                    <Text style={[styles.typeChipText, { color: statusColor }]}>
                      {cancelled ? 'CANCELLED' : postponed ? 'POSTPONED' : typeMeta.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.modalSubject, cancelled && { textDecorationLine: 'line-through', color: C.textMuted }]}>{cls.subject}</Text>
                <Text style={styles.modalCode}>{cls.section}</Text>
                {postponed && pInfo && (
                  <Text style={{ fontSize: 12, color: C.postponed, marginTop: 4, fontWeight: '600' }}>
                    ↪ Rescheduled to {pInfo.date} at {pInfo.time}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.textSec} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalGrid}>
              {[
                { icon: 'school-outline',   label: 'Year',     value: `Year ${cls.year}` },
                { icon: 'business-outline', label: 'Division', value: `Division ${cls.division}` },
                { icon: 'people-outline',   label: 'Batch',    value: `Batch ${cls.batch}` },
                { icon: 'time-outline',     label: 'Time',     value: `${formatTime(cls.start)} – ${formatTime(cls.end)}` },
                { icon: 'hourglass-outline',label: 'Duration', value: `${duration} minutes` },
                { icon: 'location-outline', label: 'Room',     value: cls.room },
              ].map((item, i) => (
                <View key={i} style={styles.modalDetailRow}>
                  <View style={[styles.modalDetailIcon, { backgroundColor: cls.color + '18' }]}>
                    <Ionicons name={item.icon} size={16} color={cls.color} />
                  </View>
                  <View>
                    <Text style={styles.modalDetailLabel}>{item.label}</Text>
                    <Text style={styles.modalDetailValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ gap: 8, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: cancelled ? C.redSoft : C.surfaceEl, borderWidth: 1, borderColor: cancelled ? C.cancelled : C.border }]}
                  onPress={handleCancelLecture}>
                  <Ionicons name={cancelled ? 'refresh-outline' : 'close-circle-outline'} size={16} color={cancelled ? C.cancelled : C.textSec} />
                  <Text style={[styles.modalBtnText, { color: cancelled ? C.cancelled : C.textSec }]}>
                    {cancelled ? 'Undo Cancel' : 'Cancel Lecture'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: postponed ? C.postponedSoft : C.surfaceEl, borderWidth: 1, borderColor: postponed ? C.postponed : C.border }]}
                  onPress={openPostponeModal}>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={postponed ? C.postponed : C.textSec} />
                  <Text style={[styles.modalBtnText, { color: postponed ? C.postponed : C.textSec }]}>
                    {postponed ? 'Change Date' : 'Postpone'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accentSoft }]} onPress={() => setModalVisible(false)}>
                  <Ionicons name="chatbubble-outline" size={16} color={C.accent} />
                  <Text style={[styles.modalBtnText, { color: C.accent }]}>Message Class</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1,
                    backgroundColor: uploadState === 'success' ? C.greenSoft : uploadState === 'error' ? C.redSoft : cls.color + '20'
                  }]}
                  onPress={handleUploadMaterial}
                  disabled={uploadState === 'uploading' || uploadState === 'picking'}>
                  <Ionicons
                    name={uploadState === 'success' ? 'checkmark-circle' : uploadState === 'error' ? 'alert-circle' : 'cloud-upload-outline'}
                    size={16}
                    color={uploadState === 'success' ? C.green : uploadState === 'error' ? C.red : cls.color}
                  />
                  <Text style={[styles.modalBtnText, { color: uploadState === 'success' ? C.green : uploadState === 'error' ? C.red : cls.color }]}>
                    {uploadState === 'idle' ? 'Upload Material' : uploadState === 'picking' ? 'Opening…' : uploadState === 'uploading' ? 'Uploading…' : uploadState === 'success' ? 'Uploaded!' : 'Failed'}
                  </Text>
                </TouchableOpacity>
              </View>

              {(uploadState === 'uploading' || uploadState === 'success') && uploadedFile && (
                <View style={styles.uploadFeedback}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <View style={[styles.fileIconWrap, { backgroundColor: cls.color + '20' }]}>
                      <Ionicons name={getFileIcon(uploadedFile.mimeType)} size={18} color={cls.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{uploadedFile.name}</Text>
                      <Text style={styles.fileSize}>{getFileSizeLabel(uploadedFile.size)}</Text>
                    </View>
                    {uploadState === 'success' && <Ionicons name="checkmark-circle" size={20} color={C.green} />}
                  </View>
                  {uploadState === 'uploading' && (
                    <View style={styles.progressTrack}>
                      <Animated.View style={[styles.progressBar, {
                        width: uploadProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: cls.color,
                      }]} />
                    </View>
                  )}
                  {uploadState === 'success' && <Text style={styles.uploadSuccessText}>✓ Material uploaded to {cls.section}</Text>}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Postpone picker modal ── */
  const renderPostponeModal = () => (
    <Modal visible={postponeModalVisible} transparent animationType="slide" onRequestClose={() => setPostponeModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setPostponeModalVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 28 }]}>
          <View style={styles.modalHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.textPrimary }}>Postpone to…</Text>
            <TouchableOpacity onPress={() => setPostponeModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {POSTPONE_DATE_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: postponeDate === d ? C.accentSoft : C.surfaceEl, borderWidth: 1, borderColor: postponeDate === d ? C.accent : C.border }}
                  onPress={() => setPostponeDate(d)}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: postponeDate === d ? C.accent : C.textSec }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>SELECT TIME</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {POSTPONE_TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: postponeTime === t ? C.accentSoft : C.surfaceEl, borderWidth: 1, borderColor: postponeTime === t ? C.accent : C.border }}
                onPress={() => setPostponeTime(t)}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: postponeTime === t ? C.accent : C.textSec }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accentSoft, justifyContent: 'center' }]} onPress={confirmPostpone}>
            <Ionicons name="checkmark-circle-outline" size={18} color={C.accent} />
            <Text style={[styles.modalBtnText, { color: C.accent, fontSize: 15 }]}>Confirm Postpone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textSec, marginTop: 12 }}>Loading your timetable…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>ACADEMIC YEAR 2024/25 · <Text style={{ color: C.accent }}>SEMESTER 1</Text></Text>
            <Text style={styles.headerTitle}>Weekly Timetable</Text>
            <Text style={styles.headerWeek}>Week of {weekStart}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.teacherChip, { borderColor: C.accent + '50' }]}>
              <View style={[styles.teacherAvatar, { backgroundColor: C.accent + '25' }]}>
                <Text style={[styles.teacherAvatarText, { color: C.accent }]}>
                  {teacherName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.teacherName}>{teacherName}</Text>
                <Text style={styles.teacherDept}>Faculty</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Classes', value: totalClasses,                                                                             icon: 'book-outline',               color: C.accent  },
            { label: 'Today',         value: `${todayClasses.length}`,                                                                 icon: 'time-outline',               color: C.green   },
            { label: 'Cancelled',     value: Object.values(statusMap).filter(s => s.status === 'cancelled').length,                    icon: 'close-circle-outline',       color: C.red     },
            { label: 'Postponed',     value: Object.values(statusMap).filter(s => s.status === 'postponed').length,                    icon: 'arrow-forward-circle-outline',color: C.orange  },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderColor: stat.color + '30' }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon} size={14} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── View toggle ── */}
        <View style={styles.toolbar}>
          <View style={styles.viewToggle}>
            {['weekly', 'daily', 'list'].map((v) => (
              <TouchableOpacity key={v} style={[styles.viewBtn, view === v && styles.viewBtnActive]} onPress={() => setView(v)}>
                <Text style={[styles.viewBtnText, view === v && { color: C.white }]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8} onPress={() => { fetchSchedule(); fetchStatuses(); }}>
            <Ionicons name="refresh-outline" size={16} color={C.accent} />
            <Text style={styles.downloadText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {view === 'weekly' && renderWeeklyGrid()}
          {view === 'daily'  && renderDailyView()}
          {view === 'list'   && renderListView()}
        </View>

      </Animated.View>

      {renderModal()}
      {renderPostponeModal()}
    </View>
  );
}


/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16,
  },
  headerSub:   { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 2 },
  headerWeek:  { fontSize: 13, color: C.textSec, marginTop: 2, fontWeight: '500' },
  headerRight: { alignItems: 'flex-end' },

  /* Teacher chip */
  teacherChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surfaceEl, borderRadius: 14, borderWidth: 1.2,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  teacherAvatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  teacherAvatarText: { fontWeight: '800', fontSize: 13 },
  teacherName:       { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  teacherDept:       { fontSize: 11, color: C.textSec, marginTop: 1 },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  statCard:  {
    flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.2, borderColor: C.border,
    padding: 11, alignItems: 'center', gap: 5,
  },
  statIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 19, fontWeight: '900', color: C.textPrimary },
  statLabel: { fontSize: 10, color: C.textMuted, textAlign: 'center', fontWeight: '600', letterSpacing: 0.4 },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 14, gap: 10,
  },
  viewToggle:    { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.2, borderColor: C.border, overflow: 'hidden', padding: 2 },
  viewBtn:       { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  viewBtnActive: { backgroundColor: C.accent },
  viewBtnText:   { fontSize: 13, fontWeight: '700', color: C.textSec },
  downloadBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.accentSoft, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: C.accent + '40' },
  downloadText:  { fontSize: 13, fontWeight: '700', color: C.accent },

  /* ── Weekly grid ── */
  timeCol:       { width: 60, paddingTop: 40, position: 'relative' },
  timeSlotLabel: { position: 'absolute', right: 8, width: 56 },
  timeText:      { fontSize: 9, color: C.textMuted, textAlign: 'right', fontWeight: '700', letterSpacing: 0.3 },
  dayCol:        { borderLeftWidth: 1, borderLeftColor: C.border },
  dayHeader: {
    height: 44, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border, position: 'relative', backgroundColor: C.surfaceEl,
  },
  dayHeaderActive: { backgroundColor: C.accentGlow },
  dayName:         { fontSize: 13, fontWeight: '900', color: C.textSec, letterSpacing: 0.5 },
  todayUnderline:  { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, backgroundColor: C.accent, borderRadius: 1.5 },
  hourLine:        { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.border + '60' },
  breakStripe:     { position: 'absolute', left: 0, right: 0 },
  classCard: {
    position: 'absolute', left: 3, borderRadius: 10,
    borderLeftWidth: 4, padding: 8, overflow: 'hidden',
  },
  classTypePill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 4 },
  classTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  classSubject:  { fontSize: 12, fontWeight: '700', color: C.textPrimary, lineHeight: 15, marginBottom: 2 },
  classYear:     { fontSize: 10, fontWeight: '600', color: C.textSec, marginBottom: 1 },
  classTime:     { fontSize: 9, color: C.textSec, fontWeight: '500' },
  classRoom:     { fontSize: 9, color: C.textMuted, marginTop: 3 },

  /* ── Daily view ── */
  daySelectorPill: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1.2, borderColor: C.border, alignItems: 'center',
  },
  daySelectorPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  daySelectorText:       { fontSize: 13, fontWeight: '800', color: C.textSec },
  emptyDay:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.textMuted, fontWeight: '500' },
  dailyCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.2, borderColor: C.border,
    borderLeftWidth: 4, padding: 16, marginBottom: 12,
  },
  dailyTimeBlock:  { width: 54, alignItems: 'center' },
  dailyTimeStart:  { fontSize: 12, fontWeight: '800', color: C.textPrimary },
  dailyTimeLine:   { width: 3, flex: 1, marginVertical: 6, minHeight: 28, borderRadius: 1.5 },
  dailyTimeEnd:    { fontSize: 12, fontWeight: '700', color: C.textSec },
  dailySubject:    { fontSize: 17, fontWeight: '800', color: C.textPrimary, marginBottom: 6 },
  dailyYear:       { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 4 },
  dailyCode:       { fontSize: 12, color: C.textMuted },
  dailyMeta:       { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  typeChipText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  durationText:    { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  /* ── List view ── */
  listDayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: C.border,
  },
  listDayName:      { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  listDayCount:     { backgroundColor: C.accentSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  listDayCountText: { fontSize: 11, fontWeight: '700', color: C.accent },
  listEmpty:        { fontSize: 13, color: C.textMuted, paddingVertical: 10, paddingLeft: 4, fontStyle: 'italic' },
  listCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1.2, borderColor: C.border,
    padding: 14, marginBottom: 8,
  },
  listColorDot:  { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  listSubject:   { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  listMeta:      { fontSize: 12, color: C.textSec, marginTop: 3, lineHeight: 16 },
  listTypePill:  { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  listTypeText:  { fontSize: 11, fontWeight: '700' },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.70)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderTopWidth: 1.2, borderTopColor: C.border,
  },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 22 },
  modalHeader:  { borderLeftWidth: 5, paddingLeft: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  modalSubject: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  modalCode:    { fontSize: 14, color: C.textSec, fontWeight: '600' },
  modalClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  modalGrid:    { gap: 14, marginBottom: 24 },
  modalDetailRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalDetailIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalDetailLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  modalDetailValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 2 },
  modalActions:     { flexDirection: 'row', gap: 10 },
  modalBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 },
  modalBtnText:     { fontSize: 14, fontWeight: '700' },

  /* ── Upload feedback ── */
  uploadFeedback: {
    marginTop: 12, backgroundColor: C.surfaceEl, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  fileIconWrap:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName:      { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  fileSize:      { fontSize: 11, color: C.textMuted, marginTop: 1 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressBar:   { height: 4, borderRadius: 2 },
  uploadSuccessText: { fontSize: 12, color: C.green, fontWeight: '600', marginTop: 4 },
});