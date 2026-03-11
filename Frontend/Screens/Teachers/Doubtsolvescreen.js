// Screens/Teacher/DoubtSolveScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
//  Clean chat-only UI  •  Resolve button in header  •  TextInput glitch fixed
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Platform, StatusBar, KeyboardAvoidingView,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Palette ────────────────────────────────────────────────────────────────── */
const DARK = {
  bg:           '#0B0F1A',
  header:       '#0F1525',
  headerBorder: '#1C2540',
  surface:      '#131929',
  bubble_me:    '#1A2E52',
  bubble_them:  '#161D30',
  border:       '#1E273D',
  accent:       '#4F8EF7',
  accentText:   '#7AAEFF',
  green:        '#22C55E',
  greenBg:      'rgba(34,197,94,0.12)',
  greenBorder:  'rgba(34,197,94,0.25)',
  textPrimary:  '#E8EEFF',
  textSec:      '#7B88AC',
  textMuted:    '#3C4A6A',
  inputBg:      '#111726',
  inputBorder:  '#1C2540',
  statusBar:    'light-content',
};
const LIGHT = {
  bg:           '#F2F5FB',
  header:       '#FFFFFF',
  headerBorder: '#E3E8F4',
  surface:      '#FFFFFF',
  bubble_me:    '#EAF0FF',
  bubble_them:  '#FFFFFF',
  border:       '#E3E8F4',
  accent:       '#3B6FE8',
  accentText:   '#3B6FE8',
  green:        '#16A34A',
  greenBg:      'rgba(22,163,74,0.08)',
  greenBorder:  'rgba(22,163,74,0.20)',
  textPrimary:  '#0F172A',
  textSec:      '#4B5580',
  textMuted:    '#9CA3AF',
  inputBg:      '#F0F4FF',
  inputBorder:  '#D8E0F5',
  statusBar:    'dark-content',
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ═══════════════════════════════════════════════════════════════════════════════
 *  COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════ */
export default function DoubtSolveScreen() {
  const navigation             = useNavigation();
  const route                  = useRoute();
  const { doubtId, teacherId } = route.params || {};

  const isDark = useContext(ThemeContext).isDark;
  const T      = isDark ? DARK : LIGHT;

  /* ── State ── */
  const [doubt,      setDoubt]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [resolving,  setResolving]  = useState(false);
  const [sending,    setSending]    = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reply,      setReply]      = useState('');

  const scrollRef  = useRef(null);
  const inputRef   = useRef(null);
  const lastTapRef = useRef({});

  useEffect(() => {
    if (doubtId) fetchDoubt();
  }, [doubtId]);

  /* ══ GET doubt ══════════════════════════════════════════════════════════════ */
  const fetchDoubt = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/doubts/${doubtId}`);
      if (res.data?.success) {
        setDoubt(res.data.doubt);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
      } else {
        Alert.alert('Error', res.data?.error || 'Could not load doubt.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not load doubt. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [doubtId]);

  /* ══ SEND reply ═════════════════════════════════════════════════════════════  */
  const handleSend = useCallback(async () => {
    const text = reply.trim();
    if (!text || !doubt || sending) return;
    try {
      setSending(true);
      const res = await axiosInstance.post(`/doubts/${doubt._id}/messages`, {
        sender:   'teacher',
        senderId: teacherId || 'unknown',
        text,
      });
      if (res.data?.success) {
        setDoubt(res.data.doubt);
        setReply('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        Alert.alert('Send Failed', res.data?.error || 'Could not send.');
      }
    } catch (e) {
      Alert.alert('Send Failed', e.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  }, [reply, doubt, sending, teacherId]);

  /* ══ RESOLVE ════════════════════════════════════════════════════════════════ */
const handleResolve = useCallback(() => {

  const confirmResolve = async () => {
    try {
      setResolving(true);

      const res = await axiosInstance.patch(`/doubts/${doubt._id}/status`, {
        status: 'RESOLVED'
      });

     if (res.data?.success) {
        // Update local doubt status so the resolved banner shows — stay on screen
        setDoubt(prev => prev ? { ...prev, status: 'RESOLVED' } : prev);
        if (Platform.OS === 'web') {
          window.alert('Doubt marked as resolved.');
        } else {
          Alert.alert('Resolved ✓', 'Doubt has been marked as resolved.');
        }
      } else {
        const msg = res.data?.error || 'Could not resolve.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      }

    } catch {
      Platform.OS === 'web'
        ? window.alert('Network error. Try again.')
        : Alert.alert('Error', 'Network error. Try again.');
    } finally {
      setResolving(false);
    }
  };

  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'This closes the doubt and removes it from your active queue.'
    );
    if (confirmed) confirmResolve();
  } else {
    Alert.alert(
      'Mark as Resolved?',
      'This closes the doubt and removes it from your active queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resolve', onPress: confirmResolve },
      ]
    );
  }

}, [doubt, navigation]);

  /* ══ DELETE student message (double-tap) ═══════════════════════════════════ */
  const handleDoubleTap = useCallback((msg) => {
    if (msg.sender !== 'student') return;
    const now  = Date.now();
    const last = lastTapRef.current[msg._id] || 0;
    if (now - last < 420) {
      Alert.alert('Delete Message?', 'Remove this student message?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(msg._id);
              const res = await axiosInstance.delete(`/doubts/${doubt._id}/messages/${msg._id}`);
              if (res.data?.success) setDoubt(res.data.doubt);
              else Alert.alert('Error', res.data?.error || 'Could not delete.');
            } catch {
              Alert.alert('Error', 'Network error while deleting.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]);
    }
    lastTapRef.current[msg._id] = now;
  }, [doubt]);

  /* ── Derived ── */
  const messages   = doubt?.messages || [];
  const isResolved = doubt?.status === 'RESOLVED';

  /* ══════════════════════════════════════════════════════════════════════════
   *  RENDER
   * ══════════════════════════════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.header} />

      {/* ── HEADER ── */}
      <View style={[s.header, { backgroundColor: T.header, borderBottomColor: T.headerBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={T.accentText} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: T.textPrimary }]} numberOfLines={1}>
            {doubt?.title || doubt?.subject || 'Doubt Thread'}
          </Text>
          {doubt?.studentName ? (
            <Text style={[s.headerSub, { color: T.textSec }]} numberOfLines={1}>
              {doubt.studentName}
              {doubt.subject ? `  ·  ${doubt.subject}` : ''}
            </Text>
          ) : null}
        </View>

        {/* Resolve / Resolved pill */}
        {isResolved ? (
          <View style={[s.resolvedPill, { backgroundColor: T.greenBg, borderColor: T.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={13} color={T.green} />
            <Text style={[s.resolvedPillTxt, { color: T.green }]}>Resolved</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleResolve}
            disabled={resolving || loading}
            activeOpacity={0.8}
            style={[s.resolveBtn, { backgroundColor: T.greenBg, borderColor: T.greenBorder }]}>
            {resolving
              ? <ActivityIndicator size="small" color={T.green} />
              : <>
                  <Ionicons name="checkmark-done-outline" size={13} color={T.green} />
                  <Text style={[s.resolveBtnTxt, { color: T.green }]}>Resolve</Text>
                </>}
          </TouchableOpacity>
        )}
      </View>

      {/* ── BODY ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        {/* Messages */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={T.accentText} size="large" />
            <Text style={[s.loadingTxt, { color: T.textMuted }]}>Loading thread…</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, backgroundColor: T.bg }}
            contentContainerStyle={s.msgList}
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>

            {messages.length === 0 ? (
              <View style={s.emptyWrap}>
                <View style={[s.emptyIcon, { backgroundColor: T.surface, borderColor: T.border }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={30} color={T.textMuted} />
                </View>
                <Text style={[s.emptyTxt, { color: T.textMuted }]}>No messages yet</Text>
                <Text style={[s.emptyHint, { color: T.textMuted }]}>Be the first to respond</Text>
              </View>
            ) : (
              messages.map((msg, idx) => {
                const isTeacher  = msg.sender === 'teacher';
                const isDeleting = deletingId === msg._id;
                const showDate   = idx === 0 || (
                  new Date(msg.time || msg.createdAt).toDateString() !==
                  new Date(messages[idx - 1]?.time || messages[idx - 1]?.createdAt).toDateString()
                );

                return (
                  <View key={msg._id || idx}>
                    {showDate && (
                      <View style={s.dateSep}>
                        <View style={[s.dateLine, { backgroundColor: T.border }]} />
                        <Text style={[s.dateLabel, { color: T.textMuted, backgroundColor: T.bg }]}>
                          {new Date(msg.time || msg.createdAt).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </Text>
                        <View style={[s.dateLine, { backgroundColor: T.border }]} />
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={msg.sender === 'student' ? 0.7 : 1}
                      onPress={() => handleDoubleTap(msg)}
                      style={[
                        s.msgRow,
                        isTeacher ? s.msgRowRight : s.msgRowLeft,
                      ]}>
                      {/* Avatar */}
                      {!isTeacher && (
                        <View style={[s.avatar, { backgroundColor: T.surface, borderColor: T.border }]}>
                          <Ionicons name="person-outline" size={14} color={T.textSec} />
                        </View>
                      )}

                      <View style={[
                        s.bubble,
                        isTeacher
                          ? [s.bubbleRight, { backgroundColor: T.bubble_me, borderColor: T.accent + '30' }]
                          : [s.bubbleLeft,  { backgroundColor: T.bubble_them, borderColor: T.border }],
                        isDeleting && { opacity: 0.35 },
                      ]}>
                        <Text style={[s.bubbleTxt, { color: T.textPrimary }]}>{msg.text}</Text>
                        <View style={s.bubbleMeta}>
                          <Text style={[s.bubbleTime, { color: T.textMuted }]}>
                            {fmt(msg.time || msg.createdAt)}
                          </Text>
                          {msg.sender === 'student' && (
                            <Text style={[s.tapHint, { color: T.textMuted }]}>  ·  2× tap to delete</Text>
                          )}
                          {isTeacher && (
                            <View style={[s.sentTick]}>
                              <Ionicons name="checkmark-done" size={11} color={T.accentText} />
                            </View>
                          )}
                        </View>

                        {isDeleting && (
                          <ActivityIndicator
                            size="small" color="#EF4444"
                            style={{ position: 'absolute', top: 10, right: 10 }}
                          />
                        )}
                      </View>

                      {isTeacher && (
                        <View style={[s.avatar, { backgroundColor: T.accent + '20', borderColor: T.accent + '30' }]}>
                          <Ionicons name="person" size={14} color={T.accentText} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            <View style={{ height: 10 }} />
          </ScrollView>
        )}

        {/* ── INPUT / RESOLVED BANNER ── */}
        {isResolved ? (
          <View style={[s.resolvedBanner, { backgroundColor: T.greenBg, borderTopColor: T.greenBorder }]}>
            <Ionicons name="checkmark-circle" size={15} color={T.green} />
            <Text style={[s.resolvedBannerTxt, { color: T.green }]}>
              This doubt has been resolved
            </Text>
          </View>
        ) : (
          <View style={[s.inputBar, { backgroundColor: T.header, borderTopColor: T.headerBorder }]}>
            <TextInput
              ref={inputRef}
              // ✅ FIX: use defaultValue + uncontrolled style to avoid Android multiline double-letter bug
              // We track value via state but avoid the re-render that causes the glitch
              style={[s.input, {
                backgroundColor: T.inputBg,
                borderColor: T.inputBorder,
                color: T.textPrimary,
              }]}
              placeholder="Reply to student…"
              placeholderTextColor={T.textMuted}
              value={reply}
              onChangeText={(t) => setReply(t)}
              multiline
              textAlignVertical="top"
              blurOnSubmit={false}
              maxLength={2000}
              // ✅ FIX: disableFullscreenUI prevents Android from opening full editor
              // ✅ FIX: scrollEnabled={false} on Android avoids internal scroll conflicts
              disableFullscreenUI={true}
              scrollEnabled={Platform.OS === 'ios' ? undefined : false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!reply.trim() || sending}
              activeOpacity={0.8}
              style={[
                s.sendBtn,
                { backgroundColor: reply.trim() && !sending ? T.accent : T.border },
              ]}>
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={18} color={reply.trim() ? '#fff' : T.textMuted} />
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 56,
  },
  backBtn:        { padding: 4 },
  headerCenter:   { flex: 1, gap: 1 },
  headerTitle:    { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  headerSub:      { fontSize: 12 },

  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  resolveBtnTxt: { fontSize: 12, fontWeight: '700' },

  resolvedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  resolvedPillTxt: { fontSize: 12, fontWeight: '700' },

  /* Loading */
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingTxt:  { fontSize: 13 },

  /* Messages */
  msgList: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTxt:  { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 13 },

  dateSep:   { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dateLine:  { flex: 1, height: StyleSheet.hairlineWidth },
  dateLabel: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6 },

  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowLeft:  { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0, marginBottom: 2,
  },

  bubble: {
    maxWidth: '75%', borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 9, gap: 4,
  },
  bubbleLeft:  { borderBottomLeftRadius:  4 },
  bubbleRight: { borderBottomRightRadius: 4 },

  bubbleTxt:  { fontSize: 14, lineHeight: 20 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center' },
  bubbleTime: { fontSize: 10 },
  tapHint:    { fontSize: 10 },
  sentTick:   { marginLeft: 4 },

  /* Resolved banner */
  resolvedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderTopWidth: 1,
  },
  resolvedBannerTxt: { fontSize: 13, fontWeight: '600' },

  /* Input bar */
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 9,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 120,
    minHeight: 42,
  },
  sendBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
});