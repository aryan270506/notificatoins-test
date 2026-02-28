import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';

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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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

const CLASSES = [
  { day: 'Mon', slotIndex: 0, span: 1, title: 'Quantum Mechanics III', sub: 'Dr. Thorne | Lab 402B',      color: '#6366f1', bg: '#6366f118', border: '#6366f1' },
  { day: 'Mon', slotIndex: 3, span: 1, title: 'Linear Algebra',        sub: 'Dr. Patel | Room 301',       color: '#22d3ee', bg: '#22d3ee18', border: '#22d3ee' },
  { day: 'Tue', slotIndex: 1, span: 1, title: 'Thermodynamics',        sub: 'Dr. Roy | Hall B',           color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b' },
  { day: 'Tue', slotIndex: 4, span: 1, title: 'Data Structures',       sub: 'Dr. Kim | Lab 210',          color: '#10b981', bg: '#10b98118', border: '#10b981' },
  { day: 'Wed', slotIndex: 1, span: 1, title: 'AI & Ethics',           sub: 'Dr. Vane | Room 505',        color: '#ffffff', bg: '#1e3b8a',   border: '#3b5fc0' },
  { day: 'Wed', slotIndex: 3, span: 2, title: 'Research Lab',          sub: 'Dr. Singh | Lab A',          color: '#a78bfa', bg: '#a78bfa18', border: '#a78bfa' },
  { day: 'Thu', slotIndex: 0, span: 1, title: 'Fluid Mechanics',       sub: 'Dr. Lim | Hall 3',           color: '#fb7185', bg: '#fb718518', border: '#fb7185' },
  { day: 'Thu', slotIndex: 5, span: 1, title: 'Numerical Methods',     sub: 'Dr. Chen | Room 212',        color: '#34d399', bg: '#34d39918', border: '#34d399' },
  { day: 'Fri', slotIndex: 0, span: 1, title: 'Seminar',               sub: 'Prof. Adams | Auditorium',   color: '#fbbf24', bg: '#fbbf2418', border: '#fbbf24' },
  { day: 'Fri', slotIndex: 3, span: 1, title: 'Project Review',        sub: 'Dr. Thorne | Lab 402B',      color: '#6366f1', bg: '#6366f118', border: '#6366f1' },
];

const CLASS_SLOT_MAP = TIME_SLOTS.reduce((acc, slot, i) => {
  if (slot.type === 'class') acc.push(i);
  return acc;
}, []);

function getCardTop(classSlotIndex) {
  return SLOT_TOPS[CLASS_SLOT_MAP[classSlotIndex]];
}

function getCardHeight(classSlotIndex, span) {
  let h = 0;
  for (let i = 0; i < span; i++) {
    h += getRowHeight(TIME_SLOTS[CLASS_SLOT_MAP[classSlotIndex + i]]);
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
const GridColumn = ({ day, C }) => {
  const dayClasses = CLASSES.filter((c) => c.day === day);
  return (
    <View style={{ width: DAY_COL_WIDTH, height: TOTAL_HEIGHT, position: 'relative' }}>
      {TIME_SLOTS.map((slot, i) => {
        const h   = getRowHeight(slot);
        const bg  = slot.type === 'lunch' ? C.accentBg + '18'
                  : slot.type === 'break' ? C.orangeBg + '18'
                  : 'transparent';
        return (
          <View key={i} style={{
            height: h,
            borderBottomWidth: slot.type === 'class' ? 0.5 : 0,
            borderColor: C.border,
            backgroundColor: bg,
          }} />
        );
      })}

      {dayClasses.map((cls, idx) => {
        const top    = getCardTop(cls.slotIndex);
        const height = getCardHeight(cls.slotIndex, cls.span || 1);
        const isSolid = cls.bg === '#1e3b8a';
        return (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.85}
            style={[
              styles.card,
              { top: top + 2, height, backgroundColor: cls.bg, borderLeftColor: cls.border },
              isSolid && { borderLeftWidth: 0 },
            ]}
          >
            <View style={[styles.cardAccent, { backgroundColor: cls.border }]} />
            <Text style={[styles.cardTitle, { color: cls.color }]} numberOfLines={2}>{cls.title}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{cls.sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentTimetable({ C, onThemeToggle }) {
  const headerScrollRef = useRef(null);
  const bodyScrollRef   = useRef(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      {/* ── Week Bar / Title ── */}
      <View style={[styles.weekBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Timetable</Text>
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

      {/* ── Timetable ── */}
      <View style={styles.tableWrapper}>

        {/* Sticky Day Header */}
        <View style={{ flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.border }}>
          <View style={{ width: TIME_COL_WIDTH }} />
          <ScrollView
            ref={headerScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {DAYS.map((day) => (
              <View key={day} style={[styles.dayHeader, { width: DAY_COL_WIDTH, borderLeftColor: C.border }]}>
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
              headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
            }}
          >
            <View style={{ flexDirection: 'row' }}>
              <TimeColumn C={C} />
              {DAYS.map((day) => (
                <GridColumn key={day} day={day} C={C} />
              ))}
            </View>
          </ScrollView>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1 },

  weekBar: {
    height: 60, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title:    { fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  themeBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  tableWrapper: { flex: 1, overflow: 'hidden' },

  dayHeader: { paddingVertical: 10, alignItems: 'center', borderLeftWidth: 0.5 },
  dayText:   { fontWeight: '600', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },

  timeCell:  { justifyContent: 'flex-start', alignItems: 'center', paddingTop: 6, borderBottomWidth: 0.5 },
  timeText:  { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
  lunchBadge:{ borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  lunchText: { fontSize: 9, fontWeight: '600' },
  breakBadge:{ borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  breakText: { fontSize: 8, fontWeight: '600' },

  card: {
    position: 'absolute', left: 4, right: 4,
    borderRadius: 10, padding: 8, borderLeftWidth: 3, overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', top: 0, right: 0, width: 3, bottom: 0,
    opacity: 0.3, borderTopRightRadius: 10, borderBottomRightRadius: 10,
  },
  cardTitle: { fontWeight: '700', fontSize: 12, lineHeight: 16, marginBottom: 3 },
  cardSub:   { fontSize: 10, color: '#64748b', fontWeight: '500' },
});