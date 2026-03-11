// Screens/Teacher/SelectionScreen.js
// Step 1 of broadcast: pick Role → Year → Division → open MessagingScreen

import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Dimensions, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

const { width: SW } = Dimensions.get('window');
const IS_TABLET = SW >= 768;
const SAFE_T = Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 0) + 10;
const SAFE_B = Platform.OS === 'ios' ? 28 : 16;

const P_DARK = {
  bg: '#060912', panel: '#0C1221', card: '#111827', border: '#1C2640',
  blue: '#3B82F6', blueMid: '#2563EB', blueSoft: 'rgba(59,130,246,0.14)',
  teal: '#14B8A6', tealSoft: 'rgba(20,184,166,0.14)',
  violet: '#8B5CF6', violetSoft: 'rgba(139,92,246,0.14)',
  amber: '#F59E0B', amberSoft: 'rgba(245,158,11,0.14)',
  green: '#22C55E',
  t1: '#F1F5FF', t2: '#8B98C8', t3: '#3D4F7A', t4: '#1E2D50',
};
const P_LIGHT = {
  bg: '#F1F4FD', panel: '#FFFFFF', card: '#FFFFFF', border: '#DDE3F4',
  blue: '#2563EB', blueMid: '#1D4ED8', blueSoft: 'rgba(37,99,235,0.09)',
  teal: '#0D9488', tealSoft: 'rgba(13,148,136,0.09)',
  violet: '#7C3AED', violetSoft: 'rgba(124,58,237,0.09)',
  amber: '#D97706', amberSoft: 'rgba(217,119,6,0.09)',
  green: '#059669',
  t1: '#0F172A', t2: '#4B5563', t3: '#9CA3AF', t4: '#CBD5E1',
};

const ROLES_FN = (P) => [
  { key: 'teacher', label: 'Teacher', sub: 'Faculty & instructors', emoji: '👩‍🏫', color: P.violet, soft: P.violetSoft },
  { key: 'student', label: 'Student', sub: 'Enrolled students',     emoji: '🧑‍🎓', color: P.teal,   soft: P.tealSoft   },
  { key: 'parent',  label: 'Parent',  sub: 'Parents of students',   emoji: '👨‍👩‍👧',  color: P.amber,  soft: P.amberSoft  },
];
const YEARS = [
  { key: '1', label: '1st Year', emoji: '🌱',  },
  { key: '2', label: '2nd Year', emoji: '📖',  },
  { key: '3', label: '3rd Year', emoji: '🔭',  },
  { key: '4', label: '4th Year', emoji: '🎓', },
];
const DIVISIONS = ['A', 'B', 'C'];

// ─── Animated selection card ──────────────────────────────────────────────────
function SelectCard({ item, selected, onPress, index, accentColor, accentSoft }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const s = makeS(P);
  const scale = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 260, delay: index * 40, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 260, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);
  const col  = item.color || accentColor || P.blue;
  const soft = item.soft  || accentSoft  || P.blueSoft;
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slideY }, { scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, tension: 220, friction: 10, useNativeDriver: true }).start()}
        activeOpacity={1}
        style={[s.card, selected && { borderColor: col, backgroundColor: soft }]}
      >
        <View style={[s.cardIcon, { backgroundColor: col + '22', borderColor: col + '44' }]}>
          <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardLabel, selected && { color: col }]}>{item.label}</Text>
          {!!item.sub    && <Text style={s.cardSub}>{item.sub}</Text>}
          {!!item.approx && <Text style={[s.cardSub, { color: P.t3 }]}>{item.approx}</Text>}
        </View>
        <View style={[s.radio, selected && { borderColor: col }]}>
          {selected && <View style={[s.radioDot, { backgroundColor: col }]} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Division tile ────────────────────────────────────────────────────────────
function DivTile({ letter, selected, onPress, index }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const s = makeS(P);
  const scale = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 240, delay: index * 50, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.91, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, tension: 220, friction: 10, useNativeDriver: true }).start()}
        activeOpacity={1}
        style={[s.divTile, selected && { borderColor: P.blue, backgroundColor: P.blueSoft }]}
      >
        {selected && (
          <View style={s.divCheck}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
        <Text style={[s.divLetter, selected && { color: P.blue }]}>{letter}</Text>
        <Text style={[s.divSub, selected && { color: P.blue + 'aa' }]}>Div</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Step header ─────────────────────────────────────────────────────────────
function StepHead({ n, title, done, color }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const s = makeS(P);
  return (
    <View style={s.stepHead}>
      <View style={[s.stepBadge, done && { backgroundColor: color, borderColor: color }]}>
        {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : <Text style={s.stepN}>{n}</Text>}
      </View>
      <Text style={[s.stepTitle, done && { color: P.t1 }]}>{title}</Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SelectionScreen() {
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const ROLES = ROLES_FN(P);
  const s = makeS(P);
  const [sender,  setSender]  = useState({ id: '', name: '', role: 'teacher' });
  const [loading, setLoading] = useState(true);
  const [selRole, setSelRole] = useState(null);
  const [selYear, setSelYear] = useState(null);
  const [selDiv,  setSelDiv]  = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(70)).current;
  const ctaFade  = useRef(new Animated.Value(0)).current;

  // ── Resolve sender identity ───────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    (async () => {
      try {
        let id = await AsyncStorage.getItem('teacherId');
        let name = '', role = 'teacher';
        if (id) {
          try {
            const r = await axiosInstance.get(`/teachers/${id}`);
            if (r.data?.success) { name = r.data.data?.name || ''; id = r.data.data?._id || id; }
          } catch (_) {}
        } else {
          const raw = await AsyncStorage.getItem('userData') || await AsyncStorage.getItem('user');
          if (raw) { const p = JSON.parse(raw); id = p._id || p.id; name = p.name || ''; role = p.role || 'teacher'; }
        }
        setSender({ id: id || '', name, role });
      } catch (e) { console.warn('SelectionScreen:', e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  // ── CTA animation ─────────────────────────────────────────────────────────
  const allSelected = selRole && selYear && selDiv;
  useEffect(() => {
    if (allSelected) {
      Animated.parallel([
        Animated.spring(ctaSlide, { toValue: 0, tension: 160, friction: 14, useNativeDriver: true }),
        Animated.timing(ctaFade,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(ctaSlide, { toValue: 70, duration: 160, useNativeDriver: true }),
        Animated.timing(ctaFade,  { toValue: 0,  duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [allSelected]);

  // ── Navigate to MessagingScreen ───────────────────────────────────────────
  const handleOpen = useCallback(() => {
    if (!allSelected) return;
    const yl = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }[selYear] || selYear;
    navigation.navigate('MessagingScreen', {
      recipientRole: selRole,
      academicYear:  selYear,
      division:      selDiv,
      channelLabel:  `${selRole.charAt(0).toUpperCase() + selRole.slice(1)} · ${yl} Year · Div ${selDiv}`,
      senderId:      sender.id,
      senderName:    sender.name,
      senderRole:    sender.role,
    });
  }, [allSelected, selRole, selYear, selDiv, sender, navigation]);

  const yl = y => ({ '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }[y] || y);

  if (loading) return (
    <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={P.blue} />
    </View>
  );

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={P.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.78}>
          <Ionicons name="chevron-back" size={20} color={P.t2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Broadcast</Text>
          <Text style={s.headerSub}>Select audience to message</Text>
        </View>
        {sender.name ? (
          <View style={s.pill}>
            <Text style={s.pillTxt} numberOfLines={1}>
              {sender.role === 'teacher' ? '👩‍🏫' : '🛡️'} {sender.name.split(' ')[0]}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Step 1 */}
        <StepHead n={1} title="Choose Recipient Role" done={!!selRole} color={P.violet} />
        <View style={s.group}>
          {ROLES.map((r, i) => (
            <SelectCard key={r.key} item={r} index={i} selected={selRole === r.key} onPress={() => setSelRole(r.key)} />
          ))}
        </View>

        {/* Step 2 */}
        <StepHead n={2} title="Choose Academic Year" done={!!selYear} color={P.teal} />
        <View style={s.group}>
          {YEARS.map((y, i) => (
            <SelectCard key={y.key} item={y} index={i} selected={selYear === y.key} onPress={() => setSelYear(y.key)}
              accentColor={P.teal} accentSoft={P.tealSoft} />
          ))}
        </View>

        {/* Step 3 */}
        <StepHead n={3} title="Choose Division" done={!!selDiv} color={P.blue} />
        <View style={[s.group, s.divRow]}>
          {DIVISIONS.map((d, i) => (
            <DivTile key={d} letter={d} index={i} selected={selDiv === d} onPress={() => setSelDiv(d)} />
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA bar */}
      <Animated.View style={[s.ctaBar, { opacity: ctaFade, transform: [{ translateY: ctaSlide }] }]}
        pointerEvents={allSelected ? 'auto' : 'none'}>
        <TouchableOpacity onPress={handleOpen} activeOpacity={0.88} style={s.ctaBtn}>
          <Text style={s.ctaTxt} numberOfLines={1}>
            Open Chat · {selRole ? selRole.charAt(0).toUpperCase() + selRole.slice(1) : ''}{selYear ? ` · ${yl(selYear)} Yr` : ''}{selDiv ? ` Div ${selDiv}` : ''}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const TILE = Math.max((SW - (IS_TABLET ? 200 : 80)) / 5 - 10, 58);

const makeS = (P) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: SAFE_T, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: P.panel, borderBottomWidth: 1, borderBottomColor: P.border },
  backBtn:{ width: 36, height: 36, borderRadius: 10, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: P.t1, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: P.t3, marginTop: 1 },
  pill: { backgroundColor: P.blueSoft, borderRadius: 20, borderWidth: 1, borderColor: P.blue + '40', paddingHorizontal: 12, paddingVertical: 6, maxWidth: 160 },
  pillTxt: { fontSize: 11, fontWeight: '700', color: P.blue },
  scroll: { paddingHorizontal: IS_TABLET ? 40 : 16, paddingTop: 18 },
  stepHead:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.t4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: P.border },
  stepN:     { fontSize: 11, fontWeight: '800', color: P.t2 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: P.t2 },
  group: { gap: 10, marginBottom: 18 },
  card:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.card, borderRadius: 16, borderWidth: 1.5, borderColor: P.border, paddingHorizontal: 16, paddingVertical: 14 },
  cardIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 15, fontWeight: '700', color: P.t1 },
  cardSub:   { fontSize: 11, color: P.t3, marginTop: 2 },
  radio:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: P.t4, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  divRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  divTile: { width: TILE, aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderColor: P.border, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  divCheck: { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: P.blue, alignItems: 'center', justifyContent: 'center' },
  divLetter: { fontSize: 26, fontWeight: '900', color: P.t2 },
  divSub:    { fontSize: 10, fontWeight: '600', color: P.t3 },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: IS_TABLET ? 40 : 16, paddingBottom: SAFE_B + 8, paddingTop: 12, backgroundColor: P.panel + 'f0', borderTopWidth: 1, borderTopColor: P.border },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: P.blueMid, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24 },
  ctaTxt: { fontSize: 14, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
});