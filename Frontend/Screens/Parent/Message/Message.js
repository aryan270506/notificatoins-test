import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axiosInstance from '../../../Src/Axios';
import { useTheme } from '../Dashboard/Dashboard';

const SERVER_BASE = axiosInstance.defaults.baseURL.replace(/\/api\/?$/, '');
const API_BASE_URL = SERVER_BASE;

async function uploadFile(uri, fileName, mimeType) {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    formData.append('file', blob, fileName);
  } else {
    formData.append('file', { uri, type: mimeType || 'application/octet-stream', name: fileName });
  }
  const response = await fetch(`${API_BASE_URL}/api/messages/upload-attachment`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Upload failed');
  return data.data;
}

const showAlert = (title, msg) => {
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
};

const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ uri, size = 40 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#23263a' }}>
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      defaultSource={{ uri: 'https://i.pravatar.cc/40?img=1' }}
    />
  </View>
);

// ─── Delete Popup ─────────────────────────────────────────────────────────────
const DeletePopup = ({ visible, position, isMe, onDelete, onCancel, C }) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={popupStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[
              popupStyles.popup,
              {
                backgroundColor: C.mode === 'dark' ? '#0f1e30' : '#ffffff',
                borderColor: C.cardBorder,
              }
            ]}>
              <Text style={[popupStyles.title, { color: C.white }]}>Delete Message?</Text>
              <Text style={[popupStyles.subtitle, { color: C.sub }]}>
                This message will be removed from the chat.
              </Text>
              <View style={popupStyles.actions}>
                <TouchableOpacity
                  style={[popupStyles.cancelBtn, { borderColor: C.cardBorder }]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[popupStyles.cancelTxt, { color: C.sub }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={popupStyles.deleteBtn}
                  onPress={onDelete}
                  activeOpacity={0.7}
                >
                  <Text style={popupStyles.deleteTxt}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const popupStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  popup:      { width: 280, borderRadius: 16, padding: 22, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 16 },
  title:      { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  subtitle:   { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  actions:    { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '600' },
  deleteBtn:  { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  deleteTxt:  { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ message, isTablet, width, C, s, onLongPress }) => {
  const { sender, time, text, isMe, avatar } = message;
  const maxBubbleWidth = isTablet ? 520 : width * 0.72;

  const AttachmentView = () => {
    if (!message.attachmentUrl) return null;
    const fullUrl = `${SERVER_BASE}${message.attachmentUrl}`;
    const handlePress = () => {
      if (Platform.OS === 'web') window.open(fullUrl, '_blank');
      else Linking.openURL(fullUrl).catch(err => console.error('Open error:', err));
    };
    if (message.messageType === 'image') {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => message.onImagePress && message.onImagePress(fullUrl, message.attachmentName)} style={{ marginTop: 6 }}>
          <Image source={{ uri: fullUrl }} style={{ width: '100%', height: 180, borderRadius: 8 }} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (message.messageType === 'document') {
      return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: C.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isMe ? '#fff' : C.white }} numberOfLines={1}>{message.attachmentName || 'Document'}</Text>
            {message.attachmentSize ? <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : C.sub, marginTop: 2 }}>{message.attachmentSize}</Text> : null}
          </View>
          <Text style={{ fontSize: 18, color: isMe ? '#fff' : C.blue }}>⬇</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  if (isMe) {
    return (
      <TouchableWithoutFeedback onLongPress={() => onLongPress(message.id)}>
        <View style={s.myMessageRow}>
          <View style={s.myMeta}>
            <Text style={s.myTime}>{time}</Text>
            <Text style={s.myName}>Me</Text>
          </View>
          <View style={[s.myBubble, { maxWidth: maxBubbleWidth }]}>
            <Text style={s.myBubbleText}>{text}</Text>
            <AttachmentView />
          </View>
          <Avatar uri={avatar} size={isTablet ? 44 : 38} />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <TouchableWithoutFeedback onLongPress={() => onLongPress(message.id)}>
      <View style={s.theirMessageRow}>
        <Avatar uri={avatar} size={isTablet ? 44 : 38} />
        <View style={s.theirContent}>
          <View style={s.theirHeader}>
            <Text style={s.senderName}>{sender}</Text>
            <Text style={s.messageTime}>{time}</Text>
          </View>
          <View style={[s.theirBubble, { maxWidth: maxBubbleWidth }]}>
            <Text style={s.theirBubbleText}>{text}</Text>
            <AttachmentView />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = ({ s }) => (
  <View style={s.typingRow}>
    <View style={s.typingDots}>
 
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Message() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const s = makeStyles(C, isTablet, width);
  const flatListRef = useRef(null);

  const [inputText, setInputText]         = useState('');
  const [messages, setMessages]           = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [fullImg, setFullImg]             = useState(null);
  const [showAttach, setShowAttach]       = useState(false);
  const [attachment, setAttachment]       = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [parentId, setParentId]           = useState(null);
  const [parentName, setParentName]       = useState('Parent');
  const [parentYear, setParentYear]       = useState(null);
  const [parentDivision, setParentDivision] = useState(null);

  // ── Fetch messages helper ──────────────────────────────────────────────
  const fetchMessages = useCallback(async (yr, div, pid) => {
    try {
      const { data: res } = await axiosInstance.get('/messages/filter/by-recipient', {
        params: { recipientRole: 'parent', academicYear: yr, division: div },
      });
      if (res.success) {
        const mapped = res.data
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map(m => ({
            id: m.messageId,
            sender: m.senderName || m.senderRole,
            time: fmtTime(m.timestamp),
            text: m.content,
            isMe: m.senderId === pid,
            avatar: m.senderId === pid
              ? 'https://i.pravatar.cc/40?img=33'
              : 'https://i.pravatar.cc/40?img=1',
            messageType: m.messageType || 'text',
            attachmentUrl: m.attachmentUrl || null,
            attachmentName: m.attachmentName || null,
            attachmentSize: m.attachmentSize || null,
          }));
        setMessages(mapped);
      }
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
  }, []);

  // ── Init: load parent profile then fetch messages ──────────────────────
  useEffect(() => {
    (async () => {
      try {
        const id   = await AsyncStorage.getItem('parentId');
        const name = await AsyncStorage.getItem('userName');
        if (!id) { setLoading(false); return; }

        setParentId(id);
        setParentName(name || 'Parent');

        const { data: info } = await axiosInstance.get(`/parents/child-info/${id}`);
        const yr  = String(info.student?.year  || '1');
        const div = info.student?.division     || 'A';
        setParentYear(yr);
        setParentDivision(div);

        await fetchMessages(yr, div, id);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Poll for new messages every 10 s ───────────────────────────────────
  useEffect(() => {
    if (!parentYear || !parentDivision || !parentId) return;
    const iv = setInterval(
      () => fetchMessages(parentYear, parentDivision, parentId),
      10000,
    );
    return () => clearInterval(iv);
  }, [parentYear, parentDivision, parentId, fetchMessages]);

  // ── Long-press / delete ────────────────────────────────────────────────
  const handleLongPress = (id) => {
    const msg = messages.find(m => m.id === id);
    if (!msg || !msg.isMe) return;          // only allow deleting own messages
    setSelectedId(id);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    const idToDelete = selectedId;
    setDeleteVisible(false);
    setSelectedId(null);
    setMessages(prev => prev.filter(m => m.id !== idToDelete));
    try {
      await axiosInstance.delete(`/messages/${idToDelete}`);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleCancelDelete = () => {
    setDeleteVisible(false);
    setSelectedId(null);
  };

  // ── Pick Image ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    setShowAttach(false);
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { showAlert('Permission', 'Media library access is required.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      setAttachment({ uri: asset.uri, name: fileName, type: asset.mimeType || 'image/jpeg', kind: 'image' });
    }
  };

  // ── Pick Document ──────────────────────────────────────────────────────
  const pickDocument = async () => {
    setShowAttach(false);
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    const asset = res.assets?.[0] || (res.type !== 'cancel' ? res : null);
    if (asset?.name) {
      setAttachment({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream', kind: 'document', size: asset.size });
    }
  };

  // ── Remove attachment preview ──────────────────────────────────────────
  const removeAttachment = () => setAttachment(null);

  // ── Send ───────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if ((!inputText.trim() && !attachment) || !parentId) return;
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const text  = inputText.trim() || (attachment ? attachment.name : '');
    const currentAttachment = attachment;
    setInputText('');
    setAttachment(null);

    // optimistic UI
    const optimistic = {
      id: msgId,
      sender: 'Me',
      time: fmtTime(new Date()),
      text,
      isMe: true,
      avatar: 'https://i.pravatar.cc/40?img=33',
      messageType: currentAttachment ? currentAttachment.kind : 'text',
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      let attachmentUrl = null, attachmentName = null, attachmentSize = null;
      let messageType = 'text';

      if (currentAttachment) {
        setUploading(true);
        const uploaded = await uploadFile(currentAttachment.uri, currentAttachment.name, currentAttachment.type);
        attachmentUrl  = uploaded.url;
        attachmentName = uploaded.name;
        attachmentSize = currentAttachment.size ? `${(currentAttachment.size / 1024).toFixed(0)} KB` : uploaded.size;
        messageType    = currentAttachment.kind === 'image' ? 'image' : 'document';
        setUploading(false);
      }

      await axiosInstance.post('/messages/save', {
        messageId:     msgId,
        content:       text,
        messageType,
        senderId:      parentId,
        senderName:    parentName,
        senderRole:    'parent',
        recipientRole: 'parent',
        academicYear:  parentYear,
        division:      parentDivision,
        attachmentUrl,
        attachmentName,
        attachmentSize,
      });

      // Update optimistic message with real attachment data
      if (currentAttachment) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, attachmentUrl, attachmentName, attachmentSize, messageType } : m));
      }
    } catch (e) {
      console.error('Send error:', e);
      setUploading(false);
      showAlert('Error', 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={{ color: C.sub, marginTop: 12 }}>Loading messages…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Delete confirmation popup */}
      <DeletePopup
        visible={deleteVisible}
        isMe={messages.find(m => m.id === selectedId)?.isMe}
        onDelete={handleDelete}
        onCancel={handleCancelDelete}
        C={C}
      />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.groupIconContainer}>
            <Text style={s.groupIconText}>👨‍👩‍👧</Text>
          </View>
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>Class of 2027 Parents</Text>
            <View style={s.headerSubRow} />
          </View>
        </View>
        <View style={s.headerActions}>
         
        </View>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={s.messageList}
          ListHeaderComponent={
            <View style={s.dateBadgeContainer}>
              <View style={s.dateBadge}>
                <Text style={s.dateBadgeText}>TODAY</Text>
              </View>
            </View>
          }
          ListFooterComponent={<TypingIndicator s={s} />}
          renderItem={({ item }) => (
            <MessageBubble
              message={{ ...item, onImagePress: (uri, name) => setFullImg({ uri, fileName: name }) }}
              isTablet={isTablet}
              width={width}
              C={C}
              s={s}
              onLongPress={handleLongPress}
            />
          )}
          showsVerticalScrollIndicator={false}
        />

        <Text style={s.encryptedLabel}>END-TO-END ENCRYPTED</Text>

        {/* Attachment Preview Pill */}
        {attachment && (
          <View style={s.attachPill}>
            <Text style={s.attachPillIcon}>{attachment.kind === 'image' ? '🖼️' : '📄'}</Text>
            <Text style={s.attachPillName} numberOfLines={1}>{attachment.name}</Text>
            <TouchableOpacity onPress={removeAttachment} activeOpacity={0.7} style={s.attachPillRemove}>
              <Text style={s.attachPillRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <View style={s.uploadingBar}>
            <ActivityIndicator size="small" color={C.blue} />
            <Text style={{ color: C.sub, fontSize: 12, marginLeft: 8 }}>Uploading…</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={s.inputBar}>
          <TouchableOpacity
            style={s.attachBtn}
            activeOpacity={0.7}
            onPress={() => setShowAttach(true)}
          >
            <Text style={s.attachBtnIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            placeholder="Message Class of 2027 Parents..."
            placeholderTextColor={C.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[s.sendBtn, (inputText.trim() || attachment) ? s.sendBtnActive : {}]}
            activeOpacity={0.8}
            onPress={sendMessage}
          >
            <Text style={s.sendBtnIcon}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* Attachment Sheet Modal */}
        <Modal transparent animationType="fade" visible={showAttach} onRequestClose={() => setShowAttach(false)}>
          <TouchableWithoutFeedback onPress={() => setShowAttach(false)}>
            <View style={s.attachOverlay}>
              <TouchableWithoutFeedback>
                <View style={s.attachSheet}>
                  <Text style={s.attachSheetTitle}>Share</Text>
                  <View style={s.attachSheetRow}>
                    <TouchableOpacity style={s.attachOption} onPress={pickImage} activeOpacity={0.7}>
                      <View style={[s.attachOptionCircle, { backgroundColor: '#4ade80' }]}>
                        <Text style={s.attachOptionIcon}>🖼️</Text>
                      </View>
                      <Text style={s.attachOptionLabel}>Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.attachOption} onPress={pickDocument} activeOpacity={0.7}>
                      <View style={[s.attachOptionCircle, { backgroundColor: '#60a5fa' }]}>
                        <Text style={s.attachOptionIcon}>📄</Text>
                      </View>
                      <Text style={s.attachOptionLabel}>Document</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>

      {/* Fullscreen Image Viewer */}
      <Modal transparent animationType="fade" visible={!!fullImg} onRequestClose={() => setFullImg(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isTablet ? 24 : 16, paddingVertical: isTablet ? 16 : 12 }}>
              <TouchableOpacity onPress={() => setFullImg(null)} activeOpacity={0.7} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 }}>✕</Text>
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: isTablet ? 15 : 13, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>{fullImg?.fileName || 'Image'}</Text>
              <TouchableOpacity onPress={() => {
                if (!fullImg?.uri) return;
                if (Platform.OS === 'web') {
                  const a = document.createElement('a'); a.href = fullImg.uri; a.download = fullImg.fileName || 'image'; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                } else {
                  Linking.openURL(fullImg.uri).catch(err => console.error('Download error:', err));
                }
              }} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 16 }}>⬇</Text>
                <Text style={{ color: '#fff', fontSize: isTablet ? 14 : 13, fontWeight: '600' }}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
          {fullImg?.uri && <Image source={{ uri: fullImg.uri }} style={{ width: isTablet ? '80%' : '95%', height: '70%', borderRadius: isTablet ? 8 : 0 }} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
function makeStyles(C, isTablet, width) {
  const bg          = C.bg;
  const surface     = C.card;
  const border      = C.cardBorder;
  const accent      = C.blue;
  const accentLight = C.blueLight;
  const textPrimary = C.white;
  const textSub     = C.sub;
  const textMuted   = C.muted;
  const myBubbleBg  = C.blue;
  const theirBubble = C.mode === 'dark' ? '#1e2130' : '#d4e4f5';
  const dateBadgeBg = C.mode === 'dark' ? '#23263a' : '#c8ddf0';
  const groupIconBg = C.mode === 'dark' ? '#1e3a5f' : '#bdd4ed';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: bg },

    // Header
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isTablet ? 24 : 16, paddingVertical: isTablet ? 14 : 12, backgroundColor: C.sidebar, borderBottomWidth: 1, borderBottomColor: border },
    headerLeft:         { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    groupIconContainer: { width: isTablet ? 48 : 42, height: isTablet ? 48 : 42, borderRadius: isTablet ? 24 : 21, backgroundColor: groupIconBg, alignItems: 'center', justifyContent: 'center' },
    groupIconText:      { fontSize: isTablet ? 22 : 18 },
    headerInfo:         { flex: 1 },
    headerTitle:        { color: textPrimary, fontWeight: '700', fontSize: isTablet ? 18 : 16, letterSpacing: 0.1 },
    headerSubRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
    headerActions:      { flexDirection: 'row', gap: 4 },
    headerBtn:          { padding: 8, borderRadius: 8 },
    headerBtnText:      { fontSize: isTablet ? 20 : 18, color: textSub },

    // Messages
    messageList:        { paddingHorizontal: isTablet ? 48 : 12, paddingTop: 16, paddingBottom: 4 },
    dateBadgeContainer: { alignItems: 'center', marginBottom: 20 },
    dateBadge:          { backgroundColor: dateBadgeBg, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
    dateBadgeText:      { color: textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },

    // Their message
    theirMessageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 10 },
    theirContent:    { flex: 1 },
    theirHeader:     { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
    senderName:      { color: textPrimary, fontWeight: '700', fontSize: isTablet ? 14 : 13 },
    messageTime:     { color: textMuted, fontSize: 11 },
    theirBubble:     { backgroundColor: theirBubble, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
    theirBubbleText: { color: textPrimary, fontSize: isTablet ? 15 : 14, lineHeight: isTablet ? 22 : 20 },

    // My message
    myMessageRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 20, gap: 10 },
    myMeta:       { alignItems: 'flex-end', gap: 2, marginBottom: 2 },
    myTime:       { color: textMuted, fontSize: 11 },
    myName:       { color: accentLight, fontSize: 11, fontWeight: '600' },
    myBubble:     { backgroundColor: myBubbleBg, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
    myBubbleText: { color: '#ffffff', fontSize: isTablet ? 15 : 14, lineHeight: isTablet ? 22 : 20 },

    // Typing indicator
    typingRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: isTablet ? 48 : 12, marginTop: 4, marginBottom: 8, gap: 8 },
    typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot:        { width: 7, height: 7, borderRadius: 3.5, backgroundColor: textMuted },

    // Encrypted label
    encryptedLabel: { textAlign: 'center', color: textMuted, fontSize: 10, letterSpacing: 1, paddingVertical: 6 },

    // Attachment preview pill
    attachPill:          { flexDirection: 'row', alignItems: 'center', marginHorizontal: isTablet ? 24 : 12, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.mode === 'dark' ? '#1e2130' : '#e8f0fe', borderRadius: 12, gap: 8 },
    attachPillIcon:      { fontSize: 18 },
    attachPillName:      { flex: 1, color: textPrimary, fontSize: 13, fontWeight: '500' },
    attachPillRemove:    { width: 24, height: 24, borderRadius: 12, backgroundColor: C.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
    attachPillRemoveText:{ color: textSub, fontSize: 13, fontWeight: '700' },
    uploadingBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },

    // Attachment button
    attachBtn:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    attachBtnIcon:   { fontSize: isTablet ? 24 : 22 },

    // Attachment sheet
    attachOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    attachSheet:        { backgroundColor: C.mode === 'dark' ? '#1a1d2e' : '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
    attachSheetTitle:   { color: textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
    attachSheetRow:     { flexDirection: 'row', justifyContent: 'center', gap: 32 },
    attachOption:       { alignItems: 'center', gap: 8 },
    attachOptionCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    attachOptionIcon:   { fontSize: 26 },
    attachOptionLabel:  { color: textSub, fontSize: 13, fontWeight: '500' },

    // Input bar
    inputBar:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: isTablet ? 24 : 12, paddingVertical: 10, backgroundColor: bg, borderTopWidth: 1, borderTopColor: border, gap: 6 },
    inputAction:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    inputActionText: { fontSize: 22, color: textSub },
    textInput:       { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: textPrimary, fontSize: isTablet ? 15 : 14, borderWidth: 1, borderColor: border },
    sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: border, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    sendBtnActive:   { backgroundColor: accent },
    sendBtnIcon:     { color: '#ffffff', fontSize: 16, marginLeft: 2 },
  });
}