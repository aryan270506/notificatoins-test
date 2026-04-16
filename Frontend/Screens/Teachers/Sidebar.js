/**
 * Sidebar.js
 * - Desktop (>=768px): permanent sidebar, fixed 210px width on the left
 * - Mobile (<768px): top bar with ☰ hamburger, opens a 240px wide drawer modal
 * - Teacher name/image fetched from DB on mount
 * - Tap avatar to upload a new profile photo
 * - Settings item opens ClassTeacherSettings screen (timetable + batch management)
 */

import React, { useCallback, useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  useWindowDimensions, Modal, Pressable, Platform,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

// ─── Sidebar themes ───────────────────────────────────────────────────────────────────
const SB_DARK = {
  wideBg: '#080818', sidebarBg: '#0f0f23', screenBg: '#0d0d20',
  borderColor: 'rgba(99,102,241,0.15)', borderColor2: 'rgba(99,102,241,0.2)',
  borderColor3: 'rgba(99,102,241,0.12)',
  logoBadgeBg: '#6366f1', logoText: '#e2e8f0',
  hamburgerColor: '#a5b4fc',
  navText: '#64748b', navActiveText: '#a5b4fc',
  navActiveBg: 'rgba(99,102,241,0.14)', navActiveBorder: '#6366f1',
  avatarBg: '#6366f1', avatarBorder: 'rgba(99,102,241,0.4)',
  cameraBadgeBg: '#1e1e3a',
  userName: '#e2e8f0', userRole: '#475569',
  logoutBg: 'rgba(239,68,68,0.10)', logoutBorder: 'rgba(239,68,68,0.30)',
  drawerBg: '#0f0f23', drawerShadow: '#000',
  settingsDividerColor: 'rgba(99,102,241,0.10)',
  settingsBg: 'rgba(99,102,241,0.08)', settingsBorder: 'rgba(99,102,241,0.22)',
  settingsText: '#a5b4fc', settingsIcon: '#6366f1',
};
const SB_LIGHT = {
  wideBg: '#F1F4FD', sidebarBg: '#FFFFFF', screenBg: '#F1F4FD',
  borderColor: '#E2E8F4', borderColor2: '#DDE3F4', borderColor3: '#E8EDF5',
  logoBadgeBg: '#4F46E5', logoText: '#1E293B',
  hamburgerColor: '#4F46E5',
  navText: '#64748B', navActiveText: '#4F46E5',
  navActiveBg: 'rgba(79,70,229,0.08)', navActiveBorder: '#4F46E5',
  avatarBg: '#4F46E5', avatarBorder: 'rgba(79,70,229,0.3)',
  cameraBadgeBg: '#EEF2FF',
  userName: '#1E293B', userRole: '#64748B',
  logoutBg: 'rgba(239,68,68,0.06)', logoutBorder: 'rgba(239,68,68,0.20)',
  drawerBg: '#FFFFFF', drawerShadow: '#94A3B8',
  settingsDividerColor: '#E8EDF5',
  settingsBg: 'rgba(79,70,229,0.06)', settingsBorder: 'rgba(79,70,229,0.18)',
  settingsText: '#4F46E5', settingsIcon: '#4F46E5',
};

// ─── Derive BASE_URL from axiosInstance so there's no hardcoded IP ───────────
const BASE_URL = axiosInstance.defaults.baseURL;

const NAV_ITEMS = [
  { id: 'dashboard',          label: 'Dashboard',        route: 'DashboardScreen' },
  { id: 'attendanceMarking',  label: 'Attendance Marking', route: 'AttendanceScreen' },
  { id: 'studentAttendance',  label: 'Attendance',        route: 'StudentAttendanceScreen' },
  { id: 'assignments',        label: 'Assignments',       route: 'AssignmentScreen' },
  { id: 'planner',            label: 'Lesson Planner',    route: 'PlannerScreen' },
  { id: 'exams',              label: 'Exams',             route: 'TeacherExamScreen' },
  { id: 'quiz',               label: 'Quiz Session',      route: 'QuizzSessionScreen' },
  { id: 'addquizz',           label: 'Add Quiz',          route: 'QuizBuilderScreen' },
  { id: 'doubt',              label: 'Doubt Session',     route: 'DoubtScreen' },
  { id: 'messages',           label: 'Messages',          route: 'MessagesScreen' },
  { id: 'timetable',          label: 'Timetable',         route: 'TimetableScreen' },
  { id: 'settings',           label: 'Settings',          route: 'ClassTeacherSettingsScreen' },
];

const SIDEBAR_W  = 210;
const DRAWER_W   = 240;
const BREAKPOINT = 768;

// ─── Helper: get 2-letter initials ───────────────────────────────────────────
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ─── Avatar Component ─────────────────────────────────────────────────────────
const AvatarButton = ({ name, profileImage, teacherId, uploading, onPress }) => {
  const imageUri = teacherId
    ? `${BASE_URL}/teachers/profile/image/${teacherId}`
    : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.avatar}>
      {uploading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : imageUri ? (
        <Image source={{ uri: imageUri }} style={s.avatarImage} />
      ) : (
        <Text style={s.avText}>{getInitials(name)}</Text>
      )}
      {!uploading && (
        <View style={s.cameraBadge}>
          <Text style={s.cameraIcon}>📷</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Sidebar inner content ────────────────────────────────────────────────────
const SidebarContent = ({ activeScreen, onSelect, onLogout, teacher, uploading, onAvatarPress, ST }) => (
  <View style={[s.sidebar, { backgroundColor: ST.sidebarBg }]}>
    {/* Logo */}
    <View style={[s.logoRow, { borderBottomColor: ST.borderColor3 }]}>
      <View style={[s.logoBadge, { backgroundColor: ST.logoBadgeBg }]}>
        <Text style={s.logoIcon}>✦</Text>
      </View>
      <Text style={[s.logoText, { color: ST.logoText }]}>UniVerse</Text>
    </View>

    {/* Nav items */}
    <View style={s.navList}>
      {NAV_ITEMS.filter(item => {
        // ✅ Hide Settings tab if teacher is NOT assigned as class teacher
        if (item.id === 'settings') {
          return teacher?.classTeacher?.year && teacher?.classTeacher?.division;
        }
        return true;
      }).map(item => {
        const active = activeScreen === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item)}
            activeOpacity={0.75}
            style={[
              s.navItem,
              active && [s.navItemActive, { backgroundColor: ST.navActiveBg, borderLeftColor: ST.navActiveBorder }],
            ]}>
            <Text style={[s.navIcon, { color: ST.navText }, active && { color: ST.navActiveText }]}>{item.icon}</Text>
            <Text style={[s.navLabel, { color: ST.navText }, active && { color: ST.navActiveText, fontWeight: '600' }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    {/* User profile + Logout */}
    <View style={[s.userRow, { borderTopColor: ST.borderColor3 }]}>
      <AvatarButton
        name={teacher.name}
        profileImage={teacher.profileImage}
        teacherId={teacher.id}
        uploading={uploading}
        onPress={onAvatarPress}
      />
      <View style={{ flex: 1 }}>
        <Text style={[s.userName, { color: ST.userName }]} numberOfLines={1}>
          {teacher.name || 'Loading...'}
        </Text>
        <Text style={[s.userRole, { color: ST.userRole }]} numberOfLines={1}>
          {teacher.role || 'Teacher'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onLogout}
        activeOpacity={0.75}
        style={[s.logoutBtn, { backgroundColor: ST.logoutBg, borderColor: ST.logoutBorder }]}>
        <Text style={s.logoutIcon}>🚪</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Main export ──────────────────────────────────────────────────────────────
const Sidebar = ({ activeScreen = 'dashboard', children }) => {
  const navigation              = useNavigation();
  const { width }               = useWindowDimensions();
  const isWide                  = width >= BREAKPOINT;
  const { isDark }              = useContext(ThemeContext);
  const ST                      = isDark ? SB_DARK : SB_LIGHT;
  const [drawerOpen, setDrawer] = useState(false);

  // Teacher state
  const [teacher, setTeacher]     = useState({ id: '', name: '', role: '', profileImage: '', classTeacher: null });
  const [teacherId, setTeacherId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ── Fetch teacher info on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const id = await AsyncStorage.getItem('teacherId');
        console.log('Sidebar: teacherId from storage =', id);

        if (!id) {
          console.warn('Sidebar: no teacherId in AsyncStorage — was it saved on login?');
          return;
        }

        setTeacherId(id);

        const res  = await axiosInstance.get(`/teachers/${id}`);
        const json = res.data;

        if (json.success && json.data) {
          setTeacher({
            id:           json.data._id || json.data.id || '',
            name:         json.data.name || '',
            role:         'Teacher',
            profileImage: json.data.profileImage || '',
            classTeacher: json.data.classTeacher || null,
          });
        }
      } catch (err) {
        console.warn('Sidebar: failed to fetch teacher', err);
      }
    };

    fetchTeacher();
  }, []);

  // ── Handle avatar tap → image picker → upload ───────────────────────────
  const handleAvatarPress = useCallback(async () => {
    if (!teacherId) {
      Alert.alert('Error', 'Teacher ID not found. Please log in again.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset    = result.assets[0];
    const formData = new FormData();

    if (Platform.OS === 'web') {
      formData.append('profileImage', asset.file);
    } else {
      formData.append('profileImage', {
        uri:  asset.uri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    }

    try {
      setUploading(true);
      const res  = await axiosInstance.put(
        `/teachers/profile/upload/${teacherId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const json = res.data;

      if (json.success) {
        setTeacher(prev => ({ ...prev, profileImage: json.profileImage }));
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        Alert.alert('Upload Failed', json.message || 'Something went wrong.');
      }
    } catch (err) {
      console.warn('Upload error:', err);
      Alert.alert('Error', 'Failed to upload image. Check your connection.');
    } finally {
      setUploading(false);
    }
  }, [teacherId]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const handleSelect = useCallback((item) => {
    setDrawer(false);
    if (item.id === activeScreen) return;
    navigation.navigate(item.route);
  }, [navigation, activeScreen]);

  // ── Settings navigation ──────────────────────────────────────────────────
  // Now handled via NAV_ITEMS — kept for backward-compat if called directly
  const handleSettingsPress = useCallback(() => {
    setDrawer(false);
    navigation.navigate('ClassTeacherSettingsScreen');
  }, [navigation]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setDrawer(false);

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
            console.error('⚠️  Error revoking token on backend:', error.message);
          }
        }

        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('teacherId');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userName');
        await AsyncStorage.removeItem('currentScreen');

        console.log('✅ User logged out successfully');

        let nav = navigation;
        while (nav.getParent()) nav = nav.getParent();
        nav.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        console.error('❌ Logout error:', error);
        Alert.alert('Error', 'Error during logout. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) performLogout();
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel',  style: 'cancel'      },
          { text: 'Logout',  style: 'destructive', onPress: performLogout },
        ],
        { cancelable: true },
      );
    }
  }, [navigation]);

  const sidebarContentProps = {
    activeScreen,
    onSelect:        handleSelect,
    onLogout:        handleLogout,
    teacher,
    uploading,
    onAvatarPress:   handleAvatarPress,
    ST,
  };

  /* ── Desktop: permanent sidebar ─────────────────────────────────────────── */
  if (isWide) {
    return (
      <View style={[s.wideContainer, { backgroundColor: ST.wideBg }]}>
        <View style={[s.permanentSidebar, { backgroundColor: ST.sidebarBg, borderRightColor: ST.borderColor }]}>
          <SidebarContent {...sidebarContentProps} />
        </View>
        <View style={[s.screenArea, { backgroundColor: ST.screenBg }]}>{children}</View>
      </View>
    );
  }

  /* ── Mobile: top bar + slide-in drawer ──────────────────────────────────── */
  return (
    <SafeAreaView style={[s.mobileRoot, { backgroundColor: ST.screenBg }]}>
      <View style={[s.topBar, { backgroundColor: ST.sidebarBg, borderBottomColor: ST.borderColor2 }]}>
        <TouchableOpacity
          onPress={() => setDrawer(true)}
          style={s.hamburger}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.hamburgerIcon, { color: ST.hamburgerColor }]}>☰</Text>
        </TouchableOpacity>
        <View style={s.topLogoRow}>
          <View style={[s.logoBadgeSm, { backgroundColor: ST.logoBadgeBg }]}>
            <Text style={s.logoIconSm}>✦</Text>
          </View>
          <Text style={[s.logoTextSm, { color: ST.logoText }]}>UniVerse</Text>
        </View>
      </View>

      <View style={s.mobileContent}>{children}</View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawer(false)}>
        <Pressable style={s.backdrop} onPress={() => setDrawer(false)} />
        <View style={[s.drawerPanel, { backgroundColor: ST.drawerBg, borderRightColor: ST.borderColor2, shadowColor: ST.drawerShadow }]}>
          <SidebarContent {...sidebarContentProps} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* Desktop */
  wideContainer: {
    flex: 1, flexDirection: 'row', backgroundColor: '#080818',
  },
  permanentSidebar: {
    width: SIDEBAR_W,
    backgroundColor: '#0f0f23',
    borderRightWidth: 1,
    borderRightColor: 'rgba(99,102,241,0.15)',
  },
  screenArea: { flex: 1, backgroundColor: '#0d0d20' },

  /* Mobile */
  mobileRoot: { flex: 1, backgroundColor: '#0d0d20' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0f23',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.2)',
  },
  hamburger: { padding: 4 },
  hamburgerIcon: { fontSize: 22, color: '#a5b4fc' },
  topLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadgeSm: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
  },
  logoIconSm:  { fontSize: 12, color: '#fff' },
  logoTextSm:  { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
  mobileContent: { flex: 1 },

  /* Drawer */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawerPanel: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#0f0f23',
    borderRightWidth: 1, borderRightColor: 'rgba(99,102,241,0.2)',
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 16,
  },

  /* Sidebar content */
  sidebar: { flex: 1, flexDirection: 'column' },
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  logoBadge: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
  },
  logoIcon: { fontSize: 14, color: '#fff' },
  logoText: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },

  navList: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 10, borderLeftWidth: 3, borderLeftColor: 'transparent',
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(99,102,241,0.14)', borderLeftColor: '#6366f1',
  },
  navIcon:        { fontSize: 14, color: '#64748b' },
  navIconActive:  { color: '#a5b4fc' },
  navLabel:       { fontSize: 12, color: '#64748b', fontWeight: '400' },
  navLabelActive: { color: '#a5b4fc', fontWeight: '600' },

  /* Logout */
  logoutBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoutIcon: { fontSize: 14 },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 12, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.12)',
  },

  /* Avatar */
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.4)',
    overflow: 'visible',
    flexShrink: 0,
  },
  avatarImage: { width: 34, height: 34, borderRadius: 17 },
  avText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cameraBadge: {
    position: 'absolute',
    bottom: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#1e1e3a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  cameraIcon: { fontSize: 8 },

  userName: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  userRole:  { color: '#475569', fontSize: 10 },
});

export default Sidebar;