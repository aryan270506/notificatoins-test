import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';

// ─── Data ─────────────────────────────────────────────────────────────────────
const getSchedule = (C) => [
  {
    day: 'MON', date: 'OCT 23',
    events: [
      { id: 'mon1', title: 'Advanced Calculus', startTime: '10:30', endTime: '11:30 AM', accentColor: C.blueLight },
      { id: 'mon2', title: 'Physics Lab', startTime: '01:15', endTime: '03:15 PM', type: 'LAB', location: 'Science Wing 4', accentColor: '#6366f1' },
    ],
  },
  {
    day: 'TUE', date: 'OCT 24',
    events: [
      { id: 'tue1', title: 'Data Structures Lab', startTime: '10:30', endTime: '12:30 PM', type: 'LAB', hasJoinButton: true, accentColor: C.teal },
    ],
  },
  {
    day: 'WED', date: 'OCT 25',
    events: [
      { id: 'wed1', title: 'System Arch.', startTime: '1:15', endTime: '2:15 PM', accentColor: C.blueLight },
    ],
  },
  {
    day: 'THU', date: 'OCT 26',
    events: [
      { id: 'thu1', title: 'Database Lab', startTime: '10:30', endTime: '12:30 PM', type: 'LAB', accentColor: C.teal },
    ],
  },
  {
    day: 'FRI', date: 'OCT 27',
    events: [
      { id: 'fri1', title: 'Research Lab', startTime: '03:30', endTime: '05:30 PM', type: 'LAB', accentColor: C.blueLight },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const LabBadge = ({ color }) => (
  <View style={[{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, backgroundColor: color + '33', borderColor: color }]}>
    <Text style={{ fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color }}> LAB</Text>
  </View>
);

const ClassCard = ({ event, isActive, compact, C, s }) => (
  <View style={[s.classCard, { borderLeftColor: event.accentColor }, isActive && s.classCardActive, compact && s.classCardCompact]}>
    <View style={s.classCardHeader}>
      <Text style={[s.classTitle, compact && s.classTitleCompact]} numberOfLines={compact ? 2 : 1}>
        {event.title}
      </Text>
      {event.type === 'LAB' && <LabBadge color={event.accentColor} />}
    </View>
    <Text style={[s.classTime, compact && s.classTimeCompact]}>
      {event.startTime} – {event.endTime}
    </Text>
    {event.location && !compact && (
      <View style={s.locationRow}>
        <Text style={s.locationPin}>📍</Text>
        <Text style={[s.locationText, { color: event.accentColor }]}>{event.location}</Text>
      </View>
    )}
    {event.hasJoinButton && !compact && (
      <TouchableOpacity style={[s.joinBtn, { backgroundColor: event.accentColor }]}>
        <Text style={s.joinBtnText}>Join Class</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Weekly Grid ──────────────────────────────────────────────────────────────
const WeeklyGrid = ({ colWidth, timeColWidth, C, s }) => {
  const SCHEDULE = getSchedule(C);
  return (
    <View>
      <View style={s.gridHeader}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeColLabel}>TIME</Text>
        </View>
        {SCHEDULE.map((day, i) => (
          <View key={day.day} style={[s.dayHeaderCol, { width: colWidth }, i === 1 && s.dayHeaderActive]}>
            <Text style={[s.dayHeaderDay, i === 1 && s.dayHeaderDayActive]}>{day.day}</Text>
            <Text style={[s.dayHeaderDate, i === 1 && s.dayHeaderDateActive]}>{day.date}</Text>
          </View>
        ))}
      </View>

      {/* 10:00 AM */}
      <View style={s.timeRow}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeLabel}>10:00 AM</Text>
        </View>
        {SCHEDULE.map((day) => (
          <View key={day.day} style={[s.cellBlock, { width: colWidth }]} />
        ))}
      </View>

      {/* 10:30 AM */}
      <View style={s.timeRow}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeLabel}>10:30 AM</Text>
        </View>
        {SCHEDULE.map((day) => {
          const evt = day.events.find((e) => e.startTime === '10:30');
          return (
            <View key={day.day} style={[s.cellBlock, { width: colWidth }]}>
              {evt && <ClassCard event={evt} isActive={day.day === 'TUE'} compact={colWidth < 100} C={C} s={s} />}
            </View>
          );
        })}
      </View>

      <View style={s.breakRow}>
        <Text style={s.breakText}>🍴  LUNCH BREAK  (12:30 – 1:15)</Text>
      </View>

      {/* 1:15 PM */}
      <View style={s.timeRow}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeLabel}>01:15 PM</Text>
        </View>
        {SCHEDULE.map((day) => {
          const evt = day.events.find((e) => e.startTime === '01:15' || e.startTime === '1:15');
          return (
            <View key={day.day} style={[s.cellBlock, { width: colWidth }]}>
              {evt && <ClassCard event={evt} compact={colWidth < 100} C={C} s={s} />}
            </View>
          );
        })}
      </View>

      <View style={[s.breakRow, { backgroundColor: 'transparent' }]}>
        <Text style={[s.breakText, { fontSize: 10 }]}>SHORT BREAK  (3:15 – 3:30)</Text>
      </View>

      {/* 3:30 PM */}
      <View style={s.timeRow}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeLabel}>03:30 PM</Text>
        </View>
        {SCHEDULE.map((day) => {
          const evt = day.events.find((e) => e.startTime === '03:30');
          return (
            <View key={day.day} style={[s.cellBlock, { width: colWidth }]}>
              {evt && <ClassCard event={evt} compact={colWidth < 100} C={C} s={s} />}
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
};

// ─── Daily/List View ──────────────────────────────────────────────────────────
const DailyList = ({ C, s }) => {
  const SCHEDULE = getSchedule(C);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      {SCHEDULE.map((day) => (
        <View key={day.day}>
          <View style={s.listDayHeader}>
            <Text style={s.listDayLabel}>{day.day}</Text>
            <Text style={s.listDayDate}>{day.date}</Text>
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            {day.events.length > 0
              ? day.events.map((evt) => <ClassCard key={evt.id} event={evt} C={C} s={s} />)
              : <Text style={{ color: C.muted, fontSize: 13, fontStyle: 'italic', paddingLeft: 4 }}>No classes</Text>
            }
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ParentSchedule({ onMenuOpen }) {
  const { C } = useTheme();
  const s = makeStyles(C);

  const [viewMode] = useState('Weekly');
  const [containerWidth, setContainerWidth] = useState(0);

  const timeColWidth = containerWidth < 400 ? 58 : 80;
  const colWidth = containerWidth > 0
    ? Math.max(80, (containerWidth - timeColWidth) / 5)
    : 120;

  return (
    <View
      style={s.root}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Top bar */}
      <View style={s.topBar}>
        {containerWidth < 768 && (
          <TouchableOpacity
            onPress={() => onMenuOpen && onMenuOpen()}
            style={{ marginRight: 12 }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 24, color: C.white }}>☰</Text>
          </TouchableOpacity>
        )}

        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          
          {containerWidth > 500 && (
            <View style={s.profilePill}>
              <View>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: '600', textAlign: 'right' }}></Text>
               <Text
                    style={{
                      color: C.white,
                      fontSize: 22,
                      textAlign: 'right',
                      fontWeight: '800',   // 🔥 bold
                    }}
                  >
                    Schedule
                  </Text>

              </View>
              
            </View>
          )}
        </View>
      </View>

      {/* Page header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.breadcrumb}>
            ACADEMIC YEAR 2023/24 / <Text style={{ color: C.teal, fontWeight: '700' }}>SEMESTER 1</Text>
          </Text>
          <Text style={s.pageTitle}>Weekly Timetable</Text>
          <Text style={{ color: C.sub, fontSize: 12 }}>Week 12: Oct 23rd – Oct 27th</Text>
        </View>
      </View>

      {/* Schedule content */}
      <View style={s.scheduleBody}>
        {viewMode === 'Weekly' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <WeeklyGrid colWidth={colWidth} timeColWidth={timeColWidth} C={C} s={s} />
            </ScrollView>
          </ScrollView>
        ) : (
          <DailyList C={C} s={s} />
        )}
      </View>
    </View>
  );
}

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
function makeStyles(C) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    topBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
      backgroundColor: C.sidebar, gap: 10,
    },
    searchBar: {
      flex: 1, backgroundColor: C.card, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: C.cardBorder,
    },
    topIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    profilePill: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
    avatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center',
    },

    pageHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: 16, paddingVertical: 14, flexWrap: 'wrap', gap: 10,
    },
    breadcrumb: { color: C.sub, fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
    pageTitle: { color: C.white, fontSize: 22, fontWeight: '800', marginBottom: 2 },

    scheduleBody: { flex: 1 },

    gridHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    timeCol: { paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' },
    timeColLabel: { color: C.sub, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    dayHeaderCol: {
      paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
      borderLeftWidth: 1, borderLeftColor: C.cardBorder,
    },
    dayHeaderActive: { borderBottomWidth: 2, borderBottomColor: C.teal },
    dayHeaderDay: { color: C.sub, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    dayHeaderDayActive: { color: C.white },
    dayHeaderDate: { color: C.muted, fontSize: 9, marginTop: 2 },
    dayHeaderDateActive: { color: C.teal },
    timeRow: {
      flexDirection: 'row', minHeight: 86,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    timeLabel: { color: C.sub, fontSize: 9, paddingTop: 10, paddingHorizontal: 10 },
    cellBlock: { borderLeftWidth: 1, borderLeftColor: C.cardBorder, padding: 5 },
    breakRow: {
      backgroundColor: C.sidebar, paddingVertical: 8, paddingHorizontal: 20,
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.cardBorder, alignItems: 'center',
    },
    breakText: { color: C.sub, fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },

    classCard: {
      backgroundColor: C.card, borderRadius: 10,
      padding: 9, borderLeftWidth: 3, flex: 1, gap: 3,
      borderWidth: 1, borderColor: C.cardBorder,
    },
    classCardActive: { borderColor: C.teal + '44' },
    classCardCompact: { padding: 5 },
    classCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 },
    classTitle: { color: C.white, fontSize: 12, fontWeight: '700', flex: 1 },
    classTitleCompact: { fontSize: 10 },
    classTime: { color: C.sub, fontSize: 10 },
    classTimeCompact: { fontSize: 9 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    locationPin: { fontSize: 10 },
    locationText: { fontSize: 10, fontWeight: '500' },
    joinBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start', marginTop: 5 },
    joinBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    listDayHeader: {
      flexDirection: 'row', alignItems: 'baseline', gap: 10,
      paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    listDayLabel: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    listDayDate: { color: C.sub, fontSize: 12 },
  });
}