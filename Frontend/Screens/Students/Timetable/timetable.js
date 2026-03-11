import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Time Slot Definitions ───────────────────────────────────────────────────
const TIME_SLOTS = [
  { label: '10:30', endLabel: '11:30', duration: 60, type: 'class'  },
  { label: '11:30', endLabel: '12:30', duration: 60, type: 'class'  },
  { label: '12:30', endLabel: '13:15', duration: 45, type: 'lunch'  },
  { label: '13:15', endLabel: '14:15', duration: 60, type: 'class'  },
  { label: '14:15', endLabel: '15:15', duration: 60, type: 'class'  },
  { label: '15:15', endLabel: '15:30', duration: 15, type: 'break'  },
  { label: '15:30', endLabel: '16:30', duration: 60, type: 'class'  },
  { label: '16:30', endLabel: '17:30', duration: 60, type: 'class'  },
];

const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Maps timetable slot IDs (t1–t6) to the correct index in TIME_SLOTS
// t1→idx0, t2→idx1, (lunch→idx2 skipped), t3→idx3, t4→idx4, (break→idx5 skipped), t5→idx6, t6→idx7
const SLOT_MAP = { t1: 0, t2: 1, t3: 3, t4: 4, t5: 6, t6: 7 };

const COLOR_MAP = {
  teal:   '#14b8a6',
  blue:   '#3b82f6',
  purple: '#a855f7',
  orange: '#f59e0b',
  green:  '#22c55e',
  pink:   '#ec4899',
};

// ─── Convert backend timetable document → card array for the grid ─────────────
function convertBackendToClasses(dbTimetable) {
  if (!dbTimetable) return [];
  const classes = [];

  DAYS_FULL.forEach((day, dayIdx) => {
    const dayData = dbTimetable[day];
    if (!dayData || typeof dayData !== 'object') return;

    Object.entries(dayData).forEach(([slotId, slot]) => {
      if (!slot || !slot.subject) return;

      const slotIndex = SLOT_MAP[slotId];
      if (slotIndex === undefined) return;   // ignore unknown slot IDs

      const color = COLOR_MAP[slot.color] || COLOR_MAP.teal;

      classes.push({
        day:      DAYS[dayIdx],
        slotIndex,
        span:     1,
        title:    slot.subject,
        sub:      `${slot.teacherName || 'Unknown'} | ${slot.room || 'Room TBA'}`,
        color,
        bg:       color + '18',
        border:   color,
      });
    });
  });

  return classes;
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const PX_PER_MIN       = 1.3;
const LUNCH_ROW_HEIGHT = 40;
const BREAK_ROW_HEIGHT = 28;

function getRowHeight(slot) {
  if (slot.type === 'lunch') return LUNCH_ROW_HEIGHT;
  if (slot.type === 'break') return BREAK_ROW_HEIGHT;
  return slot.duration * PX_PER_MIN;
}

function getSlotTops() {
  let tops = [], y = 0;
  for (const slot of TIME_SLOTS) { tops.push(y); y += getRowHeight(slot); }
  return tops;
}

const SLOT_TOPS    = getSlotTops();
const TOTAL_HEIGHT = SLOT_TOPS[TIME_SLOTS.length - 1] + getRowHeight(TIME_SLOTS[TIME_SLOTS.length - 1]);
const TIME_COL_WIDTH = 70;
const DAY_COL_WIDTH  = Math.max(130, (SCREEN_WIDTH - TIME_COL_WIDTH) / DAYS.length);

// Ordered list of TIME_SLOTS indices that represent actual class periods
const CLASS_SLOT_MAP = TIME_SLOTS.reduce((acc, slot, i) => {
  if (slot.type === 'class') acc.push(i);
  return acc;
}, []);

function getCardTop(classSlotIndex) {
  // classSlotIndex is from SLOT_MAP (0, 1, 3, 4, 6, 7)
  // We need to find its position within CLASS_SLOT_MAP
  const classPosition = CLASS_SLOT_MAP.indexOf(classSlotIndex);
  if (classPosition === -1) return 0; // Not found
  return SLOT_TOPS[CLASS_SLOT_MAP[classPosition]];
}

function getCardHeight(classSlotIndex, span) {
  // classSlotIndex is from SLOT_MAP (0, 1, 3, 4, 6, 7)
  // We need to find its position within CLASS_SLOT_MAP
  const classPosition = CLASS_SLOT_MAP.indexOf(classSlotIndex);
  if (classPosition === -1) return 40; // Not found, return default height
  
  let h = 0;
  for (let i = 0; i < span; i++) {
    const slotIdx = CLASS_SLOT_MAP[classPosition + i];
    if (slotIdx === undefined) break;
    h += getRowHeight(TIME_SLOTS[slotIdx]);
  }
  return h - 4;
}

// ── TimeColumn ────────────────────────────────────────────────────────────────
const TimeColumn = ({ C }) => (
  <View style={{ width: TIME_COL_WIDTH }}>
    {TIME_SLOTS.map((slot, i) => {
      const h = getRowHeight(slot);
      return (
        <View key={i} style={[styles.timeCell, { height: h, borderBottomColor: C.border }]}>
          {slot.type === 'lunch' ? (
            <View style={[styles.lunchBadge, { backgroundColor: C.accentBg }]}>
              <Text style={[styles.lunchText, { color: C.accent }]}>🍽 Lunch</Text>
            </View>
          ) : slot.type === 'break' ? (
            <View style={[styles.breakBadge, { backgroundColor: C.orangeBg }]}>
              <Text style={[styles.breakText, { color: C.orange }]}>☕ Break</Text>
            </View>
          ) : (
            <Text style={[styles.timeText, { color: C.textMuted }]}>{slot.label}</Text>
          )}
        </View>
      );
    })}
  </View>
);

// ── GridColumn ────────────────────────────────────────────────────────────────
const GridColumn = ({ day, C, classes = [] }) => {
  const dayClasses = classes.filter((c) => c.day === day);
  return (
    <View style={{ width: DAY_COL_WIDTH, height: TOTAL_HEIGHT, position: 'relative' }}>
      {TIME_SLOTS.map((slot, i) => {
        const h   = getRowHeight(slot);
        const bg  = slot.type === 'lunch' ? C.accentBg + '18'
                  : slot.type === 'break' ? C.orangeBg + '18'
                  : 'transparent';
        return (
          <View
            key={i}
            style={{
              height: h,
              borderBottomWidth: slot.type === 'class' ? 0.5 : 0,
              borderColor: C.border,
              backgroundColor: bg,
            }}
          />
        );
      })}

      {dayClasses.map((cls, idx) => {
        const top    = getCardTop(cls.slotIndex);
        const height = getCardHeight(cls.slotIndex, cls.span || 1);
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            style={[
              styles.card,
              { top: top + 2, height, backgroundColor: cls.bg, borderLeftColor: cls.border },
            ]}
          >
            <View style={[styles.cardAccent, { backgroundColor: cls.border }]} />
            <Text style={[styles.cardTitle, { color: cls.color }]} numberOfLines={3}>
              {cls.title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={2}>{cls.sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ C, message }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
    <Text style={{ color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
      No Timetable Found
    </Text>
    <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
      {message || 'Your timetable has not been assigned yet.\nPlease contact your admin.'}
    </Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentTimetable({ C, onThemeToggle }) {
  const headerScrollRef = useRef(null);
  const bodyScrollRef   = useRef(null);

  const [classes,     setClasses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [studentInfo, setStudentInfo] = useState(null);

  // ── Fetch timetable from backend ──────────────────────────────────────────
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // ── 1. Read student profile from AsyncStorage ──────────────────────────
      const raw = await AsyncStorage.getItem('studentData');
      let student = null;
      if (raw) {
        student = JSON.parse(raw);
      } else {
        // Fallback: try getting basic user info
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const res = await axiosInstance.get(`/students/${userId}`);
          student = res.data;
          // Extract batch if needed
          if (student && !student.batch && student.roll_no) {
            const parts = student.roll_no.split('-');
            student.batch = parts[1] || null;
          }
        }
      }

      if (!student) {
        setErrorMsg('Student profile not found. Please log in again.');
        setLoading(false);
        return;
      }

      const { year, division, batch } = student;

      setStudentInfo({ year, division, batch });
      console.log(`🎓 Student profile — year=${year}  division=${division}  batch=${batch}`);

      // ── 2. Guard: all three params must be present ─────────────────────────
      if (!year || !division || !batch) {
        setErrorMsg(
          `Incomplete profile (year=${year}, division=${division}, batch=${batch}).\n` +
          'Please contact admin to update your record.'
        );
        setLoading(false);
        return;
      }

      // ── 3. Call backend ────────────────────────────────────────────────────
      // Backend route: GET /api/timetable?year=&division=&batch=
      // The backend expects division in UPPERCASE and batch in UPPERCASE.
      // Login.js already uppercases division; batch comes from roll_no (e.g. "A1").
      console.log(`📡 GET /timetable  year=${year}  division=${division}  batch=${batch}`);

      const response = await axiosInstance.get('/timetable', {
        params: {
          year,
          division: division.toUpperCase(),
          batch:    batch.toUpperCase(),
        },
      });

      console.log('📥 Timetable response:', JSON.stringify(response.data, null, 2));

      // ── 4. Handle response ────────────────────────────────────────────────
      if (response.data.success && response.data.data) {
        const converted = convertBackendToClasses(response.data.data);
        console.log(`✅ Converted ${converted.length} class cards from timetable`);
        setClasses(converted);

        if (converted.length === 0) {
          setErrorMsg('Your timetable exists but has no classes assigned yet.');
        }
      } else {
        // success: true but data: null → timetable not created yet for this batch
        console.warn('⚠️ No timetable document found for this batch');
        setClasses([]);
        setErrorMsg(
          `No timetable found for Year ${year} / Division ${division} / Batch ${batch}.\n` +
          'Please ask your admin to assign your timetable.'
        );
      }
    } catch (err) {
      console.error('❌ fetchTimetable error:', err?.response?.data || err.message || err);
      setClasses([]);
      setErrorMsg('Failed to load timetable. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchTimetable();
  }, []);

  // Re-fetch whenever screen is focused (e.g. after admin updates timetable)
  useFocusEffect(
    React.useCallback(() => {
      fetchTimetable();
    }, [])
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={[styles.weekBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Timetable</Text>
          {studentInfo && (
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
              Year {studentInfo.year} · Div {studentInfo.division} · Batch {studentInfo.batch}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Refresh button */}
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
            onPress={fetchTimetable}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>🔄</Text>
          </TouchableOpacity>
          {onThemeToggle && (
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
              onPress={onThemeToggle}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{C.moonIcon}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading overlay ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ color: C.textMuted, marginTop: 10, fontSize: 13 }}>
            Loading your timetable…
          </Text>
        </View>
      )}

      {/* ── Error / empty state ── */}
      {!loading && errorMsg ? (
        <EmptyState C={C} message={errorMsg} />
      ) : null}

      {/* ── Timetable grid ── */}
      {!loading && !errorMsg && (
        <View style={styles.tableWrapper}>

          {/* Sticky Day Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: C.card,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}>
            <View style={{ width: TIME_COL_WIDTH }} />
            <ScrollView
              ref={headerScrollRef}
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {DAYS.map((day) => (
                <View
                  key={day}
                  style={[styles.dayHeader, { width: DAY_COL_WIDTH, borderLeftColor: C.border }]}
                >
                  <Text style={[styles.dayText, { color: C.textMuted }]}>{day}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Body */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <ScrollView
              ref={bodyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                headerScrollRef.current?.scrollTo({
                  x: e.nativeEvent.contentOffset.x,
                  animated: false,
                });
              }}
            >
              <View style={{ flexDirection: 'row' }}>
                <TimeColumn C={C} />
                {DAYS.map((day) => (
                  <GridColumn key={day} day={day} C={C} classes={classes} />
                ))}
              </View>
            </ScrollView>
          </ScrollView>

        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1 },

  weekBar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title:    { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  themeBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableWrapper: { flex: 1, overflow: 'hidden' },

  dayHeader: {
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 0.5,
  },
  dayText: { fontWeight: '600', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },

  timeCell: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    borderBottomWidth: 0.5,
  },
  timeText:   { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
  lunchBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  lunchText:  { fontSize: 9, fontWeight: '600' },
  breakBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  breakText:  { fontSize: 8, fontWeight: '600' },

  card: {
    position: 'absolute', left: 4, right: 4,
    borderRadius: 10, padding: 6, borderLeftWidth: 3, overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  cardAccent: {
    position: 'absolute', top: 0, right: 0, width: 3, bottom: 0,
    opacity: 0.3, borderTopRightRadius: 10, borderBottomRightRadius: 10,
  },
  cardTitle: { fontWeight: '700', fontSize: 11, lineHeight: 14, marginBottom: 2, marginRight: 2 },
  cardSub:   { fontSize: 9, color: '#64748b', fontWeight: '500' },
});