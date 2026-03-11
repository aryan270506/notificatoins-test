import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// ─── Design Tokens ──────────────────────────────────────────────────────────
const C = {
  bg:     '#0b0d1a',
  card:   '#13172a',
  border: '#1c2140',
  blue:   '#4b6cf7',
  blueL:  '#6a85f8',
  purple: '#8b5cf6',
  teal:   '#14b8a6',
  green:  '#22c55e',
  orange: '#f59e0b',
  red:    '#ef4444',
  white:  '#ffffff',
  muted:  '#8b92b4',
  dim:    '#3d4266',
  darkBtn:'#1a1f38',
  cyan:   '#06b6d4',
};

// ─── Default Permissions (overridden by fetched data) ───────────────────────

const defaultPermissions = [
  { id: 1, role: 'Admin',   canUploadData: true,  canLogin: true },
  { id: 2, role: 'Teacher', canUploadData: true,  canLogin: true },
  { id: 3, role: 'Student', canUploadData: false, canLogin: true },
  { id: 4, role: 'Parent',  canUploadData: false, canLogin: true },
];

const uploadLabels = [
  { key: 'canUploadData',    label: 'Upload Data' },
  { key: 'canLogin',         label: 'Login Access' },
];

// ─── Role Tabs (matches each dashboard's NAV_ITEMS) ────────────────────────
const ROLE_TABS = {
  Admin: [
    { key: 'dashboard',        label: 'Dashboard' },
    { key: 'timetable',        label: 'Timetable Management' },
    { key: 'reports',          label: 'Reports' },
    { key: 'assignment',       label: 'Assignment' },
    { key: 'admission-fee',    label: 'Admission Fee' },
    { key: 'security-logs',    label: 'Security Logs' },
    { key: 'dataimportcenter', label: 'Data Import Center' },
    { key: 'messages',         label: 'Messages' },
  ],
  Teacher: [
    { key: 'dashboard',          label: 'Dashboard' },
    { key: 'attendanceMarking',  label: 'Attendance Marking' },
    { key: 'studentAttendance',  label: 'Attendance' },
    { key: 'assignments',        label: 'Assignments' },
    { key: 'planner',            label: 'Lesson Planner' },
    { key: 'exams',              label: 'Exams' },
    { key: 'quiz',               label: 'Quiz Session' },
    { key: 'addquizz',           label: 'Add Quiz' },
    { key: 'doubt',              label: 'Doubt Session' },
    { key: 'messages',           label: 'Messages' },
    { key: 'timetable',          label: 'Timetable' },
  ],
  Student: [
    { key: 'dashboard',      label: 'Dashboard' },
    { key: 'Notes',          label: 'Notes' },
    { key: 'timetable',      label: 'TimeTable' },
    { key: 'ai_doubts',      label: 'Doubts' },
    { key: 'chat',           label: 'Chat' },
    { key: 'StudentFinance', label: 'Finance' },
    { key: 'StudentExam',    label: 'Exam' },
    { key: 'Assignment',     label: 'Assignment' },
    { key: 'StudentQuiz',    label: 'Quiz' },
  ],
  Parent: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'schedule',  label: 'Schedule' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'exam',      label: 'Exam Results' },
    { key: 'Message',   label: 'Message' },
    { key: 'finance',   label: 'Finance' },
  ],
};

// ─── Platform-aware alert ───────────────────────────────────────────────────
const showDeniedAlert = () => {
  if (Platform.OS === 'web') {
    window.alert('Permission denied from developers');
  } else {
    Alert.alert('Access Restricted', 'Permission denied from developers');
  }
};

// ─── Status Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    active:   { bg: 'rgba(34,197,94,0.15)',  text: C.green,  label: 'Active' },
    inactive: { bg: 'rgba(139,146,180,0.15)', text: C.muted,  label: 'Inactive' },
    expired:  { bg: 'rgba(245,158,11,0.15)',  text: C.orange, label: 'Expired' },
    blocked:  { bg: 'rgba(239,68,68,0.15)',   text: C.red,    label: 'Blocked' },
  };
  const c = config[status] || config.inactive;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.text }]} />
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

// ─── Toggle Switch ──────────────────────────────────────────────────────────
const ToggleSwitch = ({ value, onPress }) => (
  <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
    <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      <View style={[styles.toggleThumb, value ? styles.thumbOn : styles.thumbOff]} />
    </View>
  </TouchableOpacity>
);

// ─── Role Badge ─────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const colors = {
    Admin:     C.purple,
    Teacher:   C.blue,
    Student:   C.teal,
    Parent:    C.orange,
  };
  const color = colors[role] || C.muted;
  return (
    <View style={[styles.roleBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.roleBadgeText, { color }]}>{role}</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const PermissionDashboard = () => {
  const [activeTab, setActiveTab] = useState('uploads');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsSummary, setLogsSummary] = useState({ total: 0, success: 0, warning: 0, failed: 0 });
  const [tabAccess, setTabAccess] = useState({ Admin: {}, Teacher: {}, Student: {}, Parent: {} });
  const [selectedRole, setSelectedRole] = useState('Admin');

  // ── Fetch data from backend (same pattern as Admin) ─────────────────────
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch permissions + security logs in parallel
      const [permRes, logsRes, summaryRes, activeUsersRes] = await Promise.all([
        axiosInstance.get('/permissions').catch(() => ({ data: [] })),
        axiosInstance.get('/admins/security-logs?type=Auth').catch(() => ({ data: [] })),
        axiosInstance.get('/admins/security-logs/summary').catch(() => ({ data: {} })),
        axiosInstance.get('/users/active-users').catch(() => ({ data: { users: [], count: 0 } })),
      ]);

      // Load persisted permissions from backend
      if (Array.isArray(permRes.data) && permRes.data.length > 0) {
        const mapped = permRes.data.map((p, idx) => ({
          id: idx + 1,
          role: p.role,
          canUploadData: p.canUploadData,
          canLogin: p.canLogin,
        }));
        setPermissions(mapped);

        // Load tab access per role
        const access = {};
        permRes.data.forEach(p => {
          access[p.role] = p.tabAccess || {};
        });
        setTabAccess(prev => ({ ...prev, ...access }));
      }

      // Map security logs to login activity rows
      const logs = (logsRes.data?.logs || []).map((log, idx) => ({
        id: log._id || idx + 1,
        name: log.actor || 'Unknown',
        role: log.metadata?.role || 'Unknown',
        email: log.metadata?.email || log.route || '—',
        lastLogin: new Date(log.createdAt).toLocaleString(),
        status: log.status === 'Success' ? 'active'
              : log.status === 'Failed' ? 'blocked'
              : log.status === 'Warning' ? 'expired'
              : 'inactive',
        ip: log.ip || '—',
        device: log.metadata?.userAgent || log.method || '—',
      }));
      setLoginLogs(logs);

      // Summary
      if (summaryRes.data) {
        setLogsSummary(summaryRes.data);
      }

      console.log('✅ Committee permission data fetched:', {
        logs: logs.length,
        activeUsers: activeUsersRes.data?.count || 0,
      });
    } catch (error) {
      console.log('❌ Error fetching permission data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (id, key) => {
    setPermissions(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, [key]: !p[key] } : p);
      const changed = updated.find(p => p.id === id);

      // Persist to backend
      axiosInstance.put(`/permissions/${changed.role}`, {
        canLogin: changed.canLogin,
        canUploadData: changed.canUploadData,
      }).then(() => {
        console.log(`✅ Permission saved: ${changed.role} → ${key} = ${changed[key]}`);
      }).catch(err => {
        console.log(`❌ Failed to save permission: ${err.message}`);
      });

      return updated;
    });
  };

  const toggleTabAccess = (role, tabKey) => {
    setTabAccess(prev => {
      const roleAccess = { ...(prev[role] || {}) };
      roleAccess[tabKey] = roleAccess[tabKey] === false ? true : false;
      const updated = { ...prev, [role]: roleAccess };

      axiosInstance.put(`/permissions/${encodeURIComponent(role)}`, {
        tabAccess: roleAccess,
      }).then(() => {
        console.log(`✅ Tab access saved: ${role} → ${tabKey} = ${roleAccess[tabKey]}`);
      }).catch(err => {
        console.log(`❌ Failed to save tab access: ${err.message}`);
      });

      return updated;
    });
  };

  const roles = ['All', 'Admin', 'Teacher', 'Student', 'Parent'];

  const filteredLogs = loginLogs.filter((log) => {
    const matchesSearch =
      log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'All' || log.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // ── Stats Row ───────────────────────────────────────────────────────────
  const activeCount  = loginLogs.filter(l => l.status === 'active').length;
  const blockedCount = loginLogs.filter(l => l.status === 'blocked').length;

  const stats = [
    { label: 'Total Roles',    value: '4',                    icon: '🛡️', color: C.blue   },
    { label: 'Active Sessions', value: String(activeCount),    icon: '🟢', color: C.green  },
    { label: 'Failed Logins',  value: String(blockedCount),    icon: '🚫', color: C.red    },
    { label: 'Total Logs',     value: String(loginLogs.length), icon: '📁', color: C.purple },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 14 }}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Permissions & Access</Text>
          <Text style={styles.headerSub}>Manage upload privileges and monitor login activity</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: s.color + '18' }]}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'uploads' && styles.tabActive]}
          onPress={() => setActiveTab('uploads')}
        >
          <Text style={{ fontSize: 14 }}>📤</Text>
          <Text style={[styles.tabText, activeTab === 'uploads' && styles.tabTextActive]}>
            Upload Permissions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logins' && styles.tabActive]}
          onPress={() => setActiveTab('logins')}
        >
          <Text style={{ fontSize: 14 }}>🔐</Text>
          <Text style={[styles.tabText, activeTab === 'logins' && styles.tabTextActive]}>
            Login Activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tabAccess' && styles.tabActive]}
          onPress={() => setActiveTab('tabAccess')}
        >
          <Text style={{ fontSize: 14 }}>🔒</Text>
          <Text style={[styles.tabText, activeTab === 'tabAccess' && styles.tabTextActive]}>
            Tab Access
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Upload Permissions Tab ─── */}
      {activeTab === 'uploads' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Role-Based Access Permissions</Text>
            <Text style={styles.cardSub}>Control upload and login access for each role</Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 1 }]}>Role</Text>
            {uploadLabels.map((ul) => (
              <Text key={ul.key} style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>{ul.label}</Text>
            ))}
          </View>

          {/* Table Rows */}
          {permissions.map((perm, idx) => (
            <View
              key={perm.id}
              style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
            >
              <View style={{ flex: 1 }}>
                <RoleBadge role={perm.role} />
              </View>
              {uploadLabels.map((ul) => (
                <View key={ul.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ToggleSwitch
                    value={perm[ul.key]}
                    onPress={() => togglePermission(perm.id, ul.key)}
                  />
                </View>
              ))}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.toggle, styles.toggleOn, { transform: [{ scale: 0.7 }] }]}>
                <View style={[styles.toggleThumb, styles.thumbOn]} />
              </View>
              <Text style={styles.legendText}>Allowed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.toggle, styles.toggleOff, { transform: [{ scale: 0.7 }] }]}>
                <View style={[styles.toggleThumb, styles.thumbOff]} />
              </View>
              <Text style={styles.legendText}>Denied</Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── Login Activity Tab ─── */}
      {activeTab === 'logins' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Login Activity Log</Text>
            <Text style={styles.cardSub}>Recent login sessions across all roles</Text>
          </View>

          {/* Search & Filter */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={C.dim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolePills}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pill, filterRole === r && styles.pillActive]}
                  onPress={() => setFilterRole(r)}
                >
                  <Text style={[styles.pillText, filterRole === r && styles.pillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Login Table Header */}
          {!isMobile && (
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, { flex: 1.5 }]}>User</Text>
              <Text style={[styles.thCell, { flex: 1 }]}>Role</Text>
              <Text style={[styles.thCell, { flex: 1.3 }]}>Last Login</Text>
              <Text style={[styles.thCell, { flex: 0.8 }]}>Status</Text>
              <Text style={[styles.thCell, { flex: 1 }]}>IP Address</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Device</Text>
            </View>
          )}

          {/* Login Rows */}
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try adjusting your search or filter</Text>
            </View>
          ) : (
            filteredLogs.map((log, idx) =>
              isMobile ? (
                /* ─── Mobile Card ─── */
                <View key={log.id} style={styles.mobileCard}>
                  <View style={styles.mobileCardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {log.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mobileName}>{log.name}</Text>
                      <Text style={styles.mobileEmail}>{log.email}</Text>
                    </View>
                    <StatusBadge status={log.status} />
                  </View>
                  <View style={styles.mobileCardDetails}>
                    <View style={styles.mobileDetail}>
                      <Text style={styles.mobileDetailLabel}>Role</Text>
                      <RoleBadge role={log.role} />
                    </View>
                    <View style={styles.mobileDetail}>
                      <Text style={styles.mobileDetailLabel}>Last Login</Text>
                      <Text style={styles.mobileDetailValue}>{log.lastLogin}</Text>
                    </View>
                    <View style={styles.mobileDetail}>
                      <Text style={styles.mobileDetailLabel}>IP</Text>
                      <Text style={styles.mobileDetailValue}>{log.ip}</Text>
                    </View>
                    <View style={styles.mobileDetail}>
                      <Text style={styles.mobileDetailLabel}>Device</Text>
                      <Text style={styles.mobileDetailValue}>{log.device}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* ─── Desktop Row ─── */
                <View
                  key={log.id}
                  style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
                >
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {log.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.userName}>{log.name}</Text>
                      <Text style={styles.userEmail}>{log.email}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <RoleBadge role={log.role} />
                  </View>
                  <Text style={[styles.cellText, { flex: 1.3 }]}>{log.lastLogin}</Text>
                  <View style={{ flex: 0.8 }}>
                    <StatusBadge status={log.status} />
                  </View>
                  <Text style={[styles.cellText, { flex: 1, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>{log.ip}</Text>
                  <Text style={[styles.cellText, { flex: 1.2 }]}>{log.device}</Text>
                </View>
              )
            )
          )}

          {/* Summary Footer */}
          <View style={styles.summaryFooter}>
            <Text style={styles.summaryText}>
              Showing {filteredLogs.length} of {loginLogs.length} records
            </Text>
          </View>
        </View>
      )}

      {/* ─── Tab Access Tab ─── */}
      {activeTab === 'tabAccess' && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tab Access Control</Text>
            <Text style={styles.cardSub}>Control which sections each role can access</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolePills}>
              {['Admin', 'Teacher', 'Student', 'Parent'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pill, selectedRole === r && styles.pillActive]}
                  onPress={() => setSelectedRole(r)}
                >
                  <Text style={[styles.pillText, selectedRole === r && styles.pillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Access Grid */}
          <View style={styles.tabGrid}>
            {(ROLE_TABS[selectedRole] || []).map((tab) => {
              const isAllowed = tabAccess[selectedRole]?.[tab.key] !== false;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabAccessCard, !isAllowed && styles.tabAccessCardLocked]}
                  onPress={() => {
                    if (!isAllowed) showDeniedAlert();
                  }}
                  activeOpacity={isAllowed ? 1 : 0.7}
                >
                  <View style={styles.tabAccessRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      {!isAllowed && <Text style={{ fontSize: 16 }}>🔒</Text>}
                      {isAllowed && <Text style={{ fontSize: 16 }}>✅</Text>}
                      <Text style={[styles.tabAccessLabel, !isAllowed && styles.tabAccessLabelLocked]}>
                        {tab.label}
                      </Text>
                    </View>
                    <ToggleSwitch
                      value={isAllowed}
                      onPress={() => toggleTabAccess(selectedRole, tab.key)}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <Text style={{ fontSize: 14 }}>✅</Text>
              <Text style={styles.legendText}>Accessible</Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={styles.legendText}>Locked</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    padding: isMobile ? 16 : 28,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: isMobile ? 22 : 28,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
  },

  // Stats
  statsRow: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    flex: isMobile ? undefined : 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {},
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
  },
  statLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: C.blue + '22',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.muted,
  },
  tabTextActive: {
    color: C.blueL,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: isMobile ? 16 : 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.white,
  },
  cardSub: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: isMobile ? 12 : 24,
    backgroundColor: '#0e1225',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '600',
    color: C.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: isMobile ? 12 : 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '60',
  },
  tableRowAlt: {
    backgroundColor: '#0e1225' + '50',
  },
  cellText: {
    fontSize: 13,
    color: C.muted,
  },

  // User in table
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
  },
  userEmail: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.blue + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.blueL,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Role Badge
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Toggle
  toggle: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: C.green + '30',
  },
  toggleOff: {
    backgroundColor: C.dim + '40',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  thumbOn: {
    backgroundColor: C.green,
    alignSelf: 'flex-end',
  },
  thumbOff: {
    backgroundColor: C.dim,
    alignSelf: 'flex-start',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: isMobile ? 16 : 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: C.muted,
  },

  // Filter bar
  filterBar: {
    padding: isMobile ? 12 : 20,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1225',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: C.white,
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  rolePills: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.darkBtn,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: {
    backgroundColor: C.blue + '22',
    borderColor: C.blue + '60',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.muted,
  },
  pillTextActive: {
    color: C.blueL,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },

  // Summary footer
  summaryFooter: {
    padding: isMobile ? 12 : 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  summaryText: {
    fontSize: 13,
    color: C.dim,
  },

  // Mobile card
  mobileCard: {
    margin: 12,
    backgroundColor: '#0e1225',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  mobileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.white,
  },
  mobileEmail: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  mobileCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  mobileDetail: {
    minWidth: '45%',
    gap: 4,
  },
  mobileDetailLabel: {
    fontSize: 11,
    color: C.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  mobileDetailValue: {
    fontSize: 13,
    color: C.muted,
  },

  // Tab Access
  tabGrid: {
    padding: isMobile ? 12 : 20,
    gap: 10,
  },
  tabAccessCard: {
    backgroundColor: '#0e1225',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  tabAccessCardLocked: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: C.red + '30',
  },
  tabAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabAccessLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.white,
  },
  tabAccessLabelLocked: {
    color: C.red,
    opacity: 0.7,
  },
});

export default PermissionDashboard;