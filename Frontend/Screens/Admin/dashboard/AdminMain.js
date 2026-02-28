import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
  Image,
  Alert,
} from 'react-native';
import AdminMainDashboard, { ThemeContext, DARK_COLORS, LIGHT_COLORS } from './AdminDashboard';
import SecurityLogsScreen from '../logs/SecurityLogsScreen';
import TimeTableScreen from '../timetable/TimeTableManagement';
import AdminAttendancen from '../report/Report'
import Assignment from '../Assignment/Assignment';
import Admissionfees from '../Fees/Admissionfees';
import DataImportCenter from '../DataImportCenter/DataImportCenter';

// Try to import image picker — gracefully falls back if not installed
let launchImageLibrary;
try {
  const picker = require('react-native-image-picker');
  launchImageLibrary = picker.launchImageLibrary;
} catch (_) {
  launchImageLibrary = null;
}
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 250;
const DESKTOP_BREAKPOINT = 768;
const isDesktop = SCREEN_WIDTH >= DESKTOP_BREAKPOINT;

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',             icon: '⊞' },
  { id: 'timetable',      label: 'Timetable Management',  icon: '📅' },
  { id: 'reports',        label: 'Reports',               icon: '📊' },
  { id: 'assignment',     label: 'Assignment',            icon: '📝' },
  { id: 'admission-fee',  label: 'Admission Fee',         icon: '💰' },
  { id: 'security-logs',  label: 'Security Logs',         icon: '🔒' },
  { id: 'dataimportcenter', label: 'DataImportCenter',     icon: '📥' },
];

// ─── Render the correct screen based on active route ────────────────────────
function renderScreen(routeId, isDark, onToggleTheme) {
  switch (routeId) {
    case 'dashboard':
      return <AdminMainDashboard isDark={isDark} onToggleTheme={onToggleTheme} />;
    // Add more screens here as you build them:
    case 'admission-fee':
     return <Admissionfees />;
    case 'timetable':
      return <TimeTableScreen />;
     case 'reports':
      return <AdminAttendancen />;
     case 'security-logs':        
       return <SecurityLogsScreen />;
     case 'assignment':        
       return <Assignment />; 
         case 'dataimportcenter':        
       return <DataImportCenter />;  
      
    default:
      return (
        <View style={placeholderStyles.container}>
          <Text style={placeholderStyles.icon}>🚧</Text>
          <Text style={placeholderStyles.title}>Coming Soon</Text>
          <Text style={placeholderStyles.sub}>
            This section is under construction.
          </Text>
        </View>
      );
  }
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1b3e',
    gap: 10,
  },
  icon: { fontSize: 40 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
});

// ─── Sidebar Content ─────────────────────────────────────────────────────────
function SidebarContent({ activeItem, onNavPress, onClose, isMobile, profilePhoto, onProfilePress, onLogout,
  userName, userInitials, userRole, userBranch }) {
  const { isDark, colors } = useContext(ThemeContext);

  const sidebarBg = isDark ? '#0b1437' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const logoTextColor = isDark ? '#ffffff' : '#1a2130';
  const activeNavBg = isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(26, 111, 212, 0.12)';
  const navLabelColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const navLabelActiveColor = isDark ? '#ffffff' : '#1a2130';
  const userNameColor = isDark ? '#ffffff' : '#1a2130';
  const userRoleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const closeBtnColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const logoutBg = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';

  return (
    <View style={[sidebarInnerStyles.sidebarInner, { backgroundColor: sidebarBg }]}>
      {/* Close button — mobile only */}
      {isMobile && (
        <TouchableOpacity style={sidebarInnerStyles.closeBtn} onPress={onClose}>
          <Text style={[sidebarInnerStyles.closeBtnText, { color: closeBtnColor }]}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Logo */}
      <View style={[sidebarInnerStyles.logoContainer, { borderBottomColor: borderColor }]}>
        <View style={sidebarInnerStyles.logoIcon}>
          <Text style={sidebarInnerStyles.logoIconText}>C</Text>
        </View>
        <Text style={[sidebarInnerStyles.logoText, { color: logoTextColor }]}>Campus360</Text>
      </View>

      {/* Nav Items */}
      <ScrollView style={sidebarInnerStyles.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                sidebarInnerStyles.navItem,
                isActive && [sidebarInnerStyles.navItemActive, { backgroundColor: activeNavBg }],
              ]}
              onPress={() => onNavPress(item)}
              activeOpacity={0.7}
            >
              {isActive && <View style={sidebarInnerStyles.activeIndicator} />}
              <Text style={[sidebarInnerStyles.navIcon, isActive && sidebarInnerStyles.navIconActive]}>
                {item.icon}
              </Text>
              <Text style={[
                sidebarInnerStyles.navLabel,
                { color: isActive ? navLabelActiveColor : navLabelColor },
                isActive && sidebarInnerStyles.navLabelActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User Profile + Logout */}
      <View style={[sidebarInnerStyles.userContainer, { borderTopColor: borderColor }]}>
        {/* Avatar — tappable to change photo */}
        <TouchableOpacity
          onPress={onProfilePress}
          activeOpacity={0.8}
          style={sidebarInnerStyles.userAvatarBtn}
          accessibilityLabel="Change profile photo"
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={sidebarInnerStyles.userAvatarImg}
            />
          ) : (
            <View style={sidebarInnerStyles.userAvatar}>
              <Text style={sidebarInnerStyles.userAvatarText}>{userInitials || 'AD'}</Text>
            </View>
          )}
          {/* Camera badge */}
          <View style={sidebarInnerStyles.cameraBadge}>
            <Text style={sidebarInnerStyles.cameraBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>

        <View style={sidebarInnerStyles.userInfo}>
          <Text style={[sidebarInnerStyles.userName, { color: userNameColor }]} numberOfLines={1}>{userName || 'Admin'}</Text>
          <Text style={[sidebarInnerStyles.userRole, { color: userRoleColor }]} numberOfLines={1}>{userRole || 'System Admin'}</Text>
        </View>

        {/* Logout button */}
        <TouchableOpacity
          style={[sidebarInnerStyles.logoutBtn, { backgroundColor: logoutBg }]}
          onPress={onLogout}
          activeOpacity={0.75}
          accessibilityLabel="Logout"
        >
          <Text style={sidebarInnerStyles.logoutIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function AdminMain({ navigation, route }) {
  // ── Pull logged-in user from login navigation params ──
  const user          = route?.params?.user ?? {};
  const displayName   = user.id || 'Admin';
  const displayInitials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const displayRole   = 'System Admin';
  const displayBranch = user.branch || '';

  // ── Theme state lives here so the whole shell reacts to it ──
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(prev => !prev);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const themeValue = { isDark, colors };

  // ── Profile photo ──
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const handleProfilePress = () => {
    setProfileModalVisible(true);
  };

  const pickPhoto = () => {
    if (launchImageLibrary) {
      launchImageLibrary(
        { mediaType: 'photo', quality: 0.8, includeBase64: false },
        (response) => {
          if (!response.didCancel && !response.errorCode && response.assets?.[0]?.uri) {
            setProfilePhoto(response.assets[0].uri);
            setProfileModalVisible(false);
          }
        }
      );
    } else {
      Alert.alert(
        'Image Picker',
        'react-native-image-picker is not installed.\n\nInstall it with:\nnpm install react-native-image-picker',
        [{ text: 'OK' }]
      );
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setProfileModalVisible(false);
  };

  // ── Logout ──
  const handleLogout = () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      if (navigation) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        alert('You have been logged out successfully.');
      }
    }
  } else {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (navigation) {
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } else {
              Alert.alert('Logged out', 'You have been logged out successfully.');
            }
          },
        },
      ]
    );
  }
  };

  // Derived shell colors
  const wrapperBg   = isDark ? '#0d1b3e' : colors.bg;
  const sidebarBg   = isDark ? '#0b1437' : '#ffffff';
  const sidebarBorderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const topBarBg    = isDark ? '#0b1437' : '#ffffff';
  const topBarBorderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const topBarTitleColor  = isDark ? '#ffffff' : '#1a2130';
  const hamburgerColor    = isDark ? '#ffffff' : '#1a2130';
  const modalBg = isDark ? '#0d1526' : '#ffffff';
  const modalBorderColor = isDark ? '#1e3050' : '#e0e7ef';
  const modalTextColor = isDark ? '#ffffff' : '#1a2130';
  const modalSubColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  // Always open on dashboard by default
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [isOpen, setIsOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(isDesktop ? 0 : -SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDesktop) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, []);

  const openSidebar = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  const handleNavPress = (item) => {
    setActiveRoute(item.id);
    if (!isDesktop) closeSidebar();
  };

  const sidebarProps = {
    activeItem:   activeRoute,
    onNavPress:   handleNavPress,
    profilePhoto,
    onProfilePress: handleProfilePress,
    onLogout:     handleLogout,
    userName:     displayName,
    userInitials: displayInitials,
    userRole:     displayRole,
    userBranch:   displayBranch,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <View style={[styles.wrapper, { backgroundColor: wrapperBg }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#0b1437' : '#ffffff'}
        />

        {/* ── Desktop: permanent sidebar ── */}
        {isDesktop ? (
          <View style={[styles.sidebarDesktop, { backgroundColor: sidebarBg, borderRightColor: sidebarBorderColor }]}>
            <SidebarContent {...sidebarProps} isMobile={false} />
          </View>
        ) : (
          <>
            {isOpen && (
              <Animated.View
                style={[styles.overlay, { opacity: overlayAnim }]}
                pointerEvents="auto"
              >
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={closeSidebar}
                  activeOpacity={1}
                />
              </Animated.View>
            )}
            <Animated.View
              style={[
                styles.sidebarMobile,
                { backgroundColor: sidebarBg, transform: [{ translateX: slideAnim }] },
              ]}
            >
              <SidebarContent {...sidebarProps} onClose={closeSidebar} isMobile={true} />
            </Animated.View>
          </>
        )}

        {/* ── Main content area ── */}
        <View style={[styles.mainContent, { backgroundColor: wrapperBg }]}>
          {!isDesktop && (
            <View style={[styles.topBar, { backgroundColor: topBarBg, borderBottomColor: topBarBorderColor }]}>
              <TouchableOpacity style={styles.hamburger} onPress={openSidebar}>
                <View style={[styles.hamburgerLine, { backgroundColor: hamburgerColor }]} />
                <View style={[styles.hamburgerLine, styles.hamburgerLineMid, { backgroundColor: hamburgerColor }]} />
                <View style={[styles.hamburgerLine, { backgroundColor: hamburgerColor }]} />
              </TouchableOpacity>
              <Text style={[styles.topBarTitle, { color: topBarTitleColor }]}>Admin Control Center</Text>
              <View style={styles.topBarSpacer} />
            </View>
          )}
          <View style={styles.pageContent}>
            {renderScreen(activeRoute, isDark, toggleTheme)}
          </View>
        </View>

        {/* ── Profile Photo Modal ── */}
        <Modal
          visible={profileModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setProfileModalVisible(false)}
        >
          <TouchableOpacity
            style={profileModalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setProfileModalVisible(false)}
          >
            <TouchableOpacity
              style={[profileModalStyles.sheet, { backgroundColor: modalBg, borderColor: modalBorderColor }]}
              activeOpacity={1}
            >
              {/* Handle bar */}
              <View style={[profileModalStyles.handle, { backgroundColor: isDark ? '#2a3a55' : '#d1d9e0' }]} />

              {/* Current avatar preview */}
              <View style={profileModalStyles.previewRow}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={profileModalStyles.previewImg} />
                ) : (
                  <View style={profileModalStyles.previewPlaceholder}>
                    <Text style={profileModalStyles.previewInitials}>{displayInitials || 'AD'}</Text>
                  </View>
                )}
                <View style={{ marginLeft: 14 }}>
                  <Text style={[profileModalStyles.previewName, { color: modalTextColor }]}>{displayName || 'Admin'}</Text>
                  <Text style={[profileModalStyles.previewRole, { color: modalSubColor }]}>{displayRole}{displayBranch ? ` · ${displayBranch}` : ''}</Text>
                </View>
              </View>

              <View style={[profileModalStyles.divider, { backgroundColor: modalBorderColor }]} />

              {/* Upload option */}
              <TouchableOpacity
                style={profileModalStyles.menuItem}
                onPress={pickPhoto}
                activeOpacity={0.75}
              >
                <View style={[profileModalStyles.menuIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Text style={profileModalStyles.menuIcon}>🖼️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[profileModalStyles.menuLabel, { color: modalTextColor }]}>Upload Photo</Text>
                  <Text style={[profileModalStyles.menuSub, { color: modalSubColor }]}>Choose from your gallery</Text>
                </View>
                <Text style={[profileModalStyles.menuArrow, { color: modalSubColor }]}>›</Text>
              </TouchableOpacity>

              {/* Remove option — only if photo set */}
              {profilePhoto && (
                <TouchableOpacity
                  style={profileModalStyles.menuItem}
                  onPress={removePhoto}
                  activeOpacity={0.75}
                >
                  <View style={[profileModalStyles.menuIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                    <Text style={profileModalStyles.menuIcon}>🗑️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[profileModalStyles.menuLabel, { color: '#ef4444' }]}>Remove Photo</Text>
                    <Text style={[profileModalStyles.menuSub, { color: modalSubColor }]}>Revert to initials avatar</Text>
                  </View>
                  <Text style={[profileModalStyles.menuArrow, { color: '#ef4444' }]}>›</Text>
                </TouchableOpacity>
              )}

              {/* Cancel */}
              <TouchableOpacity
                style={[profileModalStyles.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderColor: modalBorderColor }]}
                onPress={() => setProfileModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[profileModalStyles.cancelTxt, { color: modalSubColor }]}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </ThemeContext.Provider>
  );
}

// ─── Sidebar inner styles (theme-agnostic layout, colors injected at render) ──
const sidebarInnerStyles = StyleSheet.create({
  sidebarInner: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  logoIcon: {
    width: 50,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoIconText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  logoText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  navList: { flex: 1, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  navItemActive: {},
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    height: '60%',
    width: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  navIcon: { fontSize: 16, marginRight: 12, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  navLabelActive: { fontWeight: '600' },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  userAvatarBtn: {
    position: 'relative',
    marginRight: 10,
  },
  userAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  userAvatarText: { color: '#93c5fd', fontSize: 13, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeText: { fontSize: 8 },
  userInfo: { flex: 1 },
  userName: { fontSize: 12.5, fontWeight: '600' },
  userRole: { fontSize: 11, marginTop: 1 },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  logoutIcon: {
    fontSize: 17,
    color: '#ef4444',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 16,
    right: 14,
    zIndex: 10,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16 },
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar — desktop
  sidebarDesktop: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    borderRightWidth: 1,
  },

  // Sidebar — mobile (slides in)
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 99,
  },

  // Main content
  mainContent: { flex: 1 },
  pageContent: { flex: 1 },

  // Top bar (mobile)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 52 : 14,
    borderBottomWidth: 1,
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerLine: {
    height: 2,
    width: 22,
    borderRadius: 2,
  },
  hamburgerLineMid: { width: 16 },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  topBarSpacer: { width: 36 },
});
// ─── Profile Photo Modal Styles ───────────────────────────────────────────────
const profileModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  previewImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  previewPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  previewInitials: { color: '#93c5fd', fontSize: 18, fontWeight: '700' },
  previewName: { fontSize: 15, fontWeight: '700' },
  previewRole: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginBottom: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 15,
    minHeight: 60,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuSub: { fontSize: 12, marginTop: 2 },
  menuArrow: { fontSize: 22 },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelTxt: { fontSize: 15, fontWeight: '600' },
});