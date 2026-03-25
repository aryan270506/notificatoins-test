// Screens/Student/DoubtChatScreen.js  — Student side
// Text messages → JSON body
// File uploads  → multipart/form-data
// Room key = subject + year only. All divisions share one room.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Dimensions,
  Animated, Alert, Modal, TouchableWithoutFeedback, Image,
  ActivityIndicator, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker    from 'expo-image-picker';
import { Ionicons }        from '@expo/vector-icons';
import { connectSocket, getSocket } from '../../../utils/socket';

const { width } = Dimensions.get('window');
const isLaptop   = width >= 768;
const BUBBLE_MAX = isLaptop ? width * 0.45 : width * 0.72;
const strId = (id) => (id ? String(id) : '');

const AVATAR_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#14B8A6'];
const senderColor = (id) =>
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
// sendWithFile — multipart/form-data upload
// IMPORTANT rules for React Native FormData:
//   1. file entry must be a plain object { uri, name, type }  (not a Blob)
//   2. Do NOT set Content-Type header — let the runtime set multipart+boundary
//   3. Use transformRequest: [(d) => d] to stop axios from JSON-serialising FormData
// ─────────────────────────────────────────────────────────────────────────────
const sendWithFile = async (fields, file) => {
  const form = new FormData();

  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      form.append(k, String(v));
    }
  });

  if (Platform.OS === "web") {
    // 🔹 Web requires Blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    form.append("file", blob, file.name);
  } else {
    // 🔹 Android / iOS
    form.append("file", {
      uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
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

// sendTextOnly — plain JSON (no file)
const sendTextOnly = (fields) =>
  axiosInstance.post('/subject-rooms/message', fields);

// ── Typing indicator ───────────────────────────────────────────────────────────
const TypingIndicator = ({ C }) => {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = (dot, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ])).start();
    anim(d1, 0); anim(d2, 150); anim(d3, 300);
  }, []);
  return (
    <View style={[styles.typingBubble, { backgroundColor: C.card, borderColor: C.border }]}>
      {[d1, d2, d3].map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { backgroundColor: C.accent, transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
};

// ── Delete modal ───────────────────────────────────────────────────────────────
const DeleteMsgModal = ({ visible, msgText, onConfirm, onCancel, C }) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opac  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.timing(opac,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.88); opac.setValue(0); }
  }, [visible]);
  if (!visible) return null;
  const bg      = C?.card        ?? '#0D1F36';
  const border  = C?.border      ?? '#1E3A5F';
  const cardAlt = C?.cardAlt     ?? '#112240';
  const textPri = C?.textPrimary ?? '#F1F5F9';
  const textMut = C?.textMuted   ?? '#94A3B8';
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.modalOverlay, { opacity: opac }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalCard, { backgroundColor: bg, borderColor: border, transform: [{ scale }] }]}>
              <View style={styles.modalIconCircle}><Text style={{ fontSize: 28 }}>🗑️</Text></View>
              <Text style={[styles.modalTitle, { color: textPri }]}>Delete Message?</Text>
              <Text style={[styles.modalSub, { color: textMut }]}>This message will be permanently removed.</Text>
              {!!msgText && (
                <View style={[styles.msgPreviewBox, { backgroundColor: cardAlt, borderColor: '#EF444440' }]}>
                  <Text style={[styles.msgPreviewTxt, { color: textMut }]} numberOfLines={4}>"{msgText}"</Text>
                </View>
              )}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, { borderWidth: 1, borderColor: border }]} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={[styles.modalBtnTxt, { color: textMut }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={onConfirm} activeOpacity={0.8}>
                  <Text style={[styles.modalBtnTxt, { color: '#fff' }]}>🗑  Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── File preview in bubble ─────────────────────────────────────────────────────
const FilePreview = ({ msg, isOwn, C }) => {
  if (!msg.fileUrl) return null;
  if (isImageMime(msg.mimeType)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(msg.fileUrl)} activeOpacity={0.85}>
        <Image source={{ uri: msg.fileUrl }} style={styles.imagePreview} resizeMode="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.docPreview, { backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : (C.cardAlt ?? '#112240') }]}
      onPress={() => Linking.openURL(msg.fileUrl)}
      activeOpacity={0.8}
    >
      <Text style={styles.docIconTxt}>{docIcon(msg.mimeType)}</Text>
      <View style={styles.docInfo}>
        <Text style={[styles.docName, { color: isOwn ? '#fff' : C.textPrimary }]} numberOfLines={2}>
          {msg.fileName || 'Document'}
        </Text>
        {!!msg.fileSize && (
          <Text style={[styles.docSize, { color: isOwn ? 'rgba(255,255,255,0.65)' : C.textMuted }]}>
            {formatSize(msg.fileSize)}
          </Text>
        )}
      </View>
      <Ionicons name="download-outline" size={18} color={isOwn ? 'rgba(255,255,255,0.8)' : C.accent} />
    </TouchableOpacity>
  );
};

// ── Pending file chip ──────────────────────────────────────────────────────────
const PendingFileChip = ({ file, onRemove, C }) => (
  <View style={[styles.pendingChip, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
    {isImageMime(file.mimeType)
      ? <Image source={{ uri: file.uri }} style={styles.pendingThumb} />
      : <Text style={{ fontSize: 20 }}>{docIcon(file.mimeType)}</Text>
    }
    <Text style={[styles.pendingName, { color: C.textPrimary }]} numberOfLines={1}>{file.name}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={18} color={C.textMuted} />
    </TouchableOpacity>
  </View>
);

// ── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, currentUserId, C, onLongPress }) => {
  const isOwn     = strId(msg.senderId) === strId(currentUserId);
  const isTeacher = msg.senderRole === 'teacher';
  const initials  = msg.senderName
    ? msg.senderName.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  return (
    <View style={{ marginBottom: 14, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
      <TouchableOpacity
        activeOpacity={isOwn ? 0.75 : 1}
        onLongPress={isOwn ? () => onLongPress(msg) : undefined}
        delayLongPress={350}
        style={[styles.messageRow, isOwn ? styles.messageRowRight : styles.messageRowLeft]}
      >
        {!isOwn && (
          <View style={[styles.msgAvatar, { backgroundColor: isTeacher ? '#F59E0B' : (msg.avatarColor || C.accent) }]}>
            <Text style={styles.msgAvatarText}>{initials}</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isOwn
            ? [styles.bubbleOwn, { backgroundColor: C.accent }]
            : [styles.bubbleOther, {
                backgroundColor: isTeacher ? (C.cardAlt ?? '#112240') : C.card,
                borderColor: isTeacher ? '#F59E0B44' : C.border,
                borderWidth: isTeacher ? 1.5 : 1,
              }],
        ]}>
          <View style={styles.senderNameRow}>
            <Text style={[styles.senderName, {
              color: isOwn ? 'rgba(255,255,255,0.75)' : isTeacher ? '#F59E0B' : (msg.avatarColor || C.accent),
            }]}>
              {isOwn ? (msg.senderName || 'You') : (msg.senderName || 'Student')}
            </Text>
            {!isOwn && msg.senderDivision ? (
              <View style={styles.divBadge}>
                <Text style={styles.divBadgeText}>{isTeacher ? 'Teacher' : `Div ${msg.senderDivision}`}</Text>
              </View>
            ) : isTeacher && !isOwn ? (
              <View style={styles.teacherBadge}><Text style={styles.teacherBadgeText}>Teacher</Text></View>
            ) : null}
          </View>

          <FilePreview msg={msg} isOwn={isOwn} C={C} />

          {!!msg.text && (
            <Text style={[styles.bubbleText, { color: isOwn ? '#FFF' : C.textPrimary, marginTop: msg.fileUrl ? 6 : 0 }]}>
              {msg.text}
            </Text>
          )}
          <Text style={[styles.bubbleTime, { color: isOwn ? 'rgba(255,255,255,0.6)' : C.textMuted }]}>{msg.time}</Text>
        </View>
        {isOwn && (
          <View style={[styles.msgAvatarOwn, { backgroundColor: msg.avatarColor || C.accent }]}>
            <Text style={styles.msgAvatarText}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>
      {isOwn && <Text style={[styles.longPressHint, { color: C.textMuted }]}>Hold to delete</Text>}
    </View>
  );
};

// ── Suggestion chips ───────────────────────────────────────────────────────────
const Suggestions = ({ course, onSelect, C }) => {
  const chips = [
    `Can someone explain a concept in ${course?.title}?`,
    'Can anyone share study resources?',
    'What topics are important for exams?',
    'Anyone has notes to share?',
  ];
  return (
    <FlatList
      horizontal data={chips} keyExtractor={(_, i) => String(i)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.suggestionsList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.suggestionChip, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => onSelect(item)} activeOpacity={0.75}
        >
          <Text style={[styles.suggestionText, { color: C.textMuted }]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DoubtChatScreen({ course, user, onBack, C, onThemeToggle }) {
  const flatListRef    = useRef(null);
  const roomIdRef      = useRef(null);
  const socketRef      = useRef(null);
  const pendingTempRef = useRef({});

  const [messages,       setMessages]       = useState([]);
  const [inputText,      setInputText]      = useState('');
  const [pendingFile,    setPendingFile]     = useState(null);
  const [isSending,      setIsSending]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [showAttach,     setShowAttach]     = useState(false);
  const [deleteMsgModal, setDeleteMsgModal] = useState({ visible: false, msg: null });

  const currentUserId = strId(user?._id || user?.id);
  const myDivision    = user?.division || '';

  const mapMsg = useCallback((m) => ({
    id:             strId(m._id),
    senderId:       strId(m.senderId),
    senderName:     m.senderName || 'Student',
    senderRole:     m.sender || 'student',
    senderDivision: m.senderDivision || '',
    text:           m.text || '',
    fileUrl:        m.fileUrl  || null,
    fileName:       m.fileName || null,
    fileSize:       m.fileSize || null,
    mimeType:       m.mimeType || null,
    time:           new Date(m.createdAt || m.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avatarColor:    senderColor(m.senderId),
  }), []);

  // ── Load room ──────────────────────────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    if (!course?.title || !course?.year) return;
    setIsLoading(true);
    try {
      const res  = await axiosInstance.get('/subject-rooms/by-subject', {
        params: { subject: course.title, year: course.year },
      });
      const data = res.data;
      if (data.success && data.room) {
        roomIdRef.current = strId(data.room._id);
        setMessages((data.room.messages || []).map(mapMsg));
      } else {
        roomIdRef.current = null;
        setMessages([]);
      }
    } catch (err) {
      console.log('loadRoom error:', err?.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [course, mapMsg]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !course?.title || !course?.year) return;
    connectSocket(user);
    socketRef.current = getSocket();
    socketRef.current.emit('join-room', { subjectName: course.title, year: course.year });

    socketRef.current.on('new-message', (newMessage) => {
      const realId = strId(newMessage._id);
      setMessages((prev) => {
        const tempEntry = prev.find(
          (m) => m.id.startsWith('tmp_') && pendingTempRef.current[m.id] &&
                 strId(newMessage.senderId) === strId(currentUserId)
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
      socketRef.current?.emit('leave-room', { subjectName: course.title, year: course.year });
    };
  }, [user, course, currentUserId, mapMsg]);

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
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !pendingFile) || isSending) return;

    const fileToSend = pendingFile;
    const tempId     = `tmp_${Date.now()}`;

    pendingTempRef.current[tempId] = true;
    setMessages((prev) => [...prev, {
      id:             tempId,
      senderId:       currentUserId,
      senderName:     user?.name || 'Me',
      senderRole:     'student',
      senderDivision: myDivision,
      text,
      fileUrl:        fileToSend?.uri      || null,
      fileName:       fileToSend?.name     || null,
      fileSize:       fileToSend?.size     || null,
      mimeType:       fileToSend?.mimeType || null,
      time:           new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarColor:    senderColor(currentUserId),
    }]);

    setInputText('');
    setPendingFile(null);
    setIsSending(true);

    try {
      const commonFields = {
        subject:    course.title,
        year:       course.year,
        division:   myDivision,
        senderId:   currentUserId,
        senderName: user?.name || 'Student',
        sender:     'student',
        text:       text || '',
      };

      // ── Use FormData ONLY when there is a file, JSON otherwise ────────────
      const res = fileToSend
        ? await sendWithFile(commonFields, fileToSend)
        : await sendTextOnly(commonFields);

      const data = res.data;
      delete pendingTempRef.current[tempId];

      if (data.success && data.room) {
        roomIdRef.current = strId(data.room._id);
        const realMsg = (data.room.messages || []).slice(-1)[0];
        if (realMsg) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? mapMsg(realMsg) : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        Alert.alert('Error', data.error || 'Could not send message.');
      }
    } catch (err) {
      delete pendingTempRef.current[tempId];
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.log('handleSend error:', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.error || 'Could not reach the server.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleLongPress = (msg) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete this message?\n\n"${(msg.text || msg.fileName || '').substring(0, 120)}"`))
        executeDelete(msg);
    } else {
      setDeleteMsgModal({ visible: true, msg });
    }
  };
  const handleDeleteCancel  = () => setDeleteMsgModal({ visible: false, msg: null });
  const handleDeleteConfirm = () => {
    const m = deleteMsgModal.msg;
    setDeleteMsgModal({ visible: false, msg: null });
    if (m) executeDelete(m);
  };
  const executeDelete = async (msg) => {
    const msgId  = strId(msg.id);
    const roomId = roomIdRef.current;
    setMessages((prev) => prev.filter((m) => strId(m.id) !== msgId));
    if (!roomId || msgId.startsWith('tmp_')) return;
    try {
      const res = await axiosInstance.delete(`/subject-rooms/${roomId}/messages/${msgId}`);
      if (!res.data.success) {
        setMessages((prev) => [...prev, msg].sort((a, b) => strId(a.id) > strId(b.id) ? 1 : -1));
        Alert.alert('Error', res.data.error || 'Could not delete.');
      }
      if (res.data.success && res.data.room)
        setMessages((res.data.room.messages || []).map(mapMsg));
    } catch (err) {
      setMessages((prev) => [...prev, msg].sort((a, b) => strId(a.id) > strId(b.id) ? 1 : -1));
      Alert.alert('Error', err?.response?.data?.error || 'Network error.');
    }
  };

  const bg      = C?.bg          ?? '#0A1628';
  const cardBg  = C?.card        ?? '#0D1F36';
  const cardAlt = C?.cardAlt     ?? '#112240';
  const border  = C?.border      ?? '#1E3A5F';
  const textPri = C?.textPrimary ?? '#F1F5F9';
  const textMut = C?.textMuted   ?? '#94A3B8';
  const accent  = C?.accent      ?? '#4F8EF7';
  const canSend = (inputText.trim().length > 0 || !!pendingFile) && !isSending;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <DeleteMsgModal
        visible={deleteMsgModal.visible}
        msgText={deleteMsgModal.msg?.text ?? deleteMsgModal.msg?.fileName ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        C={C}
      />

      {/* Attach bottom sheet */}
      <Modal transparent animationType="slide" visible={showAttach} onRequestClose={() => setShowAttach(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAttach(false)}>
          <View style={styles.attachOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.attachSheet, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.attachHandle, { backgroundColor: border }]} />
                <Text style={[styles.attachTitle, { color: textPri }]}>Send Attachment</Text>
                {[
                  { icon: '🖼️', label: 'Photo Library', onPress: pickImage },
                  { icon: '📷', label: 'Take Photo',    onPress: takePhoto },
                  { icon: '📄', label: 'Document',      onPress: pickDocument },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.attachOption, { borderBottomColor: border }]}
                    onPress={item.onPress}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.attachOptionIcon}>{item.icon}</Text>
                    <Text style={[styles.attachOptionLabel, { color: textPri }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={textMut} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.attachCancel, { backgroundColor: cardAlt }]}
                  onPress={() => setShowAttach(false)}
                >
                  <Text style={[styles.attachCancelTxt, { color: textMut }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: cardAlt }]} onPress={onBack} activeOpacity={0.75}>
          <Text style={[styles.backArrow, { color: textPri }]}>‹</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: accent }]}>
          <Text style={styles.headerAvatarText}>{course.title.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textPri }]} numberOfLines={1}>
            {course.title} — Class Room
          </Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.tagPill, { backgroundColor: accent + '22' }]}>
              <Text style={[styles.tagPillText, { color: accent }]}>ALL DIVISIONS</Text>
            </View>
            <Text style={[styles.headerSub, { color: textMut }]}>Year {course.year}</Text>
          </View>
        </View>
        {onThemeToggle && (
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: cardAlt }]} onPress={onThemeToggle} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>{C?.moonIcon ?? '🌙'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subject banner */}
      <View style={[styles.subjectBanner, { backgroundColor: cardAlt, borderBottomColor: border }]}>
        <Text style={{ fontSize: 16 }}>🏫</Text>
        <Text style={[styles.subjectBannerText, { color: textPri }]}>
          {course.title} · Year {course.year} · All Divisions
        </Text>
        <View style={[styles.sharedPill, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
          <Text style={[styles.sharedPillText, { color: accent }]}>Shared Room</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => strId(item.id)}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading
              ? <View style={styles.emptyState}><ActivityIndicator color={accent} /></View>
              : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={[styles.emptyTitle, { color: textPri }]}>Class room is quiet</Text>
                  <Text style={[styles.emptySubtitle, { color: textMut }]}>Be the first to ask about {course.title}!</Text>
                </View>
              )
          }
          renderItem={({ item }) => (
            <MessageBubble msg={item} currentUserId={currentUserId} C={C} onLongPress={handleLongPress} />
          )}
        />

        {messages.length === 0 && !isLoading && (
          <View style={styles.suggestionsRow}>
            <Suggestions course={course} onSelect={(t) => setInputText(t)} C={C} />
          </View>
        )}

        {pendingFile && (
          <View style={[styles.pendingFileRow, { backgroundColor: cardBg, borderTopColor: border }]}>
            <PendingFileChip file={pendingFile} onRemove={() => setPendingFile(null)} C={C} />
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: cardBg, borderTopColor: border }]}>
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: cardAlt }]}
            onPress={() => setShowAttach(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="attach" size={20} color={accent} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, { backgroundColor: cardAlt, borderColor: border, color: textPri }]}
            placeholder="Ask the class something…"
            placeholderTextColor={textMut}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={isLaptop ? handleSend : undefined}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? accent : cardAlt }]}
            onPress={handleSend}
            activeOpacity={0.75}
            disabled={!canSend}
          >
            {isSending
              ? <ActivityIndicator size="small" color={canSend ? '#fff' : textMut} />
              : <Ionicons name="send" size={16} color={canSend ? '#fff' : textMut} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '700' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tagPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  headerSub: { fontSize: 11 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  subjectBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  subjectBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  sharedPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sharedPillText: { fontSize: 10, fontWeight: '700' },
  messagesList: { padding: isLaptop ? 24 : 16, paddingBottom: 8, alignSelf: isLaptop ? 'center' : undefined, width: isLaptop ? Math.min(width * 0.75, 900) : undefined },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarOwn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bubble: { maxWidth: BUBBLE_MAX, borderRadius: 16, padding: 12, paddingBottom: 8 },
  bubbleOther: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleOwn: { borderBottomRightRadius: 4 },
  senderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  senderName: { fontSize: 11, fontWeight: '700' },
  divBadge: { backgroundColor: 'rgba(59,130,246,0.18)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  divBadgeText: { fontSize: 9, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.4 },
  teacherBadge: { backgroundColor: '#F59E0B22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  teacherBadgeText: { fontSize: 9, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  longPressHint: { fontSize: 9, marginTop: 3, marginRight: 44, opacity: 0.5 },
  imagePreview: { width: BUBBLE_MAX - 28, height: (BUBBLE_MAX - 28) * 0.65, borderRadius: 10, marginTop: 6, backgroundColor: '#00000020' },
  docPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, marginTop: 6 },
  docIconTxt: { fontSize: 28 },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  docSize: { fontSize: 11, marginTop: 2 },
  pendingFileRow: { paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1 },
  pendingChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  pendingThumb: { width: 36, height: 36, borderRadius: 8 },
  pendingName: { flex: 1, fontSize: 12, fontWeight: '600' },
  suggestionsRow: { paddingBottom: 8 },
  suggestionsList: { paddingHorizontal: 16, gap: 8 },
  suggestionChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 240 },
  suggestionText: { fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 8, alignSelf: isLaptop ? 'center' : undefined, width: isLaptop ? Math.min(width * 0.75, 900) : undefined },
  attachBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  textInput: { flex: 1, borderRadius: 20, borderWidth: 1, fontSize: 14, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  attachSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  attachHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  attachTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 },
  attachOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
  attachOptionIcon: { fontSize: 22 },
  attachOptionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  attachCancel: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  attachCancelTxt: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: 'center' },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  msgPreviewBox: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 22 },
  msgPreviewTxt: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  modalBtnTxt: { fontSize: 15, fontWeight: '700' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14, gap: 5, marginBottom: 14 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },
});