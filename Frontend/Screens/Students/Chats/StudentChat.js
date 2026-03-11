// ============================================================
//  StudentChat.js  —  UniVerse
//  Fetches broadcast messages for the logged-in student
//  Matches: recipientRole="student", academicYear, division
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Dimensions, StatusBar,
  ActivityIndicator, RefreshControl, Linking, Platform,
  Alert, Image,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import axiosInstance from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

const API_BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, "");
const POLL_INTERVAL = 8000;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(dateStr) {
  if (!dateStr) return 'TODAY';
  const d         = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'TODAY';
  if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return d
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

const ROLE_CFG = {
  admin:     { color: '#4F8EF7', darkBg: '#1A2F50', lightBg: '#DBEAFE', avatarBg: '#3B5998', emoji: '🏫',  label: 'ADMIN'     },
  teacher:   { color: '#A78BFA', darkBg: '#2D1A5F', lightBg: '#EDE9FE', avatarBg: '#4C1D95', emoji: '👨‍🏫', label: 'TEACHER'   },
  committee: { color: '#34D399', darkBg: '#064E3B', lightBg: '#D1FAE5', avatarBg: '#065F46', emoji: '📋',  label: 'COMMITTEE' },
  parent:    { color: '#F59E0B', darkBg: '#451A03', lightBg: '#FEF3C7', avatarBg: '#92400E', emoji: '👨‍👩‍👧', label: 'PARENT'    },
};

// ─── Normalize student fields from login response ─────────────────────────────
// Handles whatever shape your login API returns:
//   user.year      → "1" | "2" | "3" | "4"   (string)
//   user.division  → "A" | "B" | "C"          (uppercase string)
function normalizeStudent(user) {
  if (!user) return { academicYear: null, division: null };

  // year: could come as 1, "1", "1st", "first" — normalize to "1"/"2"/"3"/"4"
  let year = user.year ?? user.academicYear ?? user.academic_year ?? null;
  if (year !== null) {
    year = String(year).trim();
    // Handle "1st", "2nd", "3rd", "4th"
    const match = year.match(/^(\d)/);
    if (match) year = match[1];
  }

  // division: could come as "a", "b", "c", "div-a", "A" — normalize to "A"/"B"/"C"
  let div = user.division ?? user.div ?? user.section ?? null;
  if (div !== null) {
    div = String(div).trim().toUpperCase();
    // Handle "DIV-A", "DIV A", "SECTION-A" → extract just the letter
    const match = div.match(/([ABC])$/);
    if (match) div = match[1];
  }

  return { academicYear: year, division: div };
}

function mapMessage(doc) {
  const ts  = doc.timestamp || doc.createdAt;

  const cfg = ROLE_CFG[doc.senderRole] || ROLE_CFG.admin;

  return {
    id: doc.messageId || String(doc._id),
    timestamp: new Date(ts).getTime(),   // ⭐ add this
    dateGroup: formatDateGroup(ts),
    sender: doc.senderName || 'Campus Administration',
    senderRole:  cfg.label,
    roleColor:   cfg.color,
    roleDarkBg:  cfg.darkBg,
    roleLightBg: cfg.lightBg,
    avatarBg:    cfg.avatarBg,
    avatarEmoji: cfg.emoji,
    time:        formatTime(ts),
    body:        doc.content,
    messageType: doc.messageType || 'text',
    attachment:  doc.attachmentName
      ? {
          name: doc.attachmentName,
          size: doc.attachmentSize || 'Document',
          url:  doc.attachmentUrl || null,
        }
      : null,
  };
}

function groupByDate(messages) {
  return messages.reduce((acc, msg) => {
    if (!acc[msg.dateGroup]) acc[msg.dateGroup] = [];
    acc[msg.dateGroup].push(msg);
    return acc;
  }, {});
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const Avtr = ({ emoji, bg }) => (
  <View style={[s.avatar, { backgroundColor: bg }]}>
    <Text style={s.avatarEmoji}>{emoji}</Text>
  </View>
);

const RoleBadge = ({ label, color, bg }) => (
  <View style={[s.roleBadge, { backgroundColor: bg }]}>
    <Text style={[s.roleBadgeText, { color }]}>{label}</Text>
  </View>
);

async function handleDownload(attachment) {
  if (!attachment?.url) {
    Alert.alert('Unavailable', 'Download link is not available for this file.');
    return;
  }
  const fullUrl = `${API_BASE_URL}${attachment.url}`;

  if (Platform.OS === 'web') {
    // Web: create a hidden <a> to trigger download
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = attachment.name || 'download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Mobile: open in system browser / viewer
  try {
    const supported = await Linking.canOpenURL(fullUrl);
    if (supported) {
      await Linking.openURL(fullUrl);
    } else {
      Alert.alert('Error', 'Cannot open this file on your device.');
    }
  } catch (err) {
    console.error('Download error:', err);
    Alert.alert('Error', 'Failed to open file.');
  }
}

const AttachmentCard = ({ attachment, C }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => handleDownload(attachment)}
    style={[s.attachCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}
  >
    <View style={[s.attachIconWrap, { backgroundColor: C.card }]}>
      <Text style={s.attachIcon}>📄</Text>
    </View>
    <View style={s.attachTextGroup}>
      <Text style={[s.attachName, { color: C.textPrimary }]} numberOfLines={1}>
        {attachment.name}
      </Text>
      <Text style={[s.attachSize, { color: C.textMuted }]}>{attachment.size}</Text>
    </View>
    <View style={[s.downloadBtn, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[s.downloadIcon, { color: C.accent }]}>⬇</Text>
    </View>
  </TouchableOpacity>
);

const InlineImage = ({ url, C }) => {
  const fullUrl = `${API_BASE_URL}${url}`;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => handleDownload({ url, name: 'image.jpg' })}
      style={s.inlineImageWrap}
    >
      <Image source={{ uri: fullUrl }} style={s.inlineImage} resizeMode="cover" />
      <View style={[s.imgSaveBadge, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={{ fontSize: 12 }}>💾</Text>
      </View>
    </TouchableOpacity>
  );
};

const MessageBubble = ({ msg, C }) => {
  const roleBg = C.isDark ? msg.roleDarkBg : msg.roleLightBg;
  return (
    <View style={s.msgWrap}>
      <Avtr emoji={msg.avatarEmoji} bg={msg.avatarBg} />
      <View style={[s.bubble, isLaptop && s.bubbleLaptop, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={s.senderRow}>
          <Text style={[s.senderName, { color: C.textPrimary }]}>{msg.sender}</Text>
          <RoleBadge label={msg.senderRole} color={msg.roleColor} bg={roleBg} />
          <Text style={[s.timeText, { color: C.textMuted }]}>{msg.time}</Text>
        </View>
        <Text style={[s.bodyText, { color: C.textSub }]}>{msg.body}</Text>
        {msg.messageType === 'image' && msg.attachment?.url && (
          <InlineImage url={msg.attachment.url} C={C} />
        )}
        {msg.attachment && <AttachmentCard attachment={msg.attachment} C={C} />}
      </View>
    </View>
  );
};

const DateDivider = ({ label, C }) => (
  <View style={s.dividerWrap}>
    <View style={[s.dividerLine, { backgroundColor: C.border }]} />
    <Text style={[s.dividerLabel, { color: C.textMuted }]}>{label}</Text>
    <View style={[s.dividerLine, { backgroundColor: C.border }]} />
  </View>
);

const EmptyState = ({ C }) => (
  <View style={s.emptyWrap}>
    <Text style={s.emptyEmoji}>📭</Text>
    <Text style={[s.emptyTitle, { color: C.textPrimary }]}>No Announcements Yet</Text>
    <Text style={[s.emptyBody, { color: C.textMuted }]}>
      Messages from admin and teachers will appear here.
    </Text>
  </View>
);

// ─── Missing user info banner ──────────────────────────────────────────────────
const MissingInfoBanner = ({ academicYear, division, C }) => (
  <View style={[s.warnBox, { backgroundColor: C.cardAlt, borderColor: C.orange ?? '#F59E0B' }]}>
    <Text style={{ fontSize: 22, marginBottom: 6 }}>⚠️</Text>
    <Text style={[s.warnTitle, { color: C.textPrimary }]}>Profile Incomplete</Text>
    <Text style={[s.warnBody, { color: C.textMuted }]}>
      {!academicYear && !division
        ? 'Your academic year and division are not set.'
        : !academicYear
        ? 'Your academic year is not set.'
        : 'Your division is not set.'}
      {'\n'}Please contact your administrator to update your profile so messages can be delivered to you.
    </Text>
    <View style={[s.warnPill, { backgroundColor: C.card }]}>
      <Text style={[s.warnPillTxt, { color: C.textMuted }]}>
        Year: <Text style={{ color: academicYear ? C.green : C.red ?? '#EF4444' }}>{academicYear ?? 'missing'}</Text>
        {'   '}
        Division: <Text style={{ color: division ? C.green : C.red ?? '#EF4444' }}>{division ?? 'missing'}</Text>
      </Text>
    </View>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentChat({ C, onThemeToggle, user }) {
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [updatedAt,  setUpdatedAt]  = useState(null);

  const scrollRef = useRef(null);
  const pollRef   = useRef(null);

  // ── Normalize student profile once ──────────────────────────────────────────
  const { academicYear, division } = normalizeStudent(user);
  const canFetch = Boolean(academicYear && division);

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    // Guard: if student profile is incomplete, don't fetch
    if (!canFetch) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      // Build query:
      //   recipientRole = "student"
      //   academicYear  = "1" | "2" | "3" | "4"
      //   division      = "A" | "B" | "C"
      // The backend returns messages where division matches OR division = "all"
      const params = {
        recipientRole: 'student',
        academicYear,
        division,
      };

      const url = '/messages/filter/by-recipient';
      console.log('[StudentChat] Fetching for student →', { academicYear, division, url });

      const res = await axiosInstance.get(url, { params });
      const data = res.data;

      if (!data.success) {
        throw new Error(data.message || `API Error`);
      }

      console.log(`[StudentChat] Received ${data.count} message(s)`);
      setMessages(data.data.map(mapMessage));
      setUpdatedAt(new Date());

      // Mark messages as read
      await AsyncStorage.setItem('lastReadChat', new Date().toISOString());
    } catch (err) {
      console.error('[StudentChat] fetch error:', err);
      if (!silent) setError('Could not load messages. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [academicYear, division, canFetch]);

  // ── Initial load + polling ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
    if (canFetch) {
      pollRef.current = setInterval(() => fetchMessages(true), POLL_INTERVAL);
    }
    return () => clearInterval(pollRef.current);
  }, [fetchMessages, canFetch]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMessages();
  }, [fetchMessages]);

  // Reverse messages so latest are at the bottom
const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

const grouped = groupByDate(sortedMessages);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.card} />

      {/* ── Top Bar ── */}
      <View style={[s.topBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={s.topLeft}>
          <View style={[s.channelIcon, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
            <Text style={{ fontSize: 20 }}>📢</Text>
          </View>
          <View>
            <View style={s.titleRow}>
              <Text style={[s.channelTitle, { color: C.textPrimary }]}>University Announcements</Text>
              <Text style={[s.verified, { color: C.accent }]}>✔</Text>
            </View>
            <View style={s.subRow}>
              <View style={[s.dot, { backgroundColor: C.green }]} />
              <Text style={[s.subText, { color: C.textMuted }]}>
                {academicYear && division
                  ? `Year ${academicYear} · Div ${division} · Broadcast`
                  : 'Broadcast Channel'}
                {updatedAt ? `  ·  ${formatTime(updatedAt.toISOString())}` : ''}
              </Text>
            </View>
          </View>
        </View>
        {/* Theme toggle button removed */}
      </View>

      {/* ── Missing profile info ── */}
      {!canFetch && !loading && (
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <MissingInfoBanner academicYear={academicYear} division={division} C={C} />
        </View>
      )}

      {/* ── Loading ── */}
      {canFetch && loading && (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={[s.centerText, { color: C.textMuted }]}>Loading announcements…</Text>
        </View>
      )}

      {/* ── Error ── */}
      {canFetch && !loading && error && (
        <View style={s.centerWrap}>
          <Text style={{ fontSize: 38, marginBottom: 8 }}>⚠️</Text>
          <Text style={[s.centerText, { color: C.textMuted }]}>{error}</Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: C.accentBg, borderColor: C.accent }]}
            onPress={() => fetchMessages()}
            activeOpacity={0.8}
          >
            <Text style={[s.retryText, { color: C.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Messages ── */}
      {canFetch && !loading && !error && (
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            isLaptop && s.scrollLaptop,
            messages.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        >
          {messages.length === 0
            ? <EmptyState C={C} />
            : Object.entries(grouped)
                .sort((a, b) => a.timestamp - b.timestamp)
                .map(([dateGroup, msgs]) => (
                  <View key={dateGroup}>
                    <DateDivider label={dateGroup} C={C} />
                    {[...msgs]
                      .sort((a, b) => {
                        // Sort messages by time ascending (oldest first)
                        const ta = new Date(a.time || 0).getTime();
                        const tb = new Date(b.time || 0).getTime();
                        return ta - tb;
                      })
                      .map(msg => <MessageBubble key={msg.id} msg={msg} C={C} />)}
                  </View>
                ))
          }
        </ScrollView>
      )}

      {/* ── Read-only Footer ── */}
      {canFetch && (
        <View style={[s.footer, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <Text style={[s.footerIcon, { color: C.textMuted }]}>🔒</Text>
          <Text style={[s.footerText, { color: C.textMuted }]}>
            This is a{' '}
            <Text style={[s.footerHL, { color: C.accent }]}>read-only</Text>
            {' '}channel. You do not have permission to reply to these messages.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:            { flex: 1 },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isLaptop ? 28 : 16, paddingVertical: 12, borderBottomWidth: 1 },
  topLeft:         { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelIcon:     { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  titleRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelTitle:    { fontSize: isLaptop ? 17 : 15, fontWeight: '700', letterSpacing: -0.3 },
  verified:        { fontSize: 13, fontWeight: '700' },
  subRow:          { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot:             { width: 7, height: 7, borderRadius: 4 },
  subText:         { fontSize: 11 },
  themeBtn:        { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:          { flex: 1 },
  scrollContent:   { paddingVertical: 12, paddingHorizontal: isLaptop ? 28 : 12 },
  scrollLaptop:    { paddingHorizontal: 40 },
  dividerWrap:     { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine:     { flex: 1, height: 1 },
  dividerLabel:    { fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  msgWrap:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  avatar:          { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 2, flexShrink: 0 },
  avatarEmoji:     { fontSize: 18 },
  bubble:          { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14 },
  bubbleLaptop:    { maxWidth: '50%' },
  senderRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  senderName:      { fontSize: 12, fontWeight: '600' },
  roleBadge:       { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  roleBadgeText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  timeText:        { fontSize: 11, marginLeft: 'auto' },
  bodyText:        { fontSize: 13, lineHeight: 20 },
  attachCard:      { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', padding: 10, gap: 10 },
  attachIconWrap:  { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  attachIcon:      { fontSize: 18 },
  attachTextGroup: { flex: 1 },
  attachName:      { fontSize: 13, fontWeight: '600' },
  attachSize:      { fontSize: 11, marginTop: 2 },
  downloadBtn:     { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  downloadIcon:    { fontSize: 15 },
  inlineImageWrap: { marginTop: 10, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  inlineImage:     { width: '100%', height: 200, borderRadius: 10 },
  imgSaveBadge:    { position: 'absolute', bottom: 8, right: 8, width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, paddingVertical: 14, paddingHorizontal: isLaptop ? 28 : 16 },
  footerIcon:      { fontSize: 14 },
  footerText:      { fontSize: 12, textAlign: 'center', flex: 1 },
  footerHL:        { fontWeight: '700' },
  centerWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  centerText:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn:        { borderRadius: 10, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryText:       { fontSize: 14, fontWeight: '700' },
  emptyWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyEmoji:      { fontSize: 48, marginBottom: 4 },
  emptyTitle:      { fontSize: 17, fontWeight: '700' },
  emptyBody:       { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  warnBox:         { borderRadius: 16, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 8 },
  warnTitle:       { fontSize: 16, fontWeight: '800' },
  warnBody:        { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  warnPill:        { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  warnPillTxt:     { fontSize: 13, fontWeight: '600' },
});