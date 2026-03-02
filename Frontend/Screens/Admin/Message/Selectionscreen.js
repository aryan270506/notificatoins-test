// ============================================================
//  SelectionScreen.js  —  Campus360
//  Theme comes from AdminDashboard's ThemeContext
// ============================================================
import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  Dimensions, Animated, Platform,
} from 'react-native';

import MessagingScreen from './Messagingscreen';
import { ThemeContext, DARK_COLORS, LIGHT_COLORS } from '../dashboard/AdminDashboard';

const { width: SW } = Dimensions.get('window');

// ─── SELECTION THEME COLORS (for this screen) ──────────────
const getSelectColors = (isDark) => isDark ? {
  BG0:    '#05080F', BG1: '#0C1220', BG2: '#111827', BG3: '#141E30',
  BORDER: '#1A2840', CYAN: '#22D3EE', CYAN_D: '#0891B2',
  WHITE:  '#F0F6FF', SUB: '#64748B', GREEN: '#10B981', AMBER: '#F59E0B', PURPLE: '#8B5CF6',
} : {
  BG0:    '#FFFFFF', BG1: '#F8FAFC', BG2: '#F1F5F9', BG3: '#E2E8F0',
  BORDER: '#CBD5E1', CYAN: '#0891B2', CYAN_D: '#06B6D4',
  WHITE:  '#0F172A', SUB: '#475569', GREEN: '#059669', AMBER: '#D97706', PURPLE: '#7C3AED',
};

// ─── FADE-IN ANIMATION ──────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 340, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ─── STEP LABEL ──────────────────────────────────────────────
function StepLabel({ num, text, done, colors }) {
  return (
    <View style={sl.row}>
      <View style={[sl.circle, { backgroundColor: colors.CYAN_D }, done && { backgroundColor: colors.GREEN }]}>
        {done
          ? <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>
          : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{num}</Text>
        }
      </View>
      <Text style={[sl.text, { color: colors.WHITE }]}>{text}</Text>
    </View>
  );
}
const sl = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 6 },
  circle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text:   { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});

// ─── ROLE CARD ───────────────────────────────────────────────
function RoleCard({ role, selected, onPress }) {
  const active = selected === role.id;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, borderWidth: 1.5 },
        { backgroundColor: role.bg, borderColor: role.border },
        active && { borderColor: role.color, backgroundColor: role.color + '14' }
      ]}
      onPress={() => onPress(role.id)}
    >
      <View style={[{ width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, { backgroundColor: role.color + '22', borderColor: role.color + '50' }]}>
        <Text style={{ fontSize: 24 }}>{role.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 15, fontWeight: '800', marginBottom: 3 }, { color: active ? role.color : role.textColor }]}>{role.label}</Text>
        <Text style={{ fontSize: 12, color: role.subColor }}>{role.desc}</Text>
      </View>
      <View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, { borderColor: active ? role.color : role.borderColor }]}>
        {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: role.color }} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── YEAR CARD ───────────────────────────────────────────────
function YearCard({ year, selected, onPress, colors }) {
  const active = selected === year.id;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, borderWidth: 1.5 },
        { backgroundColor: colors.BG2, borderColor: colors.BORDER },
        active && { borderColor: colors.CYAN, backgroundColor: colors.CYAN_D + '1A' }
      ]}
      onPress={() => onPress(year.id)}
    >
      <View style={[{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, { backgroundColor: year.color + '22' }]}>
        <Text style={{ fontSize: 22 }}>{year.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[{ fontSize: 15, fontWeight: '800', marginBottom: 3 }, { color: active ? colors.CYAN : colors.WHITE }]}>{year.label}</Text>
        <Text style={{ fontSize: 12, color: colors.SUB }}>~{year.count.toLocaleString()} members</Text>
      </View>
      <View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, { borderColor: active ? colors.CYAN : colors.BORDER }]}>
        {active && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.CYAN }} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── DIVISION ROW ────────────────────────────────────────────
function DivisionRow({ selected, onPress, colors }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {['A', 'B', 'C'].map(d => {
        const active = selected === d;
        return (
          <TouchableOpacity
            key={d} activeOpacity={0.82}
            style={[{ flex: 1, borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5, position: 'relative' },
              { backgroundColor: colors.BG2, borderColor: colors.BORDER },
              active && { borderColor: colors.CYAN, backgroundColor: colors.CYAN_D + '1A' }
            ]}
            onPress={() => onPress(selected === d ? null : d)}
          >
            {active && (
              <View style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.CYAN, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.WHITE, fontSize: 9, fontWeight: '900' }}>✓</Text>
              </View>
            )}
            <Text style={[{ fontSize: 32, fontWeight: '900', marginBottom: 4 }, { color: active ? colors.CYAN : colors.SUB }]}>{d}</Text>
            <Text style={[{ fontSize: 12, fontWeight: '600' }, { color: active ? colors.CYAN + 'AA' : colors.SUB }]}>Division</Text>
            <Text style={{ fontSize: 11, color: colors.SUB + '99', marginTop: 2 }}>~1,050</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── SUMMARY BANNER ──────────────────────────────────────────
function SummaryBanner({ roleObj, yearLabel, division, colors }) {
  return (
    <View style={[{ borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 16 },
      { backgroundColor: colors.BG3, borderColor: (roleObj?.color || colors.CYAN) + '50' }
    ]}>
      <Text style={[{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 }, { color: roleObj?.color || colors.CYAN }]}>📢  BROADCAST TARGET</Text>
      <Text style={[{ fontSize: 18, fontWeight: '900', marginBottom: 10 }, { color: colors.WHITE }]} numberOfLines={2}>
        {roleObj?.label}{yearLabel ? `  ·  ${yearLabel}` : ''}{division ? `  ·  Div ${division}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ backgroundColor: colors.CYAN_D + '22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.CYAN_D + '50' }}>
          <Text style={{ fontSize: 12, color: colors.CYAN, fontWeight: '600' }}>👥  {division ? '~1,050' : '~3,100'}  recipients</Text>
        </View>
        {!division && (
          <View style={{ backgroundColor: colors.AMBER + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.AMBER + '40' }}>
            <Text style={{ fontSize: 12, color: colors.AMBER, fontWeight: '600' }}>Select division to narrow</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────
// Gets isDark from AdminDashboard's ThemeContext
export default function SelectionScreen() {
  const themeCtx = useContext(ThemeContext);
  const isDark = themeCtx.isDark;
  const colors = getSelectColors(isDark);
  const { BG0, BG1, BG2, BG3, BORDER, CYAN, CYAN_D, WHITE, SUB, GREEN, AMBER, PURPLE } = colors;

  const ROLES = [
    { id: 'teacher', label: 'Teacher', icon: '👨‍🏫', desc: 'Faculty & instructors', color: PURPLE, bg: BG2, border: BORDER, textColor: WHITE, subColor: SUB, borderColor: BORDER },
    { id: 'student', label: 'Student', icon: '🧑‍🎓', desc: 'Enrolled students',     color: CYAN,   bg: BG2, border: BORDER, textColor: WHITE, subColor: SUB, borderColor: BORDER },
    { id: 'parent',  label: 'Parent',  icon: '👨‍👩‍👧', desc: "Parents of students",  color: GREEN,  bg: BG2, border: BORDER, textColor: WHITE, subColor: SUB, borderColor: BORDER },
  ];
  const YEARS = [
    { id: '1', label: '1st Year', icon: '🌱', color: GREEN,  count: 3100 },
    { id: '2', label: '2nd Year', icon: '📖', color: CYAN,   count: 3050 },
    { id: '3', label: '3rd Year', icon: '🔭', color: AMBER,  count: 3100 },
    { id: '4', label: '4th Year', icon: '🎓', color: PURPLE, count: 3130 },
  ];

  const [role,     setRole]     = useState(null);
  const [year,     setYear]     = useState(null);
  const [division, setDivision] = useState(null);
  const [showMessaging,  setShowMessaging]  = useState(false);
  const [messageContext, setMessageContext] = useState(null);

  const roleObj = ROLES.find(r => r.id === role);
  const yearObj = YEARS.find(y => y.id === year);

  const handleRole = (id) => { setRole(id); setYear(null); setDivision(null); };
  const handleYear = (id) => { setYear(id); setDivision(null); };

  const canProceed = Boolean(role && year && division);

  const pillLabel = (() => {
    if (!role) return null;
    let t = roleObj?.label || '';
    if (year)     t += ` · Yr ${year}`;
    if (division) t += ` · Div ${division}`;
    return t;
  })();

  const handleGo = () => {
    setMessageContext({ role, year, division, roleLabel: roleObj?.label, yearLabel: yearObj?.label, recipientCount: 1050 });
    setShowMessaging(true);
  };

  if (showMessaging && messageContext) {
    return (
      <MessagingScreen
        context={messageContext}
        onBack={() => { setShowMessaging(false); setMessageContext(null); }}
      />
    );
  }

  return (
    <SafeAreaView style={[css.safe, { backgroundColor: BG0 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={BG0} />

      {/* TOP BAR */}
      <View style={[css.topBar, { backgroundColor: BG1, borderBottomColor: BORDER }]}>
        <View style={css.topLeft}>
          <View style={[css.logoBox, { backgroundColor: CYAN_D }]}>
            <Text style={{ fontSize: 16 }}>🎓</Text>
          </View>
          <View>
            <Text style={[css.topTitle, { color: WHITE }]}>Broadcast</Text>
            <Text style={[css.topSub, { color: SUB }]}>Select audience to message</Text>
          </View>
        </View>
        {pillLabel && (
          <View style={[css.topPill, { backgroundColor: BG2, borderColor: BORDER }, roleObj && { backgroundColor: roleObj.color + '22', borderColor: roleObj.color + '60' }]}>
            <Text style={[css.topPillTxt, { color: WHITE }, roleObj && { color: roleObj.color }]} numberOfLines={1}>{pillLabel}</Text>
          </View>
        )}
        {/* GLOBAL THEME TOGGLE — controlled by AdminDashboard */}
        {/* Theme toggle removed - controlled at AdminDashboard level */}
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView contentContainerStyle={[css.scroll, { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FadeIn delay={0}>
          <StepLabel num="1" text="Choose Recipient Role" done={!!role} colors={colors} />
          {ROLES.map(r => <RoleCard key={r.id} role={r} selected={role} onPress={handleRole} />)}
        </FadeIn>

        {role && (
          <FadeIn delay={50}>
            <StepLabel num="2" text="Choose Academic Year" done={!!year} colors={colors} />
            {YEARS.map(y => <YearCard key={y.id} year={y} selected={year} onPress={handleYear} colors={colors} />)}
          </FadeIn>
        )}

        {role && year && (
          <FadeIn delay={50}>
            <StepLabel num="3" text="Choose Division" done={!!division} colors={colors} />
            <DivisionRow selected={division} onPress={setDivision} colors={colors} />
          </FadeIn>
        )}

        {role && year && (
          <FadeIn delay={60}>
            <SummaryBanner roleObj={roleObj} yearLabel={yearObj?.label} division={division} colors={colors} />
          </FadeIn>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA BUTTON */}
      {canProceed && (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[css.cta, roleObj && { backgroundColor: roleObj.color, shadowColor: roleObj.color }]}
          onPress={handleGo}
        >
          <Text style={css.ctaTxt}>
            Compose Message  ·  {roleObj?.label}  ·  {yearObj?.label?.replace(' Year', '')}  Div {division}  →
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const css = StyleSheet.create({
  safe:       { flex: 1 },
  scroll:     {},
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topTitle:   { fontSize: 16, fontWeight: '800' },
  topSub:     { fontSize: 11, marginTop: 1 },
  topPill:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, maxWidth: 180, flex: 1, marginHorizontal: 8 },
  topPillTxt: { fontSize: 11, fontWeight: '700' },
  themeBtn:   { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  themeIcon:  { fontSize: 20 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 14,
  },
  ctaTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
});