import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';
import axiosInstance from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// ─── Sub-components ───────────────────────────────────────────────────────────
const LabBadge = ({ color }) => (
  <View style={[{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, backgroundColor: color + '33', borderColor: color }]}>
    <Text style={{ fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color }}> LAB</Text>
  </View>
);

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || '').trim());

// ─── Weekly Grid (from Backend Data) ──────────────────────────────────────────
const WeeklyGridFromData = ({ colWidth, timeColWidth, C, s, timetable }) => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SLOT_TIMES = {
    t1: { startTime: '10:30', endTime: '11:30', label: '10:30 AM' },
    t2: { startTime: '11:30', endTime: '12:30', label: '11:30 AM' },
    t3: { startTime: '1:15', endTime: '2:15', label: '01:15 PM' },
    t4: { startTime: '2:15', endTime: '3:15', label: '02:15 PM' },
    t5: { startTime: '3:30', endTime: '4:30', label: '03:30 PM' },
    t6: { startTime: '4:30', endTime: '5:30', label: '04:30 PM' },
  };

  const colorMap = {
    teal: C.teal,
    blue: C.blueLight,
    purple: '#a78bfa',
    orange: C.orange,
    green: '#22c55e',
    pink: '#f472b6',
  };

  const renderSlot = (day, slotId) => {
    if (!timetable?.[day]?.[slotId]) {
      return null;
    }
    
    const slot = timetable[day][slotId];
    const isLab = slot.subject.toLowerCase().includes('lab');
    const times = SLOT_TIMES[slotId];
    const accentColor = colorMap[slot.color] || C.teal;

    return (
      <View style={[s.classCard, { borderLeftColor: accentColor }]}>
        <View style={s.classCardHeader}>
          <Text style={[s.classTitle, { flex: 1 }]} numberOfLines={2}>
            {slot.subject}
          </Text>
          {isLab && <LabBadge color={accentColor} />}
        </View>
        <Text style={s.classTime}>
          {times.startTime} – {times.endTime}
        </Text>
        {slot.room && (
          <View style={s.locationRow}>
            <Text style={s.locationPin}>📍</Text>
            <Text style={[s.locationText, { color: accentColor }]}>{slot.room}</Text>
          </View>
        )}
        {slot.teacherName && (
          <Text style={[s.classTime, { fontSize: 8, marginTop: 4 }]}>
            👨‍🏫 {slot.teacherName}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View>
      <View style={s.gridHeader}>
        <View style={[s.timeCol, { width: timeColWidth }]}>
          <Text style={s.timeColLabel}>TIME</Text>
        </View>
        {DAYS.map((day, i) => (
          <View key={day} style={[s.dayHeaderCol, { width: colWidth }, i === 1 && s.dayHeaderActive]}>
            <Text style={[s.dayHeaderDay, i === 1 && s.dayHeaderDayActive]}>{DAY_SHORT[i]}</Text>
            <Text style={[s.dayHeaderDate, i === 1 && s.dayHeaderDateActive]}>—</Text>
          </View>
        ))}
      </View>

      {Object.keys(SLOT_TIMES).map((slotId) => {
        const times = SLOT_TIMES[slotId];
        return (
          <View key={slotId} style={s.timeRow}>
            <View style={[s.timeCol, { width: timeColWidth }]}>
              <Text style={s.timeLabel}>{times.label}</Text>
            </View>
            {DAYS.map((day) => (
              <View key={`${day}-${slotId}`} style={[s.cellBlock, { width: colWidth }]}>
                {renderSlot(day, slotId)}
              </View>
            ))}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </View>
  );
};

// ─── Daily List (from Backend Data) ─────────────────────────────────────────
const DailyListFromData = ({ C, s, timetable }) => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SLOT_TIMES = {
    t1: { startTime: '10:30', endTime: '11:30 AM' },
    t2: { startTime: '11:30', endTime: '12:30 PM' },
    t3: { startTime: '1:15', endTime: '2:15 PM' },
    t4: { startTime: '2:15', endTime: '3:15 PM' },
    t5: { startTime: '3:30', endTime: '4:30 PM' },
    t6: { startTime: '4:30', endTime: '5:30 PM' },
  };

  const colorMap = {
    teal: C.teal,
    blue: C.blueLight,
    purple: '#a78bfa',
    orange: C.orange,
    green: '#22c55e',
    pink: '#f472b6',
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
      {DAYS.map((day) => (
        <View key={day}>
          <View style={s.listDayHeader}>
            <Text style={s.listDayLabel}>{day}</Text>
            <Text style={s.listDayDate}>—</Text>
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            {!timetable?.[day] ? (
              <Text style={{ color: C.muted, fontSize: 13, fontStyle: 'italic', paddingLeft: 4 }}>No classes</Text>
            ) : (
              Object.keys(timetable[day]).map((slotId) => {
                const slot = timetable[day][slotId];
                if (!slot) return null;

                const isLab = slot.subject.toLowerCase().includes('lab');
                const times = SLOT_TIMES[slotId];
                const accentColor = colorMap[slot.color] || C.teal;

                return (
                  <View key={slotId} style={[s.classCard, { borderLeftColor: accentColor }]}>
                    <View style={s.classCardHeader}>
                      <Text style={[s.classTitle]} numberOfLines={2}>
                        {slot.subject}
                      </Text>
                      {isLab && <LabBadge color={accentColor} />}
                    </View>
                    <Text style={s.classTime}>
                      {times.startTime} – {times.endTime}
                    </Text>
                    {slot.room && (
                      <View style={s.locationRow}>
                        <Text style={s.locationPin}>📍</Text>
                        <Text style={[s.locationText, { color: accentColor }]}>{slot.room}</Text>
                      </View>
                    )}
                    {slot.teacherName && (
                      <Text style={[s.classTime, { fontSize: 8, marginTop: 4 }]}>
                        👨‍🏫 {slot.teacherName}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
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
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTimetable();
  }, []);

const fetchTimetable = async () => {
  try {
    setLoading(true);
    setError(null);

    // ── Read every possible key that login.js might have saved ───────────────
    const parentId =
      (await AsyncStorage.getItem('parentId')) ||
      (await AsyncStorage.getItem('userId'));

    console.log("🔑 parentId from storage:", parentId);

    if (!parentId) {
      setError("Parent ID not found. Please log in again.");
      return;
    }

    const parentIdStr = String(parentId).trim();

    // Support both formats:
    // 1) custom parent id (e.g. 3f7a2b9c) -> /parents/timetable/:parentId
    // 2) Mongo _id (24-hex)             -> /timetable/parent/:parentId
    const primaryEndpoint = isMongoObjectId(parentIdStr)
      ? `/timetable/parent/${parentIdStr}`
      : `/parents/timetable/${parentIdStr}`;

    const fallbackEndpoint = isMongoObjectId(parentIdStr)
      ? `/parents/timetable/${parentIdStr}`
      : `/timetable/parent/${parentIdStr}`;

    let response;
    try {
      response = await axiosInstance.get(primaryEndpoint);
    } catch (primaryErr) {
      const status = primaryErr?.response?.status;
      if (status === 400 || status === 404) {
        response = await axiosInstance.get(fallbackEndpoint);
      } else {
        throw primaryErr;
      }
    }
    console.log("RESPONSE:", response.data);

    if (response.data?.success) {
      setTimetableData(response.data.data);
    } else {
      setError(response.data?.message || "Failed to fetch timetable");
    }

  } catch (err) {
    console.log("FULL ERROR:", err.response?.data);
    console.log("STATUS:", err.response?.status);
    if (err.response?.status === 404) {
      setError("Timetable not found for your child's class.");
    } else {
      setError(err.response?.data?.message || err.message);
    }
  } finally {
    setLoading(false);
  }
};

  // Helper: Convert timetable slot data to event format for rendering
  const convertTimetableToEvents = () => {
    if (!timetableData?.timetable) return [];
    
    const tt = timetableData.timetable;
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const SLOT_TIMES = {
      t1: { startTime: '10:30', endTime: '11:30 AM' },
      t2: { startTime: '11:30', endTime: '12:30 PM' },
      t3: { startTime: '1:15', endTime: '2:15 PM' },
      t4: { startTime: '2:15', endTime: '3:15 PM' },
      t5: { startTime: '3:30', endTime: '4:30 PM' },
      t6: { startTime: '4:30', endTime: '5:30 PM' },
    };

    const events = [];
    const colorMap = {
      teal: C.teal,
      blue: C.blueLight,
      purple: '#a78bfa',
      orange: C.orange,
      green: '#22c55e',
      pink: '#f472b6',
    };

    DAYS.forEach((day) => {
      if (!tt[day]) return;
      
      Object.keys(tt[day]).forEach((slotId) => {
        const slot = tt[day][slotId];
        if (!slot) return;

        const times = SLOT_TIMES[slotId] || { startTime: '', endTime: '' };
        const isLab = slot.subject.toLowerCase().includes('lab');

        events.push({
          id: `${day}-${slotId}`,
          day: day.substring(0, 3).toUpperCase(),
          title: slot.subject,
          startTime: times.startTime,
          endTime: times.endTime,
          type: isLab ? 'LAB' : undefined,
          location: slot.room || undefined,
          accentColor: colorMap[slot.color] || C.teal,
          teacherName: slot.teacherName,
        });
      });
    });

    return events;
  };

  const isMobile = containerWidth < 768;
  const timeColWidth = containerWidth < 400 ? 50 : 70;
  const colWidth = containerWidth > 0
    ? Math.max(isMobile ? 70 : 80, (containerWidth - timeColWidth) / 5)
    : 110;

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
            <Text style={{ fontSize: 24, color: C.white }}></Text>
          </TouchableOpacity>
        )}

        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          
          {containerWidth > 500 && (
            <View style={s.profilePill}>
              <View>
                <Text style={{ color: C.white, fontSize: 13, fontWeight: '600', textAlign: 'right' }}>
                  {loading ? 'Loading...' : timetableData?.studentName || 'Schedule'}
                </Text>
               <Text
                    style={{
                      color: C.white,
                      fontSize: 22,
                      textAlign: 'right',
                      fontWeight: '800',
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
          {error ? (
            <Text style={{ color: C.orange, fontSize: 12 }}>❌ {error}</Text>
          ) : (
            <Text style={{ color: C.sub, fontSize: 12 }}>
              {timetableData?.batch ? `Batch: ${timetableData.batch}` : 'Loading...'}
            </Text>
          )}
        </View>
      </View>

      {/* Schedule content */}
      <View style={[s.scheduleBody, isMobile && { paddingHorizontal: 0 }]}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: C.white }}>Loading timetable...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: C.red, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : (
          viewMode === 'Weekly' ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={isMobile} 
              scrollEventThrottle={16}
              contentContainerStyle={isMobile && { minWidth: '100%' }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <WeeklyGridFromData 
                  colWidth={colWidth} 
                  timeColWidth={timeColWidth} 
                  C={C} 
                  s={s}
                  timetable={timetableData?.timetable}
                />
              </ScrollView>
            </ScrollView>
          ) : (
            <DailyListFromData C={C} s={s} timetable={timetableData?.timetable} />
          )
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

    scheduleBody: { flex: 1, overflow: 'hidden' },

    gridHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    timeCol: { paddingHorizontal: 8, paddingVertical: 8, justifyContent: 'center' },
    timeColLabel: { color: C.sub, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
    dayHeaderCol: {
      paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center',
      borderLeftWidth: 1, borderLeftColor: C.cardBorder,
    },
    dayHeaderActive: { borderBottomWidth: 2, borderBottomColor: C.teal },
    dayHeaderDay: { color: C.sub, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    dayHeaderDayActive: { color: C.white },
    dayHeaderDate: { color: C.muted, fontSize: 8, marginTop: 1 },
    dayHeaderDateActive: { color: C.teal },
    timeRow: {
      flexDirection: 'row', minHeight: 80,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    timeLabel: { color: C.sub, fontSize: 8, paddingTop: 8, paddingHorizontal: 8 },
    cellBlock: { borderLeftWidth: 1, borderLeftColor: C.cardBorder, padding: 4 },
    breakRow: {
      backgroundColor: C.sidebar, paddingVertical: 6, paddingHorizontal: 16,
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.cardBorder, alignItems: 'center',
    },
    breakText: { color: C.sub, fontSize: 9, letterSpacing: 1, fontWeight: '600' },

    classCard: {
      backgroundColor: C.card, borderRadius: 8,
      padding: 8, borderLeftWidth: 3, flex: 1, gap: 2,
      borderWidth: 1, borderColor: C.cardBorder,
    },
    classCardActive: { borderColor: C.teal + '44' },
    classCardCompact: { padding: 4 },
    classCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 },
    classTitle: { color: C.white, fontSize: 11, fontWeight: '700', flex: 1 },
    classTitleCompact: { fontSize: 9 },
    classTime: { color: C.sub, fontSize: 9 },
    classTimeCompact: { fontSize: 8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    locationPin: { fontSize: 9 },
    locationText: { fontSize: 9, fontWeight: '500' },
    joinBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, alignSelf: 'flex-start', marginTop: 4 },
    joinBtnText: { color: '#fff', fontSize: 9, fontWeight: '700' },

    listDayHeader: {
      flexDirection: 'row', alignItems: 'baseline', gap: 10,
      paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    listDayLabel: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    listDayDate: { color: C.sub, fontSize: 12 },
  });
}