/**
 * UniVerse – Parentmaindashboard
 * Mobile:  hamburger → sliding sidebar from LEFT
 * Desktop: persistent sidebar on left
 * Tab access (lock/unlock) enforced from Committee permissions
 */

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  StatusBar, useWindowDimensions, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';

import Dashboardpage  from './dashboardpage';
import Analytics      from '../Analytics/Analytics';
import Message        from '../Message/Message';
import Examresult     from '../EXAM/Examresult';
import ParentFinance  from '../Finance/Finance';
import ParentSchedule from '../Schedule/Schedule';

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const DARK = {
  mode: 'dark', bg: '#080f1a', sidebar: '#0c1623', card: '#0f1e30',
  cardBorder: '#162840', accent: '#1a4080', blue: '#2563eb', blueLight: '#60a5fa',
  teal: '#0ea5a0', orange: '#f59e0b', red: '#ef4444', white: '#f0f6ff',
  sub: '#6b90b8', muted: '#344f6e',
};
const LIGHT = {
  mode: 'light', bg: '#f0f4f8', sidebar: '#dce8f5', card: '#ffffff',
  cardBorder: '#c2d4e8', accent: '#1d4ed8', blue: '#2563eb', blueLight: '#1d4ed8',
  teal: '#0f766e', orange: '#d97706', red: '#dc2626', white: '#0d1f35',
  sub: '#334f6b', muted: '#7096b8',
};

export const ThemeContext = createContext({ C: DARK, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

const BREAKPOINT  = 768;
const DRAWER_WIDTH= 260;

// ─── Nav Items — id MUST match PermissionDashboard ALL_TABS keys for Parent ───
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',    emoji: '⊞' },
  { key: 'schedule',  label: 'Schedule',     emoji: '📅' },
  { key: 'analytics', label: 'Analytics',    emoji: '📊' },
  { key: 'exam',      label: 'Exam Results', emoji: '📝' },
  { key: 'Message',   label: 'Message',      emoji: '✉️' },
  { key: 'finance',   label: 'Finance',      emoji: '🗒️' },
];

// ─── Platform-aware "permission denied" alert ─────────────────────────────────
const showDeniedAlert = () => {
  if (Platform.OS === 'web') {
    window.alert('Permission denied from developers');
  } else {
    Alert.alert('Access Restricted', 'Permission denied from developers');
  }
};

// ─── Locked Screen ────────────────────────────────────────────────────────────
const LockedScreen = ({ C }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
                 backgroundColor: C?.bg || '#080f1a', gap: 12 }}>
    <Text style={{ fontSize: 48 }}>🔒</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: C?.white || '#f0f6ff' }}>
      Access Restricted
    </Text>
    <Text style={{ fontSize: 14, color: C?.sub || '#6b90b8', textAlign: 'center', maxWidth: 260 }}>
      Access denied by developers
    </Text>
  </View>
);

// ─── Updated PageContent — now receives tabAccess ─────────────────────────────
function PageContent({ activeKey, setActiveKey, tabAccess, C }) {
  // If locked, show lock screen instead of real page
  if (tabAccess?.[activeKey] === false) return <LockedScreen C={C} />;

  switch (activeKey) {
    case 'dashboard': return <Dashboardpage setActiveKey={setActiveKey} />;
    case 'analytics': return <Analytics />;
    case 'exam':      return <Examresult />;
    case 'Message':   return <Message setActiveKey={setActiveKey} />;
    case 'finance':   return <ParentFinance />;
    case 'schedule':  return <ParentSchedule />;
    default:          return <Dashboardpage setActiveKey={setActiveKey} />;
  }
}
// ─── Sidebar Content ──────────────────────────────────────────────────────────
function SidebarContent({ activeKey, onSelect, onClose, isDesktop, onLogout, parentName, tabAccess }) {
  const { C } = useTheme();
  const st = makeSidebarStyles(C);

  const handleLogoutPress = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) { if (!isDesktop) onClose?.(); onLogout?.(); }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { if (!isDesktop) onClose?.(); onLogout?.(); } },
      ], { cancelable: true });
    }
  };

  return (
    <View style={[st.sidebar, isDesktop ? st.sidebarDesktop : st.sidebarMobile]}>
      {/* Logo */}
      <View style={st.logoRow}>
        <View style={st.logoBadge}><Text style={{ fontSize: 20 }}>🎓</Text></View>
        <Text style={st.logoText}>UniVerse</Text>
        {!isDesktop && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: C.sub, fontSize: 20, fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nav */}
      <View style={st.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey;
          const isLocked = tabAccess && tabAccess[item.key] === false;
          return (
            <TouchableOpacity
              key={item.key}
              style={[st.navItem, isActive && st.navItemActive, isLocked && st.navItemLocked]}
              onPress={() => {
                if (isLocked) { showDeniedAlert(); return; }
                onSelect(item.key);
                if (!isDesktop) onClose();
              }}
              activeOpacity={0.75}
            >
              <Text style={[st.navEmoji, { opacity: isActive ? 1 : 0.5 }]}>{item.emoji}</Text>
              <Text style={[st.navLabel, isActive && !isLocked && st.navLabelActive]}>{item.label}</Text>
              {isActive && !isLocked && <View style={st.navPip} />}
              {isLocked && <Text style={st.lockIcon}>🔒</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={st.sidebarFooter}>
        <View style={st.parentAvatar}><Text style={{ fontSize: 16 }}>👤</Text></View>
        <View style={st.footerInfo}>
          <Text style={st.parentLabel}>Parent Access</Text>
          <Text style={st.parentName} numberOfLines={1}>{parentName || 'Parent'}</Text>
        </View>
        <TouchableOpacity style={st.logoutBtn} onPress={handleLogoutPress} activeOpacity={0.7}>
          <Text style={st.logoutIcon}>↪</Text>
          <Text style={st.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HamburgerIcon() {
  const { C } = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: 24, height: 2.5, backgroundColor: C.blueLight, borderRadius: 2 }} />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Parentmaindashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;
  const navigation = useNavigation();

  const [activeKey,   setActiveKey]   = useState('dashboard');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [parentName,  setParentName]  = useState('');
  const [isDark,      setIsDark]      = useState(true);
  const C = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark(p => !p);

  // ── Tab Access ─────────────────────────────────────────────────────────────
  const [tabAccess, setTabAccess] = useState({});
  useEffect(() => {
    axiosInstance.get('/permissions/check/Parent')
      .then(res => setTabAccess(res.data.tabAccess || {}))
      .catch(() => setTabAccess({}));
  }, []);

  const slideAnim   = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        const parts = name.trim().split(/\s+/);
        setParentName(parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : name.trim());
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try { await axiosInstance.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }); }
        catch (error) { console.error('⚠️ Error revoking token:', error.message); }
      }
      await AsyncStorage.multiRemove(['authToken','userId','userRole','userName','parentId','currentScreen']);
      navigation.replace('Login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      Alert.alert('Error', 'Error during logout. Please try again.');
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: drawerOpen ? 0 : -DRAWER_WIDTH, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(overlayAnim, { toValue: drawerOpen ? 1 : 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [drawerOpen]);

  useEffect(() => { if (isDesktop && drawerOpen) setDrawerOpen(false); }, [isDesktop]);

  const sh = makeShellStyles(C);

  const sidebarProps = { activeKey, onSelect: setActiveKey, onClose: () => setDrawerOpen(false), onLogout: handleLogout, parentName, tabAccess };

  return (
    <ThemeContext.Provider value={{ C, toggleTheme }}>
      <SafeAreaView style={sh.root} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
        <View style={sh.appShell}>

          {/* Desktop sidebar */}
          {isDesktop && <SidebarContent {...sidebarProps} isDesktop />}

          {/* Main */}
          <View style={sh.content}>
            {!isDesktop && (
              <View style={sh.topBar}>
                <TouchableOpacity style={{ padding: 6 }} onPress={() => setDrawerOpen(true)} activeOpacity={0.7}>
                  <HamburgerIcon />
                </TouchableOpacity>
                <Text style={sh.topBarTitle}>UniVerse</Text>
                <View style={{ width: 40 }} />
              </View>
            )}
            <PageContent activeKey={activeKey} setActiveKey={setActiveKey} tabAccess={tabAccess} C={C} />
          </View>

          {/* Mobile drawer */}
          {!isDesktop && (
            <>
              <Animated.View pointerEvents={drawerOpen ? 'auto' : 'none'} style={[sh.overlay, { opacity: overlayAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} activeOpacity={1} />
              </Animated.View>
              <Animated.View style={[sh.drawer, { transform: [{ translateX: slideAnim }], backgroundColor: C.sidebar }]}>
                <SidebarContent {...sidebarProps} isDesktop={false} />
              </Animated.View>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}

function makeShellStyles(C) {
  return StyleSheet.create({
    root:        { flex: 1, backgroundColor: C.bg },
    appShell:    { flex: 1, flexDirection: 'row' },
    content:     { flex: 1, backgroundColor: C.bg },
    topBar:      { height: 58, backgroundColor: C.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    topBarTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
    overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
    drawer:      { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, elevation: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14, flexDirection: 'column' },
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
    navItemLocked:  { opacity: 0.55 },
    navEmoji:       { fontSize: 17 },
    navLabel:       { color: C.sub, fontSize: 14, fontWeight: '500', flex: 1 },
    navLabelActive: { color: C.white, fontWeight: '700' },
    navPip:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.blueLight },
    lockIcon:       { fontSize: 13, color: C.red },
    sidebarFooter:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 2, borderTopWidth: 1, borderTopColor: C.cardBorder, marginTop: 20 },
    parentAvatar:   { width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    footerInfo:     { flex: 1, minWidth: 0 },
    parentLabel:    { color: C.sub, fontSize: 10 },
    parentName:     { color: C.white, fontSize: 12, fontWeight: '600' },
    logoutBtn:      { flexShrink: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: C.mode === 'dark' ? '#1c0808' : '#fdecea', borderWidth: 1, borderColor: C.mode === 'dark' ? '#3d1212' : '#f5c6c0' },
    logoutIcon:     { fontSize: 15, color: C.red, transform: [{ scaleX: -1 }] },
    logoutTxt:      { fontSize: 9, fontWeight: '800', color: C.red, letterSpacing: 0.4, marginTop: 1 },
  });
}