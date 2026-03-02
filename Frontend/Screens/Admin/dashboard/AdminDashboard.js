/**
 * Campus360 — Admin Control Center Dashboard
 * React Native · Pure .js · No Sidebar
 *
 * ── THEME: Fully controlled by parent (App.js). ──
 * Pass isDark={bool} and onToggleTheme={fn} from your root.
 * The toggle in this header calls onToggleTheme(), which lives
 * in App.js and re-renders ALL screens at once.
 *
 * Usage (always controlled):
 *   <Campus360Dashboard isDark={isDark} onToggleTheme={handleToggle} />
 */

import React, {
  useState, useContext,
  useCallback, useMemo, useEffect, useRef,
} from 'react';

var createContext = React.createContext;
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, SafeAreaView, StatusBar,
  useWindowDimensions, Animated, Easing,
} from 'react-native';
import Svg, {
  Circle, Path, Rect, Polyline, Defs,
  LinearGradient as SvgGrad, Stop,
} from 'react-native-svg';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
var BP_DESKTOP = 900;
var BP_TABLET  = 600;

// ─── Palettes ─────────────────────────────────────────────────────────────────
var DARK = {
  bg:         '#080c14',
  surface:    '#0f1623',
  surfaceAlt: '#141d2e',
  border:     '#1e2d45',
  accent:     '#00e5b8',
  accentBlue: '#4d9fff',
  accentWarn: '#f5a623',
  accentRed:  '#ff5a5f',
  textPrim:   '#e8f0fe',
  textSec:    '#7a90b0',
  textMuted:  '#3d5070',
  success:    '#36d399',
  purple:     '#a855f7',
};
var LIGHT = {
  bg:         '#f0f4ff',
  surface:    '#ffffff',
  surfaceAlt: '#eef2fb',
  border:     '#d0daf0',
  accent:     '#00b896',
  accentBlue: '#2563eb',
  accentWarn: '#d97706',
  accentRed:  '#dc2626',
  textPrim:   '#0f172a',
  textSec:    '#475569',
  textMuted:  '#94a3b8',
  success:    '#16a34a',
  purple:     '#7c3aed',
};

var ThemeCtx = createContext({ isDark: true, C: DARK });

export const ThemeContext = ThemeCtx;
export const DARK_COLORS  = DARK;
export const LIGHT_COLORS = LIGHT;

function FadeIn(props) {
  var delay = props.delay || 0; var style = props.style; var children = props.children;
  var op = useRef(new Animated.Value(0)).current;
  var ty = useRef(new Animated.Value(14)).current;
  useEffect(function () {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 400, delay: delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 400, delay: delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

function ScalePress(props) {
  var onPress = props.onPress; var disabled = props.disabled; var children = props.children; var style = props.style;
  var scale = useRef(new Animated.Value(1)).current;
  function onIn()  { Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start(); }
  function onOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 60 }).start(); }
  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} onPress={onPress} disabled={disabled} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale: scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function PulseDot(props) {
  var color = props.color;
  var ring = useRef(new Animated.Value(0)).current;
  useEffect(function () {
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0, duration: 100, useNativeDriver: true }),
    ])).start();
  }, []);
  var ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  var ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function AnimatedNumber(props) {
  var target = props.target; var style = props.style;
  var anim = useRef(new Animated.Value(0)).current;
  var ds = useState(0); var display = ds[0]; var setDisplay = ds[1];
  useEffect(function () {
    Animated.timing(anim, { toValue: target, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    var id = anim.addListener(function (v) { setDisplay(Math.floor(v.value)); });
    return function () { anim.removeListener(id); };
  }, [target]);
  return <Text style={style}>{display.toLocaleString()}</Text>;
}

function ProgressBar(props) {
  var pct = props.pct; var color = props.color; var height = props.height || 4;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var anim = useRef(new Animated.Value(0)).current;
  useEffect(function () {
    Animated.timing(anim, { toValue: pct / 100, duration: 1000, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height: height, borderRadius: height / 2, backgroundColor: C.border, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', borderRadius: height / 2, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

function Sparkline(props) {
  var data = props.data; var color = props.color; var width = props.width || 64; var height = props.height || 24;
  var max = Math.max.apply(null, data); var min = Math.min.apply(null, data);
  var pts = data.map(function (v, i) {
    var x = (i / (data.length - 1)) * width;
    var y = height - ((v - min) / (max - min + 0.001)) * height;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  var lastPt = pts.split(' ').pop().split(',');
  return (
    <Svg width={width} height={height} style={{ overflow: 'visible' }}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r={3} fill={color} />
    </Svg>
  );
}

function AnimatedBarChart(props) {
  var width = props.width; var C = props.C;
  var anim = useRef(new Animated.Value(0)).current;
  var ps = useState(0); var prog = ps[0]; var setProg = ps[1];
  useEffect(function () {
    var t = setTimeout(function () {
      Animated.timing(anim, { toValue: 1, duration: 1000, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      var id = anim.addListener(function (v) { setProg(v.value); });
      return function () { anim.removeListener(id); };
    }, 150);
    return function () { clearTimeout(t); };
  }, []);
  var bars = [42,58,52,67,61,78,72,88,53,62,71,58,82,74,96,69,64,81,87,91,76,71,82,86,89,76,83,79,91,100];
  var H = 80; var bw = Math.max((width - bars.length) / bars.length, 2);
  var inactive = C.bg === '#080c14' ? '#1a3550' : '#c5d8e8';
  return (
    <View style={{ overflow: 'hidden' }}>
      <Svg width={width} height={H}>
        <Defs><SvgGrad id="bg2" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.accent} stopOpacity="0.85" /><Stop offset="1" stopColor={C.accent} stopOpacity="0.1" /></SvgGrad></Defs>
        {bars.map(function (h, i) {
          var fh = (h / 100) * H * prog; var hi = i === 0 || i === bars.length - 1;
          return <Rect key={i} x={i * (bw + 1)} y={H - fh} width={bw} height={fh} rx={2} fill={hi ? C.accent : inactive} opacity={hi ? 1 : 0.65} />;
        })}
      </Svg>
    </View>
  );
}

function DonutChart(props) {
  var percent = props.percent || 72; var size = props.size || 120;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var anim = useRef(new Animated.Value(0)).current;
  var vs = useState(0); var val = vs[0]; var setVal = vs[1];
  useEffect(function () {
    var t = setTimeout(function () {
      Animated.timing(anim, { toValue: percent, duration: 1400, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      var id = anim.addListener(function (v) { setVal(v.value); });
      return function () { anim.removeListener(id); };
    }, 100);
    return function () { clearTimeout(t); };
  }, [percent]);
  var r = size * 0.38; var cx = size / 2; var cy = size / 2;
  var circ = 2 * Math.PI * r; var dash = (val / 100) * circ; var sw = size * 0.1;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw} />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accent} strokeWidth={sw} strokeDasharray={dash + ' ' + circ} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={C.accentBlue} strokeWidth={sw * 0.4} strokeDasharray={((27 / 100) * circ) + ' ' + circ} strokeDashoffset={circ * 0.25 - (63 / 100) * circ} strokeLinecap="round" opacity={0.7} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.textPrim, fontWeight: '800', fontSize: size * 0.18, letterSpacing: -0.5 }}>{Math.round(val)}%</Text>
        <Text style={{ color: C.textMuted, fontSize: size * 0.1, letterSpacing: 1, fontWeight: '600' }}>USED</Text>
      </View>
    </View>
  );
}

function StatusBadge(props) {
  var status = props.status; var ctx = useContext(ThemeCtx); var C = ctx.C;
  var cfg = { Success: { color: C.success, label: '✓ Success' }, Warning: { color: C.accentWarn, label: '⚠ Warning' }, Failed: { color: C.accentRed, label: '✕ Failed' } };
  var s = cfg[status] || cfg.Success;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: s.color + '22', borderWidth: 1, borderColor: s.color + '44' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: s.color }}>{s.label}</Text>
    </View>
  );
}

function Checkbox(props) {
  var checked = props.checked; var onToggle = props.onToggle; var color = props.color;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onToggle();
  }
  return (
    <TouchableOpacity onPress={press} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: checked ? color : C.textMuted, backgroundColor: checked ? color : 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ scale: scale }] }}>
        {checked && <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"><Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>}
      </Animated.View>
    </TouchableOpacity>
  );
}

var GROUP_DEFS = [
  { id: 'all',      emoji: '🏫', label: 'All Campus Users', count: '13,570', desc: 'All members'         },
  { id: 'students', emoji: '🎓', label: 'All Students',      count: '12,400', desc: 'Enrolled students'  },
  { id: 'faculty',  emoji: '👨‍🏫', label: 'All Faculty',       count: '850',    desc: 'Teaching staff'    },
  { id: 'parents',  emoji: '👨‍👩‍👦', label: 'All Parents',       count: '9,800',  desc: 'Guardian accounts' },
  { id: 'staff',    emoji: '🛠',  label: 'All Staff',          count: '320',    desc: 'Administrative'    },
];

function GroupRow(props) {
  var group = props.group; var active = props.active; var onToggle = props.onToggle;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var scale = useRef(new Animated.Value(1)).current;
  var bgA = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(function () {
    Animated.timing(bgA, { toValue: active ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [active]);
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    onToggle(group.id);
  }
  var bgColor = bgA.interpolate({ inputRange: [0, 1], outputRange: ['transparent', C.accentBlue + '18'] });
  return (
    <TouchableOpacity onPress={press} activeOpacity={1}>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6, backgroundColor: bgColor, borderWidth: 1, borderColor: active ? C.accentBlue + '55' : C.border, transform: [{ scale: scale }] }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: active ? C.accentBlue + '25' : C.surfaceAlt, borderWidth: 1, borderColor: active ? C.accentBlue + '44' : C.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Text style={{ fontSize: 15 }}>{group.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? C.textPrim : C.textSec }}>{group.label}</Text>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{group.desc}</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.textMuted, marginRight: 10, fontWeight: '600' }}>{group.count}</Text>
        <Checkbox checked={active} onToggle={function () { onToggle(group.id); }} color={C.accentBlue} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function Toast(props) {
  var message = props.message; var visible = props.visible;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var ty = useRef(new Animated.Value(80)).current;
  var op = useRef(new Animated.Value(0)).current;
  var sc = useRef(new Animated.Value(0.9)).current;
  useEffect(function () {
    if (visible) {
      Animated.parallel([
        Animated.spring(ty, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(ty, { toValue: 80, duration: 220, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 0.9, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: C.surface, borderLeftWidth: 4, borderLeftColor: C.success, borderWidth: 1, borderColor: C.success + '44', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', opacity: op, transform: [{ translateY: ty }, { scale: sc }], shadowColor: C.success, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12, zIndex: 9999, maxWidth: 340 }}>
      <Text style={{ fontSize: 18 }}>📡</Text>
      <Text style={{ color: C.textPrim, fontSize: 12, fontWeight: '600', flex: 1, marginLeft: 10 }}>{message}</Text>
    </Animated.View>
  );
}

function Icon(props) {
  var name = props.name; var size = props.size || 16; var color = props.color;
  var ctx = useContext(ThemeCtx); var C = ctx.C; var ic = color || C.textSec; var p = { width: size, height: size };
  if (name === 'bar') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="M18 20V10M12 20V4M6 20v-6" stroke={ic} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
  if (name === 'broadcast') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="M23 7l-7 5 7 5V7z" stroke={ic} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><Rect x="1" y="5" width="15" height="14" rx="2" stroke={ic} strokeWidth="1.8" /></Svg>;
  if (name === 'storage') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Rect x="3" y="3" width="18" height="18" rx="2" stroke={ic} strokeWidth="1.8" /><Path d="M3 9h18M3 15h18" stroke={ic} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
  if (name === 'bell') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={ic} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={ic} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
  if (name === 'send') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="m22 2-11 11M22 2 15 22 11 13 2 9l20-7z" stroke={ic} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (name === 'sun') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="5" stroke={ic} strokeWidth="1.8" /><Path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={ic} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
  if (name === 'moon') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={ic} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (name === 'search') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Circle cx="11" cy="11" r="8" stroke={ic} strokeWidth="1.8" /><Path d="m21 21-4.35-4.35" stroke={ic} strokeWidth="1.8" strokeLinecap="round" /></Svg>;
  if (name === 'zap') return <Svg {...p} viewBox="0 0 24 24" fill="none"><Path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" stroke={ic} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  return null;
}

function Card(props) {
  var ctx = useContext(ThemeCtx); var C = ctx.C; var delay = props.delay || 0;
  return <FadeIn delay={delay}><View style={[ss.card, { backgroundColor: C.surface, borderColor: C.border }, props.style]}>{props.children}</View></FadeIn>;
}

function SectionHeader(props) {
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  return (
    <View style={ss.secHeader}>
      <View style={ss.secHeaderLeft}>{props.icon}<Text style={[ss.secTitle, { color: C.textPrim }]}>{props.title}</Text></View>
      {props.right ? props.right : null}
    </View>
  );
}

function StatCard(props) {
  var label = props.label; var value = props.value; var sub = props.sub; var badge = props.badge;
  var highlight = props.highlight; var sparkData = props.sparkData; var cardWidth = props.cardWidth; var delay = props.delay || 0;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var scale = useRef(new Animated.Value(1)).current;
  var labels = ['TOTAL ACTIVE USERS','STUDENTS','FACULTY','STAFF'];
  var colors = [C.accent, C.accentBlue, C.accentWarn, C.purple];
  var idx = labels.indexOf(label); var cc = colors[Math.max(idx, 0)];
  var target = parseInt(value.replace(/,/g, ''), 10);
  function onIn()  { Animated.spring(scale, { toValue: 1.03, friction: 7, useNativeDriver: true }).start(); }
  function onOut() { Animated.spring(scale, { toValue: 1,    friction: 7, useNativeDriver: true }).start(); }
  return (
    <FadeIn delay={delay}>
      <TouchableOpacity onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
        <Animated.View style={[ss.statCard, { backgroundColor: C.surface, borderColor: highlight ? C.accent + '55' : C.border, width: cardWidth, transform: [{ scale: scale }] }]}>
          <View style={ss.statCardTop}>
            {badge ? <View style={[ss.chip, { backgroundColor: C.accent + '20', borderColor: C.accent + '40' }]}><Text style={{ fontSize: 9, fontWeight: '700', color: C.accent }}>{badge}</Text></View> : <View />}
            <PulseDot color={highlight ? C.accent : cc} />
          </View>
          <AnimatedNumber target={target} style={{ fontSize: 26, fontWeight: '800', color: C.textPrim, letterSpacing: -0.8 }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginTop: 3 }}>{label}</Text>
          {sub ? <Text style={{ fontSize: 11, color: C.textSec, marginTop: 4 }}>{sub}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
            <View style={{ flex: 1, marginRight: 10 }}><ProgressBar pct={highlight ? 30 : 60} color={cc} height={3} /></View>
            {sparkData ? <Sparkline data={sparkData} color={cc} width={56} height={22} /> : null}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </FadeIn>
  );
}

function AuditRow(props) {
  var time = props.time; var actor = props.actor; var action = props.action;
  var status = props.status; var isMobile = props.isMobile; var delay = props.delay || 0;
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  if (isMobile) {
    return (
      <FadeIn delay={delay}>
        <View style={[ss.auditRowMobile, { borderBottomColor: C.border }]}>
          <View style={ss.auditTop}><Text style={[ss.auditActor, { color: C.accentBlue }]} numberOfLines={1}>{actor}</Text><StatusBadge status={status} /></View>
          <Text style={[ss.auditAction, { color: C.textSec }]} numberOfLines={1}>{action}</Text>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{time}</Text>
        </View>
      </FadeIn>
    );
  }
  return (
    <FadeIn delay={delay}>
      <View style={[ss.auditRow, { borderBottomColor: C.border }]}>
        <Text style={[ss.auditCell, { width: 78, color: C.textSec }]}>{time}</Text>
        <Text style={[ss.auditCell, { flex: 1, color: C.accentBlue }]} numberOfLines={1}>{actor}</Text>
        <Text style={[ss.auditCell, { flex: 1.5, color: C.textSec }]} numberOfLines={1}>{action}</Text>
        <StatusBadge status={status} />
      </View>
    </FadeIn>
  );
}

function SystemHealth() {
  var ctx = useContext(ThemeCtx); var C = ctx.C;
  var services = [
    { name: 'API Gateway',  pct: 99.9, color: C.success    },
    { name: 'Auth Service', pct: 98.5, color: C.success    },
    { name: 'LMS Server',   pct: 94.2, color: C.accentWarn },
    { name: 'File Storage', pct: 99.1, color: C.success    },
    { name: 'Push Service', pct: 97.8, color: C.success    },
  ];
  return (
    <Card delay={500}>
      <SectionHeader icon={<Icon name="zap" size={14} color={C.accentWarn} />} title="System Health"
        right={<View style={{ flexDirection: 'row', alignItems: 'center' }}><PulseDot color={C.success} /><Text style={{ fontSize: 11, color: C.success, fontWeight: '600', marginLeft: 6 }}>All Operational</Text></View>}
      />
      <View style={ss.healthGrid}>
        {services.map(function (s) {
          return (
            <View key={s.name} style={ss.healthItem}>
              <View style={ss.healthLabelRow}><Text style={{ fontSize: 11, color: C.textSec }}>{s.name}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: s.color }}>{s.pct}%</Text></View>
              <ProgressBar pct={s.pct} color={s.color} height={5} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
// Theme is ALWAYS controlled by parent (App.js). No local isDark state here.
export default function Campus360Dashboard(props) {
  var isDark        = props.isDark !== undefined ? props.isDark : true;  // parent-controlled
  var onToggleTheme = props.onToggleTheme;                               // parent's toggle fn

  var C = isDark ? DARK : LIGHT;

  var dims = useWindowDimensions();
  var sw = dims.width;
  var isDesktop = sw >= BP_DESKTOP; var isTablet = sw >= BP_TABLET; var isMobile = !isDesktop;
  var pad = isDesktop ? 24 : 16; var innerW = sw - pad * 2;
  var statW   = isDesktop ? Math.floor((innerW - 36) / 4) : isTablet ? Math.floor((innerW - 12) / 2) : 165;
  var attendW = isDesktop ? Math.floor(innerW * 0.6) - 36 : innerW - 32;
  var storageW = isDesktop ? innerW - Math.floor(innerW * 0.6) - 12 - 32 : innerW;
  var donutSz = Math.min(Math.floor(storageW * 0.5), 130);

  // ThemeCtx value — provides C to all child components
  var themeVal = useMemo(function () { return { isDark: isDark, C: C }; }, [isDark]);

  var ms = useState('');       var msg = ms[0];      var setMsg = ms[1];
  var gs = useState(['all']);  var groups = gs[0];   var setGroups = gs[1];
  var ps = useState(false);    var priority = ps[0]; var setPriority = ps[1];
  var ss2 = useState(false);   var sending = ss2[0]; var setSending = ss2[1];
  var tvs = useState(false);   var toastVis = tvs[0]; var setToastVis = tvs[1];
  var tms = useState('');      var toastMsg = tms[0]; var setToastMsg = tms[1];

  var spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(function () {
    if (sending) {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })).start();
    } else { spinAnim.stopAnimation(); spinAnim.setValue(0); }
  }, [sending]);

  var handleGroupToggle = useCallback(function (id) {
    setGroups(function (prev) {
      if (id === 'all') { return prev.includes('all') ? [] : ['all']; }
      var clean = prev.filter(function (x) { return x !== 'all'; });
      return clean.includes(id) ? clean.filter(function (x) { return x !== id; }) : clean.concat([id]);
    });
  }, []);

  var handleSend = useCallback(function () {
    if (!msg.trim() || groups.length === 0 || sending) { return; }
    setSending(true);
    setTimeout(function () {
      setSending(false);
      var labels = groups.map(function (g) { var f = GROUP_DEFS.find(function (d) { return d.id === g; }); return f ? f.label : g; }).join(', ');
      setToastMsg('Sent to: ' + labels); setToastVis(true); setMsg('');
      setTimeout(function () { setToastVis(false); }, 3200);
    }, 1800);
  }, [msg, groups, sending]);

  var canSend = msg.trim().length > 0 && groups.length > 0 && !sending;
  var spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  var sparkData = {
    TOTAL: [100,120,130,125,140,155,160,158,170,175], STU: [95,110,118,115,128,140,145,143,155,158],
    FAC: [20,21,22,23,22,24,25,24,26,28], STA: [8,9,9,10,10,11,11,12,12,13],
  };
  var statCards = [
    { label:'TOTAL ACTIVE USERS', value:'13,570', badge:'+4% MOM', highlight:true, sparkData:sparkData.TOTAL },
    { label:'STUDENTS',           value:'12,400', sub:'92% Engagement',            sparkData:sparkData.STU },
    { label:'FACULTY',            value:'850',    sub:'32 Active Sessions',         sparkData:sparkData.FAC },
    { label:'STAFF',              value:'320',    sub:'8 New Hires',                sparkData:sparkData.STA },
  ];
  var auditLogs = [
    { time:'09:42:15', actor:'sys_admin_vance', action:'Database Schema Migration',   status:'Success' },
    { time:'09:15:02', actor:'auto_bot_04',     action:'Scheduled Backup Initiated',  status:'Warning' },
    { time:'08:55:44', actor:'security_ovr',    action:'API Key Rotation',            status:'Success' },
    { time:'08:12:10', actor:'net_monitor',     action:'Auth Attempt (Unauthorized)', status:'Failed'  },
    { time:'07:44:30', actor:'sys_admin_tara',  action:'New Faculty Account Created', status:'Success' },
  ];
  var storageItems = [
    { label:'Student Portfolios', val:'4.2 TB', pct:63, color:C.accent },
    { label:'LMS Resources',      val:'1.8 TB', pct:27, color:C.accentBlue },
    { label:'Other / System',     val:'0.5 TB', pct:10, color:C.purple },
  ];
  var weekDays = [
    { d:'Mon', pct:96 }, { d:'Tue', pct:91 }, { d:'Wed', pct:94 }, { d:'Thu', pct:98 }, { d:'Fri', pct:92 },
  ];

  return (
    <ThemeCtx.Provider value={themeVal}>
      <SafeAreaView style={[ss.root, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

        {/* Header */}
        <View style={[ss.topBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={ss.topLeft}>
            <View style={[ss.logoBox, { backgroundColor: C.accent }]}><Text style={ss.logoText}>C</Text></View>
            <View>
              <Text style={[ss.logoTitle, { color: C.textPrim }]}>Campus<Text style={{ color: C.accent }}>360</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                <PulseDot color={C.success} />
                <Text style={{ fontSize: 10, color: C.textSec, marginLeft: 5 }}>All operational</Text>
              </View>
            </View>
          </View>
          <View style={ss.topRight}>
            {(isDesktop || isTablet) &&
              <View style={[ss.searchBar, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <Icon name="search" size={13} color={C.textMuted} />
                <Text style={{ fontSize: 12, color: C.textMuted, marginLeft: 6 }}>Search…</Text>
              </View>
            }
            {/* ── GLOBAL TOGGLE — calls App.js's handleThemeToggle ── */}
            <ScalePress onPress={onToggleTheme}>
              <View style={[ss.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Icon name={isDark ? 'sun' : 'moon'} size={16} color={isDark ? C.accentWarn : C.accentBlue} />
              </View>
            </ScalePress>
            <View style={[ss.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Icon name="bell" size={16} color={C.textSec} />
              <View style={[ss.notifDot, { backgroundColor: C.accentRed, borderColor: C.bg }]} />
            </View>
            <View style={[ss.avatar, { backgroundColor: C.accentBlue }]}><Text style={ss.avatarText}>VA</Text></View>
          </View>
        </View>

        {/* Body */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[ss.body, { padding: pad, paddingBottom: 48 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <FadeIn delay={0}>
            <View style={[ss.pageHeader, isMobile ? { flexDirection: 'column', alignItems: 'flex-start' } : null]}>
              <View>
                <Text style={[ss.pageTitle, { color: C.textPrim }]}>Admin Control Center</Text>
                <Text style={{ fontSize: 11, color: C.textSec, marginTop: 3 }}>Last sync: 2 min ago · v3.8.1</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: isMobile ? 10 : 0 }}>
                <ScalePress><View style={[ss.outlineBtn, { borderColor: C.border, backgroundColor: C.surface, marginRight: 8 }]}><Text style={{ fontSize: 12, color: C.textSec, fontWeight: '600' }}>Export</Text></View></ScalePress>
                <ScalePress><View style={[ss.outlineBtn, { borderColor: C.border, backgroundColor: C.surface }]}><Text style={{ fontSize: 12, color: C.textSec, fontWeight: '600' }}>Schedule</Text></View></ScalePress>
              </View>
            </View>
          </FadeIn>

          {(isDesktop || isTablet)
            ? <View style={[ss.statGrid, { marginBottom: 16 }]}>
                {statCards.map(function (c, i) { return <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} badge={c.badge} highlight={c.highlight} sparkData={c.sparkData} cardWidth={statW} delay={60 + i * 70} />; })}
              </View>
            : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -pad }} contentContainerStyle={{ paddingHorizontal: pad }}>
                {statCards.map(function (c, i) { return <View key={c.label} style={{ marginRight: i < 3 ? 12 : 0 }}><StatCard label={c.label} value={c.value} sub={c.sub} badge={c.badge} highlight={c.highlight} sparkData={c.sparkData} cardWidth={165} delay={60 + i * 70} /></View>; })}
              </ScrollView>
          }

          <View style={[isDesktop ? ss.rowWrap : ss.colWrap, { marginBottom: 16 }]}>
            <Card style={isDesktop ? { flex: 1.6, marginRight: 16 } : null} delay={200}>
              <SectionHeader icon={<Icon name="bar" size={14} color={C.accent} />} title="Monthly Student Attendance"
                right={<View style={[ss.chip, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}><Text style={{ fontSize: 10, color: C.textMuted }}>Last 30 Days</Text></View>}
              />
              <View style={ss.attendRow}>
                <View>
                  <Text style={[ss.bigPct, { color: C.textPrim }]}>94.2%</Text>
                  <Text style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.5, fontWeight: '600', marginTop: 3 }}>AVG DAILY ATTENDANCE</Text>
                </View>
                <View>
                  <View style={{ alignItems: 'flex-end', marginBottom: 8 }}><Text style={{ fontSize: 14, fontWeight: '800', color: C.success }}>98.5%</Text><Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 0.5 }}>PEAK</Text></View>
                  <View style={{ alignItems: 'flex-end' }}><Text style={{ fontSize: 14, fontWeight: '800', color: C.accentWarn }}>89.1%</Text><Text style={{ fontSize: 9, color: C.textMuted, letterSpacing: 0.5 }}>LOW</Text></View>
                </View>
              </View>
              <View style={{ marginTop: 10 }}><AnimatedBarChart width={attendW} C={C} /></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                <Text style={{ fontSize: 10, color: C.textMuted }}>30 DAYS AGO</Text>
                <Text style={{ fontSize: 10, color: C.textMuted }}>TODAY</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                {weekDays.map(function (d, i) {
                  return (
                    <FadeIn key={d.d} delay={500 + i * 60} style={{ flex: 1, alignItems: 'center', marginRight: i < weekDays.length - 1 ? 6 : 0 }}>
                      <View style={{ height: 34, borderRadius: 6, overflow: 'hidden', backgroundColor: C.surfaceAlt, width: '100%', justifyContent: 'flex-end' }}>
                        <View style={{ height: (d.pct / 100) * 34, backgroundColor: C.accentBlue + '55', borderRadius: 4 }} />
                      </View>
                      <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{d.d}</Text>
                      <Text style={{ fontSize: 9, color: C.accent, fontWeight: '700' }}>{d.pct}%</Text>
                    </FadeIn>
                  );
                })}
              </View>
            </Card>

            <Card style={isDesktop ? { flex: 1, minWidth: 280 } : { marginTop: 16 }} delay={260}>
              <SectionHeader icon={<Icon name="broadcast" size={14} color={C.accentBlue} />} title="Quick Broadcast"
                right={groups.length > 0 ? <View style={[ss.chip, { backgroundColor: C.accentBlue + '22', borderColor: C.accentBlue + '44' }]}><Text style={{ fontSize: 10, color: C.accentBlue, fontWeight: '700' }}>{groups.length} group{groups.length > 1 ? 's' : ''}</Text></View> : null}
              />
              <Text style={[ss.inputLabel, { color: C.textMuted }]}>TARGET GROUPS</Text>
              <View style={{ marginBottom: 12 }}>{GROUP_DEFS.map(function (g) { return <GroupRow key={g.id} group={g} active={groups.includes(g.id)} onToggle={handleGroupToggle} />; })}</View>
              <Text style={[ss.inputLabel, { color: C.textMuted }]}>MESSAGE</Text>
              <TextInput style={[ss.textArea, { backgroundColor: C.surfaceAlt, borderColor: msg.length > 0 ? C.accentBlue + '88' : C.border, color: C.textPrim }]} multiline numberOfLines={4} placeholder="Type your announcement or update here…" placeholderTextColor={C.textMuted} value={msg} onChangeText={setMsg} />
              <TouchableOpacity onPress={function () { setPriority(function (p) { return !p; }); }} style={ss.priorityRow}>
                <Checkbox checked={priority} onToggle={function () { setPriority(function (p) { return !p; }); }} color={C.accentRed} />
                <Text style={[ss.priorityLabel, { color: C.textSec }]}>Send as <Text style={{ color: C.accentRed, fontWeight: '700' }}>High-Priority</Text> Push Notification</Text>
              </TouchableOpacity>
              {canSend && <FadeIn><View style={[ss.previewChip, { backgroundColor: C.accent + '12', borderColor: C.accent + '33' }]}><Text style={{ fontSize: 11, color: C.accent }}>{'💬 Will notify '}{groups.includes('all') ? '13,570' : groups.map(function (g) { var f = GROUP_DEFS.find(function (d) { return d.id === g; }); return f ? f.count : ''; }).join(' + ')}{' users'}</Text></View></FadeIn>}
              <ScalePress onPress={handleSend} disabled={!canSend}>
                <View style={[ss.sendBtn, { backgroundColor: canSend ? C.accentBlue : C.border, opacity: canSend ? 1 : 0.5 }]}>
                  {sending ? <><Animated.View style={{ transform: [{ rotate: spinDeg }] }}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>⟳</Text></Animated.View><Text style={ss.sendBtnText}>Sending…</Text></> : <><Icon name="send" size={14} color="#fff" /><Text style={ss.sendBtnText}>Send Broadcast</Text></>}
                </View>
              </ScalePress>
            </Card>
          </View>

          <View style={[isDesktop ? ss.rowWrap : ss.colWrap, { marginBottom: 16 }]}>
            <Card style={isDesktop ? { flex: 1.6, marginRight: 16 } : null} delay={320}>
              <SectionHeader icon={<PulseDot color={C.accentWarn} />} title="Recent Audit Logs"
                right={<TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={{ fontSize: 11, color: C.accentBlue, fontWeight: '700' }}>View All →</Text></TouchableOpacity>}
              />
              {!isMobile && <View style={[ss.auditRow, { borderBottomColor: C.border, marginBottom: 4 }]}>
                <Text style={[ss.auditCell, { width: 78, color: C.textMuted, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 }]}>TIMESTAMP</Text>
                <Text style={[ss.auditCell, { flex: 1, color: C.textMuted, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 }]}>ACTOR</Text>
                <Text style={[ss.auditCell, { flex: 1.5, color: C.textMuted, fontWeight: '700', fontSize: 10, letterSpacing: 0.5 }]}>ACTION</Text>
                <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5 }}>STATUS</Text>
              </View>}
              {auditLogs.map(function (log, i) { return <AuditRow key={log.time} time={log.time} actor={log.actor} action={log.action} status={log.status} isMobile={isMobile} delay={360 + i * 55} />; })}
            </Card>

            <Card style={isDesktop ? { flex: 1, minWidth: 200 } : { marginTop: 16 }} delay={360}>
              <SectionHeader icon={<Icon name="storage" size={14} color={C.accent} />} title="Storage Distribution" />
              <View style={{ alignItems: 'center', marginBottom: 18 }}><DonutChart percent={72} size={donutSz} /></View>
              <View>
                {storageItems.map(function (item) {
                  return (
                    <View key={item.label} style={{ marginBottom: 12 }}>
                      <View style={ss.storageRow}><View style={[ss.storageDot, { backgroundColor: item.color }]} /><Text style={[ss.storageLabel, { color: C.textSec }]}>{item.label}</Text><Text style={[ss.storageVal, { color: C.textPrim }]}>{item.val}</Text></View>
                      <ProgressBar pct={item.pct} color={item.color} height={4} />
                    </View>
                  );
                })}
              </View>
              <View style={[ss.storageTotal, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <View><Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5 }}>TOTAL CAPACITY</Text><Text style={{ fontSize: 20, fontWeight: '800', color: C.textPrim, marginTop: 2 }}>6.5 TB</Text></View>
                <View style={[ss.warnChip, { backgroundColor: C.accentWarn + '20', borderColor: C.accentWarn + '44' }]}><Text style={{ fontSize: 11, color: C.accentWarn, fontWeight: '700' }}>⚠ 72% used</Text></View>
              </View>
            </Card>
          </View>

          <SystemHealth />
        </ScrollView>

        <Toast message={toastMsg} visible={toastVis} />
      </SafeAreaView>
    </ThemeCtx.Provider>
  );
}

var ss = StyleSheet.create({
  root: { flex: 1 }, body: { flexGrow: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 58, borderBottomWidth: 1 },
  topLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  logoTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, marginRight: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8, position: 'relative' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  avatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 0 },
  statCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginRight: 12, marginBottom: 12 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap' }, colWrap: { flexDirection: 'column' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  secTitle: { fontSize: 13, fontWeight: '700', marginLeft: 7 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  attendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  bigPct: { fontSize: 34, fontWeight: '800', letterSpacing: -1.5 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  textArea: { borderRadius: 10, padding: 10, borderWidth: 1, fontSize: 13, minHeight: 80, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  priorityLabel: { fontSize: 12, flex: 1, lineHeight: 17, marginLeft: 8 },
  previewChip: { padding: 9, borderRadius: 9, borderWidth: 1, marginTop: 8, marginBottom: 4 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingVertical: 13, marginTop: 10 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 8 },
  auditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderRadius: 8 },
  auditCell: { fontSize: 11, flex: 1 },
  auditRowMobile: { paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderRadius: 8 },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  auditActor: { fontSize: 12, fontWeight: '700', flex: 1, marginRight: 8 },
  auditAction: { fontSize: 11, marginTop: 1 },
  storageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  storageDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  storageLabel: { flex: 1, fontSize: 12 },
  storageVal: { fontSize: 12, fontWeight: '700' },
  storageTotal: { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warnChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  healthItem: { flex: 1, minWidth: 120, marginRight: 12, marginBottom: 12 },
  healthLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
});