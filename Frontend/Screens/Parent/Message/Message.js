import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';

const MESSAGES = [
  {
    id: '1',
    sender: 'Sarah Miller',
    time: '10:42 AM',
    text: "Does anyone know the date for the graduation ceremony? I want to make sure I book the flights for my parents early.",
    isMe: false,
    avatar: 'https://i.pravatar.cc/40?img=47',
  },
  {
    id: '2',
    sender: 'John Doe',
    time: '10:45 AM',
    text: "I think it's June 15th, but let me double check the school calendar. There was some talk about moving it to the 16th due to the venue conflict.",
    isMe: false,
    avatar: 'https://i.pravatar.cc/40?img=12',
  },
  {
    id: '3',
    sender: 'Me',
    time: '10:48 AM',
    text: "Confirmed! It is June 15th at 10:00 AM in the main auditorium. Just got the email from the principal's office. 🎓",
    isMe: true,
    avatar: 'https://i.pravatar.cc/40?img=33',
  },
  {
    id: '4',
    sender: 'Emily Chen',
    time: '10:50 AM',
    text: "Thanks for the info! Is anyone organizing a carpool for the rehearsals next week? I'm available to drive on Tuesday and Thursday.",
    isMe: false,
    avatar: 'https://i.pravatar.cc/40?img=25',
  },
];

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

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ message, isTablet, width, C, s }) => {
  const { sender, time, text, isMe, avatar } = message;
  const maxBubbleWidth = isTablet ? 520 : width * 0.72;

  if (isMe) {
    return (
      <View style={s.myMessageRow}>
        <View style={s.myMeta}>
          <Text style={s.myTime}>{time}</Text>
          <Text style={s.myName}>Me</Text>
        </View>
        <View style={[s.myBubble, { maxWidth: maxBubbleWidth }]}>
          <Text style={s.myBubbleText}>{text}</Text>
        </View>
        <Avatar uri={avatar} size={isTablet ? 44 : 38} />
      </View>
    );
  }

  return (
    <View style={s.theirMessageRow}>
      <Avatar uri={avatar} size={isTablet ? 44 : 38} />
      <View style={s.theirContent}>
        <View style={s.theirHeader}>
          <Text style={s.senderName}>{sender}</Text>
          <Text style={s.messageTime}>{time}</Text>
        </View>
        <View style={[s.theirBubble, { maxWidth: maxBubbleWidth }]}>
          <Text style={s.theirBubbleText}>{text}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = ({ s }) => (
  <View style={s.typingRow}>
    <View style={s.typingDots}>
      <View style={[s.dot, { opacity: 1 }]} />
      <View style={[s.dot, { opacity: 0.65 }]} />
      <View style={[s.dot, { opacity: 0.4 }]} />
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Message() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const s = makeStyles(C, isTablet, width);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(MESSAGES);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      sender: 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputText.trim(),
      isMe: true,
      avatar: 'https://i.pravatar.cc/40?img=33',
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <View style={s.root}>
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
          <TouchableOpacity style={s.headerBtn} activeOpacity={0.7}>
            <Text style={s.headerBtnText}>⋮</Text>
          </TouchableOpacity>
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
            <MessageBubble message={item} isTablet={isTablet} width={width} C={C} s={s} />
          )}
          showsVerticalScrollIndicator={false}
        />

        <Text style={s.encryptedLabel}>END-TO-END ENCRYPTED</Text>

        {/* Input Bar */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.inputAction} activeOpacity={0.7}>
            <Text style={s.inputActionText}>＋</Text>
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
            style={[s.sendBtn, inputText.trim() ? s.sendBtnActive : {}]}
            activeOpacity={0.8}
            onPress={sendMessage}
          >
            <Text style={s.sendBtnIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
function makeStyles(C, isTablet, width) {
  // Semantic aliases
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
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: isTablet ? 24 : 16, paddingVertical: isTablet ? 14 : 12,
      backgroundColor: C.sidebar, borderBottomWidth: 1, borderBottomColor: border,
    },
    headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    groupIconContainer: {
      width: isTablet ? 48 : 42, height: isTablet ? 48 : 42,
      borderRadius: isTablet ? 24 : 21,
      backgroundColor: groupIconBg, alignItems: 'center', justifyContent: 'center',
    },
    groupIconText:  { fontSize: isTablet ? 22 : 18 },
    headerInfo:     { flex: 1 },
    headerTitle:    { color: textPrimary, fontWeight: '700', fontSize: isTablet ? 18 : 16, letterSpacing: 0.1 },
    headerSubRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
    headerActions:  { flexDirection: 'row', gap: 4 },
    headerBtn:      { padding: 8, borderRadius: 8 },
    headerBtnText:  { fontSize: isTablet ? 20 : 18, color: textSub },

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
    typingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: isTablet ? 48 : 12, marginTop: 4, marginBottom: 8, gap: 8 },
    typingDots:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot:         { width: 7, height: 7, borderRadius: 3.5, backgroundColor: textMuted },

    // Encrypted label
    encryptedLabel: { textAlign: 'center', color: textMuted, fontSize: 10, letterSpacing: 1, paddingVertical: 6 },

    // Input bar
    inputBar:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: isTablet ? 24 : 12, paddingVertical: 10, backgroundColor: bg, borderTopWidth: 1, borderTopColor: border, gap: 6 },
    inputAction:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    inputActionText:{ fontSize: 22, color: textSub },
    textInput:      { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: textPrimary, fontSize: isTablet ? 15 : 14, borderWidth: 1, borderColor: border },
    sendBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: border, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    sendBtnActive:  { backgroundColor: accent },
    sendBtnIcon:    { color: '#ffffff', fontSize: 16, marginLeft: 2 },
  });
}