/**
 * UniVerse – AI Doubt Resolver
 * Text-only version (image upload removed)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar,
  Dimensions, Animated, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { doubtAPI } from '../../../Src/Axios';

// ─────────────────────────────────────────────
//  Responsive
// ─────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const isTablet  = SW >= 768;
const isDesktop = SW >= 1100;
const SIDEBAR_W = isDesktop ? 260 : isTablet ? 220 : 270;

// ─────────────────────────────────────────────
//  Theme builder
// ─────────────────────────────────────────────
function buildC(themeC) {
  const isDark = themeC ? themeC.statusBar === 'light-content' : true;
  return {
    bg:        isDark ? '#080D1A' : '#F0F4F8',
    surface:   isDark ? '#0F1623' : '#FFFFFF',
    card:      isDark ? '#131C2B' : '#F8FAFC',
    border:    isDark ? '#1C2B3A' : '#CBD5E1',
    accent:    '#00D4FF',
    accentDim: 'rgba(0,212,255,0.12)',
    green:     '#00C48C',
    orange:    '#FF8A65',
    blue:      isDark ? '#4FC3F7' : '#2563EB',
    text:      isDark ? '#E8F2FF' : '#0F172A',
    sub:       isDark ? '#8BA0B8' : '#475569',
    muted:     isDark ? '#4A6070' : '#94A3B8',
    danger:    '#FF5A5A',
    dangerDim: 'rgba(255,90,90,0.12)',
    statusBar: isDark ? 'light-content' : 'dark-content',
    moonIcon:  themeC?.moonIcon ?? (isDark ? '☀️' : '🌙'),
  };
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const COLOR_KEYS = ['blue', 'green', 'orange'];

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function parseResponse(raw) {
  const lines = raw.split('\n').filter(l => l.trim());
  const title = (lines[0] || '').replace(/^#+\s*/, '').substring(0, 80) || 'Solution';

  const steps = [];
  const stepRx = /^(?:step\s*(\d+)[).\-:\s]+)(.+)/i;
  let cur = null;
  for (const line of lines) {
    const m = line.match(stepRx);
    if (m) {
      if (cur) steps.push(cur);
      cur = { number: m[1], title: m[2].trim(), lines: [] };
    } else if (cur && line.trim() && !/^step\s*\d/i.test(line)) {
      if (cur.lines.length < 5) cur.lines.push(line.trim());
    }
  }
  if (cur) steps.push(cur);

  const tagLine = raw.match(/key concepts?[:\-\s]+([^\n]+)/i);
  const tags = tagLine
    ? tagLine[1].split(/[,;]/).map(t => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  const intro = lines.slice(1, 3).join(' ').substring(0, 400) || raw.substring(0, 400);
  return { title, intro, steps, tags, raw };
}

// ─────────────────────────────────────────────
//  API calls
// ─────────────────────────────────────────────
async function solveDoubt(question, userId) {
  const { data } = await doubtAPI.solve(question, userId);
  return parseResponse(data.answer);
}

async function fetchRecent(userId, limit = 6) {
  const { data } = await doubtAPI.recent(userId, limit);
  console.log('🔍 Recent API response:', JSON.stringify(data)); // ADD THIS
  return Array.isArray(data) ? data : (data.doubts || []);
}

// ─────────────────────────────────────────────
//  ConceptTag
// ─────────────────────────────────────────────
function ConceptTag({ label, C }) {
  return (
    <View style={[tt.tag, { borderColor: C.border, backgroundColor: C.card }]}>
      <Text style={[tt.tagText, { color: C.sub }]}>{label}</Text>
    </View>
  );
}
const tt = StyleSheet.create({
  tag:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12 },
});

// ─────────────────────────────────────────────
//  StepCard
// ─────────────────────────────────────────────
function StepCard({ number, title, lines, C }) {
  return (
    <View style={[pp.stepCard, { backgroundColor: C.card, borderLeftColor: C.accent }]}>
      <View style={pp.stepHead}>
        <View style={[pp.stepNum, { backgroundColor: C.accent }]}>
          <Text style={[pp.stepNumTxt, { color: C.bg }]}>{number}</Text>
        </View>
        <Text style={[pp.stepTitle, { color: C.text }]}>{title}</Text>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={[pp.stepLine, { color: C.sub }]}>{l}</Text>
      ))}
    </View>
  );
}
const pp = StyleSheet.create({
  stepCard:   { borderRadius: 12, padding: 14, borderLeftWidth: 3, marginBottom: 8 },
  stepHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepNum:    { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { fontWeight: '800', fontSize: 13 },
  stepTitle:  { fontWeight: '700', fontSize: 14, flex: 1 },
  stepLine:   { fontSize: 13, lineHeight: 20, marginLeft: 36, marginTop: 2 },
});

// ─────────────────────────────────────────────
//  Sidebar
// ─────────────────────────────────────────────
function Sidebar({ anim, onClose, onSelectRecent, recents, loadingRecents, C }) {
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-SIDEBAR_W - 10, 0] });

  return (
    <Animated.View style={[
      sb.sidebar,
      { width: SIDEBAR_W, backgroundColor: C.surface, borderRightColor: C.border },
      !isTablet && { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 200, transform: [{ translateX }] },
    ]}>
      <View style={sb.top}>
        <Text style={[sb.title, { color: C.text }]}>🕐  Recent Doubts</Text>
        {!isTablet && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ color: C.sub, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {loadingRecents && (
          <ActivityIndicator size="small" color={C.accent} style={{ marginTop: 20 }} />
        )}
        {!loadingRecents && recents.length === 0 && (
          <Text style={[sb.emptyTxt, { color: C.muted }]}>No recently asked doubts.</Text>
        )}
        {recents.map((item, i) => (
          <TouchableOpacity
            key={item._id || i}
            style={[sb.item, { borderBottomColor: C.border }]}
            activeOpacity={0.7}
            onPress={() => { onSelectRecent(item.question); if (!isTablet) onClose(); }}
          >
            <Text style={[sb.time, { color: C.muted, marginBottom: 3 }]}>{timeAgo(item.createdAt)}</Text>
            <Text style={[sb.q, { color: C[COLOR_KEYS[i % 3]] }]} numberOfLines={2}>
              {item.question || item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[sb.userBar, { borderTopColor: C.border }]}>
        <View style={[sb.avatar, { backgroundColor: C.accent }]}>
          <Text style={[sb.avatarTxt, { color: C.bg }]}>AJ</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sb.userName, { color: C.text }]}>Alex Johnson</Text>
          <Text style={[sb.userRole, { color: C.muted }]}>PREMIUM USER</Text>
        </View>
        <TouchableOpacity>
          <Text style={{ color: C.muted, fontSize: 18 }}>⚙</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const sb = StyleSheet.create({
  sidebar:   { borderRightWidth: 1, paddingTop: 14, paddingHorizontal: 12, flexDirection: 'column' },
  top:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title:     { fontWeight: '700', fontSize: 14 },
  emptyTxt:  { fontSize: 12, textAlign: 'center', marginTop: 24 },
  item:      { paddingVertical: 10, borderBottomWidth: 1 },
  time:      { fontSize: 10 },
  q:         { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  userBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, marginTop: 8 },
  avatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '800', fontSize: 13 },
  userName:  { fontWeight: '600', fontSize: 13 },
  userRole:  { fontSize: 10, letterSpacing: 0.6 },
});

// ─────────────────────────────────────────────
//  Result view
// ─────────────────────────────────────────────
function ResultView({ result, anim, C }) {
  const scale      = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <Animated.View style={[rv.wrap, { opacity: anim, transform: [{ scale }, { translateY }] }]}>
      <View style={rv.statusRow}>
        <View style={[rv.dot, { backgroundColor: C.green }]} />
        <Text style={[rv.statusTxt, { color: C.green }]}>AI ANALYSIS COMPLETE</Text>
        <View style={[rv.dot, { backgroundColor: C.green }]} />
      </View>

      <View style={[rv.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={rv.head}>
          <View style={[rv.iconBox, { backgroundColor: C.accentDim }]}>
            <Text style={{ fontSize: 22 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[rv.title, { color: C.text }]}>{result.title}</Text>
            <Text style={[rv.titleSub, { color: C.muted }]}>AI · step-by-step solution</Text>
          </View>
        </View>

        <Text style={[rv.intro, { color: C.sub }]}>{result.intro}</Text>

        {result.steps.length > 0 && (
          <>
            <Text style={[rv.sectionLabel, { color: C.muted }]}>STEP-BY-STEP BREAKDOWN</Text>
            {result.steps.map((step, i) => (
              <StepCard key={i} number={step.number} title={step.title} lines={step.lines} C={C} />
            ))}
          </>
        )}

        {result.steps.length === 0 && (
          <View style={[rv.rawCard, { backgroundColor: C.card }]}>
            <Text style={[rv.rawTxt, { color: C.sub }]}>{result.raw}</Text>
          </View>
        )}

        {result.tags.length > 0 && (
          <>
            <Text style={[rv.sectionLabel, { color: C.muted, marginTop: 4 }]}>KEY CONCEPTS</Text>
            <View style={rv.tagsRow}>
              {result.tags.map((tag, i) => <ConceptTag key={i} label={tag} C={C} />)}
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}
const rv = StyleSheet.create({
  wrap:        { width: '100%', maxWidth: isDesktop ? 860 : '100%', gap: 14 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  card:        { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  head:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:       { fontWeight: '700', fontSize: 17 },
  titleSub:    { fontSize: 12, marginTop: 2 },
  intro:       { fontSize: 13.5, lineHeight: 22 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  rawCard:     { borderRadius: 12, padding: 14 },
  rawTxt:      { fontSize: 13, lineHeight: 21 },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────
const MAIN_PAD = isDesktop ? 44 : isTablet ? 28 : 18;
const MAX_W    = isDesktop ? 860 : '100%';

export default function AIDoubtResolver({ onBack, themeC, onThemeToggle, user }) {
  const C = buildC(themeC);

  const [doubt,          setDoubt]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(isTablet);
  const [recents,        setRecents]        = useState([]);
  const [loadingRecents, setLoadingRecents] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(isTablet ? 1 : 0)).current;
  const resultAnim  = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef(null);

  useEffect(() => { loadRecents(); }, []);

  const loadRecents = useCallback(async () => {
    setLoadingRecents(true);
    try {
      const userId = user?._id || user?.id || 'anonymous';
      const data = await fetchRecent(userId, 6);
      setRecents(data);
    } catch (e) {
      console.warn('Could not load recents:', e.message);
    } finally {
      setLoadingRecents(false);
    }
  }, [user]);

  const handleSolveWithQuestion = useCallback(async (question) => {
  if (!question.trim()) return;

  setLoading(true); setError(''); setResult(null); resultAnim.setValue(0);

  try {
    const userId = user?._id || user?.id || 'anonymous';
    const res = await solveDoubt(question, userId);
    setResult(res);
    Animated.spring(resultAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
    loadRecents();
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}, [loadRecents]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    Animated.spring(sidebarAnim, { toValue: 0, tension: 85, friction: 10, useNativeDriver: true }).start();
  }, []);

const handleSolve = useCallback(async () => {
  if (!doubt.trim()) { setError('Please type a question.'); return; }
  await handleSolveWithQuestion(doubt);
}, [doubt, handleSolveWithQuestion]);

  return (
    <SafeAreaView style={[n.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.surface} />

      {/*─ Nav ── */}
      <View style={[n.topNav, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={n.navLeft}>
          <TouchableOpacity onPress={onBack} style={n.menuBtn} activeOpacity={0.75}>
            <Text style={[n.menuIcon, { color: C.text }]}>←</Text>
          </TouchableOpacity>
          <View style={n.logo}>
            <View style={[n.logoBox, { backgroundColor: C.accent }]}>
              <Text style={[n.logoLetter, { color: C.bg }]}>C</Text>
            </View>
            <View>
              <Text style={[n.logoName, { color: C.text }]}>UniVerse</Text>
              <Text style={[n.logoTag,  { color: C.muted }]}>AI Doubt Resolver</Text>
            </View>
          </View>
        </View>

        <View style={n.navRight}>
          {isTablet && (
            <Text style={[n.breadcrumb, { color: C.sub }]}>
              Dashboard{'  ›  '}
              <Text style={{ color: C.blue }}>AI Doubt Resolver</Text>
            </Text>
          )}
          {onThemeToggle && (
            <TouchableOpacity style={[n.themeBtn, { borderColor: C.border }]} onPress={onThemeToggle}>
              <Text style={{ fontSize: 16 }}>{C.moonIcon}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Layout ── */}
      <View style={n.layout}>
        {(isTablet || sidebarOpen) && (
          <Sidebar
            anim={sidebarAnim}
            onClose={closeSidebar}
           onSelectRecent={q => {
  setDoubt(q);
  handleSolveWithQuestion(q);
}}
            recents={recents}
            loadingRecents={loadingRecents}
            C={C}
          />
        )}
        {!isTablet && sidebarOpen && (
          <TouchableOpacity style={n.backdrop} activeOpacity={1} onPress={closeSidebar} />
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={n.main}
            contentContainerStyle={[n.mainContent, { alignItems: isDesktop ? 'center' : 'stretch' }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!isTablet && (
              <Text style={[n.breadcrumb, { color: C.sub, marginBottom: 18 }]}>
                Dashboard {'›'} <Text style={{ color: C.blue }}>AI Doubt Resolver</Text>
              </Text>
            )}

            {/* Hero */}
            <View style={[n.hero, { width: '100%', maxWidth: MAX_W }]}>
              <Text style={[n.heroTitle, { color: C.text }]}>What are we learning today?</Text>
              <Text style={[n.heroSub, { color: C.sub }]}>
                Type your doubt below and get a clear, step-by-step AI explanation instantly.
              </Text>
            </View>

            {/* Input card */}
            <View style={[n.inputCard, { backgroundColor: C.card, borderColor: C.border, width: '100%', maxWidth: MAX_W }]}>
              <TextInput
                style={[n.textInput, { color: C.text, minHeight: isDesktop ? 130 : 95 }]}
                placeholder="Type your doubt here… (e.g. Solve 2x² − 4x + 1 = 0)"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={isDesktop ? 6 : 4}
                value={doubt}
                onChangeText={setDoubt}
                textAlignVertical="top"
              />

              <View style={[n.divider, { backgroundColor: C.border }]} />

              <View style={n.actionRow}>
                <TouchableOpacity
                  style={[n.solveBtn, { backgroundColor: loading ? C.muted : C.green }]}
                  onPress={handleSolve}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading && <ActivityIndicator size="small" color={C.bg} style={{ marginRight: 6 }} />}
                  <Text style={[n.solveIcon, { color: C.bg }]}>{loading ? '' : '✨  '}</Text>
                  <Text style={[n.solveTxt, { color: C.bg }]}>{loading ? 'Solving…' : 'Solve Doubt'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!error && (
              <View style={[n.errorBox, { backgroundColor: C.dangerDim, borderColor: C.danger + '55', width: '100%', maxWidth: MAX_W }]}>
                <Text style={[n.errorTxt, { color: C.danger }]}>⚠️  {error}</Text>
              </View>
            )}

            {result && <ResultView result={result} anim={resultAnim} C={C} />}

            <View style={{ height: 50 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Layout styles
// ─────────────────────────────────────────────
const n = StyleSheet.create({
  safe:        { flex: 1 },
  topNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, zIndex: 10 },
  navLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn:     { padding: 4 },
  menuIcon:    { fontSize: 20 },
  logo:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetter:  { fontWeight: '900', fontSize: 17 },
  logoName:    { fontWeight: '700', fontSize: 15 },
  logoTag:     { fontSize: 11 },
  breadcrumb:  { fontSize: 12 },
  themeBtn:    { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  layout:      { flex: 1, flexDirection: 'row' },
  backdrop:    { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 150 },
  main:        { flex: 1 },
  mainContent: { padding: MAIN_PAD, paddingBottom: 60 },
  hero:        { alignItems: 'center', marginBottom: 28 },
  heroTitle:   { fontSize: isDesktop ? 30 : isTablet ? 26 : 22, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  heroSub:     { fontSize: 13.5, textAlign: 'center', lineHeight: 21, maxWidth: 560 },
  inputCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  textInput:   { padding: 16, fontSize: 14, lineHeight: 22 },
  divider:     { height: 1 },
  actionRow:   { padding: 12 },
  solveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, paddingVertical: 14 },
  solveIcon:   { fontSize: 14 },
  solveTxt:    { fontWeight: '700', fontSize: 14 },
  errorBox:    { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:    { fontSize: 13 },
});