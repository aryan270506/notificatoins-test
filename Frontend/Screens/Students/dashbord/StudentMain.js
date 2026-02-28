import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import Dashboardpage from './Dashboadpage';
import StudentTimetable from '../Timetable/timetable';
import StudentDoubt from '../Doubts/Doubt';
import StudentChat from '../Chats/StudentChat';
import StudentFinance from '../Finance/StudentFinance';
import StudentExamResults from '../Exam/StudentExam';
import StudentsNotes from '../Note/NoteSubjectList';
import StudentQuiz from '../Quiz.js/StudentQuiz';
import StudentAssignment from '../Assignment/Assignment'
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 768;
const DRAWER_WIDTH = 260;

// ─── Theme Palettes ──────────────────────────────────────────────────────────
export const DARK_THEME = {
  bg:           '#0F1117',
  sidebar:      '#13161E',
  border:       '#1E2130',
  accent:       '#3B6FE8',
  accentBg:     'rgba(59,111,232,0.15)',
  accentPurple: '#6C63FF',
  purpleBg:     '#2D2B6B',
  textPrimary:  '#E8ECF4',
  textMuted:    '#6B7280',
  textSub:      '#9CA3AF',
  white:        '#FFFFFF',
  green:        '#22C55E',
  greenBg:      'rgba(34,197,94,0.15)',
  orange:       '#F59E0B',
  orangeBg:     'rgba(245,158,11,0.15)',
  red:          '#EF4444',
  redBg:        'rgba(239,68,68,0.15)',
  card:         '#13161E',
  cardAlt:      '#1A1D2B',
  upNextBg:     '#1C2E6B',
  upNextBorder: 'rgba(59,111,232,0.3)',
  upNextText:   'rgba(232,236,244,0.75)',
  aiCardBg:     '#2D2B6B',
  aiCardBorder: 'rgba(108,99,255,0.3)',
  aiSubText:    'rgba(232,236,244,0.65)',
  announceBg:   '#13161E',
  rowBorder:    'rgba(30,33,48,0.5)',
  toggleBg:     '#1A1D2B',
  statusBar:    'light-content',
  moonIcon:     '🌙',
  isDark:       true,
};

export const LIGHT_THEME = {
  bg:           '#F0F2F8',
  sidebar:      '#FFFFFF',
  border:       '#E2E6F0',
  accent:       '#3B6FE8',
  accentBg:     'rgba(59,111,232,0.10)',
  accentPurple: '#6C63FF',
  purpleBg:     '#EAE9FF',
  textPrimary:  '#111827',
  textMuted:    '#6B7280',
  textSub:      '#4B5563',
  white:        '#FFFFFF',
  green:        '#16A34A',
  greenBg:      'rgba(34,197,94,0.12)',
  orange:       '#D97706',
  orangeBg:     'rgba(245,158,11,0.12)',
  red:          '#DC2626',
  redBg:        'rgba(239,68,68,0.12)',
  card:         '#FFFFFF',
  cardAlt:      '#F7F8FC',
  upNextBg:     '#DBEAFE',
  upNextBorder: 'rgba(59,111,232,0.25)',
  upNextText:   '#374151',
  aiCardBg:     '#EAE9FF',
  aiCardBorder: 'rgba(108,99,255,0.25)',
  aiSubText:    '#4B5563',
  announceBg:   '#FFFFFF',
  rowBorder:    'rgba(226,230,240,0.8)',
  toggleBg:     '#E2E6F0',
  statusBar:    'dark-content',
  moonIcon:     '☀️',
  isDark:       false,
};

// ─── Nav Items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',      icon: '🏠' },
  { id: 'assignment',      label: 'Assignment',      icon: '📊' },
  { id: 'Notes',          label: 'Notes',           icon: '📋' },
  { id: 'timetable',      label: 'TimeTable',       icon: '🗓️' },
  { id: 'ai_doubts',      label: 'Doubts',          icon: '🤔' },
  { id: 'chat',           label: 'Chat',            icon: '💬' },
  { id: 'StudentFinance', label: 'Finance', icon: '💰' },
  { id: 'StudentExam',    label: 'Exam',    icon: '📝' },
  { id: 'Assignment',    label: 'Assignment',    icon: '📑' },
  { id: 'StudentQuiz',    label: 'Quiz',    icon: '🧠' },
];

// ─── Avatar Fullscreen Preview Modal ─────────────────────────────────────────
const AvatarPreviewModal = ({ visible, avatarUri, onClose, onEdit, onDelete, C }) => {
  const scaleAnim   = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    useNativeDriver: true, bounciness: 6, speed: 16 }),
        Animated.timing(opacityAnim, { toValue: 1,    duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 0.82, useNativeDriver: true, bounciness: 0, speed: 20 }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalDimOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.modalCenter} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modalCard,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.modalCloseBtn}
            onPress={onClose}
          >
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.modalImageWrap}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.modalImagePlaceholder, { backgroundColor: C.accent }]}>
                <Text style={styles.modalImagePlaceholderText}>AJ</Text>
              </View>
            )}
          </View>

          <Text style={styles.modalName}>Alex Johnson</Text>
          <Text style={styles.modalRole}>Year 3 Student</Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.modalActionBtn, { backgroundColor: C.accent }]}
              onPress={onEdit}
            >
              <Text style={styles.modalActionIcon}>✏️</Text>
              <Text style={[styles.modalActionLabel, { color: '#FFFFFF' }]}>Edit Photo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Uploadable Avatar thumbnail ─────────────────────────────────────────────
const UploadableAvatar = ({ avatarUri, onPress, C, size = 36 }) => {
  const borderRadius = size / 2;

  if (avatarUri) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <View style={{ position: 'relative', width: size, height: size }}>
          <Image
            source={{ uri: avatarUri }}
            style={{ width: size, height: size, borderRadius, borderWidth: 2, borderColor: C.accent }}
          />
          <View style={[
            styles.cameraBadge,
            {
              backgroundColor: C.accent,
              borderColor: C.sidebar,
              width: size * 0.38,
              height: size * 0.38,
              borderRadius: size * 0.19,
              bottom: -2,
              right: -2,
            },
          ]}>
            <Text style={{ fontSize: size * 0.18, lineHeight: size * 0.22 }}>📷</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View style={[
        styles.avatarUploadCircle,
        { width: size, height: size, borderRadius, borderColor: C.accent, backgroundColor: C.accentBg },
      ]}>
        <Text style={{ fontSize: size * 0.38 }}>📷</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Animated Nav Item ───────────────────────────────────────────────────────
const NavItem = ({ item, isActive, onPress, collapsed, C }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(item.id)} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[
        styles.navItem,
        isActive && { backgroundColor: C.accentBg },
        collapsed && styles.navItemCollapsed,
        { transform: [{ scale }] },
      ]}>
        <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
        {!collapsed && (
          <Text style={[styles.navLabel, { color: isActive ? C.accent : C.textMuted }, isActive && { fontWeight: '600' }]}>
            {item.label}
          </Text>
        )}
        {isActive && !collapsed && <View style={[styles.activeDot, { backgroundColor: C.accent }]} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Sidebar Content ─────────────────────────────────────────────────────────
const SidebarContent = ({
  activeTab, collapsed, onNavPress, onToggleCollapse, showCollapseBtn,
  C, avatarUri, onAvatarPress, onLogout,
}) => (
  <View style={[
    styles.sidebar,
    { backgroundColor: C.sidebar, borderRightColor: C.border },
    collapsed && styles.sidebarCollapsed,
  ]}>
    <View style={[styles.logoRow, collapsed && styles.logoRowCollapsed]}>
      <View style={[styles.logoIconBox, { backgroundColor: C.accent }]}>
        <Text style={styles.logoEmoji}>🎓</Text>
      </View>
      {!collapsed && <Text style={[styles.logoText, { color: C.textPrimary }]}>Campus360</Text>}
      {showCollapseBtn && (
        <TouchableOpacity activeOpacity={0.7} style={[styles.collapseBtn, { backgroundColor: C.border }]} onPress={onToggleCollapse}>
          <Text style={[styles.collapseBtnText, { color: C.textMuted }]}>{collapsed ? '›' : '‹'}</Text>
        </TouchableOpacity>
      )}
    </View>

    <View style={[styles.divider, { backgroundColor: C.border }]} />

    <View style={styles.navList}>
      {NAV_ITEMS.map((item) => (
        <NavItem key={item.id} item={item} isActive={activeTab === item.id} collapsed={collapsed} onPress={onNavPress} C={C} />
      ))}
    </View>

    <View style={{ flex: 1 }} />
    <View style={[styles.divider, { backgroundColor: C.border }]} />

    <View style={[styles.userFooter, collapsed && styles.userFooterCollapsed]}>
      <View style={styles.avatarWrap}>
        <UploadableAvatar avatarUri={avatarUri} onPress={onAvatarPress} C={C} size={36} />
        {!avatarUri && <View style={[styles.onlineBadge, { backgroundColor: C.green, borderColor: C.sidebar }]} />}
      </View>
      {!collapsed && (
        <TouchableOpacity onPress={() => onNavPress('profile')} style={styles.userMeta}>
          <Text style={[styles.userName, { color: C.textPrimary }]}>Alex Johnson</Text>
          <Text style={[styles.userRole,  { color: C.textMuted  }]}>Year 3 Student</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.logoutBtn, { backgroundColor: C.redBg, borderColor: C.red }]}
        onPress={onLogout}
      >
        <Text style={styles.logoutIcon}>⏻</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Hamburger ───────────────────────────────────────────────────────────────
const HamburgerIcon = ({ onPress, C }) => (
  <TouchableOpacity activeOpacity={0.7} style={styles.hamburgerBtn} onPress={onPress} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
  </TouchableOpacity>
);

// ─── Mobile Drawer ───────────────────────────────────────────────────────────
const MobileDrawer = ({ activeTab, onNavPress, visible, onClose, C, avatarUri, onAvatarPress, onLogout }) => {
  const translateX    = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateX,     { toValue: 0,            useNativeDriver: true, bounciness: 0, speed: 20 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX,     { toValue: -DRAWER_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[
        styles.mobileDrawer,
        { backgroundColor: C.sidebar, borderRightColor: C.border },
        { transform: [{ translateX }] },
      ]}>
        <View style={styles.drawerHeader}>
          <View style={styles.mobileLogoRow}>
            <View style={[styles.logoIconBox, { backgroundColor: C.accent }]}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            <Text style={[styles.logoText, { color: C.textPrimary }]}>Campus360</Text>
          </View>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: C.border }]} activeOpacity={0.7} onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
            <Text style={[styles.closeBtnText, { color: C.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: C.border }]} />

        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.id} item={item} isActive={activeTab === item.id} onPress={onNavPress} collapsed={false} C={C} />
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <View style={[styles.divider, { backgroundColor: C.border }]} />

        <View style={styles.userFooter}>
          <View style={styles.avatarWrap}>
            <UploadableAvatar avatarUri={avatarUri} onPress={onAvatarPress} C={C} size={36} />
            {!avatarUri && <View style={[styles.onlineBadge, { backgroundColor: C.green, borderColor: C.sidebar }]} />}
          </View>
          <TouchableOpacity onPress={() => onNavPress('profile')} style={styles.userMeta}>
            <Text style={[styles.userName, { color: C.textPrimary }]}>Alex Johnson</Text>
            <Text style={[styles.userRole,  { color: C.textMuted  }]}>Year 3 Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.logoutBtn, { backgroundColor: C.redBg, borderColor: C.red }]}
            onPress={onLogout}
          >
            <Text style={styles.logoutIcon}>⏻</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </Animated.View>
    </>
  );
};

// ─── Tab Content ─────────────────────────────────────────────────────────────
// ↓ NEW: accepts onNavPress so Dashboard can trigger tab switches
const TabContent = ({ activeTab, C, onThemeToggle, onNavPress }) => (
  <>
    <View style={{ flex: 1, display: activeTab === 'dashboard'      ? 'flex' : 'none' }}>
      {/* ↓ pass onNavPress as onNavigateToTab so Dashboard can call it */}
      <Dashboardpage C={C} onThemeToggle={onThemeToggle} onNavigateToTab={onNavPress} />
    </View>
    <View style={{ flex: 1, display: activeTab === 'analytics'      ? 'flex' : 'none' }}>
      <View style={[styles.placeholderPage, { backgroundColor: C.bg }]}>
        <Text style={[styles.placeholderText, { color: C.textMuted }]}>Analytics Page</Text>
      </View>
    </View>
    <View style={{ flex: 1, display: activeTab === 'timetable'      ? 'flex' : 'none' }}><StudentTimetable C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'ai_doubts'      ? 'flex' : 'none' }}><StudentDoubt C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'chat'           ? 'flex' : 'none' }}><StudentChat C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'StudentFinance' ? 'flex' : 'none' }}><StudentFinance C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'StudentExam'    ? 'flex' : 'none' }}><StudentExamResults C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'Notes'          ? 'flex' : 'none' }}><StudentsNotes C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'StudentQuiz'    ? 'flex' : 'none' }}><StudentQuiz C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'Assignment'     ? 'flex' : 'none' }}><StudentAssignment C={C} /></View>
    <View style={{ flex: 1, display: activeTab === 'profile'        ? 'flex' : 'none' }}>
      <View style={[styles.placeholderPage, { backgroundColor: C.bg }]}>
        <Text style={[styles.placeholderText, { color: C.textMuted }]}>Profile Page</Text>
      </View>
    </View>
  </>
);

// ─── Root Component ──────────────────────────────────────────────────────────
export default function StudentMain({ onNavigate,  navigation }) {
  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [isDark,         setIsDark]         = useState(true);
  const [avatarUri,      setAvatarUri]      = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const C = isDark ? DARK_THEME : LIGHT_THEME;
  const toggleTheme = () => setIsDark(prev => !prev);

const handleLogout = () => {
  if (Platform.OS === "web") {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  } else {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  }
};
  const handleAvatarPress = () => {
    if (avatarUri) setPreviewVisible(true);
    else handlePickImage();
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photo library.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
        setPreviewVisible(false);
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { setAvatarUri(null); setPreviewVisible(false); } },
      ],
    );
  };

  const handleNavPress = (id) => {
    setActiveTab(id);
    onNavigate?.(id);
    if (!IS_DESKTOP) setMobileOpen(false);
  };

  const avatarModal = (
    <AvatarPreviewModal
      visible={previewVisible}
      avatarUri={avatarUri}
      onClose={() => setPreviewVisible(false)}
      onEdit={handlePickImage}
      onDelete={handleDeletePhoto}
      C={C}
    />
  );

  /* ── Desktop ─────────────────────────────────────────────────────────────── */
  if (IS_DESKTOP) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
        <View style={styles.desktopLayout}>
          <SidebarContent
            activeTab={activeTab} collapsed={false} onNavPress={handleNavPress}
            showCollapseBtn={false} C={C} avatarUri={avatarUri} onAvatarPress={handleAvatarPress}
            onLogout={handleLogout}
          />
          <View style={[styles.mainContent, { backgroundColor: C.bg }]}>
            {/* ↓ pass handleNavPress so Dashboard can switch tabs */}
            <TabContent activeTab={activeTab} C={C} onThemeToggle={toggleTheme} onNavPress={handleNavPress} />
          </View>
        </View>
        {avatarModal}
      </SafeAreaView>
    );
  }

  /* ── Mobile ──────────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.sidebar} />

      <View style={[styles.mobileTopBar, { backgroundColor: C.sidebar, borderBottomColor: C.border }]}>
        <HamburgerIcon onPress={() => setMobileOpen(true)} C={C} />
        <View style={styles.mobileLogoRow}>
          <View style={[styles.logoIconBox, { backgroundColor: C.accent }]}>
            <Text style={styles.logoEmoji}>🎓</Text>
          </View>
          <Text style={[styles.logoText, { color: C.textPrimary }]}>Campus360</Text>
        </View>
        <UploadableAvatar avatarUri={avatarUri} onPress={handleAvatarPress} C={C} size={36} />
      </View>

      <MobileDrawer
        activeTab={activeTab} onNavPress={handleNavPress}
        visible={mobileOpen} onClose={() => setMobileOpen(false)}
        C={C} avatarUri={avatarUri} onAvatarPress={handleAvatarPress}
        onLogout={handleLogout}
      />
      <View style={[styles.mainContent, { backgroundColor: C.bg }]}>
        {/* ↓ pass handleNavPress so Dashboard can switch tabs */}
        <TabContent activeTab={activeTab} C={C} onThemeToggle={toggleTheme} onNavPress={handleNavPress} />
      </View>

      {avatarModal}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  desktopLayout: { flex: 1, flexDirection: 'row' },

  sidebar:          { width: 220, height: '100%', paddingVertical: 20, paddingHorizontal: 14, borderRightWidth: 1 },
  sidebarCollapsed: { width: 68, alignItems: 'center' },

  logoRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  logoRowCollapsed: { justifyContent: 'center', gap: 0, marginBottom: 16 },
  logoIconBox:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:        { fontSize: 18 },
  logoText:         { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  collapseBtn:     { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  collapseBtnText: { fontSize: 16, fontWeight: '700', lineHeight: 20 },

  divider: { height: 1, marginVertical: 12, alignSelf: 'stretch' },

  navList:          { gap: 4, paddingHorizontal: 4 },
  navItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, gap: 12 },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 40 },
  navIcon:          { fontSize: 17, opacity: 0.45 },
  navIconActive:    { opacity: 1 },
  navLabel:         { flex: 1, fontSize: 14, fontWeight: '500' },
  activeDot:        { width: 5, height: 5, borderRadius: 3 },

  userFooter:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4, paddingHorizontal: 8, paddingBottom: 4 },
  userFooterCollapsed: { justifyContent: 'center', gap: 0 },
  avatarWrap:          { position: 'relative' },
  onlineBadge:         { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  userMeta:            { flex: 1 },
  userName:            { fontSize: 13, fontWeight: '600' },
  userRole:            { fontSize: 11, marginTop: 1 },

  avatarUploadCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed' },
  cameraBadge:        { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },

  mobileTopBar:  { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  mobileLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburgerBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start', gap: 6 },
  hamburgerLine: { width: 24, height: 2.5, borderRadius: 2 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 10 },
  mobileDrawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH,
    zIndex: 20, borderRightWidth: 1, paddingTop: 16, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 16,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  closeBtn:     { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '700' },

  mainContent:     { flex: 1 },
  placeholderPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 16 },

  logoutBtn: {
    width: 32, height: 32, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  logoutIcon: { fontSize: 15, color: '#EF4444', fontWeight: '700' },

  modalDimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCenter:     { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: Math.min(SCREEN_WIDTH * 0.82, 340),
    borderRadius: 28,
    backgroundColor: 'rgba(14,16,26,0.94)',
    alignItems: 'center',
    paddingTop: 24, paddingBottom: 28, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6, shadowRadius: 36, elevation: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  modalCloseBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  modalCloseBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalImageWrap: {
    marginTop: 8, marginBottom: 18,
    width: 164, height: 164, borderRadius: 82, overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(59,111,232,0.75)',
    shadowColor: '#3B6FE8', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65, shadowRadius: 22, elevation: 14,
  },
  modalImage:                { width: 164, height: 164 },
  modalImagePlaceholder:     { width: 164, height: 164, alignItems: 'center', justifyContent: 'center' },
  modalImagePlaceholderText: { fontSize: 54, fontWeight: '800', color: '#FFFFFF' },
  modalName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2, marginBottom: 4 },
  modalRole: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 },
  modalActions:    { flexDirection: 'row', gap: 12, width: '100%' },
  modalActionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14 },
  modalDeleteBtn:  { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  modalActionIcon: { fontSize: 15 },
  modalActionLabel:{ fontSize: 14, fontWeight: '600' },
});