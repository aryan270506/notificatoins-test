import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isDesktop = SCREEN_WIDTH >= 768;

const LOGS = [
  { id: '1',  time: '09:42:15', actor: 'sys_admin_vance', ip: '10.0.0.1',      action: 'Database Schema Migration',       type: 'System',   status: 'Success' },
  { id: '2',  time: '09:38:01', actor: 'm_garcia_edu',    ip: '192.168.1.1',   action: 'Failed Login Attempt',            type: 'Auth',     status: 'Failed'  },
  { id: '3',  time: '09:15:02', actor: 'auto_bot_04',     ip: '10.0.0.8',      action: 'Scheduled Backup Initiated',      type: 'System',   status: 'Warning' },
  { id: '4',  time: '08:55:44', actor: 'security_ovr',    ip: '10.0.0.3',      action: 'API Key Rotation (Production)',   type: 'Security', status: 'Success' },
  { id: '5',  time: '08:32:10', actor: 'm_garcia_edu',    ip: '192.168.1.1',   action: 'Failed Login Attempt',            type: 'Auth',     status: 'Failed'  },
  { id: '6',  time: '08:20:55', actor: 'j_patel_dev',     ip: '10.0.1.22',     action: 'Firewall Rule Updated',           type: 'Security', status: 'Success' },
  { id: '7',  time: '08:10:30', actor: 'auto_bot_04',     ip: '10.0.0.8',      action: 'SSL Certificate Renewed',         type: 'Security', status: 'Success' },
  { id: '8',  time: '07:58:12', actor: 'unknown',         ip: '203.0.113.42',  action: 'Brute Force Detected',            type: 'Threat',   status: 'Failed'  },
  { id: '9',  time: '07:45:00', actor: 'sys_admin_vance', ip: '10.0.0.1',      action: 'User Role Permission Changed',    type: 'Auth',     status: 'Success' },
  { id: '10', time: '07:30:18', actor: 'k_lee_admin',     ip: '10.0.0.5',      action: 'Config File Modified',            type: 'System',   status: 'Warning' },
  { id: '11', time: '07:15:44', actor: 'unknown',         ip: '198.51.100.7',  action: 'Port Scan Detected',              type: 'Threat',   status: 'Failed'  },
  { id: '12', time: '07:00:00', actor: 'auto_bot_04',     ip: '10.0.0.8',      action: 'Log Rotation Completed',          type: 'System',   status: 'Success' },
  { id: '13', time: '06:45:33', actor: 'r_chen_sec',      ip: '10.0.0.11',     action: '2FA Policy Enforced',             type: 'Security', status: 'Success' },
  { id: '14', time: '06:30:21', actor: 'unknown',         ip: '203.0.113.99',  action: 'SQL Injection Attempt Blocked',   type: 'Threat',   status: 'Failed'  },
  { id: '15', time: '06:10:09', actor: 'sys_admin_vance', ip: '10.0.0.1',      action: 'System Patch Applied',            type: 'System',   status: 'Success' },
];

const FILTERS = ['All', 'Success', 'Warning', 'Failed'];
const TYPES   = ['All Types', 'Auth', 'Security', 'System', 'Threat'];

const STATUS_CONFIG = {
  Success: { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)', icon: 'check' },
  Warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'warn'  },
  Failed:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: 'fail'  },
};

const TYPE_CONFIG = {
  Auth:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  Security: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
  System:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  Threat:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

// Summary Card
const SummaryCard = ({ label, value, color, icon, sublabel }) => {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={[summaryStyles.card, { borderTopColor: color, backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={summaryStyles.icon}>{icon}</Text>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={[summaryStyles.label, { color: colors.textMuted }]}>{label}</Text>
      {sublabel ? <Text style={[summaryStyles.sub, { color: colors.textMuted }]}>{sublabel}</Text> : null}
    </View>
  );
};

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  icon:  { fontSize: 20, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
  sub:   { fontSize: 10, marginTop: 3 },
});

// Log Row
const LogRow = ({ item, onPress }) => {
  const { colors } = useContext(ThemeContext);
  const s = STATUS_CONFIG[item.status];
  const t = TYPE_CONFIG[item.type] || TYPE_CONFIG.System;
  return (
    <TouchableOpacity style={[logStyles.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onPress(item)} activeOpacity={0.75}>
      <View style={[logStyles.stripe, { backgroundColor: s.color }]} />
      <View style={logStyles.rowContent}>
        <View style={logStyles.topLine}>
          <Text style={[logStyles.action, { color: colors.textPrim }]} numberOfLines={1}>{item.action}</Text>
          <View style={[logStyles.statusBadge, { backgroundColor: s.bg, borderColor: s.color }]}>
            <Text style={[logStyles.statusText, { color: s.color }]}>{item.status}</Text>
          </View>
        </View>
        <View style={logStyles.bottomLine}>
          <Text style={[logStyles.meta, { color: colors.textMuted }]}>{'clock'} {item.time}</Text>
          <Text style={[logStyles.meta, { color: colors.textMuted }]}>{'user'} {item.actor}</Text>
          <Text style={[logStyles.meta, { color: colors.textMuted }]}>{'ip'} {item.ip}</Text>
          <View style={[logStyles.typeBadge, { backgroundColor: t.bg }]}>
            <Text style={[logStyles.typeText, { color: t.color }]}>{item.type}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const logStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  stripe: { width: 3 },
  rowContent: { flex: 1, padding: 14 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  action: { fontSize: 13, fontWeight: '600', flex: 1 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  bottomLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  meta: { fontSize: 11 },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeText: { fontSize: 10, fontWeight: '600' },
});

// Detail Modal
const DetailModal = ({ log, onClose }) => {
  const { colors } = useContext(ThemeContext);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 40, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const s = STATUS_CONFIG[log.status];
  const t = TYPE_CONFIG[log.type] || TYPE_CONFIG.System;

  const Field = ({ label, value, valueColor, colors }) => (
    <View style={[modalStyles.field, { borderBottomColor: colors.border }]}>
      <Text style={[modalStyles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[modalStyles.fieldValue, { color: colors.textPrim }, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );

  return (
    <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
      <Animated.View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
        <View style={[modalStyles.header, { borderBottomColor: s.color }]}>
          <View style={{ flex: 1 }}>
            <Text style={[modalStyles.headerTitle, { color: colors.textPrim }]}>Log Details</Text>
            <Text style={[modalStyles.headerSub, { color: colors.textMuted }]}>Event ID #{String(log.id).padStart(6, '0')}</Text>
          </View>
          <TouchableOpacity style={[modalStyles.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={close}>
            <Text style={[modalStyles.closeBtnText, { color: colors.textSec }]}>X</Text>
          </TouchableOpacity>
        </View>

        <View style={[modalStyles.banner, { backgroundColor: s.bg, borderColor: s.color }]}>
          <Text style={[modalStyles.bannerText, { color: s.color }]}>Status: {log.status}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Field label="ACTION"     value={log.action} colors={colors} />
          <Field label="TIMESTAMP"  value={log.time} colors={colors} />
          <Field label="ACTOR"      value={log.actor} colors={colors} />
          <Field label="IP ADDRESS" value={log.ip} colors={colors} />
          <Field label="EVENT TYPE" value={log.type}   valueColor={t.color} colors={colors} />
          <Field label="STATUS"     value={log.status} valueColor={s.color} colors={colors} />

          {log.type === 'Threat' ? (
            <View style={modalStyles.threatAlert}>
              <Text style={modalStyles.threatTitle}>Threat Detected</Text>
              <Text style={modalStyles.threatDesc}>
                This event has been flagged as a potential security threat. Review the IP address and consider blocking it if malicious activity is confirmed.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={modalStyles.exportBtn}>
            <Text style={modalStyles.exportBtnText}>Export This Log</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    paddingBottom: 16,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub:   { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 13, fontWeight: '700' },
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  bannerText: { fontSize: 14, fontWeight: '700' },
  field: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldValue: { fontSize: 14, fontWeight: '500' },
  threatAlert: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  threatTitle: { color: '#f87171', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  threatDesc:  { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },
  exportBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  exportBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
});

// Main Screen
export default function SecurityLogsScreen() {
  const { colors } = useContext(ThemeContext);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All Types');
  const [selectedLog, setSelectedLog]   = useState(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const filtered = LOGS.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = q === '' ||
      l.action.toLowerCase().includes(q) ||
      l.actor.toLowerCase().includes(q) ||
      l.ip.includes(q);
    const matchStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchType   = typeFilter === 'All Types' || l.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const counts = {
    total:   LOGS.length,
    success: LOGS.filter(l => l.status === 'Success').length,
    warning: LOGS.filter(l => l.status === 'Warning').length,
    failed:  LOGS.filter(l => l.status === 'Failed').length,
    threats: LOGS.filter(l => l.type === 'Threat').length,
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrim }]}>Security Logs</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Real-time audit trail  {counts.total} events today</Text>
          </View>
          <TouchableOpacity style={[styles.exportAllBtn, { backgroundColor: colors.accentBlue + '26', borderColor: colors.accentBlue + '59' }]}>
            <Text style={[styles.exportAllText, { color: colors.accentBlue }]}>Export All</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Summary Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <SummaryCard label="Total Events" value={counts.total}   color={colors.accentBlue} icon="📋" sublabel="Today" />
          <SummaryCard label="Success"      value={counts.success} color={colors.accent}     icon="✅" />
          <SummaryCard label="Warnings"     value={counts.warning} color={colors.accentWarn} icon="⚠️" />
          <SummaryCard label="Failed"       value={counts.failed}  color={colors.accentRed}  icon="❌" />
          <SummaryCard label="Threats"      value={counts.threats} color={colors.accentRed}  icon="🚨" sublabel="Blocked" />
        </ScrollView>

        {/* Threat Banner */}
        {counts.threats > 0 ? (
          <View style={[styles.threatBanner, { backgroundColor: colors.accentRed + '1a', borderColor: colors.accentRed + '59' }]}>
            <Text style={styles.threatBannerIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.threatBannerTitle, { color: colors.accentRed }]}>{counts.threats} Active Threat{counts.threats > 1 ? 's' : ''} Detected</Text>
              <Text style={[styles.threatBannerSub, { color: colors.textMuted }]}>Suspicious activity from external IPs has been blocked. Review logs below.</Text>
            </View>
          </View>
        ) : null}

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrim }]}
            placeholder="Search by action, actor or IP..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={[styles.searchClear, { color: colors.textMuted }]}>X</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                  statusFilter === f && { backgroundColor: colors.accentBlue + '33', borderColor: colors.accentBlue },
                ]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: colors.textMuted },
                  statusFilter === f && { color: colors.accentBlue, fontWeight: '700' },
                ]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Type Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.filterRow}>
            {TYPES.map((tp) => {
              const cfg = TYPE_CONFIG[tp];
              const isActive = typeFilter === tp;
              return (
                <TouchableOpacity
                  key={tp}
                  style={[
                    styles.typePill,
                    { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                    isActive ? { backgroundColor: cfg ? cfg.bg : colors.surfaceAlt, borderColor: cfg ? cfg.color : colors.textPrim } : null,
                  ]}
                  onPress={() => setTypeFilter(tp)}
                >
                  <Text style={[styles.typePillText, { color: colors.textMuted }, isActive ? { color: cfg ? cfg.color : colors.textPrim } : null]}>{tp}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Results count */}
        <View style={styles.resultsRow}>
          <Text style={[styles.resultsText, { color: colors.textMuted }]}>
            {'Showing '}
            <Text style={{ color: colors.accentBlue }}>{filtered.length}</Text>
            {' of ' + counts.total + ' logs'}
          </Text>
          <TouchableOpacity onPress={() => { setSearch(''); setStatusFilter('All'); setTypeFilter('All Types'); }}>
            <Text style={[styles.clearAll, { color: colors.accentBlue }]}>Clear filters</Text>
          </TouchableOpacity>
        </View>

        {/* Log List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrim }]}>No logs found</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <LogRow key={item.id} item={item} onPress={setSelectedLog} />
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedLog ? (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: isDesktop ? 28 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: isDesktop ? 22 : 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 4,
  },
  exportAllBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportAllText: { fontSize: 12, fontWeight: '600' },
  threatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  threatBannerIcon:  { fontSize: 22 },
  threatBannerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  threatBannerSub:   { fontSize: 12 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  searchClear: { fontSize: 14, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText:       { fontSize: 12, fontWeight: '500' },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillText: { fontSize: 12, fontWeight: '500' },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsText: { fontSize: 12 },
  clearAll:    { fontSize: 12, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub:   { fontSize: 13 },
});