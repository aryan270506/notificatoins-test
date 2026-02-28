/**
 * Campus360 – Parentmaindashboard
 * Mobile:  hamburger (three lines) top-left → sliding sidebar from LEFT
 * Desktop: persistent sidebar on left, no hamburger
 */

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Import your page components ──────────────────────────────────────────────
import Dashboardpage from './dashboardpage';
import Analytics from '../Analytics/Analytics';
import Message from '../Message/Message';
import Examresult from '../EXAM/Examresult';
import ParentFinance from '../Finance/Finance';
import ParentSchedule from '../Schedule/Schedule';

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const DARK = {
  mode: 'dark',

  // Backgrounds — deep navy with clear depth layers
  bg:          '#080f1a',   // deepest background
  sidebar:     '#0c1623',   // sidebar, slightly lighter
  card:        '#0f1e30',   // card surface
  cardBorder:  '#162840',   // subtle card border
  cardDark:    '#091526',   // inset / nested card

  // Brand & accents
  accent:      '#1a4080',   // muted blue for active nav, badges
  blue:        '#2563eb',   // primary action blue
  blueLight:   '#60a5fa',   // highlights, links, active text
  teal:        '#0ea5a0',   // success, attendance good
  orange:      '#f59e0b',   // warnings, medium priority
  red:         '#ef4444',   // errors, high priority

  // Text
  white:       '#f0f6ff',   // primary text (not pure white — easier on eyes)
  sub:         '#6b90b8',   // secondary text
  muted:       '#344f6e',   // placeholder, disabled, faint labels

  // Component-specific
  profileCard: '#112240',
  chipBg:      '#152d50',
  searchBg:    '#0f1e30',
  btnBg:       '#f0f6ff',
  btnTxt:      '#080f1a',
  moonIcon:    '🌙',
};

const LIGHT = {
  mode: 'light',

  // Backgrounds — clean warm whites with subtle blue tint
  bg:          '#f0f4f8',   // page background
  sidebar:     '#dce8f5',   // sidebar
  card:        '#ffffff',   // card surface (pure white for contrast)
  cardBorder:  '#c2d4e8',   // border
  cardDark:    '#e8f0f8',   // inset / nested card

  // Brand & accents (keep same hue, adjust lightness for light bg)
  accent:      '#1d4ed8',
  blue:        '#2563eb',
  blueLight:   '#1d4ed8',   // darker in light mode for legibility
  teal:        '#0f766e',
  orange:      '#d97706',
  red:         '#dc2626',

  // Text
  white:       '#0d1f35',   // primary text (dark navy, not pure black)
  sub:         '#334f6b',   // secondary text
  muted:       '#7096b8',   // placeholder, disabled

  // Component-specific
  profileCard: '#ddeaf8',
  chipBg:      '#ccdff2',
  searchBg:    '#eaf2fb',
  btnBg:       '#0d1f35',
  btnTxt:      '#ffffff',
  moonIcon:    '☀️',
};

// ─── Theme Context (exported so Dashboardpage can consume it) ─────────────────
export const ThemeContext = createContext({ C: DARK, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

const BREAKPOINT = 768;
const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',   emoji: '⊞' },
  { key: 'schedule',  label: 'Schedule',    emoji: '📅' },
  { key: 'analytics', label: 'Analytics',   emoji: '📊' },
  { key: 'exam',      label: 'Exam Results',emoji: '📝' },
  { key: 'Message',   label: 'Message',     emoji: '✉️' },
  { key: 'finance',   label: 'Finance',     emoji: '🗒️' },
];

// ─── Renders the correct page ─────────────────────────────────────────────────
function PageContent({ activeKey, setActiveKey }) {
  switch (activeKey) {
    case 'dashboard': return <Dashboardpage setActiveKey={setActiveKey} />;
    case 'analytics': return <Analytics />;
    case 'exam':      return <Examresult />;
    case 'Message':   return <Message  setActiveKey={setActiveKey}/>;
    case 'finance':   return <ParentFinance />;
    case 'schedule':  return <ParentSchedule />;
    default:          return <Dashboardpage setActiveKey={setActiveKey} />;
  }
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────
function SidebarContent({ activeKey, onSelect, onClose, isDesktop }) {
  const { C } = useTheme();
  const s = makeSidebarStyles(C);

  return (
    <View style={[s.sidebar, isDesktop ? s.sidebarDesktop : s.sidebarMobile]}>
      {/* Logo row */}
      <View style={s.logoRow}>
        <View style={s.logoBadge}>
          <Text style={{ fontSize: 20 }}>🎓</Text>
        </View>
        <Text style={s.logoText}>Campus360</Text>
        {!isDesktop && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: C.sub, fontSize: 20, fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nav Items */}
      <View style={s.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              onPress={() => { onSelect(item.key); if (!isDesktop) onClose(); }}
              activeOpacity={0.75}
            >
              <Text style={[s.navEmoji, { opacity: isActive ? 1 : 0.5 }]}>{item.emoji}</Text>
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
              {isActive && <View style={s.navPip} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={s.sidebarFooter}>
        <View style={s.parentAvatar}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
        <View>
          <Text style={s.parentLabel}>Parent Access</Text>
          <Text style={s.parentName}>Robert Anderson</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Hamburger Icon ───────────────────────────────────────────────────────────
function HamburgerIcon() {
  const { C } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {[0,1,2].map(i => (
        <View key={i} style={{ width: 24, height: 2.5, backgroundColor: C.blueLight, borderRadius: 2 }} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Parentmaindashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;

  const [activeKey, setActiveKey] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Theme state lives here (single source of truth) ──
  const [isDark, setIsDark] = useState(true);
  const C = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark(prev => !prev);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.timing(overlayAnim, {
        toValue: drawerOpen ? 1 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  useEffect(() => {
    if (isDesktop && drawerOpen) setDrawerOpen(false);
  }, [isDesktop]);

  const s = makeShellStyles(C);

  return (
    <ThemeContext.Provider value={{ C, toggleTheme }}>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={C.bg}
        />
        <View style={s.appShell}>

          {/* Desktop: persistent sidebar */}
          {isDesktop && (
            <SidebarContent
              activeKey={activeKey}
              onSelect={setActiveKey}
              onClose={() => {}}
              isDesktop
            />
          )}

          {/* Main Content */}
          <View style={s.content}>

            {/* Mobile top bar */}
            {!isDesktop && (
              <View style={s.topBar}>
                <TouchableOpacity
                  style={{ padding: 6 }}
                  onPress={() => setDrawerOpen(true)}
                  activeOpacity={0.7}
                >
                  <HamburgerIcon />
                </TouchableOpacity>
                <Text style={s.topBarTitle}>Campus360</Text>
                <View style={{ width: 40 }} />
              </View>
            )}

            <PageContent activeKey={activeKey} setActiveKey={setActiveKey} />
          </View>

          {/* Mobile: drawer + overlay */}
          {!isDesktop && (
            <>
              <Animated.View
                pointerEvents={drawerOpen ? 'auto' : 'none'}
                style={[s.overlay, { opacity: overlayAnim }]}
              >
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={() => setDrawerOpen(false)}
                  activeOpacity={1}
                />
              </Animated.View>

              <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }], backgroundColor: C.sidebar }]}>
                <SidebarContent
                  activeKey={activeKey}
                  onSelect={setActiveKey}
                  onClose={() => setDrawerOpen(false)}
                  isDesktop={false}
                />
              </Animated.View>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
function makeShellStyles(C) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.bg },
    appShell:   { flex: 1, flexDirection: 'row' },
    content:    { flex: 1, backgroundColor: C.bg },
    topBar:     { height: 58, backgroundColor: C.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    topBarTitle:{ color: C.white, fontSize: 17, fontWeight: '800' },
    overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
    drawer:     { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, elevation: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14, flexDirection: 'column' },
  });
}

function makeSidebarStyles(C) {
  return StyleSheet.create({
    sidebar:        { backgroundColor: C.sidebar, paddingHorizontal: 16, paddingBottom: 24, borderRightWidth: 1, borderRightColor: C.cardBorder, flexDirection: 'column' },
    sidebarDesktop: { width: 230, paddingTop: 40, height: '100%' },
    sidebarMobile:  { flex: 1, paddingTop: 50 },
    logoRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 10 },
    logoBadge:      { width: 40, height: 40, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    logoText:       { color: C.white, fontSize: 18, fontWeight: '800', flex: 1 },
    navList:        { flex: 1, gap: 4 },
    navItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, gap: 10 },
    navItemActive:  { backgroundColor: C.accent },
    navEmoji:       { fontSize: 17 },
    navLabel:       { color: C.sub, fontSize: 14, fontWeight: '500', flex: 1 },
    navLabelActive: { color: C.white, fontWeight: '700' },
    navPip:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blueLight },
    sidebarFooter:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.cardBorder, marginTop: 20 },
    parentAvatar:   { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    parentLabel:    { color: C.sub, fontSize: 11 },
    parentName:     { color: C.white, fontSize: 13, fontWeight: '600' },
  });
}