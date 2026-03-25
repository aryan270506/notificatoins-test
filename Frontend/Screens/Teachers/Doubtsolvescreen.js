// Screens/Teacher/DoubtSolveScreen.js  — Teacher chat
// Text messages → JSON body (no multer involved)
// File uploads  → multipart/form-data (multer parses)
// Room key = subject + year only.

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform, KeyboardAvoidingView,
  ActivityIndicator, Alert, StatusBar, Image, Linking,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons }    from '@expo/vector-icons';
import AsyncStorage    from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker    from 'expo-image-picker';
import axiosInstance   from '../../Src/Axios';
import { connectSocket, getSocket } from '../../utils/socket';
import { ThemeContext } from './TeacherStack';

const DARK = {
  bg: '#07090F', surface: '#0D1120', surfaceEl: '#111827', border: '#1A2035',
  accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.14)', accentBright: '#60A5FA',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  statusBar: 'light-content', incomingBubble: '#1F2A40',
  outgoingBubble: '#3B82F6', studentBorder: '#2A3A55', cardAlt: '#0F1A2E',
};
const LIGHT = {
  bg: '#F5F7FF', surface: '#FFFFFF', surfaceEl: '#EEF2FF', border: '#E2E8F4',
  accent: '#3B6FE8', accentSoft: 'rgba(59,111,232,0.09)', accentBright: '#3B6FE8',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#94A3B8',
  statusBar: 'dark-content', incomingBubble: '#FFFFFF',
  outgoingBubble: '#3B6FE8', studentBorder: '#E2E8F4', cardAlt: '#EEF2FF',
};

const strId      = (id) => (id ? String(id) : '');
const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#14B8A6'];
const senderColor   = (id) =>
  AVATAR_COLORS[Math.abs([...strId(id)].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

// ── File helpers ───────────────────────────────────────────────────────────────
const isImageMime = (mime) => !!mime && mime.startsWith('image/');
const formatSize  = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const docIcon = (mime) => {
  if (!mime) return '📄';
  if (mime.includes('pdf'))   return '📕';
  if (mime.includes('word'))  return '📝';
  if (mime.includes('excel') || mime.includes('sheet')) return '📊';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📋';
  if (mime.includes('text')) return '📃';
  return '📄';
};

// ─────────────────────────────────────────────────────────────────────────────
// sendWithFile — multipart/form-data
// Rules for React Native FormData:
//   1. file entry = plain object { uri, name, type }  (NOT a Blob)
//   2. Content-Type must be undefined so RN sets multipart + boundary
//   3. transformRequest: [(d) => d] stops axios JSON-serialising FormData
// ─────────────────────────────────────────────────────────────────────────────
const sendWithFile = async (fields, file) => {
  const form = new FormData();

  // append text fields
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      form.append(k, String(v));
    }
  });

  // 🔹 Web requires Blob
  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    const blob = await response.blob();

    form.append("file", blob, file.name);
  } 
  // 🔹 Android / iOS
  else {
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    });
  }

  return axiosInstance.post("/subject-rooms/message", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// sendTextOnly — plain JSON
const sendTextOnly = (fields) =>
  axiosInstance.post('/subject-rooms/message', fields);

const mapMsg = (m) => ({
  id:             strId(m._id),
  senderId:       strId(m.senderId),
  senderName:     m.senderName || 'Unknown',
  senderRole:     m.sender || 'student',
  senderDivision: m.senderDivision || '',
  text:           m.text || '',
  fileUrl:        m.fileUrl  || null,
  fileName:       m.fileName || null,
  fileSize:       m.fileSize || null,
  mimeType:       m.mimeType || null,
  createdAt:      m.createdAt || new Date().toISOString(),
  avatarColor:    senderColor(m.senderId),
});

// ── File preview in bubble ─────────────────────────────────────────────────────
const FilePreview = ({ item, isOwn, T }) => {
  if (!item.fileUrl) return null;
  if (isImageMime(item.mimeType)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)} activeOpacity={0.85}>
        <Image source={{ uri: item.fileUrl }} style={styles.imagePreview} resizeMode="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.docPreview, { backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : T.surfaceEl }]}
      onPress={() => Linking.openURL(item.fileUrl)}
      activeOpacity={0.8}
    >
      <Text style={styles.docIconTxt}>{docIcon(item.mimeType)}</Text>
      <View style={styles.docInfo}>
        <Text style={[styles.docName, { color: isOwn ? '#fff' : T.textPrimary }]} numberOfLines={2}>
          {item.fileName || 'Document'}
        </Text>
        {!!item.fileSize && (
          <Text style={[styles.docSize, { color: isOwn ? 'rgba(255,255,255,0.65)' : T.textMuted }]}>
            {formatSize(item.fileSize)}
          </Text>
        )}
      </View>
      <Ionicons name="download-outline" size={18} color={isOwn ? 'rgba(255,255,255,0.8)' : T.accentBright} />
    </TouchableOpacity>
  );
};

// ── Pending file chip ──────────────────────────────────────────────────────────
const PendingFileChip = ({ file, onRemove, T }) => (
  <View style={[styles.pendingChip, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
    {isImageMime(file.mimeType)
      ? <Image source={{ uri: file.uri }} style={styles.pendingThumb} />
      : <Text style={{ fontSize: 20 }}>{docIcon(file.mimeType)}</Text>
    }
    <Text style={[styles.pendingName, { color: T.textPrimary }]} numberOfLines={1}>{file.name}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={18} color={T.textMuted} />
    </TouchableOpacity>
  </View>
);

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DoubtSolveScreen(props) {
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const T          = isDark ? DARK : LIGHT;
  const route      = useRoute();

  let userProp = props.user;
  if (!userProp && route?.params?.teacherId) {
    userProp = {
      _id:          route.params.teacherId,
      name:         route.params.teacherName || 'Unknown',
      role:         route.params.teacherRole || 'teacher',
      email:        '',
      profilePhoto: null,
    };
  }

  const [user,       setUser]       = useState(userProp || null);
  const [userReady,  setUserReady]  = useState(!!(userProp?._id));
  const [myDivision, setMyDivision] = useState(route.params?.division || props.division || '');

  const subjectName = route.params?.subjectName || props.subjectName;
  const year        = route.params?.year        || props.year;

  const [messages,    setMessages]    = useState([]);
  const [inputText,   setInputText]   = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [showAttach,  setShowAttach]  = useState(false);

  const flatListRef    = useRef(null);
  const socketRef      = useRef(null);
  const pendingTempRef = useRef({});

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userProp?._id) { setUser(userProp); setUserReady(true); return; }
    (async () => {
      try {
        const userId = (await AsyncStorage.getItem('teacherId')) || (await AsyncStorage.getItem('userId')) || '';
        const name   = (await AsyncStorage.getItem('teacherName')) || (await AsyncStorage.getItem('userName')) || 'Unknown';
        const role   = (await AsyncStorage.getItem('teacherRole')) || (await AsyncStorage.getItem('userRole')) || 'teacher';
        const email  = (await AsyncStorage.getItem('teacherEmail')) || (await AsyncStorage.getItem('userEmail')) || '';
        const div    = (await AsyncStorage.getItem('teacherDivision')) || '';
        if (div) setMyDivision(div);
        setUser({ _id: userId, name, role, email, profilePhoto: null });
      } catch (e) { console.error('loadUser:', e); }
      finally { setUserReady(true); }
    })();
  }, [userProp]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!subjectName || !year) return;
    try {
      setLoading(true);
      const res  = await axiosInstance.get('/subject-rooms/by-subject', { params: { subject: subjectName, year } });
      const data = res.data;
      setMessages(data.success && data.room ? (data.room.messages || []).map(mapMsg) : []);
    } catch (e) {
      console.error('fetchMessages:', e);
      Alert.alert('Error', 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [subjectName, year]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userReady || !user?._id || !subjectName || !year) return;
    connectSocket({ _id: user._id, userId: user._id, name: user.name, role: user.role });
    socketRef.current = getSocket();
    socketRef.current.emit('join-room', { subjectName, year });

    socketRef.current.on('new-message', (newMessage) => {
      const realId = strId(newMessage._id);
      setMessages((prev) => {
        const tempEntry = prev.find(
          (m) => m.id.startsWith('tmp_') && pendingTempRef.current[m.id] &&
                 strId(newMessage.senderId) === strId(user._id)
        );
        if (tempEntry) {
          delete pendingTempRef.current[tempEntry.id];
          return prev.map((m) => (m.id === tempEntry.id ? mapMsg(newMessage) : m));
        }
        if (prev.some((m) => m.id === realId)) return prev;
        return [...prev, mapMsg(newMessage)];
      });
    });

    socketRef.current.on('message-deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => strId(m.id) !== strId(messageId)));
    });

    return () => {
      socketRef.current?.off('new-message');
      socketRef.current?.off('message-deleted');
      socketRef.current?.emit('leave-room', { subjectName, year });
    };
  }, [user, userReady, subjectName, year]);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Pickers ────────────────────────────────────────────────────────────────
  const pickImage = async () => {
    setShowAttach(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: false });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setPendingFile({ uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', size: a.fileSize || 0 });
      }
    } catch { Alert.alert('Error', 'Could not open image library.'); }
  };

  const takePhoto = async () => {
    setShowAttach(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow camera access.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setPendingFile({ uri: a.uri, name: `photo_${Date.now()}.jpg`, mimeType: 'image/jpeg', size: a.fileSize || 0 });
      }
    } catch { Alert.alert('Error', 'Could not open camera.'); }
  };

  const pickDocument = async () => {
    setShowAttach(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setPendingFile({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream', size: a.size || 0 });
      }
    } catch { Alert.alert('Error', 'Could not open document picker.'); }
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const showError = (title, msg) =>
    Platform.OS === 'web' ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text && !pendingFile) {
  console.log("Nothing to send");
  console.log("TEXT:", text);
console.log("FILE:", fileToSend);

  return;
}
    if (!subjectName || !year) { showError('Error', 'Subject or year missing.'); return; }
    if (!user._id)             { showError('Error', 'User info missing.');       return; }

    const fileToSend = pendingFile;
    const tempId     = `tmp_${Date.now()}`;

    pendingTempRef.current[tempId] = true;
    setMessages((prev) => [...prev, {
      id:             tempId,
      senderId:       strId(user._id),
      senderName:     user.name,
      senderRole:     'teacher',
      senderDivision: myDivision,
      text,
      fileUrl:        fileToSend?.uri      || null,
      fileName:       fileToSend?.name     || null,
      fileSize:       fileToSend?.size     || null,
      mimeType:       fileToSend?.mimeType || null,
      createdAt:      new Date().toISOString(),
      avatarColor:    senderColor(user._id),
    }]);

    setInputText('');
    setPendingFile(null);
    setSending(true);

    try {
      const commonFields = {
        subject:    subjectName,
        year,
        division:   myDivision,
        senderId:   strId(user._id),
        senderName: user.name,
        sender:     'teacher',
        text:       text || '',
      };

      // ── Use FormData ONLY when there is a file, JSON otherwise ─────────────
      const res = fileToSend
        ? await sendWithFile(commonFields, fileToSend)
        : await sendTextOnly(commonFields);

      const realMessage = res.data?.room?.messages?.slice(-1)[0];
      delete pendingTempRef.current[tempId];
      if (realMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? mapMsg(realMessage) : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (e) {
      console.error('sendMessage error:', e?.response?.data || e.message);
      delete pendingTempRef.current[tempId];
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showError('Error', e?.response?.data?.error || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Render bubble ──────────────────────────────────────────────────────────
  const renderMessage = ({ item }) => {
    const isOwn     = strId(item.senderId) === strId(user?._id);
    const isStudent = item.senderRole === 'student';
    const initials  = item.senderName
      ? item.senderName.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase()
      : '??';

    return (
      <View style={[styles.messageRow, isOwn ? styles.outgoingRow : styles.incomingRow]}>
        {!isOwn && (
          <View style={[styles.avatar, { backgroundColor: isStudent ? (item.avatarColor || T.accent) : '#F59E0B' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: T.outgoingBubble, borderBottomRightRadius: 4 }
            : { backgroundColor: T.incomingBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: T.studentBorder },
        ]}>
          {!isOwn && (
            <View style={styles.senderRow}>
              <Text style={[styles.senderName, { color: isStudent ? (item.avatarColor || T.accentBright) : '#F59E0B' }]}>
                {item.senderName || 'Student'}
              </Text>
              {item.senderDivision ? (
                <View style={[styles.roleBadge, { backgroundColor: T.accentSoft }]}>
                  <Text style={[styles.roleBadgeText, { color: T.accentBright }]}>
                    {isStudent ? `Div ${item.senderDivision}` : 'Teacher'}
                  </Text>
                </View>
              ) : isStudent ? (
                <View style={[styles.roleBadge, { backgroundColor: T.accentSoft }]}>
                  <Text style={[styles.roleBadgeText, { color: T.accentBright }]}>Student</Text>
                </View>
              ) : null}
            </View>
          )}

          <FilePreview item={item} isOwn={isOwn} T={T} />

          {!!item.text && (
            <Text style={[styles.messageText, { color: isOwn ? '#fff' : T.textPrimary, marginTop: item.fileUrl ? 6 : 0 }]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: isOwn ? 'rgba(255,255,255,0.6)' : T.textMuted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {isOwn && (
          <View style={[styles.avatar, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </View>
    );
  };

  const canSend = (inputText.trim().length > 0 || !!pendingFile) && !sending;

  if (loading || !userReady) {
    return <View style={[styles.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={T.accentBright} /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle={T.statusBar} backgroundColor={T.surface} />

      {/* Attach bottom sheet */}
      <Modal transparent animationType="slide" visible={showAttach} onRequestClose={() => setShowAttach(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAttach(false)}>
          <View style={styles.attachOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.attachSheet, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[styles.attachHandle, { backgroundColor: T.border }]} />
                <Text style={[styles.attachTitle, { color: T.textPrimary }]}>Send Attachment</Text>
                {[
                  { icon: '🖼️', label: 'Photo Library', onPress: pickImage },
                  { icon: '📷', label: 'Take Photo',    onPress: takePhoto },
                  { icon: '📄', label: 'Document',      onPress: pickDocument },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.attachOption, { borderBottomColor: T.border }]}
                    onPress={item.onPress}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.attachOptionIcon}>{item.icon}</Text>
                    <Text style={[styles.attachOptionLabel, { color: T.textPrimary }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.attachCancel, { backgroundColor: T.surfaceEl }]}
                  onPress={() => setShowAttach(false)}
                >
                  <Text style={[styles.attachCancelTxt, { color: T.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={T.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: T.textPrimary }]} numberOfLines={1}>{subjectName}</Text>
          <Text style={[styles.headerSubtitle, { color: T.textMuted }]}>Year {year} · All Divisions</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
            <Text style={[styles.emptyText, { color: T.textMuted }]}>
              No messages yet. Students will appear here once they post.
            </Text>
          </View>
        }
      />

      {pendingFile && (
        <View style={[styles.pendingFileRow, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          <PendingFileChip file={pendingFile} onRemove={() => setPendingFile(null)} T={T} />
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: T.surface, borderTopColor: T.border }]}>
        <TouchableOpacity
          style={[styles.attachBtn, { backgroundColor: T.surfaceEl }]}
          onPress={() => setShowAttach(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="attach" size={20} color={T.accentBright} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: T.surfaceEl, color: T.textPrimary }]}
          placeholder="Answer a student's question…"
          placeholderTextColor={T.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: canSend ? T.accentBright : T.surfaceEl }]}
          onPress={sendMessage}
          disabled={!canSend}
        >
          {sending
            ? <ActivityIndicator size="small" color={canSend ? '#fff' : T.textMuted} />
            : <Ionicons name="send" size={20} color={canSend ? '#fff' : T.textMuted} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 50 : 10, paddingBottom: 10, borderBottomWidth: 1 },
  headerBack: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { width: 40 },
  messagesList: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  messageRow:  { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end', gap: 8 },
  outgoingRow: { justifyContent: 'flex-end' },
  incomingRow: { justifyContent: 'flex-start' },
  avatar:     { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bubble:     { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  senderRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  senderName:    { fontSize: 12, fontWeight: '700' },
  roleBadge:     { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  imagePreview: { width: 220, height: 160, borderRadius: 10, marginTop: 6, backgroundColor: '#00000020' },
  docPreview:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, marginTop: 6 },
  docIconTxt:  { fontSize: 28 },
  docInfo:     { flex: 1 },
  docName:     { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  docSize:     { fontSize: 11, marginTop: 2 },
  messageText: { fontSize: 15, lineHeight: 20 },
  timestamp:   { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  pendingFileRow: { paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  pendingThumb: { width: 36, height: 36, borderRadius: 8 },
  pendingName:  { flex: 1, fontSize: 12, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  attachBtn:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input:      { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100, fontSize: 15 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  attachSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  attachHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  attachTitle:  { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 },
  attachOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
  attachOptionIcon:  { fontSize: 22 },
  attachOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  attachCancel:    { marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  attachCancelTxt: { fontSize: 15, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText:      { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});