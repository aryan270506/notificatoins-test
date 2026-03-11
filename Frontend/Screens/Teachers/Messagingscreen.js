// Screens/Teacher/MessagingScreen.js
// Broadcast chat — real file/image/link attachments + multipart upload
//
// Attach tray:
//   📷 Photo     → expo-image-picker  (ImagePicker.launchImageLibraryAsync)
//   📄 Document  → expo-document-picker (DocumentPicker.getDocumentAsync)
//   🔗 Link      → inline modal with URL + label fields
//
// On send: if attachment exists the message is POSTed as multipart/form-data
//          to /api/messages/send so the file lands on the server.
//          Plain-text messages use JSON as before.

import React, {
  useEffect, useRef, useState, useCallback, useMemo, useContext,
} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Animated, Dimensions, Platform, StatusBar,
  Alert, ActivityIndicator, KeyboardAvoidingView, Modal,
  Pressable, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker   from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

const { width: SW } = Dimensions.get('window');
const IS_TABLET = SW >= 768;
const SAFE_T = Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 0) + 10;
const SAFE_B = Platform.OS === 'ios' ? 28 : 12;

// ─── Theme palette ────────────────────────────────────────────────────────────
const P_DARK = {
  bg: '#060912', panel: '#0C1221', card: '#111827', border: '#1C2640',
  blue: '#3B82F6', blueMid: '#2563EB', blueSoft: 'rgba(59,130,246,0.12)',
  teal: '#14B8A6', violet: '#8B5CF6',
  amber: '#F59E0B', amberSoft: 'rgba(245,158,11,0.12)',
  green: '#22C55E', red: '#EF4444',
  t1: '#F1F5FF', t2: '#8B98C8', t3: '#3D4F7A', t4: '#1E2D50',
};
const P_LIGHT = {
  bg: '#F1F4FD', panel: '#FFFFFF', card: '#FFFFFF', border: '#DDE3F4',
  blue: '#2563EB', blueMid: '#1D4ED8', blueSoft: 'rgba(37,99,235,0.09)',
  teal: '#0D9488', violet: '#7C3AED',
  amber: '#D97706', amberSoft: 'rgba(217,119,6,0.09)',
  green: '#059669', red: '#DC2626',
  t1: '#0F172A', t2: '#4B5563', t3: '#9CA3AF', t4: '#CBD5E1',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COLOURS = ['#3B82F6','#8B5CF6','#10B981','#F97316','#06B6D4','#EC4899','#F59E0B','#EF4444'];
const colorFor = (s = '') =>
  COLOURS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLOURS.length];
const initials = (n = '') =>
  n.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
const uid = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const fmtTime = d => {
  if (!d) return '';
  const dt = new Date(d), h = dt.getHours(), m = dt.getMinutes();
  return `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtDate = d => {
  if (!d) return 'Today';
  const dt = new Date(d), now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatBytes = (bytes = 0) => {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Icon for attachment type
const attachIcon = type => {
  if (!type) return 'document-outline';
  if (type.startsWith('image/'))       return 'image-outline';
  if (type === 'application/pdf')      return 'document-text-outline';
  if (type.includes('word'))           return 'document-outline';
  if (type.includes('sheet') || type.includes('excel')) return 'grid-outline';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'easel-outline';
  if (type === 'link')                 return 'link-outline';
  return 'attach-outline';
};

// ─── Date separator ───────────────────────────────────────────────────────────
function DateSep({ label }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  return (
    <View style={st.dateSep}>
      <View style={st.dateLine} />
      <View style={st.datePill}><Text style={st.dateTxt}>{label}</Text></View>
      <View style={st.dateLine} />
    </View>
  );
}

// ─── Info banner ──────────────────────────────────────────────────────────────
function InfoBanner({ role, year, division }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  const yl = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }[year] || year;

}

// ─── Attachment chip inside bubble ───────────────────────────────────────────
function AttachChip({ attachment, isMe }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  if (!attachment) return null;
  const isLink = attachment.type === 'link';
  const icon   = attachIcon(attachment.type);
  const label  = isLink ? (attachment.label || attachment.url) : attachment.name;
  const sub    = isLink ? attachment.url : formatBytes(attachment.size);

  const handlePress = () => {
    if (isLink && attachment.url) {
      Linking.openURL(
        attachment.url.startsWith('http') ? attachment.url : `https://${attachment.url}`
      ).catch(() => Alert.alert('Cannot open link', attachment.url));
    } else if (attachment.downloadUrl) {
      Linking.openURL(attachment.downloadUrl).catch(() =>
        Alert.alert('Cannot open file')
      );
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        st.attachChip,
        isMe && { backgroundColor: 'rgba(255,255,255,0.15)' },
        isLink && { borderColor: P.blue + '55', borderWidth: 1 },
      ]}
    >
      <Ionicons name={icon} size={14} color={isMe ? '#fff' : P.blue} />
      <View style={{ flex: 1 }}>
        <Text
          style={[st.attachChipName, isMe && { color: 'rgba(255,255,255,0.95)' }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!!sub && (
          <Text style={[st.attachChipSub, isMe && { color: 'rgba(255,255,255,0.55)' }]} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      {(isLink || attachment.downloadUrl) && (
        <Ionicons name="open-outline" size={12} color={isMe ? 'rgba(255,255,255,0.7)' : P.blue} />
      )}
    </TouchableOpacity>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMe, onDelete }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  const op  = useRef(new Animated.Value(0)).current;
  const ty  = useRef(new Animated.Value(8)).current;
  const scl = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(ty,  { toValue: 0, tension: 220, friction: 14, useNativeDriver: true }),
      Animated.spring(scl, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const senderColor = colorFor(msg.senderId || msg.senderName || '');

  return (
    <Animated.View style={[
      st.bubbleWrap,
      isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
      { opacity: op, transform: [{ translateY: ty }, { scale: scl }] },
    ]}>
      {!isMe && (
        <View style={st.senderRow}>
          <View style={[st.senderAv, { backgroundColor: senderColor + '25', borderColor: senderColor + '50' }]}>
            <Text style={[st.senderAvTxt, { color: senderColor }]}>{initials(msg.senderName || '')}</Text>
          </View>
          <Text style={[st.senderName, { color: senderColor }]}>{msg.senderName || 'Unknown'}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.88}
        onLongPress={() => isMe && onDelete?.(msg)}
        delayLongPress={400}
        onContextMenu={
          Platform.OS === 'web'
            ? (e) => {
                e.preventDefault();
                if (isMe && onDelete) onDelete(msg);
              }
            : undefined
        }
        style={[
          st.bubble,
          isMe ? st.bubbleMe : st.bubbleOther,
          msg._optimistic && { opacity: 0.65 },
        ]}
      >
        {!!msg.text && (
          <Text style={[st.bubbleTxt, isMe && { color: '#fff' }]}>{msg.text}</Text>
        )}
        <AttachChip attachment={msg.attachment} isMe={isMe} />
        <View style={[st.bubbleMeta, isMe && { justifyContent: 'flex-end' }]}>
          <Text style={[st.bubbleTime, isMe && { color: 'rgba(255,255,255,0.55)' }]}>
            {fmtTime(msg.createdAt || msg.timestamp)}
          </Text>
          {msg._optimistic
            ? <Ionicons name="time-outline"    size={10} color={isMe ? 'rgba(255,255,255,0.5)' : P.t3} style={{ marginLeft: 4 }} />
            : isMe
              ? <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.65)"               style={{ marginLeft: 4 }} />
              : null
          }
        </View>
      </TouchableOpacity>
      {isMe && <Text style={st.longPressTip}>Hold to delete</Text>}
    </Animated.View>
  );
}

// ─── Link modal ───────────────────────────────────────────────────────────────
function LinkModal({ visible, onClose, onAttach }) {
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  const [url,   setUrl]   = useState('');
  const [label, setLabel] = useState('');

  const handleAttach = () => {
    const trimmed = url.trim();
    if (!trimmed) { Alert.alert('Enter a URL'); return; }
    onAttach({ type: 'link', url: trimmed, label: label.trim() || trimmed, name: label.trim() || trimmed });
    setUrl(''); setLabel('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <Pressable style={st.linkModal} onPress={() => {}}>
          <Text style={st.linkModalTitle}>Attach a Link</Text>

          <Text style={st.linkLabel}>URL *</Text>
          <TextInput
            style={st.linkInput}
            placeholder="https://example.com"
            placeholderTextColor={P.t3}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />

          <Text style={st.linkLabel}>Display label (optional)</Text>
          <TextInput
            style={st.linkInput}
            placeholder="e.g. Assignment PDF"
            placeholderTextColor={P.t3}
            value={label}
            onChangeText={setLabel}
          />

          <View style={st.linkBtnRow}>
            <TouchableOpacity style={[st.linkBtn, st.linkBtnCancel]} onPress={onClose} activeOpacity={0.8}>
              <Text style={st.linkBtnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.linkBtn, st.linkBtnAttach]} onPress={handleAttach} activeOpacity={0.8}>
              <Ionicons name="link" size={14} color="#fff" style={{ marginRight: 5 }} />
              <Text style={st.linkBtnAttachTxt}>Attach</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Attach tray options ──────────────────────────────────────────────────────
const ATTACH_OPTS_FN = (P) => [
  { key: 'image',    icon: 'image',         label: 'Photo',    color: P.blue,   soft: 'rgba(59,130,246,0.14)'  },
  { key: 'document', icon: 'document-text', label: 'Document', color: P.violet, soft: 'rgba(139,92,246,0.14)' },
  { key: 'link',     icon: 'link',          label: 'Link',     color: P.amber,  soft: 'rgba(245,158,11,0.14)' },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function MessagingScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { isDark } = useContext(ThemeContext);
  const P = isDark ? P_DARK : P_LIGHT;
  const st = makeSt(P);
  const ATTACH_OPTS = ATTACH_OPTS_FN(P);

  const {
    recipientRole = 'student',
    academicYear  = '1',
    division      = 'A',
    channelLabel  = '',
    senderId      = '',
    senderName    = '',
    senderRole    = 'teacher',
  } = route.params || {};

  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [msgText,    setMsgText]    = useState('');
  const [sendState,  setSendState]  = useState('idle'); // idle | sending | sent | error
  const [sFocus,     setSFocus]     = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showLink,   setShowLink]   = useState(false);
  const [attachment, setAttachment] = useState(null);  // { type, name, size, uri, mimeType, url, label }
  const [uploading,  setUploading]  = useState(false);

  const listRef    = useRef(null);
  const pollingRef = useRef(null);
  const sendScale  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const headSlide  = useRef(new Animated.Value(-8)).current;
  const inputBorder= useRef(new Animated.Value(0)).current;
  const trayAnim   = useRef(new Animated.Value(0)).current;
  const attachRot  = useRef(new Animated.Value(0)).current;

  const approxCount = {  }[recipientRole] || 'several';
  const yl = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }[academicYear] || academicYear;

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(headSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, [messages.length]);

  useEffect(() => {
    Animated.timing(inputBorder, { toValue: sFocus ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [sFocus]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const r = await axiosInstance.get('/messages/filter/by-recipient', {
        params: { recipientRole, academicYear: String(academicYear), division },
      });
      if (r.data?.success) {
        const norm = (r.data.data || []).map(m => ({
          ...m, text: m.text || m.content || '', createdAt: m.createdAt || m.timestamp,
        }));
        setMessages(prev => {
          const opts = prev.filter(m => m._optimistic);
          return [...norm, ...opts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
      }
    } catch (e) { console.warn('fetchMessages:', e.message); }
    finally { setLoading(false); }
  }, [recipientRole, academicYear, division]);

  // ── Attach tray toggle ────────────────────────────────────────────────────
  const toggleAttach = useCallback(() => {
    const open = !showAttach;
    setShowAttach(open);
    Animated.parallel([
      Animated.spring(trayAnim,   { toValue: open ? 1 : 0, tension: 140, friction: 14, useNativeDriver: true }),
      Animated.timing(attachRot,  { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [showAttach]);

  // ── Pick image ────────────────────────────────────────────────────────────
  const pickImage = useCallback(async () => {
    if (showAttach) toggleAttach();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library.'); return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      setAttachment({
        type:     asset.mimeType || 'image/jpeg',
        name:     fileName,
        size:     asset.fileSize || 0,
        uri:      asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch (e) { Alert.alert('Image picker error', e.message); }
  }, [showAttach, toggleAttach]);

  // ── Pick document ─────────────────────────────────────────────────────────
  const pickDocument = useCallback(async () => {
    if (showAttach) toggleAttach();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',          // allow all file types
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setAttachment({
        type:     asset.mimeType || 'application/octet-stream',
        name:     asset.name,
        size:     asset.size || 0,
        uri:      asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
    } catch (e) { Alert.alert('Document picker error', e.message); }
  }, [showAttach, toggleAttach]);

  // ── Handle attach option tap ──────────────────────────────────────────────
  const handleAttachOpt = useCallback((key) => {
    if (key === 'image')    pickImage();
    if (key === 'document') pickDocument();
    if (key === 'link')     { if (showAttach) toggleAttach(); setShowLink(true); }
  }, [pickImage, pickDocument, showAttach, toggleAttach]);

  // ── Upload file to server, returns { url, downloadUrl, name, size, type } ─
  const uploadAttachment = useCallback(async (att) => {
    if (att.type === 'link') return att; // links don't upload, return as-is

    const formData = new FormData();
    if (Platform.OS === 'web') {
      // On web, uri is a blob URL; we fetch it and append as blob
      const blob = await fetch(att.uri).then(r => r.blob());
      formData.append('file', blob, att.name);
    } else {
      formData.append('file', { uri: att.uri, name: att.name, type: att.mimeType });
    }
    formData.append('senderRole', senderRole);
    formData.append('senderId',   senderId);

    const res = await axiosInstance.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    if (!res.data?.success) throw new Error(res.data?.message || 'Upload failed');
    return {
      type:        att.type,
      name:        att.name,
      size:        att.size,
      url:         res.data.url,
      downloadUrl: res.data.url,
    };
  }, [senderId, senderRole]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const txt = msgText.trim();
    if ((!txt && !attachment) || sendState !== 'idle') return;

    const msgId = uid();
    const opt = {
      _id: `opt-${msgId}`, messageId: msgId, senderId, senderName, senderRole,
      text: txt,
      attachment: attachment ? {
        type: attachment.type, name: attachment.name,
        size: attachment.size, url: attachment.uri,
        label: attachment.label,
      } : null,
      createdAt: new Date().toISOString(), _optimistic: true,
    };

    setMessages(prev => [...prev, opt]);
    setMsgText('');
    const pendingAttachment = attachment;
    setAttachment(null);
    setSendState('sending');
    if (showAttach) toggleAttach();

    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.8,  duration: 70,  useNativeDriver: true }),
      Animated.spring(sendScale,  { toValue: 1,   tension: 260, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      // 1. Upload file if there is one
      let uploadedAttachment = null;
      if (pendingAttachment) {
        setUploading(true);
        uploadedAttachment = await uploadAttachment(pendingAttachment);
        setUploading(false);
      }

      // 2. Send message
      const r = await axiosInstance.post('/messages/save', {
        messageId:     msgId,
        content:       txt,
        senderId,
        senderName,
        senderRole,
        recipientRole,
        academicYear:  String(academicYear),
        division,
        attachment:    uploadedAttachment,
      });

      if (r.data?.success) {
        const real = { ...r.data.data, text: r.data.data.text || r.data.data.content || txt };
        setMessages(prev => [...prev.filter(m => !m._optimistic), real]);
        setSendState('sent');
        setTimeout(() => setSendState('idle'), 1200);
      } else throw new Error(r.data?.message || 'Send failed');
    } catch (e) {
      setUploading(false);
      console.warn('send error:', e.message);
      setMessages(prev => prev.filter(m => !m._optimistic));
      setMsgText(txt);
      setAttachment(pendingAttachment);
      setSendState('error');
      Alert.alert('Failed to send', e.response?.data?.message || e.message);
      setTimeout(() => setSendState('idle'), 2000);
    }
  }, [msgText, attachment, sendState, senderId, senderName, senderRole,
      recipientRole, academicYear, division, showAttach, toggleAttach, uploadAttachment]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((msg) => {
    const msgId = msg.messageId || msg._id;
    Alert.alert('Delete Message', 'Remove this message for everyone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setMessages(prev => prev.filter(m => (m.messageId || m._id) !== msgId));
          try { await axiosInstance.delete(`/messages/${msgId}`); }
          catch (e) { Alert.alert('Error', 'Could not delete.'); fetchMessages(); }
        },
      },
    ]);
  }, [fetchMessages]);

  // ── List data with date separators ────────────────────────────────────────
  const listData = useMemo(() => {
    const out = []; let lastDate = null;
    messages.forEach((m, i) => {
      const d = fmtDate(m.createdAt || m.timestamp);
      if (d !== lastDate) { out.push({ _sep: true, label: d, key: `sep-${i}` }); lastDate = d; }
      out.push({ ...m, _sep: false });
    });
    return out;
  }, [messages]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSend       = (msgText.trim().length > 0 || !!attachment) && sendState === 'idle';
  const attachRotDeg  = attachRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const trayTY        = trayAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const borderC       = inputBorder.interpolate({ inputRange: [0, 1], outputRange: [P.border, P.blue] });
  const sendBg        = sendState === 'sent'  ? P.green
                      : sendState === 'error' ? P.red
                      : sendState === 'sending' ? P.t4
                      : canSend ? P.blue : P.card;
  const sendIconName  = sendState === 'sent'    ? 'checkmark'
                      : sendState === 'sending' ? 'ellipsis-horizontal'
                      : sendState === 'error'   ? 'alert'
                      : 'send';

  return (
    <Animated.View style={[st.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={P.bg} />

      {/* ── Header ── */}
      <Animated.View style={[st.header, { transform: [{ translateY: headSlide }] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.78}>
          <Ionicons name="chevron-back" size={20} color={P.t2} />
        </TouchableOpacity>
        <View style={[st.chanAv, { backgroundColor: colorFor(recipientRole) + '25', borderColor: colorFor(recipientRole) + '55' }]}>
          <Text style={{ fontSize: 20 }}>
            {recipientRole === 'teacher' ? '👩‍🏫' : recipientRole === 'parent' ? '👨‍👩‍👧' : '🧑‍🎓'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle} numberOfLines={1}>
            {channelLabel || `${recipientRole.charAt(0).toUpperCase() + recipientRole.slice(1)} · ${yl} Year · Div ${division}`}
          </Text>

        </View>
        <TouchableOpacity onPress={() => { setLoading(true); fetchMessages(); }} style={st.iconBtn} activeOpacity={0.78}>
          <Ionicons name="refresh-outline" size={15} color={P.t2} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={st.loadWrap}>
            <ActivityIndicator size="large" color={P.blue} />
            <Text style={st.loadTxt}>Loading messages…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item, i) => item.key || item._id || item.messageId || String(i)}
            contentContainerStyle={st.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
            ListHeaderComponent={
              <InfoBanner role={recipientRole} year={academicYear} division={division} />
            }
            ListEmptyComponent={
              <View style={st.emptyWrap}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>💬</Text>
                <Text style={st.emptyTitle}>No messages yet</Text>
                <Text style={st.emptySub}>Start the conversation below.</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item._sep) return <DateSep key={item.key} label={item.label} />;
              const isMe = item.senderId === senderId;
              return <Bubble msg={item} isMe={isMe} onDelete={handleDelete} />;
            }}
          />
        )}

        {/* Upload progress indicator */}
        {uploading && (
          <View style={st.uploadingBar}>
            <ActivityIndicator size="small" color={P.blue} />
            <Text style={st.uploadingTxt}>Uploading file…</Text>
          </View>
        )}

        {/* ── Attach tray ── */}
        {showAttach && (
          <Animated.View style={[st.attachTray, { opacity: trayAnim, transform: [{ translateY: trayTY }] }]}>
            <Text style={st.attachTrayHead}>ATTACH</Text>
            <View style={st.attachTrayRow}>
              {ATTACH_OPTS.map(o => (
                <TouchableOpacity
                  key={o.key}
                  style={st.attachOpt}
                  onPress={() => handleAttachOpt(o.key)}
                  activeOpacity={0.75}
                >
                  <View style={[st.attachOptIcon, { backgroundColor: o.soft }]}>
                    <Ionicons name={`${o.icon}-outline`} size={22} color={o.color} />
                  </View>
                  <Text style={[st.attachOptTxt, { color: o.color }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Attachment preview strip ── */}
        {attachment && (
          <View style={st.attachPrev}>
            <Ionicons name={attachIcon(attachment.type)} size={14} color={P.blue} />
            <View style={{ flex: 1 }}>
              <Text style={st.attachPrevName} numberOfLines={1}>
                {attachment.label || attachment.name}
              </Text>
              {!!attachment.size && (
                <Text style={st.attachPrevSize}>{formatBytes(attachment.size)}</Text>
              )}
              {attachment.type === 'link' && (
                <Text style={st.attachPrevSize} numberOfLines={1}>{attachment.url}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setAttachment(null)} style={st.attachPrevX}>
              <Ionicons name="close" size={11} color={P.t3} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={st.inputBar}>
          {/* Attach toggle */}
          <TouchableOpacity onPress={toggleAttach} style={st.attachToggle} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ rotate: attachRotDeg }] }}>
              <Ionicons name="add-circle" size={26} color={showAttach ? P.blue : P.t3} />
            </Animated.View>
          </TouchableOpacity>

          {/* Text input */}
          <Animated.View style={[st.inputWrap, { borderColor: borderC }]}>
            <TextInput
              value={msgText}
              onChangeText={setMsgText}
              placeholder="Message…"
              placeholderTextColor={P.t3}
              style={st.input}
              multiline
              maxLength={2000}
              onFocus={() => { setSFocus(true); if (showAttach) toggleAttach(); }}
              onBlur={() => setSFocus(false)}
            />
          </Animated.View>

          {/* Send */}
          <TouchableOpacity onPress={handleSend} disabled={!canSend || uploading} activeOpacity={0.85}>
            <Animated.View style={[st.sendBtn, { backgroundColor: sendBg, transform: [{ scale: sendScale }] }]}>
              {(sendState === 'sending' || uploading)
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name={sendIconName} size={16} color={canSend ? '#fff' : P.t3} />
              }
            </Animated.View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Link modal ── */}
      <LinkModal
        visible={showLink}
        onClose={() => setShowLink(false)}
        onAttach={setAttachment}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeSt = (P) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: SAFE_T, paddingHorizontal: 14, paddingBottom: 14,
    backgroundColor: P.panel, borderBottomWidth: 1, borderBottomColor: P.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: P.card, borderWidth: 1, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
  },
  chanAv:       { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 14, fontWeight: '800', color: P.t1 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot:      { width: 6, height: 6, borderRadius: 3 },
  headerSub:    { fontSize: 11, color: P.t2 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: P.card, borderWidth: 1, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
  },

  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt:  { fontSize: 13, color: P.t3 },

  msgList: { paddingHorizontal: IS_TABLET ? 28 : 14, paddingTop: 10, paddingBottom: 12 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.amberSoft, borderRadius: 14,
    borderWidth: 1, borderColor: P.amber + '40',
    padding: 12, marginBottom: 14,
  },
  infoBannerTxt: { fontSize: 12, color: P.t2, flex: 1, lineHeight: 18 },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: P.t2 },
  emptySub:   { fontSize: 12, color: P.t3 },

  bubbleWrap:  { maxWidth: IS_TABLET ? '60%' : '80%', marginBottom: 12 },
  senderRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  senderAv:    { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  senderAvTxt: { fontSize: 8, fontWeight: '800' },
  senderName:  { fontSize: 11, fontWeight: '700' },
  bubble:      { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMe:    { backgroundColor: P.blue, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderBottomLeftRadius: 4 },
  bubbleTxt:   { fontSize: 14, color: P.t1, lineHeight: 21 },
  bubbleMeta:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bubbleTime:  { fontSize: 10, color: P.t2 },
  longPressTip:{ fontSize: 9, color: P.t4, textAlign: 'right', marginTop: 2, marginRight: 4 },

  // Attachment chip inside bubble
  attachChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 6,
  },
  attachChipName: { fontSize: 12, fontWeight: '600', color: P.t1 },
  attachChipSub:  { fontSize: 10, color: P.t2, marginTop: 1 },

  dateSep:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14, paddingHorizontal: 2 },
  dateLine: { flex: 1, height: 1, backgroundColor: P.border },
  datePill: { backgroundColor: P.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: P.border },
  dateTxt:  { fontSize: 10, color: P.t3, fontWeight: '600' },

  // Upload progress
  uploadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 5,
    backgroundColor: P.blueSoft,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  uploadingTxt: { fontSize: 12, color: P.blue, fontWeight: '600' },

  // Attach tray
  attachTray:    { marginHorizontal: 12, marginBottom: 6, backgroundColor: P.card, borderRadius: 16, borderWidth: 1, borderColor: P.border, padding: 14 },
  attachTrayHead:{ fontSize: 9, fontWeight: '800', color: P.t3, letterSpacing: 1.4, marginBottom: 12 },
  attachTrayRow: { flexDirection: 'row', gap: 10 },
  attachOpt:     { flex: 1, alignItems: 'center', gap: 6 },
  attachOptIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attachOptTxt:  { fontSize: 11, fontWeight: '700' },

  // Attachment preview strip
  attachPrev: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 5,
    backgroundColor: P.blueSoft,
    borderRadius: 9, borderWidth: 1, borderColor: P.blue + '40',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  attachPrevName: { fontSize: 12, fontWeight: '600', color: P.blue },
  attachPrevSize: { fontSize: 10, color: P.t2, marginTop: 1 },
  attachPrevX: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: P.card, alignItems: 'center', justifyContent: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, paddingBottom: SAFE_B,
    borderTopWidth: 1, borderTopColor: P.border, backgroundColor: P.panel,
  },
  attachToggle: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  inputWrap:    { flex: 1, backgroundColor: P.card, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14 },
  input:        { color: P.t1, fontSize: 14, paddingVertical: 9, maxHeight: 110, lineHeight: 20 },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

  // Link modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  linkModal: {
    width: '100%', maxWidth: 420,
    backgroundColor: P.card, borderRadius: 20,
    borderWidth: 1, borderColor: P.border,
    padding: 22,
  },
  linkModalTitle: { fontSize: 16, fontWeight: '800', color: P.t1, marginBottom: 18 },
  linkLabel:      { fontSize: 11, fontWeight: '700', color: P.t3, letterSpacing: 0.6, marginBottom: 6 },
  linkInput: {
    backgroundColor: P.panel, borderRadius: 10,
    borderWidth: 1, borderColor: P.border,
    color: P.t1, fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 14,
  },
  linkBtnRow:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  linkBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  linkBtnCancel:    { backgroundColor: P.panel, borderWidth: 1, borderColor: P.border },
  linkBtnCancelTxt: { fontSize: 14, fontWeight: '600', color: P.t2 },
  linkBtnAttach:    { backgroundColor: P.blue },
  linkBtnAttachTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});