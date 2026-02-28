import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

// ── Mock Data ──────────────────────────────────────────────────────────────────
const MESSAGES = [
  {
    id: 1,
    dateGroup: 'MARCH 14, 2024',
    sender: 'Office of the Registrar',
    senderRole: 'ADMIN',
    roleColor: '#4F8EF7',
    roleBg: '#1A2F50',
    roleBgLight: '#DBEAFE',
    avatarBg: '#3B5998',
    avatarEmoji: '🏫',
    time: '09:12 AM',
    body: 'Registration for the Spring 2024 semester is now officially open for all undergraduate and graduate students. Please log into your student portal to view your assigned registration time slot.',
    attachment: {
      name: 'Registration_Guide_2024.pdf',
      size: '2.4 MB • PDF Document',
    },
    alert: null,
  },
  {
    id: 2,
    dateGroup: 'MARCH 14, 2024',
    sender: 'IT Support Services',
    senderRole: 'SYSTEM',
    roleColor: '#A78BFA',
    roleBg: '#2D1A5F',
    roleBgLight: '#EDE9FE',
    avatarBg: '#4C1D95',
    avatarEmoji: '🖥️',
    time: '11:45 AM',
    body: 'The main campus Wi-Fi networks (Campus-Secure) will undergo essential maintenance this coming Sunday, March 17, from 02:00 AM to 04:00 AM. Intermittent connectivity should be expected during this window.',
    attachment: null,
    alert: {
      label: '⚠️ SCHEDULED MAINTENANCE:',
      color: '#F59E0B',
    },
  },
  {
    id: 3,
    dateGroup: 'TODAY',
    sender: 'Office of the Registrar',
    senderRole: 'ADMIN',
    roleColor: '#4F8EF7',
    roleBg: '#1A2F50',
    roleBgLight: '#DBEAFE',
    avatarBg: '#3B5998',
    avatarEmoji: '🏫',
    time: 'Just Now',
    body: 'Reminder: The Early Bird deadline for graduation applications is tomorrow at 5:00 PM. Applications submitted after this time will incur a late processing fee.',
    attachment: null,
    alert: null,
  },
];

const groupedMessages = MESSAGES.reduce((acc, msg) => {
  if (!acc[msg.dateGroup]) acc[msg.dateGroup] = [];
  acc[msg.dateGroup].push(msg);
  return acc;
}, {});

// ── Sub-components ────────────────────────────────────────────────────────────
const Avatar = ({ emoji, bg }) => (
  <View style={[styles.avatar, { backgroundColor: bg }]}>
    <Text style={styles.avatarEmoji}>{emoji}</Text>
  </View>
);

const RoleBadge = ({ label, color, bg }) => (
  <View style={[styles.roleBadge, { backgroundColor: bg }]}>
    <Text style={[styles.roleBadgeText, { color }]}>{label}</Text>
  </View>
);

const AttachmentCard = ({ attachment, onPress, C }) => (
  <TouchableOpacity
    style={[styles.attachmentCard, { backgroundColor: C.bg, borderColor: C.border }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[styles.attachmentIconWrap, { backgroundColor: C.cardAlt }]}>
      <Text style={styles.attachmentIcon}>📄</Text>
    </View>
    <View style={styles.attachmentTextGroup}>
      <Text style={[styles.attachmentName, { color: C.textPrimary }]}>{attachment.name}</Text>
      <Text style={[styles.attachmentSize, { color: C.textMuted }]}>{attachment.size}</Text>
    </View>
    <TouchableOpacity
      style={[styles.downloadBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.downloadIcon, { color: C.accent }]}>⬇</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const MessageBubble = ({ msg, onPress, onAttachmentPress, C }) => {
  const isDark = C.isDark;
  const roleBg = isDark ? msg.roleBg : msg.roleBgLight;

  return (
    <TouchableOpacity
      style={styles.messageWrap}
      onPress={() => onPress(msg)}
      activeOpacity={0.85}
    >
      <Avatar emoji={msg.avatarEmoji} bg={msg.avatarBg} />
      <View style={[
        styles.bubble,
        isLaptop && styles.bubbleLaptop,
        { backgroundColor: C.card, borderColor: C.border },
      ]}>
        <View style={styles.senderRow}>
          <Text style={[styles.senderName, { color: C.textPrimary }]}>{msg.sender}</Text>
          <RoleBadge label={msg.senderRole} color={msg.roleColor} bg={roleBg} />
          <Text style={[styles.timeText, { color: C.textMuted }]}>{msg.time}</Text>
        </View>

        {msg.alert && (
          <Text style={styles.alertText}>
            <Text style={[styles.alertLabel, { color: msg.alert.color }]}>
              {msg.alert.label}{' '}
            </Text>
          </Text>
        )}

        <Text style={[styles.bodyText, { color: C.textSub }]}>{msg.body}</Text>

        {msg.attachment && (
          <AttachmentCard
            attachment={msg.attachment}
            onPress={() => onAttachmentPress && onAttachmentPress(msg.attachment)}
            C={C}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const DateDivider = ({ label, C }) => (
  <View style={styles.dateDividerWrap}>
    <View style={[styles.dateDividerLine, { backgroundColor: C.border }]} />
    <Text style={[styles.dateDividerLabel, { color: C.textMuted }]}>{label}</Text>
    <View style={[styles.dateDividerLine, { backgroundColor: C.border }]} />
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentChat({ C, onThemeToggle }) {
  const [selectedMsg, setSelectedMsg] = useState(null);

  const handleMsgPress    = (msg) => setSelectedMsg(selectedMsg?.id === msg.id ? null : msg);
  const handleAttachmentPress = (attachment) => console.log('Download:', attachment.name);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.card} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.topBarLeft}>
          <View style={[styles.channelIconWrap, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
            <Text style={styles.channelIcon}>📢</Text>
          </View>
          <View>
            <View style={styles.channelTitleRow}>
              <Text style={[styles.channelTitle, { color: C.textPrimary }]}>University Announcements</Text>
              <Text style={[styles.verifiedBadge, { color: C.accent }]}>✔</Text>
            </View>
            <View style={styles.recipientRow}>
              <View style={[styles.onlineDot, { backgroundColor: C.green }]} />
              <Text style={[styles.recipientText, { color: C.textMuted }]}>
                12,402 Recipients • Broadcast Channel
              </Text>
            </View>
          </View>
        </View>

        {/* Theme toggle */}
        {onThemeToggle && (
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]}
            onPress={onThemeToggle}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{C.moonIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Messages ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isLaptop && styles.scrollContentLaptop]}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedMessages).map(([dateGroup, msgs]) => (
          <View key={dateGroup}>
            <DateDivider label={dateGroup} C={C} />
            {msgs.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onPress={handleMsgPress}
                onAttachmentPress={handleAttachmentPress}
                C={C}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ── Read-only Footer ── */}
      <View style={[styles.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <Text style={[styles.footerIcon, { color: C.textMuted }]}>🔒</Text>
        <Text style={[styles.footerText, { color: C.textMuted }]}>
          This is a{' '}
          <Text style={[styles.footerHighlight, { color: C.accent }]}>read-only</Text>
          {' '}channel. You do not have permission to reply to these messages.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: isLaptop ? 28 : 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  topBarLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelIconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  channelIcon:     { fontSize: 20 },
  channelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelTitle:    { fontSize: isLaptop ? 17 : 15, fontWeight: '700', letterSpacing: -0.3 },
  verifiedBadge:   { fontSize: 13, fontWeight: '700' },
  recipientRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:       { width: 7, height: 7, borderRadius: 4 },
  recipientText:   { fontSize: 12 },
  themeBtn:        { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  scroll:              { flex: 1 },
  scrollContent:       { paddingVertical: 12, paddingHorizontal: isLaptop ? 28 : 12 },
  scrollContentLaptop: { paddingHorizontal: 40 },

  dateDividerWrap:  { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dateDividerLine:  { flex: 1, height: 1 },
  dateDividerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  messageWrap: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  avatar:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  avatarEmoji: { fontSize: 18 },

  bubble:       { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, maxWidth: isLaptop ? '70%' : undefined },
  bubbleLaptop: { maxWidth: '72%' },

  senderRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  senderName:   { fontSize: 14, fontWeight: '700' },
  roleBadge:    { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  roleBadgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  timeText:     { fontSize: 11, marginLeft: 'auto' },

  alertLabel: { fontSize: 13, fontWeight: '700' },
  alertText:  { marginBottom: 4 },
  bodyText:   { fontSize: 13, lineHeight: 20 },

  attachmentCard:      { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', padding: 10, gap: 10 },
  attachmentIconWrap:  { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  attachmentIcon:      { fontSize: 18 },
  attachmentTextGroup: { flex: 1 },
  attachmentName:      { fontSize: 13, fontWeight: '600' },
  attachmentSize:      { fontSize: 11, marginTop: 2 },
  downloadBtn:         { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  downloadIcon:        { fontSize: 15 },

  footer:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, paddingVertical: 14, paddingHorizontal: isLaptop ? 28 : 16 },
  footerIcon:      { fontSize: 14 },
  footerText:      { fontSize: 12, textAlign: 'center', flex: 1 },
  footerHighlight: { fontWeight: '700' },
});