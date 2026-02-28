/**
 * Campus360 – AI Doubt Resolver
 * ─────────────────────────────────────────────────────────────
 * React Native · Responsive (mobile + desktop/tablet)
 * Full light/dark theme support via themeC prop
 *
 * DEPENDENCIES:
 *   npx expo install expo-image-picker
 *
 * PROXY:
 *   Start proxy-server.js on your PC first.
 *   Set PROXY_BASE_URL below to your PC's local IP, e.g.:
 *     http://192.168.1.10:3001
 *   Find your IP with: ipconfig (Windows) → IPv4 Address
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Image,
  Dimensions, Animated, Platform, ActivityIndicator,
  KeyboardAvoidingView, Modal, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// ─────────────────────────────────────────────
//  ⚙️  CONFIG — update this to your PC's IP
// ─────────────────────────────────────────────
const PROXY_BASE_URL = 'http://192.168.137.214:3001';

// ─────────────────────────────────────────────
//  Responsive
// ─────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const isTablet  = SW >= 768;
const isDesktop = SW >= 1100;
const SIDEBAR_W = isDesktop ? 260 : isTablet ? 220 : 270;

// ─────────────────────────────────────────────
//  Theme builder — merges passed themeC into
//  AI-Doubt-specific colour tokens
// ─────────────────────────────────────────────
function buildC(themeC) {
  // Detect dark mode from the parent theme's statusBar or bg colour
  const isDark = themeC
    ? themeC.statusBar === 'light-content'
    : true;

  return {
    // Backgrounds
    bg:        isDark ? '#080D1A' : '#F0F4F8',
    surface:   isDark ? '#0F1623' : '#FFFFFF',
    card:      isDark ? '#131C2B' : '#F8FAFC',
    border:    isDark ? '#1C2B3A' : '#CBD5E1',

    // Accent colours — same in both modes
    accent:    '#00D4FF',
    accentDim: 'rgba(0,212,255,0.12)',
    green:     '#00C48C',
    orange:    '#FF8A65',
    blue:      isDark ? '#4FC3F7' : '#2563EB',

    // Text
    text:      isDark ? '#E8F2FF' : '#0F172A',
    sub:       isDark ? '#8BA0B8' : '#475569',
    muted:     isDark ? '#4A6070' : '#94A3B8',

    // Danger
    danger:    '#FF5A5A',
    dangerDim: 'rgba(255,90,90,0.12)',

    // Status bar
    statusBar: isDark ? 'light-content' : 'dark-content',

    // Theme toggle icon (re-used from parent where available)
    moonIcon: themeC?.moonIcon ?? (isDark ? '☀️' : '🌙'),
  };
}

// ─────────────────────────────────────────────
//  Static data
// ─────────────────────────────────────────────
const SUBJECTS = [
 
];

const RECENT = [
  {   colorKey: 'blue',   time: '2h ago',     q: 'Explain the Taylor Series expansion of sin(x) around zero.' },
  {     colorKey: 'green',  time: 'Yesterday',  q: 'How does angular momentum conservation apply to ice skaters?' },
  {     colorKey: 'orange', time: '3 days ago', q: 'Balance: MnO₄⁻ + Fe²⁺ → Mn²⁺ + Fe³⁺' },
  {   colorKey: 'blue',   time: '4 days ago', q: 'Difference between permutations and combinations?' },
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
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

async function callGemini(apiKey, subject, question, imageBase64, imageMime) {
  const content = [];

  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMime || 'image/jpeg', data: imageBase64 },
    });
  }

  content.push({
    type: 'text',
    text: `Subject: ${subject}\n\nQuestion: ${question || 'Please explain or solve the content shown in the image.'}`,
  });

  const res = await fetch(`${PROXY_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      max_tokens: 1500,
      system: `You are an expert ${subject} tutor for students. Give clear, concise, step-by-step answers.
Format your response EXACTLY as:
Line 1: Short solution title (no markdown symbols)
Line 2-3: One or two intro sentences
Numbered steps: Step 1: Title
  Sub-lines with explanation
Final line: Key Concepts: concept1, concept2, concept3`,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status} — check proxy server is running`);
  }

  const data = await res.json();
  return parseResponse(data.content[0]?.text || '');
}

// ─────────────────────────────────────────────
//  Sub-components — all accept C prop
// ─────────────────────────────────────────────
function ConceptTag({ label, C }) {
  return (
    <View style={[t.tag, { borderColor: C.border, backgroundColor: C.card }]}>
      <Text style={[t.tagText, { color: C.sub }]}>{label}</Text>
    </View>
  );
}

const t = StyleSheet.create({
  tag:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12 },
});

function StepCard({ number, title, lines, C }) {
  return (
    <View style={[p.stepCard, { backgroundColor: C.card, borderLeftColor: C.accent }]}>
      <View style={p.stepHead}>
        <View style={[p.stepNum, { backgroundColor: C.accent }]}>
          <Text style={[p.stepNumTxt, { color: C.bg }]}>{number}</Text>
        </View>
        <Text style={[p.stepTitle, { color: C.text }]}>{title}</Text>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={[p.stepLine, { color: C.sub }]}>{l}</Text>
      ))}
    </View>
  );
}

const p = StyleSheet.create({
  stepCard:    { borderRadius: 12, padding: 14, borderLeftWidth: 3, marginBottom: 8 },
  stepHead:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepNum:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt:  { fontWeight: '800', fontSize: 13 },
  stepTitle:   { fontWeight: '700', fontSize: 14, flex: 1 },
  stepLine:    { fontSize: 13, lineHeight: 20, marginLeft: 36, marginTop: 2 },
});

// ─────────────────────────────────────────────
//  API Key Modal
// ─────────────────────────────────────────────
function ApiKeyModal({ visible, current, onSave, onClose, C }) {
  const [val,  setVal]  = useState(current);
  const [show, setShow] = useState(false);
  React.useEffect(() => { if (visible) setVal(current); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={[m.box, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[m.title, { color: C.text }]}>🔑  Set Grok API Key</Text>
          <Text style={[m.sub, { color: C.sub }]}>
            Get your FREE key at:{'\n'}
            https://console.x.ai{'\n\n'}
            Key starts with: xai-...{'\n'}
            Held in memory only — never stored.
          </Text>
          <View style={[m.inputRow, { borderColor: C.border }]}>
            <TextInput
              style={[m.input, { color: C.text }]}
              placeholder="xai-..."
              placeholderTextColor={C.muted}
              value={val}
              onChangeText={setVal}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={m.eyeBtn} onPress={() => setShow(v => !v)}>
              <Text style={{ fontSize: 16 }}>{show ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          <View style={m.actions}>
            <TouchableOpacity style={[m.cancel, { borderColor: C.border }]} onPress={onClose}>
              <Text style={[m.cancelTxt, { color: C.sub }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.save, { backgroundColor: C.green }, !val.trim() && { opacity: 0.4 }]}
              disabled={!val.trim()}
              onPress={() => { onSave(val.trim()); onClose(); }}
            >
              <Text style={[m.saveTxt, { color: C.bg }]}>Save Key</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box:      { borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, borderWidth: 1 },
  title:    { fontWeight: '800', fontSize: 17, marginBottom: 8 },
  sub:      { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  input:    { flex: 1, padding: 12, fontSize: 13 },
  eyeBtn:   { padding: 12 },
  actions:  { flexDirection: 'row', gap: 10 },
  cancel:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderRadius: 10 },
  cancelTxt:{ fontWeight: '600', fontSize: 14 },
  save:     { flex: 2, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10 },
  saveTxt:  { fontWeight: '700', fontSize: 14 },
});

// ─────────────────────────────────────────────
//  Image Picker Sheet
// ─────────────────────────────────────────────
function ImagePickerSheet({ visible, onGallery, onCamera, onClose, C }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sh.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[sh.box, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <Text style={[sh.title, { color: C.text }]}>Add Image</Text>
          <TouchableOpacity style={[sh.btn, { backgroundColor: C.card }]} onPress={() => { onGallery(); onClose(); }}>
            <Text style={sh.btnIcon}>🖼</Text>
            <Text style={[sh.btnTxt, { color: C.text }]}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[sh.btn, { backgroundColor: C.card }]} onPress={() => { onCamera(); onClose(); }}>
            <Text style={sh.btnIcon}>📷</Text>
            <Text style={[sh.btnTxt, { color: C.text }]}>Take a Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[sh.btn, { marginTop: 4, backgroundColor: C.card }]} onPress={onClose}>
            <Text style={[sh.btnTxt, { color: C.danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sh = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  box:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderTopWidth: 1 },
  title:   { fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 10 },
  btnIcon: { fontSize: 20 },
  btnTxt:  { fontSize: 15, fontWeight: '500' },
});

// ─────────────────────────────────────────────
//  Sidebar
// ─────────────────────────────────────────────
function Sidebar({ anim, onClose, onSelectRecent, C }) {
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
        {RECENT.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[sb.item, { borderBottomColor: C.border }]}
            activeOpacity={0.7}
            onPress={() => { onSelectRecent(item.q); if (!isTablet) onClose(); }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={[sb.cat, { color: C[item.colorKey] }]}>{item.cat}</Text>
              <Text style={[sb.time, { color: C.muted }]}>{item.time}</Text>
            </View>
            <Text style={[sb.q, { color: C.sub }]} numberOfLines={2}>{item.q}</Text>
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
  sidebar:  { borderRightWidth: 1, paddingTop: 14, paddingHorizontal: 12, flexDirection: 'column' },
  top:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title:    { fontWeight: '700', fontSize: 14 },
  item:     { paddingVertical: 10, borderBottomWidth: 1 },
  cat:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  time:     { fontSize: 10 },
  q:        { fontSize: 12, lineHeight: 17, marginTop: 2 },
  userBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, marginTop: 8 },
  avatar:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:{ fontWeight: '800', fontSize: 13 },
  userName: { fontWeight: '600', fontSize: 13 },
  userRole: { fontSize: 10, letterSpacing: 0.6 },
});

// ─────────────────────────────────────────────
//  Result view
// ─────────────────────────────────────────────
function ResultView({ result, anim, C }) {
  const scale      = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <Animated.View style={[r.wrap, { opacity: anim, transform: [{ scale }, { translateY }] }]}>
      <View style={r.statusRow}>
        <View style={[r.dot, { backgroundColor: C.green }]} />
        <Text style={[r.statusTxt, { color: C.green }]}>AI ANALYSIS COMPLETE</Text>
        <View style={[r.dot, { backgroundColor: C.green }]} />
      </View>

      <View style={[r.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={r.head}>
          <View style={[r.iconBox, { backgroundColor: C.accentDim }]}>
            <Text style={{ fontSize: 22 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[r.title, { color: C.text }]}>{result.title}</Text>
            <Text style={[r.titleSub, { color: C.muted }]}>Grok · step-by-step solution</Text>
          </View>
          <TouchableOpacity style={r.iconBtn}><Text style={[r.iconBtnTxt, { color: C.sub }]}>↗</Text></TouchableOpacity>
          <TouchableOpacity style={r.iconBtn}><Text style={[r.iconBtnTxt, { color: C.sub }]}>♡</Text></TouchableOpacity>
        </View>

        <Text style={[r.intro, { color: C.sub }]}>{result.intro}</Text>

        {result.steps.length > 0 && (
          <>
            <Text style={[r.sectionLabel, { color: C.muted }]}>STEP-BY-STEP BREAKDOWN</Text>
            {result.steps.map((step, i) => (
              <StepCard key={i} number={step.number} title={step.title} lines={step.lines} C={C} />
            ))}
          </>
        )}

        {result.steps.length === 0 && (
          <View style={[r.rawCard, { backgroundColor: C.card }]}>
            <Text style={[r.rawTxt, { color: C.sub }]}>{result.raw}</Text>
          </View>
        )}

        {result.tags.length > 0 && (
          <>
            <Text style={[r.sectionLabel, { color: C.muted, marginTop: 4 }]}>KEY CONCEPTS</Text>
            <View style={r.tagsRow}>
              {result.tags.map((tag, i) => <ConceptTag key={i} label={tag} C={C} />)}
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const r = StyleSheet.create({
  wrap:       { width: '100%', maxWidth: isDesktop ? 860 : '100%', gap: 14 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  statusTxt:  { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  card:       { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  head:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontWeight: '700', fontSize: 17 },
  titleSub:   { fontSize: 12, marginTop: 2 },
  iconBtn:    { padding: 6 },
  iconBtnTxt: { fontSize: 16 },
  intro:      { fontSize: 13.5, lineHeight: 22 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  rawCard:    { borderRadius: 12, padding: 14 },
  rawTxt:     { fontSize: 13, lineHeight: 21 },
  tagsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────
const MAIN_PAD = isDesktop ? 44 : isTablet ? 28 : 18;
const MAX_W    = isDesktop ? 860 : '100%';

export default function AIDoubtResolver({ onBack, themeC, onThemeToggle }) {
  // Derive component-level colour tokens from the parent theme
  const C = buildC(themeC);

  const [subject,     setSubject]     = useState('Mathematics');
  const [doubt,       setDoubt]       = useState('');
  const [apiKey,      setApiKey]      = useState('');
  const [keyVisible,  setKeyVisible]  = useState(false);
  const [imgSheet,    setImgSheet]    = useState(false);
  const [image,       setImage]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(isTablet);

  const sidebarAnim = useRef(new Animated.Value(isTablet ? 1 : 0)).current;
  const resultAnim  = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef(null);

  const toggleSidebar = useCallback(() => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    Animated.spring(sidebarAnim, { toValue: next ? 1 : 0, tension: 85, friction: 10, useNativeDriver: true }).start();
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    Animated.spring(sidebarAnim, { toValue: 0, tension: 85, friction: 10, useNativeDriver: true }).start();
  }, []);

  const _pick = useCallback(async (useCamera) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', useCamera ? 'Camera access denied.' : 'Photo library access denied.');
        return;
      }
      const fn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82, base64: true, allowsEditing: true, aspect: [4, 3] });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setImage({ uri: a.uri, base64: a.base64, mime: a.mimeType || 'image/jpeg' });
        setError('');
      }
    } catch (e) { setError('Image error: ' + e.message); }
  }, []);

  const handleSolve = useCallback(async () => {
    if (!doubt.trim() && !image) { setError('Please type a question or attach an image.'); return; }
    if (!apiKey) { setKeyVisible(true); setError('Please set your API key first.'); return; }

    setLoading(true); setError(''); setResult(null); resultAnim.setValue(0);

    try {
      const res = await callGemini(apiKey, subject, doubt, image?.base64 ?? null, image?.mime ?? null);
      setResult(res);
      Animated.spring(resultAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [doubt, image, apiKey, subject]);

  return (
    <SafeAreaView style={[n.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.surface} />

      {/* ── Nav ── */}
      <View style={[n.topNav, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={n.navLeft}>
          {/* Back button */}
          <TouchableOpacity onPress={onBack} style={n.menuBtn} activeOpacity={0.75}>
            <Text style={[n.menuIcon, { color: C.text }]}>←</Text>
          </TouchableOpacity>

          <View style={n.logo}>
            <View style={[n.logoBox, { backgroundColor: C.accent }]}>
              <Text style={[n.logoLetter, { color: C.bg }]}>C</Text>
            </View>
            <View>
              <Text style={[n.logoName, { color: C.text }]}>Campus360</Text>
              <Text style={[n.logoTag, { color: C.muted }]}>AI Doubt Resolver</Text>
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

          {/* Theme toggle — fires the same parent toggle */}
          

          <TouchableOpacity
            style={[n.keyBtn, apiKey && { borderColor: C.green + '88' }, { borderColor: C.border }]}
            onPress={() => setKeyVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12 }}>🔑</Text>
            <Text style={[n.keyBtnTxt, { color: apiKey ? C.green : C.blue }]}>
              {apiKey ? 'Key Set ✓' : 'Set API Key'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Proxy banner ── */}
      <View style={[n.proxyBanner, { backgroundColor: C.accentDim, borderBottomColor: C.accent + '33' }]}>
        <Text style={[n.proxyTxt, { color: C.muted }]}>
          ⚡ Grok · Proxy: <Text style={{ color: C.accent }}>{PROXY_BASE_URL}</Text>
          {'  —  '}Make sure proxy-server.js is running
        </Text>
      </View>

      {/* ── Layout ── */}
      <View style={n.layout}>
        {(isTablet || sidebarOpen) && (
          <Sidebar anim={sidebarAnim} onClose={closeSidebar} onSelectRecent={q => setDoubt(q)} C={C} />
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
                Type your doubt or upload a photo of your notes for an AI step-by-step explanation.
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

              {image && (
                <View style={n.imgWrap}>
                  <Image source={{ uri: image.uri }} style={n.imgThumb} resizeMode="cover" />
                  <TouchableOpacity style={n.imgRemove} onPress={() => setImage(null)}>
                    <Text style={n.imgRemoveTxt}>✕</Text>
                  </TouchableOpacity>
                  <View style={n.imgCaption}>
                    <Text style={n.imgCaptionTxt}>📷 Image attached — Grok will analyse it</Text>
                  </View>
                </View>
              )}

              <View style={[n.divider, { backgroundColor: C.border }]} />

              {/* Subject chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={n.chipsRow}>
                {SUBJECTS.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      n.chip,
                      { borderColor: C.border },
                      subject === sub && { borderColor: C.accent, backgroundColor: C.accentDim },
                    ]}
                    onPress={() => setSubject(sub)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      n.chipTxt,
                      { color: subject === sub ? C.accent : C.muted },
                      subject === sub && { fontWeight: '700' },
                    ]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={[n.divider, { backgroundColor: C.border }]} />

              {/* Actions */}
              <View style={n.actionRow}>
                <TouchableOpacity
                  style={[n.uploadBtn, { borderColor: C.border }]}
                  onPress={() => setImgSheet(true)}
                  activeOpacity={0.8}
                >
                  <Text style={n.uploadIcon}>🖼</Text>
                  <Text style={[n.uploadTxt, { color: C.sub }]}>Upload Image</Text>
                </TouchableOpacity>

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

      <ApiKeyModal visible={keyVisible} current={apiKey} onSave={setApiKey} onClose={() => setKeyVisible(false)} C={C} />
      <ImagePickerSheet visible={imgSheet} onGallery={() => _pick(false)} onCamera={() => _pick(true)} onClose={() => setImgSheet(false)} C={C} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Layout styles (no colour tokens here)
// ─────────────────────────────────────────────
const n = StyleSheet.create({
  safe:       { flex: 1 },
  topNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, zIndex: 10 },
  navLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn:    { padding: 4 },
  menuIcon:   { fontSize: 20 },
  logo:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontWeight: '900', fontSize: 17 },
  logoName:   { fontWeight: '700', fontSize: 15 },
  logoTag:    { fontSize: 11 },
  breadcrumb: { fontSize: 12 },
  themeBtn:   { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  keyBtnTxt:  { fontSize: 12, fontWeight: '600' },
  proxyBanner:{ borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 7 },
  proxyTxt:   { fontSize: 11 },
  layout:     { flex: 1, flexDirection: 'row' },
  backdrop:   { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 150 },
  main:       { flex: 1 },
  mainContent:{ padding: MAIN_PAD, paddingBottom: 60 },
  hero:       { alignItems: 'center', marginBottom: 28 },
  heroTitle:  { fontSize: isDesktop ? 30 : isTablet ? 26 : 22, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  heroSub:    { fontSize: 13.5, textAlign: 'center', lineHeight: 21, maxWidth: 560 },
  inputCard:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  textInput:  { padding: 16, fontSize: 14, lineHeight: 22 },
  divider:    { height: 1 },
  chipsRow:   { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  chip:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  chipTxt:    { fontSize: 13 },
  imgWrap:    { margin: 12, alignSelf: 'flex-start' },
  imgThumb:   { width: isDesktop ? 210 : 140, height: isDesktop ? 160 : 105, borderRadius: 12 },
  imgRemove:  { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  imgRemoveTxt:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  imgCaption:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 5 },
  imgCaptionTxt:  { color: '#fff', fontSize: 10, textAlign: 'center' },
  actionRow:  { flexDirection: 'row', padding: 12, gap: 10 },
  uploadBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16 },
  uploadIcon: { fontSize: 15 },
  uploadTxt:  { fontSize: 13 },
  solveBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, paddingVertical: 12 },
  solveIcon:  { fontSize: 14 },
  solveTxt:   { fontWeight: '700', fontSize: 13 },
  errorBox:   { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:   { fontSize: 13 },
});