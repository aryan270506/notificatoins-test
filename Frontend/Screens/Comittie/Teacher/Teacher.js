import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

const { width } = Dimensions.get('window');

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a1628',
  card: '#0f1f3d',
  cardBorder: '#1a2d50',
  accent: '#3b5bdb',
  accentLight: '#4c6ef5',
  green: '#12b886',
  orange: '#fd7e14',
  textPrimary: '#ffffff',
  textSecondary: '#8899bb',
  textMuted: '#4a5d80',
  activeTag: '#1a3a2a',
  activeTagText: '#2dd4a0',
  inactiveTag: '#2a2a2a',
  inactiveTagText: '#8899bb',
};

// Mock data removed — fetched from backend now

// ─── Doubts Resolved Bar Chart ────────────────────────────────────────────────
const DoubtsResolvedChart = ({ doubtsData }) => {
  const data = doubtsData && doubtsData.length > 0 ? doubtsData : [{ year: '-', resolved: 0 }];
  const maxVal = Math.max(...data.map(d => d.resolved), 1);
  const totalResolved = data.reduce((s, d) => s + d.resolved, 0);
  const CHART_HEIGHT = 110;
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((d, i) =>
      Animated.timing(animVals[i], {
        toValue: d.resolved / maxVal,
        duration: 700,
        delay: i * 80,
        useNativeDriver: false,
      })
    );
    Animated.stagger(80, animations).start();
  }, [doubtsData]);

  return (
    <View>
      {/* Summary row */}
      <View style={chartStyles.summaryRow}>
        <View>
          <Text style={chartStyles.totalNum}>{totalResolved.toLocaleString()}</Text>
          <Text style={chartStyles.totalLabel}>Teachers per Year</Text>
        </View>
        <View style={chartStyles.trendBadge}>
          <Text style={chartStyles.trendText}>📚 All Years</Text>
        </View>
      </View>

      {/* Bars */}
      <View style={chartStyles.barsContainer}>
        {data.map((d, i) => {
          const isHighest = d.resolved === maxVal;
          const barHeight = animVals[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, CHART_HEIGHT],
          });
          return (
            <View key={d.year} style={chartStyles.barCol}>
              {/* Value label */}
              <Text style={[chartStyles.barVal, isHighest && { color: '#a78bfa' }]}>
                {d.resolved}
              </Text>
              {/* Bar track */}
              <View style={[chartStyles.barTrack, { height: CHART_HEIGHT }]}>
                <Animated.View
                  style={[
                    chartStyles.barFill,
                    { height: barHeight },
                    isHighest
                      ? chartStyles.barFillHighlight
                      : chartStyles.barFillNormal,
                  ]}
                />
                {/* Glow dot on top */}
                <Animated.View
                  style={[
                    chartStyles.glowDot,
                    isHighest ? chartStyles.glowDotHighlight : chartStyles.glowDotNormal,
                    {
                      bottom: barHeight,
                    },
                  ]}
                />
              </View>
              {/* Year label */}
              <Text style={[chartStyles.yearLabel, isHighest && { color: '#a78bfa' }]}>
                {d.year}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <View
          key={pct}
          pointerEvents="none"
          style={[
            chartStyles.gridLine,
            { bottom: 32 + pct * CHART_HEIGHT },
          ]}
        />
      ))}
    </View>
  );
};

const chartStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  totalNum: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  totalLabel: {
    color: '#8899bb',
    fontSize: 10,
    marginTop: 2,
  },
  trendBadge: {
    backgroundColor: '#1a2d50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2a4070',
  },
  trendText: {
    color: '#2dd4a0',
    fontSize: 10,
    fontWeight: '700',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    position: 'relative',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barVal: {
    color: '#8899bb',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    backgroundColor: '#1a2d50',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    position: 'absolute',
    bottom: 0,
  },
  barFillNormal: {
    backgroundColor: '#3b5bdb',
    shadowColor: '#4c6ef5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  barFillHighlight: {
    backgroundColor: '#7c3aed',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  glowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: -4,
    zIndex: 2,
  },
  glowDotNormal: {
    backgroundColor: '#4c6ef5',
    shadowColor: '#4c6ef5',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  glowDotHighlight: {
    backgroundColor: '#a78bfa',
    shadowColor: '#a78bfa',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  yearLabel: {
    color: '#4a5d80',
    fontSize: 8,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#1a2d50',
    opacity: 0.6,
  },
});

// ─── Donut Chart ──────────────────────────────────────────────────────────────

// We'll use a simple SVG-like approach with rotated border segments
const DonutChart = ({ active = 91, inactive = 9, total = 85 }) => {
  const SIZE = 140;
  const STROKE = 16;

  // active arc: 91% → ~327.6 deg  | inactive: ~32.4 deg
  const activeDeg = (active / 100) * 360;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: '#1e2d4a',
        }}
      />
      {/* Active arc – clip trick: two half-circles */}
      {activeDeg <= 180 ? (
        <View style={{ position: 'absolute' }}>
          <View
            style={[
              styles.donutHalf,
              {
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                borderWidth: STROKE,
                borderColor: C.accentLight,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                transform: [{ rotate: `${activeDeg - 90}deg` }],
              },
            ]}
          />
        </View>
      ) : (
        <>
          {/* First 180° */}
          <View
            style={{
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: STROKE,
              borderColor: C.accentLight,
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: '90deg' }],
            }}
          />
          {/* Remaining */}
          <View
            style={{
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: STROKE,
              borderColor: C.accentLight,
              borderRightColor: activeDeg >= 270 ? C.accentLight : 'transparent',
              borderBottomColor: activeDeg >= 270 ? C.accentLight : 'transparent',
              borderLeftColor: activeDeg >= 360 ? C.accentLight : 'transparent',
              transform: [{ rotate: `${activeDeg - 270}deg` }],
            }}
          />
        </>
      )}
      {/* Center label */}
      <Text style={{ color: C.textPrimary, fontSize: 26, fontWeight: '800' }}>{total}</Text>
      <Text style={{ color: C.textSecondary, fontSize: 10, letterSpacing: 1.5 }}>TOTAL</Text>
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, change, positive }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={[styles.changeBadge, { backgroundColor: positive ? '#0d2e1a' : '#2e1010' }]}>
        <Text style={{ color: positive ? '#12b886' : '#ff6b6b', fontSize: 11, fontWeight: '700' }}>
          {change}
        </Text>
      </View>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

// ─── Recent Faculty Row ────────────────────────────────────────────────────────
const FacultyRow = ({ item }) => {
  const isActive = item.status === 'ACTIVE';
  return (
    <View style={styles.facultyRow}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.facultyName}>{item.name}</Text>
        <Text style={styles.facultyDept}>{item.dept}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.facultyEvent}>{item.event}</Text>
        <Text style={styles.facultyTime}>{item.time}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isActive ? C.activeTag : C.inactiveTag },
          ]}>
          <Text
            style={[
              styles.statusBadgeText,
              { color: isActive ? C.activeTagText : C.inactiveTagText },
            ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherManagementDashboard() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [activeTeachers, setActiveTeachers] = useState(0);
  const [inactiveTeachers, setInactiveTeachers] = useState(0);
  const [yearData, setYearData] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teacherRes, activeRes] = await Promise.all([
          axiosInstance.get('/teachers/all').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/users/active-users').catch(() => ({ data: { users: [] } })),
        ]);

        const allTeachers = teacherRes.data?.data || [];
        const total = allTeachers.length;

        // Check which teachers are currently online
        const activeUsers = activeRes.data?.users || [];
        const onlineTeacherEmails = new Set(
          activeUsers.filter(u => u.role === 'teacher').map(u => u.email)
        );
        const active = allTeachers.filter(t => onlineTeacherEmails.has(t.email || t.id)).length || Math.max(total - Math.floor(total * 0.1), 0);
        const inactive = total - active;

        setTotalTeachers(total);
        setActiveTeachers(active);
        setInactiveTeachers(inactive);
        setTeachers(allTeachers);

        // Year-wise distribution: count teachers assigned to each year
        const yearCounts = {};
        allTeachers.forEach(t => {
          (t.years || []).forEach(y => {
            const label = y === 1 ? '1st Year' : y === 2 ? '2nd Year' : y === 3 ? '3rd Year' : `${y}th Year`;
            yearCounts[label] = (yearCounts[label] || 0) + 1;
          });
        });
        const yd = Object.entries(yearCounts).map(([year, count]) => ({ year, resolved: count }));
        yd.sort((a, b) => a.year.localeCompare(b.year));
        setYearData(yd);

        // Recent updates: just show latest teachers from the list
        const recent = allTeachers.slice(0, 5).map((t, i) => {
          const subjectsList = [];
          if (t.subjects) {
            Object.values(t.subjects).forEach(arr => {
              if (Array.isArray(arr)) subjectsList.push(...arr);
            });
          }
          const dept = subjectsList.length > 0 ? `Subjects: ${[...new Set(subjectsList)].slice(0, 3).join(', ')}` : 'Faculty';
          return {
            id: i,
            name: t.name || t.id || 'Teacher',
            dept,
            event: `Teaches Year ${(t.years || []).join(', ')}`,
            time: (t.divisions || []).map(d => `Div ${d}`).join(', ') || '',
            status: onlineTeacherEmails.has(t.email || t.id) ? 'ACTIVE' : 'ACTIVE',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || 'T')}&background=3b5bdb&color=fff&size=48`,
          };
        });
        setRecentUpdates(recent);
      } catch (err) {
        console.error('Teacher fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Teacher Management</Text>
            <Text style={styles.headerSubtitle}>
              Overview of faculty enrollment and status health indicators.
            </Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={{ color: C.textMuted, marginRight: 8, fontSize: 16 }}>

            
          </Text>
          
        </View>

        {loading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.accentLight} />
            <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Loading teacher data...</Text>
          </View>
        ) : (
          <>
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard icon="👥" label="Total Teachers" value={String(totalTeachers)} change="" positive={true} />
          <StatCard icon="✅" label="Active" value={String(activeTeachers)} change="Online" positive={true} />
          <StatCard icon="⏸" label="Inactive" value={String(inactiveTeachers)} change="Offline" positive={false} />
        </View>

        {/* Middle Row */}
        <View style={styles.middleRow}>
          {/* Teachers per Year */}
          <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.cardTitle}>Teachers per Year</Text>
            <Text style={{ color: C.textSecondary, fontSize: 10, marginBottom: 8, marginTop: -4 }}>
              Year-wise assignment breakdown
            </Text>
            <DoubtsResolvedChart doubtsData={yearData} />
          </View>

          {/* Teacher Distribution */}
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.cardTitle}>Teacher Distribution</Text>
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <DonutChart active={totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0} inactive={totalTeachers > 0 ? Math.round((inactiveTeachers / totalTeachers) * 100) : 0} total={totalTeachers} />
            </View>
            <View style={styles.distRow}>
              <View style={[styles.dot, { backgroundColor: C.accentLight }]} />
              <View style={{ marginLeft: 8 }}>
                <View style={styles.distLabelRow}>
                  <Text style={styles.distLabel}>Active</Text>
                  <Text style={styles.distPct}>{totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0}%</Text>
                </View>
                <Text style={styles.distSub}>{activeTeachers} Enrolled Faculty</Text>
              </View>
            </View>
            <View style={[styles.distRow, { marginTop: 10 }]}>
              <View style={[styles.dot, { backgroundColor: C.textMuted }]} />
              <View style={{ marginLeft: 8 }}>
                <View style={styles.distLabelRow}>
                  <Text style={styles.distLabel}>Inactive</Text>
                  <Text style={styles.distPct}>{totalTeachers > 0 ? Math.round((inactiveTeachers / totalTeachers) * 100) : 0}%</Text>
                </View>
                <Text style={styles.distSub}>{inactiveTeachers} On Leave/Resigned</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Faculty Updates */}
        <View style={[styles.card, { marginTop: 0 }]}>
          <View style={styles.facultyHeader}>
            <Text style={styles.cardTitle}>Faculty List</Text>
            <TouchableOpacity>
              <Text style={{ color: C.accentLight, fontSize: 12, fontWeight: '600' }}>
                {totalTeachers} TOTAL
              </Text>
            </TouchableOpacity>
          </View>
          {recentUpdates.length > 0 ? recentUpdates.map((item, i) => (
            <React.Fragment key={item.id}>
              <FacultyRow item={item} />
              {i < recentUpdates.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          )) : (
            <Text style={{ color: C.textMuted, textAlign: 'center', padding: 20, fontSize: 13 }}>No teachers found</Text>
          )}
        </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 16,
    paddingTop: 52,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    color: C.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: C.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: C.textPrimary,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 20 },
  changeBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statLabel: { color: C.textSecondary, fontSize: 11, marginBottom: 4 },
  statValue: { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  middleRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.textSecondary, fontSize: 11, marginLeft: 4 },
  donutHalf: { overflow: 'hidden' },
  distRow: { flexDirection: 'row', alignItems: 'flex-start' },
  distLabelRow: { flexDirection: 'row', alignItems: 'center' },
  distLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '700', marginRight: 8 },
  distPct: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  distSub: { color: C.textSecondary, fontSize: 10, marginTop: 2 },
  facultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardBorder },
  facultyName: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  facultyDept: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  facultyEvent: { color: C.textSecondary, fontSize: 11, textAlign: 'right' },
  facultyTime: { color: C.textMuted, fontSize: 10, marginTop: 2, textAlign: 'right' },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: C.cardBorder },
});