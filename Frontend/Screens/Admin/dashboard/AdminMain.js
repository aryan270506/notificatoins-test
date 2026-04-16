import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  StatusBar, Dimensions, Platform, ScrollView, Modal, Image, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';
import AdminMainDashboard, { ThemeContext, DARK_COLORS, LIGHT_COLORS, Icon } from './AdminDashboard';
import SecurityLogsScreen from '../logs/SecurityLogsScreen';
import TimeTableScreen from '../timetable/TimeTableManagement';
import AdminAttendancen from '../report/Report';
import Assignment from '../Assignment/Assignment';
import Admissionfees from '../Fees/Admissionfees';
import DataImportCenter from '../DataImportCenter/DataImportCenter';
import SelectionScreen from '../Message/Selectionscreen';
import TeacherManagementDashboard from '../FacultyAssignment/FacultyAssign';


// ─── Nav Items — id keys MUST match PermissionDashboard ALL_TABS for Admin ───
const NAV_ITEMS = [
  { id: 'dashboard',        label: 'Dashboard',       icon: '⊞' },
  { id: 'timetable',        label: 'Timetable',       icon: '📅' },
  { id: 'reports',          label: 'Reports',         icon: '📊' },
  { id: 'assignment',       label: 'Assignment',      icon: '📝' },
  { id: 'faculty-assign',   label: 'Faculty Assign',  icon: '👑' },
  { id: 'admission-fee',    label: 'Admission Fee',   icon: '💰' },
  { id: 'security-logs',    label: 'Security Logs',   icon: '🔒' },
  { id: 'dataimportcenter', label: 'DataImportCenter',icon: '📥' },
  { id: 'messages',         label: 'Messages',        icon: '✉️' },
];

let launchImageLibrary;
try {
  const picker = require('react-native-image-picker');
  launchImageLibrary = picker.launchImageLibrary;
} catch (_) { launchImageLibrary = null; }

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH      = 250;
const DESKTOP_BREAKPOINT = 768;
const isDesktop          = SCREEN_WIDTH >= DESKTOP_BREAKPOINT;

// ─── Platform-aware "permission denied" alert ────────────────────────────────
const showDeniedAlert = () => {
  if (Platform.OS === 'web') {
    window.alert('Permission denied from developers');
  } else {
    Alert.alert('Access Restricted', 'Permission denied from developers');
  }
};

// ─── Locked Screen ────────────────────────────────────────────────────────────
const LockedScreen = ({ isDark }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
                 backgroundColor: isDark ? '#0d1b3e' : '#f0f4f8', gap: 12 }}>
    <Text style={{ fontSize: 48 }}>🔒</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#ffffff' : '#1a2130' }}>
      Access Restricted
    </Text>
    <Text style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                   textAlign: 'center', maxWidth: 260 }}>
      Access denied by developers
    </Text>
  </View>
);

// ─── Updated renderScreen — now receives tabAccess ────────────────────────────
function renderScreen(routeId, isDark, onToggleTheme, messageNavContext, onMessageContextConsumed, onBellPress, unreadCount, tabAccess) {
  // Dashboard is never locked
  if (routeId !== 'dashboard' && tabAccess?.[routeId] === false) {
    return <LockedScreen isDark={isDark} />;
  }

  switch (routeId) {
    case 'dashboard':        return <AdminMainDashboard isDark={isDark} onToggleTheme={onToggleTheme} onBellPress={onBellPress} unreadCount={unreadCount} />;
    case 'admission-fee':    return <Admissionfees />;
    case 'timetable':        return <TimeTableScreen />;
    case 'messages':         return <SelectionScreen initialContext={messageNavContext} onContextConsumed={onMessageContextConsumed} />;
    case 'reports':          return <AdminAttendancen />;
    case 'security-logs':    return <SecurityLogsScreen />;
    case 'assignment':       return <Assignment />;
    case 'faculty-assign':   return <TeacherManagementDashboard />;
    case 'dataimportcenter': return <DataImportCenter />;
    default:
      return (
        <View style={placeholderStyles.container}>
          <Text style={placeholderStyles.icon}>🚧</Text>
          <Text style={placeholderStyles.title}>Coming Soon</Text>
          <Text style={placeholderStyles.sub}>This section is under construction.</Text>
        </View>
      );
  }
}

const placeholderStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1b3e', gap: 10 },
  icon:  { fontSize: 40 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  sub:   { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
});

// ─── Sidebar Content ─────────────────────────────────────────────────────────
function SidebarContent({
  activeItem, onNavPress, onClose, isMobile,
  profilePhoto, onProfilePress, onLogout,
  userName, userInitials, userRole,
  tabAccess,
}) {
  const { isDark } = useContext(ThemeContext);
  const sidebarBg           = isDark ? '#030920ff' : '#ffffff';
  const borderColor         = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const logoTextColor       = isDark ? '#ffffff' : '#1a2130';
  const activeNavBg         = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(26,111,212,0.12)';
  const navMutedColor       = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const navActiveColor      = isDark ? '#ffffff' : '#1a2130';
  const userNameColor       = isDark ? '#ffffff' : '#1a2130';
  const userRoleColor       = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const closeBtnColor       = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const logoutBg            = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';

  return (
    <View style={[sbInner.container, { backgroundColor: sidebarBg }]}>
      {isMobile && (
        <TouchableOpacity style={sbInner.closeBtn} onPress={onClose}>
          <Text style={[sbInner.closeBtnText, { color: closeBtnColor }]}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Logo */}
      <View style={[sbInner.logoContainer, { borderBottomColor: borderColor }]}>
        <View style={sbInner.logoIcon}>
          <Text style={sbInner.logoIconText}>U</Text>
        </View>
        <Text style={[sbInner.logoText, { color: logoTextColor }]}>UniVerse</Text>
      </View>

      {/* Nav */}
      <ScrollView style={sbInner.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeItem === item.id;
          const isLocked = tabAccess && tabAccess[item.id] === false;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                sbInner.navItem,
                isActive && [sbInner.navItemActive, { backgroundColor: activeNavBg }],
                isLocked && sbInner.navItemLocked,
              ]}
              onPress={() => isLocked ? showDeniedAlert() : onNavPress(item)}
              activeOpacity={0.7}
            >
              {isActive && !isLocked && <View style={sbInner.activeIndicator} />}
              <Text style={[sbInner.navIcon, isActive && !isLocked && sbInner.navIconActive]}>
                {item.icon}
              </Text>
              <Text style={[
                sbInner.navLabel,
                { color: isLocked ? navMutedColor : isActive ? navActiveColor : navMutedColor },
                isActive && !isLocked && sbInner.navLabelActive,
              ]}>
                {item.label}
              </Text>
              {isLocked && <Text style={sbInner.lockIcon}>🔒</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User + Logout */}
      <View style={[sbInner.userContainer, { borderTopColor: borderColor }]}>
        <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8} style={sbInner.userAvatarBtn}>
          {profilePhoto
            ? <Image source={{ uri: profilePhoto }} style={sbInner.userAvatarImg} />
            : <View style={sbInner.userAvatar}><Text style={sbInner.userAvatarText}>{userInitials || 'AD'}</Text></View>
          }
          <View style={sbInner.cameraBadge}><Text style={sbInner.cameraBadgeText}>📷</Text></View>
        </TouchableOpacity>
        <View style={sbInner.userInfo}>
          <Text style={[sbInner.userName, { color: userNameColor }]} numberOfLines={1}>{userName || 'Admin'}</Text>
          <Text style={[sbInner.userRole,  { color: userRoleColor  }]} numberOfLines={1}>{userRole  || 'System Admin'}</Text>
        </View>
        <TouchableOpacity style={[sbInner.logoutBtn, { backgroundColor: logoutBg }]} onPress={onLogout} activeOpacity={0.75}>
          <Text style={sbInner.logoutIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function AdminMain({ navigation, route }) {
  const user           = route?.params?.user ?? {};
  const displayName    = user.id || 'Admin';
  const displayInitials= displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayRole    = 'System Admin';

  const [isDark,     setIsDark]     = useState(true);
  const toggleTheme = () => setIsDark(p => !p);
  const colors      = isDark ? DARK_COLORS : LIGHT_COLORS;
  const themeValue  = { isDark, colors };

  // ── Tab Access ─────────────────────────────────────────────────────────────
  const [tabAccess, setTabAccess] = useState({});
  useEffect(() => {
    axiosInstance.get('/permissions/check/Admin')
      .then(res => setTabAccess(res.data.tabAccess || {}))
      .catch(() => setTabAccess({}));
  }, []);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const handleProfilePress = () => setProfileModalVisible(true);
  const pickPhoto = () => {
    if (launchImageLibrary) {
      launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
        if (!response.didCancel && response.assets?.[0]?.uri) {
          setProfilePhoto(response.assets[0].uri);
          setProfileModalVisible(false);
        }
      });
    } else Alert.alert('Image Picker', 'react-native-image-picker is not installed.', [{ text: 'OK' }]);
  };
  const removePhoto = () => { setProfilePhoto(null); setProfileModalVisible(false); };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          try { await axiosInstance.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }); }
          catch (e) { console.error('⚠️ revoke token:', e.message); }
        }
        await AsyncStorage.multiRemove(['authToken','userId','userRole','userName','teacherId','parentId','currentScreen']);
        navigation?.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (e) { alert('Error during logout. Please try again.'); }
    };
    if (Platform.OS === 'web') { if (window.confirm('Logout?')) doLogout(); }
    else Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: doLogout }]);
  };

  const wrapperBg    = isDark ? '#0d1b3e' : colors.bg;
  const sidebarBg    = isDark ? '#0b1437' : '#ffffff';
  const sidebarBrdr  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const topBarBg     = isDark ? '#0b1437' : '#ffffff';
  const topBarBrdr   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const topBarTitle  = isDark ? '#ffffff' : '#1a2130';
  const hamburgerClr = isDark ? '#ffffff' : '#1a2130';
  const modalBg      = isDark ? '#0d1526' : '#ffffff';
  const modalBrdr    = isDark ? '#1e3050' : '#e0e7ef';
  const modalTxt     = isDark ? '#ffffff' : '#1a2130';
  const modalSub     = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [isOpen,      setIsOpen]      = useState(false);
  const [notifications,    setNotifications]    = useState([]);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);
  const [lastSeenAt,       setLastSeenAt]       = useState(() => new Date().toISOString());
  const [messageNavContext,setMessageNavContext] = useState(null);

  useEffect(() => {
    const fetchNotif = async () => {
      try {
        const res = await axiosInstance.get('/messages/notifications/admin');
        if (res.data.success) setNotifications(res.data.data || []);
      } catch (e) { console.error('Failed to fetch notifications:', e); }
    };
    fetchNotif();
    const interval = setInterval(fetchNotif, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount    = notifications.filter(n => new Date(n.timestamp) > new Date(lastSeenAt)).length;
  const handleBellPress= () => setShowNotifPanel(true);
  const handleMarkSeen = () => setLastSeenAt(new Date().toISOString());
  const handleNotifPress = (notif) => {
    setShowNotifPanel(false);
    setLastSeenAt(new Date().toISOString());
    setMessageNavContext({ role: notif.recipientRole, year: String(notif.academicYear), division: notif.division || 'A', messageId: notif.messageId });
    setActiveRoute('messages');
  };

  const slideAnim   = useRef(new Animated.Value(isDesktop ? 0 : -SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDesktop) Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, []);

  const openSidebar = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: 0,             useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };
  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: -SIDEBAR_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  };

  const handleNavPress = (item) => { setActiveRoute(item.id); if (!isDesktop) closeSidebar(); };

  const sidebarProps = {
    activeItem: activeRoute, onNavPress: handleNavPress,
    profilePhoto, onProfilePress: handleProfilePress, onLogout: handleLogout,
    userName: displayName, userInitials: displayInitials, userRole: displayRole,
    tabAccess,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <View style={[s.wrapper, { backgroundColor: wrapperBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0b1437' : '#ffffff'} />

        {/* Desktop sidebar */}
        {isDesktop ? (
          <View style={[s.sidebarDesktop, { backgroundColor: sidebarBg, borderRightColor: sidebarBrdr }]}>
            <SidebarContent {...sidebarProps} isMobile={false} />
          </View>
        ) : (
          <>
            {isOpen && (
              <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSidebar} activeOpacity={1} />
              </Animated.View>
            )}
            <Animated.View style={[s.sidebarMobile, { backgroundColor: sidebarBg, transform: [{ translateX: slideAnim }] }]}>
              <SidebarContent {...sidebarProps} onClose={closeSidebar} isMobile={true} />
            </Animated.View>
          </>
        )}

        {/* Main */}
        <View style={[s.mainContent, { backgroundColor: wrapperBg }]}>
          {!isDesktop && (
            <View style={[s.topBar, { backgroundColor: topBarBg, borderBottomColor: topBarBrdr }]}>
              <TouchableOpacity style={s.hamburger} onPress={openSidebar}>
                <View style={[s.hamburgerLine,                  { backgroundColor: hamburgerClr }]} />
                <View style={[s.hamburgerLine, s.hamburgerMid,  { backgroundColor: hamburgerClr }]} />
                <View style={[s.hamburgerLine,                  { backgroundColor: hamburgerClr }]} />
              </TouchableOpacity>
              <Text style={[s.topBarTitle, { color: topBarTitle }]}>Admin Control Center</Text>
              <TouchableOpacity onPress={handleBellPress} style={ns.bellBtn} activeOpacity={0.7}>
                <Icon name="bell" size={18} color={isDark ? '#8b949e' : '#4a5568'} />
                {unreadCount > 0 && (
                  <View style={ns.bellBadge}>
                    <Text style={ns.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
          <View style={s.pageContent}>
            {renderScreen(activeRoute, isDark, toggleTheme, messageNavContext, () => setMessageNavContext(null), handleBellPress, unreadCount)}
          </View>
        </View>

        {/* Profile Modal */}
        <Modal visible={profileModalVisible} transparent animationType="slide" onRequestClose={() => setProfileModalVisible(false)}>
          <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={() => setProfileModalVisible(false)}>
            <TouchableOpacity style={[pm.sheet, { backgroundColor: modalBg, borderColor: modalBrdr }]} activeOpacity={1}>
              <View style={[pm.handle, { backgroundColor: isDark ? '#2a3a55' : '#d1d9e0' }]} />
              <View style={pm.previewRow}>
                {profilePhoto
                  ? <Image source={{ uri: profilePhoto }} style={pm.previewImg} />
                  : <View style={pm.previewPlaceholder}><Text style={pm.previewInitials}>{displayInitials || 'AD'}</Text></View>
                }
                <View style={{ marginLeft: 14 }}>
                  <Text style={[pm.previewName, { color: modalTxt }]}>{displayName}</Text>
                  <Text style={[pm.previewRole, { color: modalSub }]}>{displayRole}</Text>
                </View>
              </View>
              <View style={[pm.divider, { backgroundColor: modalBrdr }]} />
              <TouchableOpacity style={pm.menuItem} onPress={pickPhoto} activeOpacity={0.75}>
                <View style={[pm.menuIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}><Text style={pm.menuIcon}>🖼️</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[pm.menuLabel, { color: modalTxt }]}>Upload Photo</Text>
                  <Text style={[pm.menuSub, { color: modalSub }]}>Choose from your gallery</Text>
                </View>
                <Text style={[pm.menuArrow, { color: modalSub }]}>›</Text>
              </TouchableOpacity>
              {profilePhoto && (
                <TouchableOpacity style={pm.menuItem} onPress={removePhoto} activeOpacity={0.75}>
                  <View style={[pm.menuIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}><Text style={pm.menuIcon}>🗑️</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pm.menuLabel, { color: '#ef4444' }]}>Remove Photo</Text>
                    <Text style={[pm.menuSub, { color: modalSub }]}>Revert to initials avatar</Text>
                  </View>
                  <Text style={[pm.menuArrow, { color: '#ef4444' }]}>›</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[pm.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: modalBrdr }]} onPress={() => setProfileModalVisible(false)} activeOpacity={0.8}>
                <Text style={[pm.cancelTxt, { color: modalSub }]}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Notification Panel */}
        <Modal visible={showNotifPanel} transparent animationType="fade" onRequestClose={() => setShowNotifPanel(false)}>
          <TouchableOpacity style={ns.backdrop} activeOpacity={1} onPress={() => setShowNotifPanel(false)}>
            <View style={[ns.panel, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1e3050' : '#e0e7ef' }]}>
              <View style={[ns.panelHeader, { borderBottomColor: isDark ? '#1e3050' : '#e0e7ef' }]}>
                <Text style={[ns.panelTitle, { color: isDark ? '#fff' : '#1a2130' }]}>🔔  Notifications</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkSeen} activeOpacity={0.7}>
                    <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '600' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <View style={ns.emptyBox}>
                    <Text style={{ fontSize: 36 }}>📭</Text>
                    <Text style={[ns.emptyText, { color: isDark ? '#8b949e' : '#9aa5b4' }]}>No notifications yet</Text>
                  </View>
                ) : notifications.map((notif, idx) => {
                  const isUnread = new Date(notif.timestamp) > new Date(lastSeenAt);
                  const roleEmoji = notif.senderRole === 'parent' ? '👨‍👩‍👧' : notif.senderRole === 'teacher' ? '👨‍🏫' : notif.senderRole === 'student' ? '🧑‍🎓' : '📢';
                  const timeStr = new Date(notif.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <TouchableOpacity key={notif.messageId || notif._id || idx}
                      style={[ns.notifItem, { borderBottomColor: isDark ? '#1a2840' : '#eef1f5' }, isUnread && { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }]}
                      onPress={() => handleNotifPress(notif)} activeOpacity={0.7}>
                      <View style={ns.notifAvatar}><Text style={{ fontSize: 20 }}>{roleEmoji}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[ns.notifSender, { color: isDark ? '#e6edf3' : '#1a2130' }]} numberOfLines={1}>{notif.senderName || notif.senderRole}</Text>
                          {isUnread && <View style={ns.unreadDot} />}
                        </View>
                        <Text style={[ns.notifContent, { color: isDark ? '#8b949e' : '#4a5568' }]} numberOfLines={2}>{notif.content}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Text style={[ns.notifTime, { color: isDark ? '#484f58' : '#9aa5b4' }]}>{timeStr}</Text>
                          <View style={[ns.notifTag, { backgroundColor: isDark ? '#1a2840' : '#eef1f5' }]}>
                            <Text style={{ fontSize: 9, color: isDark ? '#64748b' : '#4a5568', fontWeight: '600' }}>
                              {notif.recipientRole} · Yr {notif.academicYear}{notif.division && notif.division !== 'all' ? ` · ${notif.division}` : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ThemeContext.Provider>
  );
}

const sbInner = StyleSheet.create({
  container:       { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  logoContainer:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 28, borderBottomWidth: 1, marginBottom: 16 },
  logoIcon:        { width: 50, height: 34, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoIconText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  logoText:        { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  navList:         { flex: 1, paddingHorizontal: 12 },
  navItem:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4, position: 'relative', overflow: 'hidden' },
  navItemActive:   {},
  navItemLocked:   { opacity: 0.55 },
  activeIndicator: { position: 'absolute', left: 0, top: '20%', height: '60%', width: 3, backgroundColor: '#3b82f6', borderRadius: 4 },
  navIcon:         { fontSize: 16, marginRight: 12, opacity: 0.5 },
  navIconActive:   { opacity: 1 },
  navLabel:        { fontSize: 13.5, fontWeight: '500', flexShrink: 1 },
  navLabelActive:  { fontWeight: '600' },
  lockIcon:        { fontSize: 14, color: '#ef4444', marginLeft: 'auto' },
  userContainer:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, marginTop: 8 },
  userAvatarBtn:   { position: 'relative', marginRight: 10 },
  userAvatarImg:   { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#3b82f6' },
  userAvatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  userAvatarText:  { color: '#93c5fd', fontSize: 13, fontWeight: '700' },
  cameraBadge:     { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  cameraBadgeText: { fontSize: 8 },
  userInfo:        { flex: 1 },
  userName:        { fontSize: 12.5, fontWeight: '600' },
  userRole:        { fontSize: 11, marginTop: 1 },
  logoutBtn:       { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  logoutIcon:      { fontSize: 17, color: '#ef4444' },
  closeBtn:        { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 16, right: 14, zIndex: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:    { fontSize: 16 },
});

const s = StyleSheet.create({
  wrapper:         { flex: 1, flexDirection: 'row' },
  sidebarDesktop:  { width: SIDEBAR_WIDTH, height: '100%', borderRightWidth: 1 },
  sidebarMobile:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH, zIndex: 100, elevation: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16 },
  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 99 },
  mainContent:     { flex: 1 },
  pageContent:     { flex: 1 },
  topBar:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === 'ios' ? 52 : 14, borderBottomWidth: 1 },
  hamburger:       { width: 36, height: 36, justifyContent: 'center', gap: 5 },
  hamburgerLine:   { height: 2, width: 22, borderRadius: 2 },
  hamburgerMid:    { width: 16 },
  topBarTitle:     { fontSize: 15, fontWeight: '600', marginLeft: 12, flex: 1 },
});

const ns = StyleSheet.create({
  bellBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge:    { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText:{ color: '#ffffff', fontSize: 9, fontWeight: '800' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 90 : 56, paddingRight: 12 },
  panel:        { width: Math.min(380, SCREEN_WIDTH - 32), borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  panelHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  panelTitle:   { fontSize: 15, fontWeight: '700' },
  emptyBox:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText:    { fontSize: 13, fontWeight: '500' },
  notifItem:    { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  notifAvatar:  { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifSender:  { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  unreadDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  notifContent: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  notifTime:    { fontSize: 10, fontWeight: '500' },
  notifTag:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});

const pm = StyleSheet.create({
  backdrop:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:             { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, borderWidth: 1, borderBottomWidth: 0 },
  handle:            { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  previewRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 18 },
  previewImg:        { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#3b82f6' },
  previewPlaceholder:{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  previewInitials:   { color: '#93c5fd', fontSize: 18, fontWeight: '700' },
  previewName:       { fontSize: 15, fontWeight: '700' },
  previewRole:       { fontSize: 12, marginTop: 2 },
  divider:           { height: 1, marginBottom: 8 },
  menuItem:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 15, minHeight: 60 },
  menuIconBox:       { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon:          { fontSize: 20 },
  menuLabel:         { fontSize: 15, fontWeight: '600' },
  menuSub:           { fontSize: 12, marginTop: 2 },
  menuArrow:         { fontSize: 22 },
  cancelBtn:         { marginHorizontal: 20, marginTop: 10, borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1 },
  cancelTxt:         { fontSize: 15, fontWeight: '600' },
});