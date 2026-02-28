import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import CommitteeDash from './CommitteeDash';
import StudentManagementDashboard from '../Students/Students';
import TeacherManagementDashboard from '../Teacher/Teacher';
import ParentManagementDashboard from '../Parent/Parent';
import AttendanceDashboard from '../Attendence/Attendence';


// ---------------- ICONS ----------------
const Icon = ({ name, color = '#fff', size = 20 }) => {
  const icons = {
    dashboard: '⊞',
    students: '👥',
    faculty: '👨‍🏫',
    parents: '👨‍👩‍👧',
    attendance: '📅',
    exams: '📋',
    results: '📊',
    Storage: '🏢',
    settings: '⚙️',
    logout: '🚪',
  };

  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name] || '•'}
    </Text>
  );
};


// ---------------- NAV ITEMS ----------------
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'students', label: 'Students', icon: 'students' },
  { id: 'faculty', label: 'Faculty', icon: 'faculty' },
  { id: 'parents', label: 'Parents', icon: 'parents' },
  { id: 'attendance', label: 'Attendance', icon: 'attendance' },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'logout', label: 'Logout', icon: 'logout', danger: true },
];


// ================= SIDEBAR CONTENT =================
const SidebarContent = ({ active, setActive, onClose, isMobile }) => {
  const renderNavItem = ({ id, label, icon, danger }) => {
    const isActive = active === id;

    return (
      <TouchableOpacity
        key={id}
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
        ]}
        onPress={() => {
          setActive(id);
          if (isMobile && onClose) onClose(); // close sidebar on mobile after selection
        }}
        activeOpacity={0.7}
      >
        <View style={styles.navIconWrap}>
          <Icon
            name={icon}
            color={danger ? '#f87171' : isActive ? '#fff' : '#8a9ab5'}
            size={18}
          />
        </View>

        <Text
          style={[
            styles.navLabel,
            isActive && styles.navLabelActive,
            danger && styles.navLabelDanger,
          ]}
        >
          {label}
        </Text>

        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo Row */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIconWrap}>
          <Text style={styles.logoIcon}>⊞</Text>
        </View>
        <Text style={styles.logoText}>Campus360</Text>

        {/* Close button — only on mobile */}
        {isMobile && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <ScrollView
        style={styles.navScroll}
        showsVerticalScrollIndicator={false}
      >
        {navItems.map(renderNavItem)}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.bottomSection}>
        {bottomItems.map(renderNavItem)}
      </View>
    </View>
  );
};


// ================= MAIN COMPONENT =================
const ComitteiSideBar = () => {
  const [active, setActive] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const renderContent = () => {
    switch (active) {
      case 'dashboard':   return <CommitteeDash />;
      case 'students':    return <StudentManagementDashboard />;
      case 'faculty':     return <TeacherManagementDashboard />;
      case 'parents':     return <ParentManagementDashboard />;
      case 'attendance':  return <AttendanceDashboard />;
      default:            return <CommitteeDash />;
    }
  };

  return (
    <View style={styles.mainContainer}>

      {/* ---- DESKTOP: persistent sidebar ---- */}
      {!isMobile && (
        <SidebarContent
          active={active}
          setActive={setActive}
          isMobile={false}
        />
      )}

      {/* ---- MOBILE: slide-in drawer via Modal ---- */}
      {isMobile && (
        <Modal
          visible={drawerOpen}
          transparent
          animationType="none"
          onRequestClose={() => setDrawerOpen(false)}
        >
          {/* Backdrop — tap to close */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setDrawerOpen(false)}
          />

          {/* Sidebar panel */}
          <View style={styles.drawerPanel}>
            <SidebarContent
              active={active}
              setActive={setActive}
              isMobile={true}
              onClose={() => setDrawerOpen(false)}
            />
          </View>
        </Modal>
      )}

      {/* ---- CONTENT AREA ---- */}
      <View style={styles.contentArea}>

        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.hamburgerBtn}
              activeOpacity={0.7}
            >
              {/* Three lines */}
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>

            <Text style={styles.topBarTitle}>Campus360</Text>
          </View>
        )}

        {renderContent()}
      </View>

    </View>
  );
};


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
  },

  // ---- Sidebar ----
  sidebar: {
    width: 230,
    backgroundColor: '#0f1624',
    height: '100%',
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'column',
  },

  // ---- Content ----
  contentArea: {
    flex: 1,
  },
  contentText: {
    margin: 20,
    fontSize: 16,
    color: '#333',
  },

  // ---- Mobile Drawer ----
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 240,
  },

  // ---- Top Bar (mobile) ----
  topBar: {
    height: 56,
    backgroundColor: '#0f1624',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // ---- Hamburger ----
  hamburgerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },

  // ---- Logo ----
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  logoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
    color: '#60a5fa',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    flex: 1,
  },

  // Close button inside drawer
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#8a9ab5',
    fontSize: 16,
  },

  // ---- Divider ----
  divider: {
    height: 1,
    backgroundColor: '#1e2d45',
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // ---- Nav Items ----
  navScroll: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#1d3461',
  },
  navIconWrap: {
    width: 26,
    alignItems: 'center',
    marginRight: 12,
  },
  navLabel: {
    fontSize: 14,
    color: '#8a9ab5',
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  navLabelDanger: {
    color: '#f87171',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },

  // ---- Bottom Section ----
  bottomSection: {
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 2,
  },
});

export default ComitteiSideBar;