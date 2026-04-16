import React, { useState, useMemo } from 'react';
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
import PermissionDashboard from '../Permission/Permission';
import AddInstitute from '../AddInstitute/AddInstitute';

// ── Admin screens reused by Committee ──
import { ThemeContext, DARK_COLORS } from '../../Admin/dashboard/AdminDashboard';
import TimeTableScreen from '../../Admin/timetable/TimeTableManagement';
import SelectionScreen from '../../Admin/Message/Selectionscreen';
import Assignment from '../../Admin/Assignment/Assignment';
import Admissionfees from '../../Admin/Fees/Admissionfees';
import DataImportCenter from '../../Admin/DataImportCenter/DataImportCenter';

const Icon = ({ name, color = '#fff', size = 20 }) => {
  const icons = {
    dashboard: '⊞', students: '👥', faculty: '👨‍🏫', parents: '👨‍👩‍👧',
    attendance: '📅', permission: '🔑', reports: '📊', timetable: '🕐',
    messages: '✉️', assignment: '📝', finance: '💰', securitylogs: '🔒',
    dataimport: '📥', addinstitute: '🏫', logout: '🚪',
  };
  return <Text style={{ fontSize: size, color }}>{icons[name] || '•'}</Text>;
};

const navItems = [
  { id: 'dashboard',    label: 'Dashboard',      icon: 'dashboard' },
  { id: 'students',     label: 'Students',       icon: 'students' },
  { id: 'faculty',      label: 'Faculty',        icon: 'faculty' },
  { id: 'parents',      label: 'Parents',        icon: 'parents' },
  { id: 'attendance',   label: 'Attendance',     icon: 'attendance' },
  { id: 'timetable',    label: 'Timetable',      icon: 'timetable' },
  { id: 'messages',     label: 'Messages',       icon: 'messages' },
  { id: 'assignment',   label: 'Assignments',    icon: 'assignment' },
  { id: 'finance',      label: 'Finance / Fees', icon: 'finance' },
  { id: 'permission',   label: 'Permissions',    icon: 'permission' },
  { id: 'dataimport',   label: 'Data Import',    icon: 'dataimport' },
  { id: 'addinstitute', label: 'Add Institute',  icon: 'addinstitute' },
];
const bottomItems = [{ id: 'logout', label: 'Logout', icon: 'logout', danger: true }];

const SidebarContent = ({ active, setActive, onClose, isMobile }) => {
  const renderNavItem = ({ id, label, icon, danger }) => {
    const isActive = active === id;
    return (
      <TouchableOpacity
        key={id}
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => { setActive(id); if (isMobile && onClose) onClose(); }}
        activeOpacity={0.7}
      >
        <View style={styles.navIconWrap}>
          <Icon name={icon} color={danger ? '#f87171' : isActive ? '#fff' : '#8a9ab5'} size={18} />
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive, danger && styles.navLabelDanger]}>
          {label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIconWrap}><Text style={styles.logoIcon}>⊞</Text></View>
        <Text style={styles.logoText}>UniVerse</Text>
        {isMobile && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.divider} />
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {navItems.map(renderNavItem)}
      </ScrollView>
      <View style={styles.divider} />
      <View style={styles.bottomSection}>{bottomItems.map(renderNavItem)}</View>
    </View>
  );
};

const ComitteiSideBar = () => {
  const [active, setActive] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const themeValue = useMemo(() => ({ isDark: true, colors: DARK_COLORS }), []);

  const renderContent = () => {
    switch (active) {
      case 'dashboard':    return <CommitteeDash onNavigate={setActive} />;
      case 'students':     return <StudentManagementDashboard />;
      case 'faculty':      return <TeacherManagementDashboard />;
      case 'parents':      return <ParentManagementDashboard />;
      case 'attendance':   return <AttendanceDashboard />;
      case 'permission':   return <PermissionDashboard />;
      case 'timetable':    return <TimeTableScreen />;
      case 'messages':     return <SelectionScreen />;
      case 'assignment':   return <Assignment />;
      case 'finance':      return <Admissionfees />;
      case 'dataimport':   return <DataImportCenter />;
      case 'addinstitute': return <AddInstitute />;
      default:             return <CommitteeDash onNavigate={setActive} />;
    }
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <View style={styles.mainContainer}>
        {!isMobile && <SidebarContent active={active} setActive={setActive} isMobile={false} />}
        {isMobile && (
          <Modal visible={drawerOpen} transparent animationType="none" onRequestClose={() => setDrawerOpen(false)}>
            <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
            <View style={styles.drawerPanel}>
              <SidebarContent active={active} setActive={setActive} isMobile={true} onClose={() => setDrawerOpen(false)} />
            </View>
          </Modal>
        )}
        <View style={styles.contentArea}>
          {isMobile && (
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.hamburgerBtn} activeOpacity={0.7}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </TouchableOpacity>
              <Text style={styles.topBarTitle}>UniVerse</Text>
            </View>
          )}
          {renderContent()}
        </View>
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#f0f4f8' },
  sidebar: { width: 230, backgroundColor: '#0f1624', height: '100%', paddingTop: 20, paddingBottom: 16, flexDirection: 'column' },
  contentArea: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerPanel: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 240 },
  topBar: { height: 56, backgroundColor: '#0f1624', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  topBarTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700', letterSpacing: 0.4 },
  hamburgerBtn: { width: 36, height: 36, justifyContent: 'center', gap: 5 },
  hamburgerLine: { width: 24, height: 2.5, backgroundColor: '#ffffff', borderRadius: 2 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  logoIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 18, color: '#60a5fa' },
  logoText: { fontSize: 18, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5, flex: 1 },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#8a9ab5', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#1e2d45', marginHorizontal: 16, marginVertical: 8 },
  navScroll: { flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2, position: 'relative' },
  navItemActive: { backgroundColor: '#1d3461' },
  navIconWrap: { width: 26, alignItems: 'center', marginRight: 12 },
  navLabel: { fontSize: 14, color: '#8a9ab5', fontWeight: '500', flex: 1 },
  navLabelActive: { color: '#ffffff', fontWeight: '600' },
  navLabelDanger: { color: '#f87171' },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3b82f6' },
  bottomSection: { paddingHorizontal: 12, paddingTop: 4, gap: 2 },
});

export default ComitteiSideBar;