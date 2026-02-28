/**
 * Campus360 - Admin Control Center Dashboard
 * React Native Implementation — Mobile & Desktop Optimized
 *
 * Install dependencies:
 *   npm install react-native-svg
 */

import React, { useState, useContext, createContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const DESKTOP_BP = 768;   // ≥ this → desktop layout
const TABLET_BP  = 480;   // ≥ this → two-column cards on mobile

// ─── Color Palettes ───────────────────────────────────────────────────────────
export const DARK_COLORS = {
  bg:               '#0d1117',
  surface:          '#161b22',
  surfaceAlt:       '#1c2333',
  border:           '#21262d',
  accent:           '#00d4aa',
  accentBlue:       '#388bfd',
  accentWarn:       '#f0a500',
  accentRed:        '#f85149',
  textPrim:         '#e6edf3',
  textSec:          '#8b949e',
  textMuted:        '#484f58',
  sidebar:          '#0d1117',
  sidebarAct:       '#1f6feb22',
  sidebarActBorder: '#1f6feb',
  success:          '#3fb950',
};

export const LIGHT_COLORS = {
  bg:               '#f4f6f9',
  surface:          '#ffffff',
  surfaceAlt:       '#eef1f5',
  border:           '#d1d9e0',
  accent:           '#00a884',
  accentBlue:       '#1a6fd4',
  accentWarn:       '#d4880a',
  accentRed:        '#d93025',
  textPrim:         '#1a2130',
  textSec:          '#4a5568',
  textMuted:        '#9aa5b4',
  sidebar:          '#ffffff',
  sidebarAct:       '#1a6fd422',
  sidebarActBorder: '#1a6fd4',
  success:          '#2e7d52',
};

// ─── Theme Context ────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ isDark: true, colors: DARK_COLORS });

// ─── Icons (SVG-based) ────────────────────────────────────────────────────────
const Icon = React.memo(({ name, size = 16, color }) => {
  const { colors } = useContext(ThemeContext);
  const iconColor = color || colors.textSec;
  const p = { width: size, height: size };
  switch (name) {
    case 'reports':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="M18 20V10M12 20V4M6 20v-6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="8" stroke={iconColor} strokeWidth="1.5" />
          <Path d="m21 21-4.35-4.35" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'broadcast':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="M23 7l-7 5 7 5V7z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Rect x="1" y="5" width="15" height="14" rx="2" stroke={iconColor} strokeWidth="1.5" />
        </Svg>
      );
    case 'storage':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="M3 12h18M3 6h18M3 18h18" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
          <Rect x="3" y="3" width="18" height="18" rx="2" stroke={iconColor} strokeWidth="1.5" />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="m6 9 6 6 6-6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'send':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="m22 2-11 11M22 2 15 22 11 13 2 9l20-7z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="5" stroke={iconColor} strokeWidth="1.5" />
          <Path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...p} viewBox="0 0 24 24" fill="none">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = React.memo(({ label, value, sub, badge, highlight, cardWidth }) => {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={[
      ss.statCard,
      { backgroundColor: colors.surface, borderColor: highlight ? colors.accent + '44' : colors.border },
      cardWidth ? { width: cardWidth } : null,
    ]}>
      {badge && (
        <View style={[ss.statBadge, { backgroundColor: colors.accent + '22' }]}>
          <Text style={[ss.statBadgeText, { color: colors.accent }]}>{badge}</Text>
        </View>
      )}
      <Text style={[ss.statValue, { color: colors.textPrim }]}>{value}</Text>
      <Text style={[ss.statLabel, { color: colors.textMuted }]}>{label}</Text>
      {sub && <Text style={[ss.statSub, { color: colors.textSec }]}>{sub}</Text>}
      <View style={[ss.statBar, { backgroundColor: colors.border }]}>
        <View style={[ss.statBarFill, {
          width: highlight ? '30%' : '60%',
          backgroundColor: highlight ? colors.accent : colors.accentBlue,
        }]} />
      </View>
    </View>
  );
});

// ─── Mini Bar Chart (width-aware) ─────────────────────────────────────────────
const MiniBarChart = React.memo(({ chartWidth }) => {
  const { colors } = useContext(ThemeContext);
  const bars = [40, 65, 55, 70, 60, 85, 75, 90, 55, 65, 70, 60, 80, 75, 95, 70, 65, 80, 85, 90, 75, 70, 80, 85, 88, 75, 82, 78, 90, 100];
  const w = chartWidth || 280;
  const barW = (w - bars.length) / bars.length;
  const inactiveColor = colors === LIGHT_COLORS ? '#c5d8e8' : '#1e3a4a';

  return (
    <Svg width={w} height={100}>
      <Defs>
        <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity="0.8" />
          <Stop offset="1" stopColor={colors.accent} stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      {bars.map((h, i) => {
        const highlight = i === 1 || i === bars.length - 1;
        return (
          <Rect
            key={i}
            x={i * (barW + 1)}
            y={100 - (h / 100) * 90}
            width={Math.max(barW, 1)}
            height={(h / 100) * 90}
            rx={2}
            fill={highlight ? colors.accent : inactiveColor}
          />
        );
      })}
    </Svg>
  );
});

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart = React.memo(({ percent = 72, size = 110 }) => {
  const { colors } = useContext(ThemeContext);
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (percent / 100) * circumference;
  const strokeW = size * 0.09;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.border} strokeWidth={strokeW} />
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={colors.accent}
          strokeWidth={strokeW}
          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[ss.donutPct, { color: colors.textPrim, fontSize: size * 0.16 }]}>{percent}%</Text>
          <Text style={[ss.donutLabel, { color: colors.textMuted }]}>USED</Text>
        </View>
      </View>
    </View>
  );
});

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = React.memo(({ status }) => {
  const { colors } = useContext(ThemeContext);
  const cfg = {
    Success: { color: colors.success, bg: colors.success + '22' },
    Warning: { color: colors.accentWarn, bg: colors.accentWarn + '22' },
    Failed:  { color: colors.accentRed, bg: colors.accentRed + '22' },
  };
  const s = cfg[status] || cfg.Success;
  return (
    <View style={[ss.badge, { backgroundColor: s.bg }]}>
      <View style={[ss.badgeDot, { backgroundColor: s.color }]} />
      <Text style={[ss.badgeText, { color: s.color }]}>{status}</Text>
    </View>
  );
});

// ─── Audit Log Row ────────────────────────────────────────────────────────────
// On mobile, collapses to a 2-line card style; on desktop shows full table row.
const AuditRow = React.memo(({ time, actor, action, status, isMobile }) => {
  const { colors } = useContext(ThemeContext);
  if (isMobile) {
    return (
      <View style={[ss.auditRowMobile, { borderBottomColor: colors.border }]}>
        <View style={ss.auditRowMobileTop}>
          <Text style={[ss.auditCellActor, { color: colors.accentBlue }]} numberOfLines={1}>{actor}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={[ss.auditCellAction, { color: colors.textSec }]} numberOfLines={1}>{action}</Text>
        <Text style={[ss.auditCellTime, { color: colors.textMuted }]}>{time}</Text>
      </View>
    );
  }
  return (
    <View style={[ss.auditRow, { borderBottomColor: colors.border }]}>
      <Text style={[ss.auditCell, { width: 76, color: colors.textPrim }]}>{time}</Text>
      <Text style={[ss.auditCell, { flex: 1, color: colors.accentBlue }]} numberOfLines={1}>{actor}</Text>
      <Text style={[ss.auditCell, { flex: 1.4, color: colors.textSec }]} numberOfLines={1}>{action}</Text>
      <StatusBadge status={status} />
    </View>
  );
});

// ─── Section Card wrapper ─────────────────────────────────────────────────────
const Card = ({ style, children }) => {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={[ss.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Campus360Dashboard({ isDark: isDarkProp, onToggleTheme }) {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= DESKTOP_BP;
  const isTablet  = screenWidth >= TABLET_BP;
  const isMobile  = !isDesktop;

  // Content width = full width minus padding (32px total) on mobile; slightly padded on desktop
  const contentPad = isDesktop ? 24 : 16;
  const contentWidth = screenWidth - contentPad * 2;

  // Stat card widths: desktop → 4 visible; mobile → 160 fixed (horizontal scroll)
  const statCardW = isDesktop
    ? Math.floor((contentWidth - 36) / 4)   // 4 cards, 3×12 gaps
    : isTablet
      ? Math.floor((contentWidth - 12) / 2) // 2 cards, 1×12 gap
      : 160;

  // Chart width = card width minus padding
  const attendanceCardW = isDesktop
    ? Math.floor(contentWidth * 0.60) - 32
    : contentWidth - 32;

  // Donut size scales with card
  const storageCardW = isDesktop ? contentWidth - attendanceCardW - 32 - 12 : contentWidth;
  const donutSize = Math.min(storageCardW * 0.45, 120);

  const [isDarkInternal, setIsDarkInternal] = useState(true);
  const isControlled = isDarkProp !== undefined;
  const isDark = isControlled ? isDarkProp : isDarkInternal;
  const handleToggle = useCallback(
    isControlled ? onToggleTheme : () => setIsDarkInternal((p) => !p),
    [isControlled, onToggleTheme],
  );

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const themeValue = useMemo(() => ({ isDark, colors }), [isDark, colors]);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [highPriority, setHighPriority] = useState(false);
  const togglePriority = useCallback(() => setHighPriority((p) => !p), []);

  // Audit data
  const auditLogs = [
    { time: '09:42:15', actor: 'sys_admin_vance', action: 'Database Schema Migration', status: 'Success' },
    { time: '09:15:02', actor: 'auto_bot_04',     action: 'Scheduled Backup Initiated', status: 'Warning' },
    { time: '08:55:44', actor: 'security_ovr',    action: 'API Key Rotation',           status: 'Success' },
    { time: '08:12:10', actor: 'net_monitor',     action: 'Auth Attempt (Unauthorized)', status: 'Failed' },
  ];

  const storageItems = [
    { label: 'Student Portfolios', val: '4.2 TB', color: colors.accent },
    { label: 'LMS Resources',      val: '1.8 TB', color: colors.accentBlue },
    { label: 'Other / System',     val: '0.5 TB', color: colors.textMuted },
  ];

  return (
    <ThemeContext.Provider value={themeValue}>
      <SafeAreaView style={[ss.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={[ss.scrollContent, { padding: contentPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View style={[ss.header, isMobile && ss.headerMobile]}>
            <View style={ss.headerLeft}>
              <Text style={[ss.headerTitle, { color: colors.textPrim }, isMobile && ss.headerTitleSm]}>
                Admin Control Center
              </Text>
              <View style={ss.headerStatus}>
                <Text style={[ss.headerStatusText, { color: colors.textSec }]}>System Status: </Text>
                <Text style={[ss.headerStatusText, { color: colors.accent }]}>Operational</Text>
              </View>
            </View>

            <View style={ss.headerRight}>
              {/* Search — hide on small mobile to save space */}
              {(isDesktop || isTablet) && (
                <View style={[ss.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Icon name="search" size={14} color={colors.textMuted} />
                  <Text style={[ss.searchPlaceholder, { color: colors.textMuted }]}>Search systems…</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleToggle}
                style={[ss.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Icon name={isDark ? 'sun' : 'moon'} size={17} color={isDark ? '#f0a500' : '#388bfd'} />
              </TouchableOpacity>

              <View style={ss.bellWrap}>
                <Icon name="bell" size={18} color={colors.textSec} />
                <View style={[ss.bellDot, { backgroundColor: colors.accentRed, borderColor: colors.bg }]} />
              </View>
            </View>
          </View>

          {/* ── Stat Cards ── */}
          {isDesktop || isTablet ? (
            // Grid layout: 4 columns on desktop, 2 on tablet
            <View style={[ss.statGrid, { marginBottom: 16 }]}>
              {[
                { value: '13,570', label: 'TOTAL ACTIVE USERS', badge: '+4% MOM', highlight: true },
                { value: '12,400', label: 'STUDENTS',           sub: '92% Engagement Rate' },
                { value: '850',    label: 'FACULTY',            sub: '32 Current Sessions' },
                { value: '320',    label: 'STAFF',              sub: '8 New Hires Registered' },
              ].map((c) => (
                <StatCard key={c.label} {...c} cardWidth={statCardW} />
              ))}
            </View>
          ) : (
            // Horizontal scroll on small mobile
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16, marginHorizontal: -contentPad }}
              contentContainerStyle={{ paddingHorizontal: contentPad, paddingRight: contentPad }}
            >
              {[
                { value: '13,570', label: 'TOTAL ACTIVE USERS', badge: '+4% MOM', highlight: true },
                { value: '12,400', label: 'STUDENTS',           sub: '92% Engagement Rate' },
                { value: '850',    label: 'FACULTY',            sub: '32 Current Sessions' },
                { value: '320',    label: 'STAFF',              sub: '8 New Hires Registered' },
              ].map((c, i) => (
                <View key={c.label} style={{ marginRight: i < 3 ? 12 : 0 }}>
                  <StatCard {...c} cardWidth={160} />
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── Attendance + Broadcast row ── */}
          <View style={[isDesktop ? ss.rowWrap : ss.colWrap, { marginBottom: 16 }]}>
            {/* Attendance Card */}
            <Card style={isDesktop ? { flex: 1.6 } : null}>
              <View style={ss.cardHeader}>
                <View style={ss.cardTitleRow}>
                  <Icon name="reports" size={14} color={colors.accent} />
                  <Text style={[ss.cardTitle, { color: colors.textPrim }]}>Monthly Student Attendance</Text>
                </View>
                <Text style={[ss.cardSub, { color: colors.textMuted }]}>Last 30 Days</Text>
              </View>

              <View style={ss.attendanceStat}>
                <View>
                  <Text style={[ss.attendancePct, { color: colors.textPrim }]}>94.2%</Text>
                  <Text style={[ss.attendanceLabel, { color: colors.textMuted }]}>AVG DAILY ATTENDANCE</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ alignItems: 'flex-end', marginBottom: 6 }}>
                    <Text style={[ss.attendanceMini, { color: colors.accent }]}>98.5%</Text>
                    <Text style={[ss.attendanceMiniLabel, { color: colors.textMuted }]}>PEAK</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[ss.attendanceMini, { color: colors.accentWarn }]}>89.1%</Text>
                    <Text style={[ss.attendanceMiniLabel, { color: colors.textMuted }]}>LOW</Text>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 8, overflow: 'hidden' }}>
                <MiniBarChart chartWidth={attendanceCardW} />
              </View>

              <View style={ss.chartLabels}>
                <Text style={[ss.chartLabel, { color: colors.textMuted }]}>30 DAYS AGO</Text>
                <Text style={[ss.chartLabel, { color: colors.textMuted }]}>TODAY</Text>
              </View>
            </Card>

            {/* Broadcast Card */}
            <Card style={isDesktop ? { flex: 1, minWidth: 200 } : { marginTop: 16 }}>
              <View style={[ss.cardTitleRow, { marginBottom: 14 }]}>
                <Icon name="broadcast" size={14} color={colors.accentBlue} />
                <Text style={[ss.cardTitle, { color: colors.textPrim }]}>Quick Broadcast</Text>
              </View>

              <Text style={[ss.inputLabel, { color: colors.textMuted }]}>TARGET AUDIENCE</Text>
              <View style={[ss.select, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[ss.selectText, { color: colors.textPrim }]}>All Campus Users</Text>
                <Icon name="chevron-down" size={14} color={colors.textSec} />
              </View>

              <Text style={[ss.inputLabel, { marginTop: 12, color: colors.textMuted }]}>MESSAGE</Text>
              <TextInput
                style={[ss.textArea, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrim }]}
                multiline
                numberOfLines={4}
                placeholder="Type your emergency announcement or update here…"
                placeholderTextColor={colors.textMuted}
                value={broadcastMsg}
                onChangeText={setBroadcastMsg}
                accessibilityLabel="Broadcast message"
              />

              <TouchableOpacity
                style={ss.priorityRow}
                onPress={togglePriority}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: highPriority }}
              >
                <View style={[
                  ss.checkbox,
                  { borderColor: colors.textMuted },
                  highPriority && { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
                ]} />
                <Text style={[ss.priorityLabel, { color: colors.textSec }]}>
                  Send as High-Priority Push Notification
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[ss.broadcastBtn, { backgroundColor: colors.accentBlue }]}
                accessibilityRole="button"
                accessibilityLabel="Send broadcast"
              >
                <Icon name="send" size={14} color="#fff" />
                <Text style={ss.broadcastBtnText}>Send Broadcast</Text>
              </TouchableOpacity>
            </Card>
          </View>

          {/* ── Audit Logs + Storage row ── */}
          <View style={isDesktop ? ss.rowWrap : ss.colWrap}>
            {/* Audit Logs */}
            <Card style={isDesktop ? { flex: 1.6 } : null}>
              <View style={ss.cardHeader}>
                <View style={ss.cardTitleRow}>
                  <View style={[ss.auditDot, { backgroundColor: colors.accentWarn }]} />
                  <Text style={[ss.cardTitle, { color: colors.textPrim }]}>Recent Audit Logs</Text>
                </View>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[ss.cardSub, { color: colors.accentBlue }]}>View All</Text>
                </TouchableOpacity>
              </View>

              {/* Table header — desktop only */}
              {!isMobile && (
                <View style={[ss.auditRow, { marginBottom: 4, borderBottomColor: colors.border }]}>
                  {['TIMESTAMP', 'ACTOR', 'ACTION', 'STATUS'].map((h) => (
                    <Text
                      key={h}
                      style={[
                        ss.auditCell,
                        ss.auditHeader,
                        { color: colors.textMuted },
                        h === 'TIMESTAMP' && { width: 76 },
                        h === 'ACTION' && { flex: 1.4 },
                      ]}
                    >
                      {h}
                    </Text>
                  ))}
                </View>
              )}

              {auditLogs.map((log) => (
                <AuditRow key={log.time} {...log} isMobile={isMobile} />
              ))}
            </Card>

            {/* Storage Distribution */}
            <Card style={isDesktop ? { flex: 1, minWidth: 200 } : { marginTop: 16 }}>
              <View style={[ss.cardTitleRow, { marginBottom: 16 }]}>
                <Icon name="storage" size={14} color={colors.accent} />
                <Text style={[ss.cardTitle, { color: colors.textPrim }]}>Storage Distribution</Text>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <DonutChart percent={72} size={donutSize} />
              </View>

              {storageItems.map(({ label, val, color }) => (
                <View key={label} style={ss.storageRow}>
                  <View style={[ss.storageDot, { backgroundColor: color }]} />
                  <Text style={[ss.storageLabel, { color: colors.textSec }]}>{label}</Text>
                  <Text style={[ss.storageVal, { color: colors.textPrim }]}>{val}</Text>
                </View>
              ))}
            </Card>
          </View>

          {/* Bottom breathing room for tab bars */}
          <View style={{ height: Platform.OS === 'ios' ? 20 : 8 }} />
        </ScrollView>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:         { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerMobile: {
    alignItems: 'flex-start',
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerTitleSm: { fontSize: 16 },
  headerStatus: { flexDirection: 'row', marginTop: 3, flexWrap: 'wrap' },
  headerStatusText: { fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    marginRight: 10,
  },
  searchPlaceholder: { fontSize: 12, marginLeft: 7 },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  bellWrap: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute',
    top: 2, right: 2,
    width: 7, height: 7,
    borderRadius: 4,
    borderWidth: 1,
  },

  // Stat Cards
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  statBadge: {
    alignSelf: 'flex-end',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 6,
  },
  statBadgeText: { fontSize: 10, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  statSub:   { fontSize: 11, marginTop: 4 },
  statBar:   { height: 3, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },

  // Layout helpers
  rowWrap: { flexDirection: 'row', gap: 12 },
  colWrap: { flexDirection: 'column' },

  // Card
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  cardSub:   { fontSize: 11 },

  // Attendance
  attendanceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  attendancePct:        { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  attendanceLabel:      { fontSize: 10, letterSpacing: 0.4, marginTop: 2 },
  attendanceMini:       { fontSize: 13, fontWeight: '700' },
  attendanceMiniLabel:  { fontSize: 9, letterSpacing: 0.5 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel:  { fontSize: 10, letterSpacing: 0.3 },

  // Broadcast
  inputLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  select: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
  },
  selectText:  { fontSize: 13 },
  textArea: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 8,
  },
  priorityLabel: { fontSize: 12, flex: 1 },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 12,
    gap: 7,
  },
  broadcastBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Audit Logs — desktop (table row)
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 4,
  },
  auditCell:   { fontSize: 11, flex: 1 },
  auditHeader: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },

  // Audit Logs — mobile (card row)
  auditRowMobile: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  auditRowMobileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  auditCellActor:  { fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
  auditCellAction: { fontSize: 12, marginTop: 1 },
  auditCellTime:   { fontSize: 11, marginTop: 3 },

  auditDot: { width: 8, height: 8, borderRadius: 4 },

  // Status badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  // Storage
  donutPct:   { fontWeight: '700', textAlign: 'center' },
  donutLabel: { fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  storageDot:   { width: 8, height: 8, borderRadius: 4 },
  storageLabel: { fontSize: 12, flex: 1 },
  storageVal:   { fontSize: 12, fontWeight: '600' },
});