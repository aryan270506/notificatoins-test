/**
 * DashboardScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pixel-perfect React Native dashboard matching the screenshot.
 *
 * INSTALL DEPENDENCIES:
 *   npm install react-native-svg
 *   # Expo:
 *   npx expo install react-native-svg
 *
 * USAGE:
 *   import DashboardScreen from './DashboardScreen';
 *   <DashboardScreen />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Rect,
} from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const { width } = Dimensions.get('window');
const isMobile = width < 768;


// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#0b0d1a',
  card:    '#13172a',
  border:  '#1c2140',
  blue:    '#4b6cf7',
  blueL:   '#6a85f8',
  purple:  '#8b5cf6',
  teal:    '#14b8a6',
  green:   '#22c55e',
  orange:  '#f59e0b',
  red:     '#ef4444',
  pink:    '#ec4899',
  white:   '#ffffff',
  muted:   '#8b92b4',
  dim:     '#3d4266',
  darkBtn: '#1a1f38',
  cyan:    '#06b6d4',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
function polarXY(cx, cy, r, deg) {
  const rad = toRad(deg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarXY(cx, cy, r, startDeg);
  const e = polarXY(cx, cy, r, endDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${lg} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARDS
// ═══════════════════════════════════════════════════════════════════════════════
const STATS = [
  { emoji: '👥', iconBg: '#1e2d6b', label: 'TOTAL USERS',      value: '13,570', change: '↑12%',  up: true  },
  { emoji: '🎓', iconBg: '#1a1e60', label: 'STUDENTS',         value: '12,400', change: '↑5%',   up: true  },
  { emoji: '📋', iconBg: '#2e1550', label: 'FACULTY',          value: '850',    change: '↓2%',   up: false },
  { emoji: '👪', iconBg: '#2e1800', label: 'PARENTS',          value: '320',    change: '↑1%',   up: true  },
  { emoji: '📖', iconBg: '#0d2820', label: 'COURSES',          value: '45',     change: '↑8%',   up: true  },
  { emoji: '🖥️', iconBg: '#1f0f30', label: 'ACTIVE\nCLASSES', value: '18',     change: 'STEADY', up: null  },
];

function StatCard({ emoji, iconBg, label, value, change, up }) {
  const changeColor = up === null ? C.muted : up ? C.teal : C.red;
  return (
    <View style={s.statCard}>
      <View style={[s.statIconBox, { backgroundColor: iconBg }]}>
        <Text style={s.statEmoji}>{emoji}</Text>
      </View>
      <Text style={[s.statChange, { color: changeColor }]}>{change}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAR CHART
// ═══════════════════════════════════════════════════════════════════════════════
const BAR_DATA = [
  { month: 'JAN', s: 60,  f: 17 },
  { month: 'FEB', s: 78,  f: 21 },
  { month: 'MAR', s: 90,  f: 25 },
  { month: 'APR', s: 70,  f: 19 },
  { month: 'MAY', s: 56,  f: 27 },
  { month: 'JUN', s: 100, f: 31 },
];
const CHART_MAX_H = 110;

function BarChart() {
  const anims = useRef(BAR_DATA.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      70,
      anims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, []);

  return (
    <View style={s.barChartWrap}>
      {BAR_DATA.map(({ month, s: sv, f }, i) => (
        <View key={month} style={s.barGroup}>
          <View style={[s.barsRow, { height: CHART_MAX_H }]}>
            <Animated.View
              style={[
                s.bar,
                {
                  backgroundColor: C.blue,
                  marginRight: 4,
                  height: anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, sv],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                s.bar,
                {
                  backgroundColor: '#3d4470',
                  height: anims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, f],
                  }),
                },
              ]}
            />
          </View>
          <Text style={s.barLabel}>{month}</Text>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONUT CHART
// ═══════════════════════════════════════════════════════════════════════════════
const D_SIZE   = 170;
const D_R      = 64;
const D_STROKE = 16;
const D_CX     = D_SIZE / 2;
const D_CY     = D_SIZE / 2;

function DonutChart() {
  const path = arcPath(D_CX, D_CY, D_R, 120, 420); // 300° arc

  return (
    <View style={s.donutWrapper}>
      <Svg width={D_SIZE} height={D_SIZE}>
        <Defs>
          <LinearGradient id="dg" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor={C.cyan}   />
            <Stop offset="45%"  stopColor={C.blue}   />
            <Stop offset="100%" stopColor={C.purple} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={D_CX} cy={D_CY} r={D_R}
          fill="none"
          stroke="#1e2545"
          strokeWidth={D_STROKE}
        />
        {/* Gradient arc */}
        <Path
          d={path}
          fill="none"
          stroke="url(#dg)"
          strokeWidth={D_STROKE}
          strokeLinecap="round"
        />
      </Svg>
      <View style={s.donutCenter}>
        <Text style={s.donutValue}>13.5k</Text>
        <Text style={s.donutSub}>TOTAL</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENT ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════
const STATUS_CFG = {
  COMPLETED: { bg: '#0d3728', color: C.green  },
  UPDATED:   { bg: '#0e1f60', color: C.blueL  },
  SUCCESS:   { bg: '#0d3728', color: C.green  },
  ACTIVE:    { bg: '#1e2545', color: C.muted  },
};

const ACTIVITIES = [
  { av: 'AJ', avBg: '#374151', name: 'Alex Johnson',    role: 'Student', action: 'New Enrollment',        time: '2 mins ago',  status: 'COMPLETED' },
  { av: 'SM', avBg: '#92400e', name: 'Dr. Sarah Miller', role: 'Faculty', action: 'Exam Grades Published',  time: '1 hour ago',  status: 'UPDATED'   },
  { av: 'MW', avBg: '#7f1d1d', name: 'Marcus Wu',        role: 'Parent',  action: 'Tuition Paid',           time: '3 hours ago', status: 'SUCCESS'   },
  { av: 'ER', avBg: '#1e3a5f', name: 'Elena Rodriguez',  role: 'Student', action: 'System Access',          time: '5 hours ago', status: 'ACTIVE'    },
];

function ActivityRow({ av, avBg, name, role, action, time, status, isLast }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[s.actRow, isLast && { borderBottomWidth: 0 }]}>
      {/* Avatar */}
      <View style={[s.actAvatar, { backgroundColor: avBg }]}>
        <Text style={s.actAvatarTxt}>{av}</Text>
      </View>
      {/* Name / Role */}
      <View style={s.actNameBlock}>
        <Text style={s.actName} numberOfLines={1}>{name}</Text>
        <Text style={s.actRole}>{role}</Text>
      </View>
      {/* Action */}
      <Text style={s.actAction} numberOfLines={2}>{action}</Text>
      {/* Time */}
      <Text style={s.actTime}>{time}</Text>
      {/* Badge */}
      <View style={[s.actBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[s.actBadgeTxt, { color: cfg.color }]}>{status}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
function QBtn({ emoji, label, primary }) {
  const btnW = isMobile ? '48%' : (SCREEN_W - 16 * 2 - 32 - 10) / 2;

  return (
    <Pressable
      style={[
        s.qBtn,
        { width: btnW },
        primary && { backgroundColor: C.blue, borderColor: C.blue },
      ]}
      android_ripple={{ color: '#ffffff22' }}>
      <Text style={s.qBtnEmoji}>{emoji}</Text>
      <Text style={[s.qBtnLabel, primary && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════════════
const HEALTH_ITEMS = [
  { iconBg: '#0d2918', emoji: '⚡',  label: 'ACTIVE NOW',       value: '1,240', badge: null,     showBars: true  },
  { iconBg: '#2a1500', emoji: '📦',  label: 'PENDING APPROVAL', value: '14',    badge: 'URGENT', showBars: false },
  { iconBg: '#101b36', emoji: '🔷',  label: 'DEPARTMENTS',      value: '8',     badge: null,     showBars: false },
];

function HealthBarsIcon() {
  const heights = [8, 14, 20, 14];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width: 5, height: h, backgroundColor: C.green, borderRadius: 2 }} />
      ))}
    </View>
  );
}

function HealthRow({ iconBg, emoji, label, value, badge, showBars, isLast }) {
  return (
    <View style={[s.healthRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[s.healthIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={s.healthText}>
        <Text style={s.healthLabel}>{label}</Text>
        <Text style={s.healthValue}>{value}</Text>
      </View>
      {showBars && <HealthBarsIcon />}
      {badge && (
        <View style={s.urgentBadge}>
          <Text style={s.urgentTxt}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════
function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function CommitteeDash() {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Dashboard Overview</Text>
            <Text style={s.headerSub}>
              System status is optimal. All modules functioning correctly.

              
            </Text>
          </View>
          
        </View>

        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statScroll}>
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </ScrollView>

        {/* ── ENROLLMENT TRENDS ──────────────────────────────────────────── */}
        <Card style={s.mb14}>
          <View style={s.enrollHeader}>
            <View>
              <Text style={s.cardTitle}>Enrollment Trends</Text>
              <Text style={s.cardSub}>Monthly registration data comparison</Text>
            </View>
            <View style={s.legendCol}>
              {[
                { color: C.blue,    label: 'Students' },
                { color: '#3d4470', label: 'Faculty'  },
              ].map(({ color, label }) => (
                <View key={label} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: color }]} />
                  <Text style={s.legendTxt}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          <BarChart />
        </Card>

        {/* ── USER DISTRIBUTION ──────────────────────────────────────────── */}
        <Card style={s.mb14}>
          <Text style={s.cardTitle}>User Distribution</Text>
          <DonutChart />
          {[
            { label: 'Students', pct: '75%', color: C.blue   },
            { label: 'Faculty',  pct: '15%', color: C.purple },
            { label: 'Parents',  pct: '10%', color: C.pink   },
          ].map(({ label, pct, color }) => (
            <View key={label} style={s.distRow}>
              <View style={[s.distDot, { backgroundColor: color }]} />
              <Text style={s.distLabel}>{label}</Text>
              <Text style={[s.distPct, { color }]}>{pct}</Text>
            </View>
          ))}
        </Card>

        {/* ── RECENT ACTIVITY ────────────────────────────────────────────── */}
        <Card style={s.mb14}>
          <View style={s.actCardHeader}>
            <View>
              <Text style={s.cardTitle}>Recent Activity</Text>
              <Text style={s.cardSub}>Live updates from all departments</Text>
            </View>
            <TouchableOpacity>
              <Text style={s.viewHistoryBtn}>View History</Text>
            </TouchableOpacity>
          </View>

          {/* Column headers */}
          <View style={s.actTableHead}>
            <Text style={[s.actHeadTxt, { flex: 2.5 }]}>NAME &amp; ROLE</Text>
            <Text style={[s.actHeadTxt, { flex: 1.8 }]}>ACTION</Text>
            <Text style={[s.actHeadTxt, { flex: 1.5 }]}>TIMESTAMP</Text>
            <Text style={[s.actHeadTxt, { flex: 1.8, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {ACTIVITIES.map((a, i) => (
            <ActivityRow
              key={i}
              {...a}
              isLast={i === ACTIVITIES.length - 1}
            />
          ))}
        </Card>

        {/* ── QUICK ACTIONS ──────────────────────────────────────────────── */}
        <Card style={s.mb14}>
          <Text style={s.cardTitle}>Quick Actions</Text>
          <View style={s.qGrid}>
            <QBtn emoji="👤" label="Add User"    primary />
            <QBtn emoji="📄" label="Add Faculty" />
            <QBtn emoji="🔑" label="Roles"       />
            <QBtn emoji="💾" label="Backup"      />
          </View>
          <TouchableOpacity style={s.generateBtn} activeOpacity={0.85}>
            <Text style={s.generateTxt}>📄  Generate Monthly Report</Text>
          </TouchableOpacity>
        </Card>

        {/* ── SYSTEM HEALTH ──────────────────────────────────────────────── */}
        <Card style={s.mb14}>
          <Text style={[s.cardTitle, { marginBottom: 4 }]}>System Health</Text>
          {HEALTH_ITEMS.map((h, i) => (
            <HealthRow
              key={i}
              {...h}
              isLast={i === HEALTH_ITEMS.length - 1}
            />
          ))}
        </Card>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const PAD = 16;

const s = StyleSheet.create({

  // Root & Scroll
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: PAD,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 48,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  mb14: { marginBottom: 14 },

  // Header
  header: {
  flexDirection: isMobile ? 'column' : 'row',
  alignItems: isMobile ? 'flex-start' : 'center',
  gap: isMobile ? 12 : 0,
},

  headerTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    maxWidth: isMobile ? '100%' : SCREEN_W * 0.58,
    lineHeight: 18,
  },
  exportBtn: {
    backgroundColor: C.darkBtn,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  exportTxt: {
    color: C.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Stat Cards
  statScroll: {
    gap: 10,
    paddingBottom: 14,
  },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    width: 132,
    position: 'relative',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statEmoji: { fontSize: 19 },
  statChange: {
    position: 'absolute',
    top: 14,
    right: 12,
    fontSize: 11,
    fontWeight: '700',
  },
  statLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginTop: 6,
    lineHeight: 13,
  },
  statValue: {
    color: C.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },

  // Card title/sub
  cardTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },

  // Enrollment chart
  enrollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  legendCol: { gap: 5, alignItems: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: C.muted, fontSize: 11 },

  barChartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barGroup: { flex: 1, alignItems: 'center' },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: 13,
    borderRadius: 4,
  },
  barLabel: {
    color: C.muted,
    fontSize: 8,
    marginTop: 7,
    letterSpacing: 0.5,
    fontWeight: '700',
  },

  // Donut chart
  donutWrapper: {
    alignSelf: 'center',
    marginVertical: 14,
    width: D_SIZE,
    height: D_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    color: C.white,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  donutSub: {
    color: C.muted,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },

  // Distribution rows
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  distDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },
  distLabel: { color: C.muted, flex: 1, fontSize: 13 },
  distPct: { fontWeight: '700', fontSize: 13 },

  // Activity card
  actCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  viewHistoryBtn: {
    color: C.blue,
    fontWeight: '700',
    fontSize: 13,
  },
  actTableHead: {
    flexDirection: 'row',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 2,
  },
  actHeadTxt: {
    color: C.dim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border + 'aa',
    gap: 6,
  },
  actAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actAvatarTxt: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  actNameBlock: { flex: 2.5, paddingLeft: 4 },
  actName: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  actRole: { color: C.muted, fontSize: 10 },
  actAction: {
    flex: 1.8,
    color: C.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  actTime: {
    flex: 1.5,
    color: C.dim,
    fontSize: 10,
  },
  actBadge: {
    flex: 1.8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  actBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Quick Actions
  qGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: 12,
  marginBottom: 12,
},

  qBtn: {
    backgroundColor: C.darkBtn,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 7,
  },
  qBtnEmoji: { fontSize: 22 },
  qBtnLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  generateBtn: {
    backgroundColor: C.white,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateTxt: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },

  // System Health
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  healthIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  healthText: { flex: 1, marginLeft: 12 },
  healthLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  healthValue: {
    color: C.white,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 1,
  },
  urgentBadge: {
    backgroundColor: '#7c2d12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  urgentTxt: {
    color: C.orange,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});