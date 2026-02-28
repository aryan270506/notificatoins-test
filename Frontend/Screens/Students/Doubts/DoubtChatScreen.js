import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';

const { width } = Dimensions.get('window');
const isLaptop = width >= 768;

// ── Seed messages ──────────────────────────────────────────────────────────────
const SEED_MESSAGES = {
  'Data Structures': [
    {
      id: 'm1',
      sender: 'student',
      text: 'What is the time complexity difference between Merge Sort and Quick Sort in the worst case?',
      time: '10:22 AM',
    },
    {
      id: 'm2',
      sender: 'instructor',
      text: "Great question! Merge Sort always runs in O(n log n) even in the worst case. Quick Sort, however, degrades to O(n²) when the pivot is consistently the smallest or largest element — for example on an already-sorted array with a naive pivot strategy.",
      time: '10:35 AM',
    },
    {
      id: 'm3',
      sender: 'student',
      text: 'So in practice, why is Quick Sort still preferred despite the worst-case?',
      time: '10:38 AM',
    },
    {
      id: 'm4',
      sender: 'instructor',
      text: "Because in practice Quick Sort has better cache performance and smaller constant factors. With a randomized or median-of-three pivot, worst-case is extremely unlikely. Merge Sort also needs O(n) extra space, which matters for large datasets.",
      time: '10:45 AM',
    },
  ],
};

// ── Typing indicator ───────────────────────────────────────────────────────────
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

// ── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, instructorColor, instructorInitials, C }) => {
  const isStudent = msg.sender === 'student';
  return (
    <View style={[styles.messageRow, isStudent ? styles.messageRowRight : styles.messageRowLeft]}>
      {!isStudent && (
        <View style={[styles.msgAvatar, { backgroundColor: instructorColor }]}>
          <Text style={styles.msgAvatarText}>{instructorInitials}</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isStudent
          ? [styles.bubbleStudent, { backgroundColor: C.accent }]
          : [styles.bubbleInstructor, { backgroundColor: C.card, borderColor: C.border }],
      ]}>
        <Text style={[
          styles.bubbleText,
          { color: isStudent ? '#FFFFFF' : C.textPrimary },
        ]}>
          {msg.text}
        </Text>
        <Text style={[
          styles.bubbleTime,
          { color: isStudent ? 'rgba(255,255,255,0.6)' : C.textMuted },
        ]}>
          {msg.time}
        </Text>
      </View>
      {isStudent && (
        <View style={[styles.msgAvatarStudent, { backgroundColor: C.accent }]}>
          <Text style={styles.msgAvatarText}>AR</Text>
        </View>
      )}
    </View>
  );
};

// ── Scroll suggestion chips ────────────────────────────────────────────────────
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

// ── Main ChatScreen ────────────────────────────────────────────────────────────
export default function DoubtChatScreen({ course, inquiry, mode, onBack, C, onThemeToggle }) {
  const flatListRef = useRef(null);

  const getInitialMessages = () => {
    if (mode === 'existing' && SEED_MESSAGES[course?.title]) {
      return SEED_MESSAGES[course.title];
    }
    return [];
  };

  const [messages, setMessages]           = useState(getInitialMessages);
  const [inputText, setInputText]         = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  const instructorColor    = course?.instructorColor    || (C?.accent ?? '#4F8EF7');
  const instructorInitials = course?.instructorInitials || 'IN';

  const simulateReply = (userMessage) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = {
        id: `m${Date.now()}r`,
        sender: 'instructor',
        text: `Thanks for your question about "${userMessage.substring(0, 40)}...". I'll review this and get back to you with a detailed explanation shortly. In the meantime, try checking Chapter 4 of the textbook.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg = {
      id: `m${Date.now()}`,
      sender: 'student',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    simulateReply(text);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const chatTitle = inquiry ? inquiry.title : `New Doubt — ${course?.title}`;

  // Fallback colors if C is not provided
  const bg       = C?.bg       ?? '#0A1628';
  const cardBg   = C?.card     ?? '#0D1F36';
  const border   = C?.border   ?? '#1E3A5F';
  const textPri  = C?.textPrimary ?? '#F1F5F9';
  const textMut  = C?.textMuted   ?? '#94A3B8';
  const accent   = C?.accent      ?? '#4F8EF7';
  const cardAlt  = C?.cardAlt     ?? '#172A46';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: cardAlt }]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={[styles.backArrow, { color: textMut }]}>←</Text>
        </TouchableOpacity>

        <View style={[styles.headerAvatar, { backgroundColor: instructorColor, borderColor: border }]}>
          <Text style={styles.headerAvatarText}>{instructorInitials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: textPri }]} numberOfLines={1}>
            {course?.instructor || 'Instructor'}
          </Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.tagPill, { backgroundColor: (course?.tagColor || accent) + '33' }]}>
              <Text style={[styles.tagPillText, { color: course?.tagColor || accent }]}>
                {course?.tag || 'CORE'}
              </Text>
            </View>
            <Text style={[styles.headerCourse, { color: textMut }]}>{course?.title || 'Course'}</Text>
          </View>
        </View>

        {/* Theme toggle */}
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

      {/* ── Doubt subject banner ── */}
      {chatTitle && (
        <View style={[styles.subjectBanner, { backgroundColor: C?.upNextBg ?? '#0F2744', borderBottomColor: border }]}>
          <Text style={[styles.subjectBannerText, { color: textMut }]} numberOfLines={1}>
            {chatTitle}
          </Text>
          {inquiry && (
            <View style={[styles.statusPill, { backgroundColor: inquiry.badgeBg }]}>
              <Text style={[styles.statusPillText, { color: inquiry.badgeColor }]}>
                {inquiry.badge}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
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

        {/* ── Suggested prompts ── */}
        {messages.length === 0 && (
          <View style={styles.suggestionsRow}>
            <ScrollSuggestions course={course} onSelect={(t) => setInputText(t)} C={C} />
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={[
          styles.inputBar,
          { backgroundColor: cardBg, borderTopColor: border },
        ]}>
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
            style={[
              styles.textInput,
              { backgroundColor: cardAlt, borderColor: border, color: textPri },
            ]}
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
              !inputText.trim() && [styles.sendBtnDisabled, { backgroundColor: cardAlt }],
            ]}
            onPress={handleSend}
            activeOpacity={0.75}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const BUBBLE_MAX = isLaptop ? width * 0.45 : width * 0.72;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex:     { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  backArrow:       { fontSize: 18, fontWeight: '700' },
  headerAvatar:    { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  headerAvatarText:{ color: '#fff', fontSize: 14, fontWeight: '800' },
  headerInfo:      { flex: 1 },
  headerTitle:     { fontSize: 15, fontWeight: '700' },
  headerSubRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tagPill:         { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagPillText:     { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  headerCourse:    { fontSize: 12 },
  headerIconBtn:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  subjectBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, gap: 8,
  },
  subjectBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  statusPill:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  messagesList: {
    padding: isLaptop ? 24 : 16,
    paddingBottom: 8,
    alignSelf: isLaptop ? 'center' : undefined,
    width: isLaptop ? Math.min(width * 0.75, 900) : undefined,
  },

  emptyState:    { alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 32 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  messageRow:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  messageRowLeft:  { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },

  msgAvatar:        { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarStudent: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  msgAvatarText:    { color: '#fff', fontSize: 11, fontWeight: '800' },

  bubble:           { maxWidth: BUBBLE_MAX, borderRadius: 16, padding: 12, paddingBottom: 8 },
  bubbleInstructor: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleStudent:    { borderBottomRightRadius: 4 },
  bubbleText:       { fontSize: 14, lineHeight: 20 },
  bubbleTime:       { fontSize: 10, marginTop: 4, textAlign: 'right' },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 14, gap: 5, marginBottom: 14,
  },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },

  suggestionsRow:  { paddingBottom: 8 },
  suggestionsList: { paddingHorizontal: 16, gap: 8 },
  suggestionChip:  { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 240 },
  suggestionText:  { fontSize: 12 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, gap: 8,
    alignSelf: isLaptop ? 'center' : undefined,
    width: isLaptop ? Math.min(width * 0.75, 900) : undefined,
  },
  attachBtn:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  attachMenu:     { position: 'absolute', bottom: 60, left: 12, borderRadius: 12, borderWidth: 1, overflow: 'hidden', zIndex: 999 },
  attachMenuItem: { paddingHorizontal: 20, paddingVertical: 12 },
  attachMenuText: { fontSize: 14 },
  textInput: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    fontSize: 14, paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
  },
  sendBtn:         { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sendBtnDisabled: {},
  sendIcon:        { color: '#fff', fontSize: 16, marginLeft: 2 },
});