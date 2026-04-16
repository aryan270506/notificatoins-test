import React, { useState, useRef, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';
import Dashboardpage from './Dashboadpage';
import StudentTimetable from '../Timetable/timetable';
import StudentDoubt from '../Doubts/Doubt';
import StudentChat from '../Chats/StudentChat';
import StudentFinance from '../Finance/StudentFinance';
import StudentExamResults from '../Exam/StudentExam';
import StudentsNotes from '../Note/NoteSubjectList';
import StudentQuiz from '../Quiz.js/StudentQuiz';
import StudentAssignment from '../Assignment/Assignment';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
// Keys here MUST match ALL_TABS keys in PermissionDashboard exactly
const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',  icon: '🏠' },
  { id: 'Notes',          label: 'Notes',      icon: '📋' },
  { id: 'timetable',      label: 'TimeTable',  icon: '🗓️' },
  { id: 'ai_doubts',      label: 'Doubts',     icon: '🧐' },
  { id: 'chat',           label: 'Chat',       icon: '💬' },
  { id: 'StudentFinance', label: 'Finance',    icon: '💰' },
  { id: 'StudentExam',    label: 'Exam',       icon: '📝' },
  { id: 'Assignment',     label: 'Assignment', icon: '📑' },
  { id: 'StudentQuiz',    label: 'Quiz',       icon: '🧠' },
];

// ─── Platform-aware "permission denied" alert ────────────────────────────────
const showDeniedAlert = () => {
  if (Platform.OS === 'web') {
    window.alert('Permission denied from developers');
  } else {
    Alert.alert('Access Restricted', 'Permission denied from developers');
  }
};

// ─── Avatar Fullscreen Preview Modal ────────────────────────────────────────
const AvatarPreviewModal = ({ visible, avatarUri, onClose, onEdit, onDelete, C, user }) => {
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
                <Text style={styles.modalImagePlaceholderText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.modalName}>{user?.name || user?.id || 'Student'}</Text>
          <Text style={styles.modalRole}>
            {[
              user?.id     ? `ID: ${user.id}`      : null,
              user?.branch ? user.branch            : null,
              user?.year   ? `Year ${user.year}`   : null,
            ].filter(Boolean).join('  •  ')}
          </Text>

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
              borderColor:      C.sidebar,
              width:            size * 0.38,
              height:           size * 0.38,
              borderRadius:     size * 0.19,
              bottom: -2,
              right:  -2,
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
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(item.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[
        styles.navItem,
        isActive && { backgroundColor: C.accentBg },
        collapsed && styles.navItemCollapsed,
        { transform: [{ scale }] },
      ]}>
        <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
        {!collapsed && (
          <Text style={[
            styles.navLabel,
            { color: isActive ? C.accent : C.textMuted },
            isActive && { fontWeight: '600' },
          ]}>
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
  C, avatarUri, onAvatarPress, onLogout, user, tabAccess,
}) => (
  <View style={[
    styles.sidebar,
    { backgroundColor: C.sidebar, borderRightColor: C.border },
    collapsed && styles.sidebarCollapsed,
  ]}>
    {/* Logo */}
    <View style={[styles.logoRow, collapsed && styles.logoRowCollapsed]}>
      <View style={[styles.logoIconBox, { backgroundColor: C.accent }]}>
        <Text style={styles.logoEmoji}>🎓</Text>
      </View>
      {!collapsed && (
        <Text style={[styles.logoText, { color: C.textPrimary }]}>UniVerse</Text>
      )}
      {showCollapseBtn && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.collapseBtn, { backgroundColor: C.border }]}
          onPress={onToggleCollapse}
        >
          <Text style={[styles.collapseBtnText, { color: C.textMuted }]}>
            {collapsed ? '›' : '‹'}
          </Text>
        </TouchableOpacity>
      )}
    </View>

    <View style={[styles.divider, { backgroundColor: C.border }]} />

    {/* Nav list */}
    <View style={styles.navList}>
      {NAV_ITEMS.map((item) => {
        // undefined = allowed; false = locked
        const isLocked = tabAccess && tabAccess[item.id] === false;

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              activeTab === item.id && {
                borderWidth:     2,
                borderColor:     C.accent,
                borderRadius:    10,
                backgroundColor: C.accentBg,
              },
              isLocked && styles.navItemLocked,
            ]}
            onPress={() => {
              if (isLocked) {
                showDeniedAlert();
              } else {
                onNavPress(item.id);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>

            {!collapsed && (
              <Text style={[
                styles.navLabel,
                isLocked
                  ? { color: C.textMuted }
                  : { color: activeTab === item.id ? C.accent : C.textPrimary },
                activeTab === item.id && !isLocked && { fontWeight: '600' },
              ]}>
                {item.label}
              </Text>
            )}

            {/* Lock icon */}
            {isLocked && !collapsed && (
              <Text style={styles.lockIcon}>🔒</Text>
            )}

            {/* Active dot */}
            {activeTab === item.id && !isLocked && !collapsed && (
              <View style={[styles.activeDot, { backgroundColor: C.accent }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={{ flex: 1 }} />
    <View style={[styles.divider, { backgroundColor: C.border }]} />

    {/* User footer */}
    <View style={[styles.userFooter, collapsed && styles.userFooterCollapsed]}>
      <View style={styles.avatarWrap}>
        <UploadableAvatar avatarUri={avatarUri} onPress={onAvatarPress} C={C} size={36} />
        {!avatarUri && (
          <View style={[styles.onlineBadge, { backgroundColor: C.green, borderColor: C.sidebar }]} />
        )}
      </View>
      {!collapsed && (
        <TouchableOpacity onPress={() => onNavPress('profile')} style={styles.userMeta}>
          <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.name || user?.id || 'Student'}
          </Text>
          <Text style={[styles.userRole, { color: C.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.branch ? `${user.branch} - Yr ${user.year}` : 'Student'}
          </Text>
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
  <TouchableOpacity
    activeOpacity={0.7}
    style={styles.hamburgerBtn}
    onPress={onPress}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
    <View style={[styles.hamburgerLine, { backgroundColor: C.textPrimary }]} />
  </TouchableOpacity>
);

// ─── Mobile Drawer ───────────────────────────────────────────────────────────
const MobileDrawer = ({
  activeTab, onNavPress, visible, onClose,
  C, avatarUri, onAvatarPress, onLogout, user, tabAccess,
}) => {
  const translateX     = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateX,     { toValue: 0,             useNativeDriver: true, bounciness: 0, speed: 20 }),
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
        {/* Drawer header */}
        <View style={styles.drawerHeader}>
          <View style={styles.mobileLogoRow}>
            <View style={[styles.logoIconBox, { backgroundColor: C.accent }]}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            <Text style={[styles.logoText, { color: C.textPrimary }]}>UniVerse</Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: C.border }]}
            activeOpacity={0.7}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.closeBtnText, { color: C.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: C.border }]} />

        {/* Nav list with lock support */}
        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isLocked = tabAccess && tabAccess[item.id] === false;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.navItem,
                  activeTab === item.id && {
                    backgroundColor: C.accentBg,
                    borderWidth:     1,
                    borderColor:     C.accent,
                    borderRadius:    10,
                  },
                  isLocked && styles.navItemLocked,
                ]}
                onPress={() => {
                  if (isLocked) {
                    showDeniedAlert();
                  } else {
                    onNavPress(item.id);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[
                  styles.navLabel,
                  isLocked
                    ? { color: C.textMuted }
                    : { color: activeTab === item.id ? C.accent : C.textPrimary },
                  activeTab === item.id && !isLocked && { fontWeight: '600' },
                ]}>
                  {item.label}
                </Text>
                {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
                {activeTab === item.id && !isLocked && (
                  <View style={[styles.activeDot, { backgroundColor: C.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />
        <View style={[styles.divider, { backgroundColor: C.border }]} />

        {/* User footer */}
        <View style={styles.userFooter}>
          <View style={styles.avatarWrap}>
            <UploadableAvatar avatarUri={avatarUri} onPress={onAvatarPress} C={C} size={36} />
            {!avatarUri && (
              <View style={[styles.onlineBadge, { backgroundColor: C.green, borderColor: C.sidebar }]} />
            )}
          </View>
          <TouchableOpacity onPress={() => onNavPress('profile')} style={styles.userMeta}>
            <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
              {user?.name || user?.id || 'Student'}
            </Text>
            <Text style={[styles.userRole, { color: C.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
              {user?.branch ? `${user.branch} - Year ${user.year}` : 'Student'}
            </Text>
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

// ─── Locked Tab Screen ────────────────────────────────────────────────────────
const LockedScreen = ({ C, label }) => (
  <View style={[styles.placeholderPage, { backgroundColor: C.bg, gap: 12 }]}>
    <Text style={{ fontSize: 48 }}>🔒</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: C.textPrimary }}>{label}</Text>
    <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', maxWidth: 260 }}>
      Access denied by developers
    </Text>
  </View>
);

// ─── Tab Content ─────────────────────────────────────────────────────────────
const TabContent = ({ activeTab, C, onThemeToggle, onNavPress, user, tabAccess }) => {
  // Helper: if locked, render locked screen instead
  const renderTab = (tabId, label, component) => (
    <View key={tabId} style={{ flex: 1, display: activeTab === tabId ? 'flex' : 'none' }}>
      {tabAccess?.[tabId] === false
        ? <LockedScreen C={C} label={label} />
        : component
      }
    </View>
  );

  return (
    <>
      {renderTab('dashboard',      'Dashboard',  <Dashboardpage C={C} onThemeToggle={onThemeToggle} onNavigateToTab={onNavPress} user={user} />)}
      {renderTab('Notes',          'Notes',       <StudentsNotes C={C} user={user} />)}
      {renderTab('timetable',      'TimeTable',   <StudentTimetable C={C} />)}
      {renderTab('ai_doubts',      'Doubts',      <StudentDoubt C={C} user={user} />)}
      {renderTab('chat',           'Chat',        <StudentChat C={C} onThemeToggle={onThemeToggle} user={user} />)}
      {renderTab('StudentFinance', 'Finance',     <StudentFinance C={C} user={user} />)}
      {renderTab('StudentExam',    'Exam',        <StudentExamResults C={C} user={user} />)}
      {renderTab('Assignment',     'Assignment',  <StudentAssignment C={C} user={user} />)}
      {renderTab('StudentQuiz',    'Quiz',        <StudentQuiz C={C} user={user} />)}
      {renderTab('analytics',      'Analytics',
        <View style={[styles.placeholderPage, { backgroundColor: C.bg }]}>
          <Text style={[styles.placeholderText, { color: C.textMuted }]}>Analytics Page</Text>
        </View>
      )}
      {renderTab('profile',        'Profile',
        <View style={[styles.placeholderPage, { backgroundColor: C.bg }]}>
          <Text style={[styles.placeholderText, { color: C.textMuted }]}>Profile Page</Text>
        </View>
      )}
    </>
  );
};

// ─── Root Component ──────────────────────────────────────────────────────────
export default function StudentMain({ onNavigate, navigation, route }) {

  // ── Tab Access ────────────────────────────────────────────────────────────
  const [tabAccess, setTabAccess] = useState({});

  useEffect(() => {
    const fetchTabAccess = async () => {
      try {
        const res = await axiosInstance.get('/permissions/check/Student');
        setTabAccess(res.data.tabAccess || {});
      } catch (err) {
        // If API fails, default to all allowed (empty object = no restrictions)
        setTabAccess({});
      }
    };
    fetchTabAccess();
  }, []);

  // ── User State ────────────────────────────────────────────────────────────
  const rawUser = route?.params?.user || null;
  const [user, setUser] = useState(
    rawUser
      ? { ...rawUser, id: rawUser.id || rawUser._id, _id: rawUser._id || rawUser.id }
      : null,
  );

  console.log('📱 StudentMain user:', user ? `${user.name} (id: ${user._id})` : 'null');

  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [isDark,         setIsDark]         = useState(true);
  const [avatarUri,      setAvatarUri]      = useState(user?.profilePhoto || null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);

  const C = isDark ? DARK_THEME : LIGHT_THEME;
  const toggleTheme = () => setIsDark(prev => !prev);

  // If user is null (e.g. auto-restored session), load from AsyncStorage + API
  useEffect(() => {
    if (user) return;
    const loadUser = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) return;
        const res = await axiosInstance.get(`/students/${userId}`);
        const s = res.data;
        if (s) {
          setUser({ ...s, id: s.id || s._id, _id: s._id || s.id });
          if (s.profilePhoto) setAvatarUri(s.profilePhoto);
        }
      } catch (err) {
        console.log('Error loading user from storage:', err);
      }
    };
    loadUser();
  }, []);

  // Fetch profile photo from DB
  const fetchStudent = async () => {
    try {
      const res = await axiosInstance.get(`/students/${user.id}`);
      const data = res.data;
      if (data?.profilePhoto) setAvatarUri(data.profilePhoto);
    } catch (err) {
      console.log('Error fetching student:', err);
    }
  };

  useEffect(() => {
    if (user?.id) fetchStudent();
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          try {
            await axiosInstance.post('/auth/logout', {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
            console.log('✅ Token revoked on backend');
          } catch (error) {
            console.error('⚠️ Error revoking token on backend:', error.message);
          }
        }
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userName');
        await AsyncStorage.removeItem('currentScreen');
        console.log('✅ User logged out successfully');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        console.error('❌ Logout error:', error);
        if (Platform.OS === 'web') {
          window.alert('Error during logout. Please try again.');
        } else {
          Alert.alert('Error', 'Error during logout. Please try again.');
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) performLogout();
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  // ── Avatar ────────────────────────────────────────────────────────────────
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
        const imageUri = result.assets[0].uri;
        setAvatarUri(imageUri);
        try {
          const formData = new FormData();
          formData.append('photo', {
            uri:  imageUri,
            name: 'profile.jpg',
            type: 'image/jpeg',
          });
          await axiosInstance.put(`/students/upload-profile/${user.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (error) {
          console.log('Photo upload failed', error);
        }
        setPreviewVisible(false);
      }
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Could not open image picker. Please try again.');
      } else {
        Alert.alert('Error', 'Could not open image picker. Please try again.');
      }
    }
  };

  const handleDeletePhoto = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to remove your profile photo?');
      if (confirmed) { setAvatarUri(null); setPreviewVisible(false); }
    } else {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to remove your profile photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { setAvatarUri(null); setPreviewVisible(false); } },
        ],
      );
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNavPress = (id) => {
    setActiveTab(id);
    onNavigate?.(id);
    if (!IS_DESKTOP) setMobileOpen(false);
  };

  // ── Unread Notifications ───────────────────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      console.log('📊 Fetching unread notification count...');
      const response = await axiosInstance.get('/notifications/unread-count');
      console.log('✅ Unread count response:', response.data);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('❌ Error fetching unread count:', error.message);
      console.error('📍 URL:', error.config?.url);
      console.error('🔴 Status:', error.response?.status);
      console.error('💬 Response:', error.response?.data);
      setUnreadCount(0);
    }
  };

  const avatarModal = (
    <AvatarPreviewModal
      visible={previewVisible}
      avatarUri={avatarUri}
      onClose={() => setPreviewVisible(false)}
      onEdit={handlePickImage}
      onDelete={handleDeletePhoto}
      C={C}
      user={user}
    />
  );

  const sidebarProps = {
    activeTab,
    collapsed: false,
    onNavPress: handleNavPress,
    showCollapseBtn: false,
    C,
    avatarUri,
    onAvatarPress: handleAvatarPress,
    onLogout: handleLogout,
    user,
    tabAccess,
  };

  /* ── Desktop ─────────────────────────────────────────────────────────────── */
  if (IS_DESKTOP) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
        <View style={styles.desktopLayout}>
          <SidebarContent {...sidebarProps} />
          <View style={[styles.mainContent, { backgroundColor: C.bg }]}>
            <TabContent
                  activeTab={activeTab}
                    C={C}
                  onThemeToggle={toggleTheme}
                  onNavPress={handleNavPress}
                  user={user}
                  tabAccess={tabAccess}   
            />
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
          <Text style={[styles.logoText, { color: C.textPrimary }]}>UniVerse</Text>
        </View>
        <UploadableAvatar avatarUri={avatarUri} onPress={handleAvatarPress} C={C} size={36} />
      </View>

      <MobileDrawer
        activeTab={activeTab}
        onNavPress={handleNavPress}
        visible={mobileOpen}
        onClose={() => setMobileOpen(false)}
        C={C}
        avatarUri={avatarUri}
        onAvatarPress={handleAvatarPress}
        onLogout={handleLogout}
        user={user}
        tabAccess={tabAccess}
      />

      <View style={[styles.mainContent, { backgroundColor: C.bg }]}>
        <TabContent
          activeTab={activeTab}
          C={C}
          onThemeToggle={toggleTheme}
          onNavPress={handleNavPress}
          user={user}
          tabAccess={tabAccess}
        />
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

  navList: { gap: 4, paddingHorizontal: 4 },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 40 },

  // Locked nav item — slightly dimmed
  navItemLocked: {
    opacity: 0.55,
  },

  navIcon:       { fontSize: 17, opacity: 0.45 },
  navIconActive: { opacity: 1 },
  navLabel:      { flex: 1, fontSize: 14, fontWeight: '500' },
  activeDot:     { width: 5, height: 5, borderRadius: 3 },

  // Lock icon in nav
  lockIcon: { fontSize: 14, color: '#EF4444', marginLeft: 2 },

  userFooter:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, paddingHorizontal: 4, paddingBottom: 4, minWidth: 0 },
  userFooterCollapsed: { justifyContent: 'center', gap: 0 },
  avatarWrap:          { position: 'relative', flexShrink: 0 },
  onlineBadge:         { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  userMeta:            { flex: 1, minWidth: 0 },
  userName:            { fontSize: 12, fontWeight: '600' },
  userRole:            { fontSize: 10, marginTop: 1 },

  avatarUploadCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed' },
  cameraBadge:        { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },

  mobileTopBar:  { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  mobileLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburgerBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start', gap: 6 },
  hamburgerLine: { width: 24, height: 2.5, borderRadius: 2 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 10,
  },
  mobileDrawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH,
    zIndex: 20, borderRightWidth: 1, paddingTop: 16, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 16,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  closeBtn:     { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, fontWeight: '700' },

  mainContent:     { flex: 1 },
  placeholderPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 16 },

  logoutBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2, flexShrink: 0,
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
  modalName:  { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2, marginBottom: 4 },
  modalRole:  { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28, textAlign: 'center' },
  modalActions:    { flexDirection: 'row', gap: 12, width: '100%' },
  modalActionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14 },
  modalDeleteBtn:  { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  modalActionIcon: { fontSize: 15 },
  modalActionLabel:{ fontSize: 14, fontWeight: '600' },

  // Header styles for dashboard
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});