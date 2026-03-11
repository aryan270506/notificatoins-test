import React, { useState, useRef, useEffect } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

const API_BASE = axiosInstance.defaults.baseURL;

// ─── tiny helper: always compare IDs as strings ──────────────────────────────
const strId = (id) => (id ? String(id) : '');

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────────────────────────────────────
const TypingIndicator = ({ C }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={[styles.typingBubble, { backgroundColor: C.card, borderColor: C.border }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { backgroundColor: C.accent, transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Delete Message Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteMsgModal = ({ visible, msgText, onConfirm, onCancel, C }) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 100 }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacAnim.setValue(0);
    }
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
        <Animated.View style={[styles.modalOverlay, { opacity: opacAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalCard, { backgroundColor: bg, borderColor: border }, { transform: [{ scale: scaleAnim }] }]}>

              <View style={styles.modalIconCircle}>
                <Text style={{ fontSize: 28 }}>🗑️</Text>
              </View>

              <Text style={[styles.modalTitle, { color: textPri }]}>Delete Message?</Text>
              <Text style={[styles.modalSub, { color: textMut }]}>
                This message will be permanently removed from the thread.
              </Text>

              {/* Message preview */}
              <View style={[styles.msgPreviewBox, { backgroundColor: cardAlt, borderColor: '#EF444440' }]}>
                <Text style={[styles.msgPreviewTxt, { color: textMut }]} numberOfLines={4}>
                  "{msgText}"
                </Text>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderWidth: 1, borderColor: border }]}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnTxt, { color: textMut }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnRed]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
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

// ─────────────────────────────────────────────────────────────────────────────
// Delete Entire Doubt Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteDoubtModal = ({ visible, doubtTitle, messageCount, onConfirm, onCancel, C }) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacAnim.setValue(0);
    }
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
        <Animated.View style={[styles.modalOverlay, { opacity: opacAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalCard, { backgroundColor: bg, borderColor: border }, { transform: [{ scale: scaleAnim }] }]}>

              <View style={styles.modalIconCircle}>
                <Text style={{ fontSize: 28 }}>🗑️</Text>
              </View>

              <Text style={[styles.modalTitle, { color: textPri }]}>Delete Entire Doubt?</Text>
              <Text style={[styles.modalSub, { color: textMut }]}>
                This will permanently delete this doubt and all {messageCount} message{messageCount !== 1 ? 's' : ''}. This cannot be undone.
              </Text>

              <View style={[styles.msgPreviewBox, { backgroundColor: cardAlt, borderColor: '#EF444440' }]}>
                <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 4 }}>📋</Text>
                <Text style={[styles.msgPreviewTxt, { color: textMut }]} numberOfLines={2}>{doubtTitle}</Text>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderWidth: 1, borderColor: border }]}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnTxt, { color: textMut }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnRed]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
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

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// • Tap  → shows Delete / Cancel bar below bubble
// • Tap Delete → opens confirm modal
// • Only student messages are tappable for delete
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble = ({
  msg,
  instructorColor,
  instructorInitials,
  C,
  selectedMsgId,
  onTap,
  onDeletePress,
  onDismiss,
}) => {
  const isStudent  = msg.sender === 'student';
  const isSelected = strId(selectedMsgId) === strId(msg.id);   // ← string compare

  const barOpac  = useRef(new Animated.Value(0)).current;
  const barSlide = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(barOpac,  { toValue: isSelected ? 1 : 0, duration: 160, useNativeDriver: true }),
      Animated.spring(barSlide, { toValue: isSelected ? 0 : -8, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [isSelected]);

  return (
    <View style={{ marginBottom: 14, alignItems: isStudent ? 'flex-end' : 'flex-start' }}>

      {/* Bubble row */}
      <TouchableOpacity
        activeOpacity={isStudent ? 0.75 : 1}
        onPress={() => isStudent && onTap(strId(msg.id))}   // ← always pass string
        style={[styles.messageRow, isStudent ? styles.messageRowRight : styles.messageRowLeft]}
      >
        {!isStudent && (
          <View style={[styles.msgAvatar, { backgroundColor: instructorColor }]}>
            <Text style={styles.msgAvatarText}>{instructorInitials}</Text>
          </View>
        )}

        <View style={[
          styles.bubble,
          isStudent
            ? [styles.bubbleStudent, { backgroundColor: isSelected ? '#C0392B' : C.accent }]
            : [styles.bubbleInstructor, { backgroundColor: C.card, borderColor: C.border }],
        ]}>
          <Text style={[styles.bubbleText, { color: isStudent ? '#FFF' : C.textPrimary }]}>
            {msg.text}
          </Text>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, { color: isStudent ? 'rgba(255,255,255,0.6)' : C.textMuted }]}>
              {msg.time}
            </Text>
            {isStudent && isSelected && (
              <Text style={styles.bubbleHint}> · tap Delete below</Text>
            )}
          </View>
        </View>

        {isStudent && (
          <View style={[styles.msgAvatarStudent, { backgroundColor: C.accent }]}>
            <Text style={styles.msgAvatarText}>ME</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Animated Delete/Cancel bar ── */}
      {isStudent && (
        <Animated.View
          style={[
            styles.deleteBar,
            { opacity: barOpac, transform: [{ translateY: barSlide }] },
          ]}
          pointerEvents={isSelected ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.deleteBarDeleteBtn}
            onPress={() => onDeletePress(msg)}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBarDeleteIcon}>🗑️</Text>
            <Text style={styles.deleteBarDeleteTxt}>Delete</Text>
          </TouchableOpacity>

          <View style={[styles.deleteBarDivider, { backgroundColor: C.border ?? '#1E3A5F' }]} />

          <TouchableOpacity
            style={styles.deleteBarCancelBtn}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={[styles.deleteBarCancelTxt, { color: C.textMuted ?? '#94A3B8' }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion chips
// ─────────────────────────────────────────────────────────────────────────────
function ScrollSuggestions({ course, onSelect, C }) {
  const suggestions = [
    `Can you explain the core concepts of ${course?.title}?`,
    'Can you recommend resources to understand this better?',
    'What are common mistakes students make here?',
    'Can you give me a simple example?',
  ];
  return (
    <FlatList
      horizontal
      data={suggestions}
      keyExtractor={(_, i) => String(i)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.suggestionsList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.suggestionChip, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => onSelect(item)}
          activeOpacity={0.75}
        >
          <Text style={[styles.suggestionText, { color: C.textMuted }]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ChatScreen
// ─────────────────────────────────────────────────────────────────────────────
export default function DoubtChatScreen({ course, inquiry, mode, onBack, C, onThemeToggle, user }) {
  const flatListRef = useRef(null);

  const [messages, setMessages]               = useState([]);
  const [inputText, setInputText]             = useState('');
  const [isTyping, setIsTyping]               = useState(false);
  const [attachMenuOpen, setAttachMenuOpen]   = useState(false);
  const [isSending, setIsSending]             = useState(false);
  const [isDeletingDoubt, setIsDeletingDoubt] = useState(false);

  // selected message ID — always stored as a plain string
  const [selectedMsgId, setSelectedMsgId]     = useState(null);

  // confirm-delete-message modal
  const [deleteMsgModal, setDeleteMsgModal]   = useState({ visible: false, msg: null });

  // confirm-delete-entire-doubt modal
  const [deleteDoubtModal, setDeleteDoubtModal] = useState(false);

  const doubtIdRef = useRef(inquiry?._id ? strId(inquiry._id) : null);

  const instructorColor    = course?.instructorColor    || (C?.accent ?? '#4F8EF7');
  const instructorInitials = course?.instructorInitials || 'IN';

  // ── Load existing messages ─────────────────────────────────────────────────
  useEffect(() => {
    // Always reload messages after refresh if inquiry._id is available
    if (inquiry?._id) {
      axiosInstance.get(`/doubts/${strId(inquiry._id)}`)
        .then(res => {
          const data = res.data;
          if (data.success && data.doubt?.messages) {
            setMessages(
              data.doubt.messages.map((m) => ({
                id:     strId(m._id),   // ← always string
                sender: m.sender,
                text:   m.text,
                time:   new Date(m.createdAt || m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
            );
          }
        })
        .catch(err => console.log('Failed to load messages:', err));
    }
  }, [inquiry]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
  const text = inputText.trim();
  if (!text || isSending) return;

  setSelectedMsgId(null);

  const tempId = `tmp_${Date.now()}`;
  const optimisticMsg = {
    id:     tempId,
    sender: 'student',
    text,
    time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  setMessages(prev => [...prev, optimisticMsg]);
  setInputText('');
  setIsSending(true);

  try {
    if (!doubtIdRef.current) {
      // ── CREATE new doubt ────────────────────────────────────────────────
      const studentId = user?._id || user?.id;
      const res = await axiosInstance.post('/doubts', {
        studentId,
        subject:     course?.title || 'General',
        teacherId:   course?.teacherId || null,
        title:       text.substring(0, 80),
        messageText: text,
      });
      const data = res.data;
      if (data.success && data.doubt?._id) {
        doubtIdRef.current = strId(data.doubt._id);
        // ✅ Reload from server so messages are confirmed persisted
        await loadMessages(doubtIdRef.current);
        console.log('[DoubtChatScreen] Created new doubt and loaded messages:', data.doubt.messages);
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', 'Could not save your doubt. Please try again.');
      }
    } else {
      // ── ADD message to existing doubt ───────────────────────────────────
      const studentId = user?._id || user?.id;
      const res = await axiosInstance.post(`/doubts/${doubtIdRef.current}/messages`, {
        sender:   'student',
        senderId: studentId,
        text,
      });
      const data = res.data;
      if (data.success) {
        // ✅ Reload from server to confirm persistence
        await loadMessages(doubtIdRef.current);
        console.log('[DoubtChatScreen] Sent message and loaded messages:', data.doubt.messages);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', 'Could not send message. Please try again.');
      }
    }
    // Force reload messages after sending
    if (doubtIdRef.current) {
      setTimeout(() => loadMessages(doubtIdRef.current), 300);
    }
  } catch (err) {
    console.error('Network error:', err);
    // Remove optimistic message on network failure
    setMessages(prev => prev.filter(m => m.id !== tempId));
    Alert.alert('Network Error', 'Could not reach the server.');
  } finally {
    setIsSending(false);
  }
};

  // ─────────────────────────────────────────────────────────────────────────
  // TAP on student bubble → toggle selected ID (stored as string)
  // ─────────────────────────────────────────────────────────────────────────
  const handleBubbleTap = (msgId) => {
    setSelectedMsgId(prev => (prev === msgId ? null : msgId));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // "Delete" tapped in the action bar → open confirm modal
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteBarPress = (msg) => {
    setSelectedMsgId(null);
    setDeleteMsgModal({ visible: true, msg });
  };

  const loadMessages = async (doubtId) => {
  try {
    const res = await axiosInstance.get(`/doubts/${doubtId}`);
    const data = res.data;
    if (data.success && data.doubt?.messages) {
      setMessages(
        data.doubt.messages.map((m) => ({
          id:     strId(m._id),
          sender: m.sender,
          text:   m.text,
          time:   new Date(m.createdAt || m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      );
    }
  } catch (err) {
    console.log('Failed to reload messages:', err);
  }
};


  // ─────────────────────────────────────────────────────────────────────────
  // Confirmed: delete message from UI first, then MongoDB
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteMsgConfirmed = async () => {
    const msg = deleteMsgModal.msg;
    setDeleteMsgModal({ visible: false, msg: null });
    if (!msg) return;

    const msgId   = strId(msg.id);
    const doubtId = doubtIdRef.current;

    // ── 1. Remove from UI immediately ──────────────────────────────────────
    setMessages(prev => prev.filter(m => strId(m.id) !== msgId));

    // ── 2. Skip API if message was never saved (temp ID) ───────────────────
    if (!doubtId || msgId.startsWith('tmp_')) return;

    // ── 3. Delete from MongoDB ─────────────────────────────────────────────
    try {
      const res = await axiosInstance.delete(`/doubts/${doubtId}/messages/${msgId}`);
      const data = res.data;

      if (!data.success) {
        // Restore the message if server rejected
        setMessages(prev => {
          const restored = [...prev, { ...msg, id: msgId }];
          restored.sort((a, b) => (strId(a.id) > strId(b.id) ? 1 : -1));
          return restored;
        });
        Alert.alert('Error', data.error || 'Could not delete the message. Please try again.');
      } else {
        console.log('✅ Message deleted successfully from backend');
      }
    } catch (err) {
      // Restore the message on network error or any error
      console.error('Delete message error:', err);
      setMessages(prev => {
        const restored = [...prev, { ...msg, id: msgId }];
        restored.sort((a, b) => (strId(a.id) > strId(b.id) ? 1 : -1));
        return restored;
      });
      Alert.alert('Error', err.message || 'Could not delete the message. Please try again.');
    }
  };

  const handleDeleteMsgCancel  = () => setDeleteMsgModal({ visible: false, msg: null });
  const handleDismissSelection = () => setSelectedMsgId(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Delete entire doubt (header 🗑 button)
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteDoubtPress = () => {
    setSelectedMsgId(null);
    setDeleteDoubtModal(true);
  };

  const handleDeleteDoubtConfirmed = async () => {
    setDeleteDoubtModal(false);
    const doubtId = doubtIdRef.current;
    if (!doubtId) { onBack(); return; }

    setIsDeletingDoubt(true);
    try {
      const res = await axiosInstance.delete(`/doubts/${doubtId}`);
      const data = res.data;
      if (data.success) {
        doubtIdRef.current = null;
        setMessages([]);
        console.log('✅ Doubt deleted successfully from backend');
        onBack();
      } else {
        Alert.alert('Error', data.error || 'Could not delete the doubt. Please try again.');
      }
    } catch (err) {
      console.error('Delete doubt error:', err);
      Alert.alert('Error', err.message || 'Could not delete the doubt. Please try again.');
    } finally {
      setIsDeletingDoubt(false);
    }
  };

  const handleDeleteDoubtCancel = () => setDeleteDoubtModal(false);

  const chatTitle = inquiry ? inquiry.title : `New Doubt — ${course?.title}`;

  // Colours
  const bg      = C?.bg          ?? '#0A1628';
  const cardBg  = C?.card        ?? '#0D1F36';
  const cardAlt = C?.cardAlt     ?? '#112240';
  const border  = C?.border      ?? '#1E3A5F';
  const textPri = C?.textPrimary ?? '#F1F5F9';
  const textMut = C?.textMuted   ?? '#94A3B8';
  const accent  = C?.accent      ?? '#4F8EF7';

  return (
    <TouchableWithoutFeedback onPress={handleDismissSelection}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>

        {/* ── Confirm Delete Message Modal ── */}
        <DeleteMsgModal
          visible={deleteMsgModal.visible}
          msgText={deleteMsgModal.msg?.text ?? ''}
          onConfirm={handleDeleteMsgConfirmed}
          onCancel={handleDeleteMsgCancel}
          C={C}
        />

        {/* ── Confirm Delete Entire Doubt Modal ── */}
        <DeleteDoubtModal
          visible={deleteDoubtModal}
          doubtTitle={chatTitle}
          messageCount={messages.length}
          onConfirm={handleDeleteDoubtConfirmed}
          onCancel={handleDeleteDoubtCancel}
          C={C}
        />

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: cardAlt }]}
            onPress={onBack}
            activeOpacity={0.75}
          >
            <Text style={[styles.backArrow, { color: textPri }]}>‹</Text>
          </TouchableOpacity>

          <View style={[styles.headerAvatar, { backgroundColor: instructorColor, borderColor: border }]}>
            <Text style={styles.headerAvatarText}>{instructorInitials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: textPri }]} numberOfLines={1}>{chatTitle}</Text>
            <View style={styles.headerSubRow}>
              <View style={[styles.tagPill, { backgroundColor: accent + '22' }]}>
                <Text style={[styles.tagPillText, { color: accent }]}>{course?.tag || 'SUBJECT'}</Text>
              </View>
              <Text style={[styles.headerCourse, { color: textMut }]}>{course?.title}</Text>
            </View>
          </View>

          {/* 🗑 Delete entire doubt */}
          <TouchableOpacity
            style={[styles.headerDeleteBtn, { backgroundColor: '#EF444420', borderColor: '#EF444455' }]}
            onPress={handleDeleteDoubtPress}
            activeOpacity={0.75}
            disabled={isDeletingDoubt}
          >
            <Text style={{ fontSize: 17 }}>{isDeletingDoubt ? '⏳' : '🗑️'}</Text>
          </TouchableOpacity>

          {onThemeToggle && (
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: cardAlt }]}
              onPress={onThemeToggle}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{C?.moonIcon ?? '🌙'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Subject banner ── */}
        {course && (
          <View style={[styles.subjectBanner, { backgroundColor: cardAlt, borderBottomColor: border }]}>
            <Text style={{ fontSize: 16 }}>📚</Text>
            <Text style={[styles.subjectBannerText, { color: textPri }]}>Subject: {course.title}</Text>
            <View style={[styles.statusPill, { backgroundColor: accent + '22' }]}>
              <Text style={[styles.statusPillText, { color: accent }]}>OPEN</Text>
            </View>
          </View>
        )}

        {/* ── Hint bar ── */}
        <View style={[styles.hintBar, { backgroundColor: '#EF444411', borderBottomColor: '#EF444430' }]}>
          <Text style={[styles.hintText, { color: '#EF9999' }]}>
            💡 Tap your message to delete it
          </Text>
        </View>

        {/* ── Messages + Input ── */}
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={[styles.emptyTitle, { color: textPri }]}>Start the conversation</Text>
                <Text style={[styles.emptySubtitle, { color: textMut }]}>
                  Ask {course?.instructor || 'your instructor'} anything about {course?.title}.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                instructorColor={instructorColor}
                instructorInitials={instructorInitials}
                C={C}
                selectedMsgId={selectedMsgId}
                onTap={handleBubbleTap}
                onDeletePress={handleDeleteBarPress}
                onDismiss={handleDismissSelection}
              />
            )}
            ListFooterComponent={
              isTyping ? (
                <View style={styles.messageRowLeft}>
                  <View style={[styles.msgAvatar, { backgroundColor: instructorColor }]}>
                    <Text style={styles.msgAvatarText}>{instructorInitials}</Text>
                  </View>
                  <TypingIndicator C={C} />
                </View>
              ) : null
            }
          />

          {messages.length === 0 && (
            <View style={styles.suggestionsRow}>
              <ScrollSuggestions course={course} onSelect={(t) => setInputText(t)} C={C} />
            </View>
          )}

          {/* ── Input bar ── */}
          <View style={[styles.inputBar, { backgroundColor: cardBg, borderTopColor: border }]}>
            <TouchableOpacity
              style={[styles.attachBtn, { backgroundColor: cardAlt }]}
              onPress={() => setAttachMenuOpen(!attachMenuOpen)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20, color: textMut }}>＋</Text>
            </TouchableOpacity>

            {attachMenuOpen && (
              <View style={[styles.attachMenu, { backgroundColor: cardBg, borderColor: border }]}>
                {['📷 Photo', '📄 File', '🖼 Image', '🔗 Link'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.attachMenuItem}
                    onPress={() => setAttachMenuOpen(false)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.attachMenuText, { color: textPri }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.textInput, { backgroundColor: cardAlt, borderColor: border, color: textPri }]}
              placeholder={`Ask ${course?.instructor?.split(' ')[1] || 'instructor'} something…`}
              placeholderTextColor={textMut}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={isLaptop ? handleSend : undefined}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: accent },
                (!inputText.trim() || isSending) && [styles.sendBtnDisabled, { backgroundColor: cardAlt }],
              ]}
              onPress={handleSend}
              activeOpacity={0.75}
              disabled={!inputText.trim() || isSending}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const BUBBLE_MAX = isLaptop ? width * 0.45 : width * 0.72;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex:     { flex: 1 },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  backArrow:        { fontSize: 18, fontWeight: '700' },
  headerAvatar:     { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  headerAvatarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  headerInfo:       { flex: 1 },
  headerTitle:      { fontSize: 14, fontWeight: '700' },
  headerSubRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tagPill:          { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagPillText:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  headerCourse:     { fontSize: 11 },
  headerIconBtn:    { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  headerDeleteBtn:  { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  // Subject banner
  subjectBanner:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  subjectBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  statusPill:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Hint bar
  hintBar:  { paddingVertical: 5, paddingHorizontal: 16, borderBottomWidth: 1 },
  hintText: { fontSize: 11, textAlign: 'center' },

  // Messages list
  messagesList:  { padding: isLaptop ? 24 : 16, paddingBottom: 8, alignSelf: isLaptop ? 'center' : undefined, width: isLaptop ? Math.min(width * 0.75, 900) : undefined },
  emptyState:    { alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 32 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Bubble rows
  messageRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowLeft:  { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },

  msgAvatar:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarStudent: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarText:    { color: '#fff', fontSize: 10, fontWeight: '800' },

  bubble:           { maxWidth: BUBBLE_MAX, borderRadius: 16, padding: 12, paddingBottom: 8 },
  bubbleInstructor: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleStudent:    { borderBottomRightRadius: 4 },
  bubbleText:       { fontSize: 14, lineHeight: 20 },
  bubbleFooter:     { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  bubbleTime:       { fontSize: 10 },
  bubbleHint:       { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' },

  // Delete action bar (slides in below selected bubble)
  deleteBar: {
    flexDirection:   'row',
    alignItems:      'center',
    marginTop:       6,
    marginRight:     40,
    borderRadius:    12,
    overflow:        'hidden',
    backgroundColor: '#1A0A0A',
    borderWidth:     1,
    borderColor:     '#EF444466',
    alignSelf:       'flex-end',
    shadowColor:     '#EF4444',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    6,
    elevation:       6,
  },
  deleteBarDeleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11 },
  deleteBarDeleteIcon: { fontSize: 15 },
  deleteBarDeleteTxt:  { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  deleteBarDivider:    { width: 1, height: 32 },
  deleteBarCancelBtn:  { paddingHorizontal: 18, paddingVertical: 11 },
  deleteBarCancelTxt:  { fontSize: 14, fontWeight: '600' },

  // Typing indicator
  typingBubble: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14, gap: 5, marginBottom: 14 },
  typingDot:    { width: 7, height: 7, borderRadius: 3.5 },

  // Suggestions
  suggestionsRow:  { paddingBottom: 8 },
  suggestionsList: { paddingHorizontal: 16, gap: 8 },
  suggestionChip:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 240 },
  suggestionText:  { fontSize: 12 },

  // Input bar
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 8, alignSelf: isLaptop ? 'center' : undefined, width: isLaptop ? Math.min(width * 0.75, 900) : undefined },
  attachBtn:       { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  attachMenu:      { position: 'absolute', bottom: 60, left: 12, borderRadius: 12, borderWidth: 1, overflow: 'hidden', zIndex: 999 },
  attachMenuItem:  { paddingHorizontal: 20, paddingVertical: 12 },
  attachMenuText:  { fontSize: 14 },
  textInput:       { flex: 1, borderRadius: 20, borderWidth: 1, fontSize: 14, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100 },
  sendBtn:         { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sendBtnDisabled: {},
  sendIcon:        { color: '#fff', fontSize: 16, marginLeft: 2 },

  // Modals
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard:       { width: '100%', maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 24, alignItems: 'center' },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle:      { fontSize: 19, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  modalSub:        { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  msgPreviewBox:   { width: '100%', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 22 },
  msgPreviewTxt:   { fontSize: 13, lineHeight: 19, fontStyle: 'italic', textAlign: 'center' },
  modalBtnRow:     { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn:        { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  modalBtnRed:     { backgroundColor: '#EF4444' },
  modalBtnTxt:     { fontSize: 15, fontWeight: '700' },
});