// ============================================================
//  MessagingScreen.js  —  Campus360
//  Theme comes from AdminDashboard's ThemeContext
// ============================================================
import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, SafeAreaView, StatusBar, Dimensions,
  Platform, Animated, KeyboardAvoidingView,
  Modal, Pressable, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ThemeContext, DARK_COLORS, LIGHT_COLORS } from '../dashboard/AdminDashboard';

// ─── RESPONSIVE ──────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const IS_WEB   = Platform.OS === 'web';
const IS_IOS   = Platform.OS === 'ios';
const IS_LARGE = SW >= 768 || IS_WEB;
const CHAT_MAX  = IS_LARGE ? 720 : SW;
const BUBBLE_MAX = IS_LARGE ? Math.min(480, CHAT_MAX * 0.65) : SW * 0.78;

// ─── MESSAGING THEME (for chat bubble colors) ──────────────
// Maps AdminDashboard colors to messaging color names
const getMsgColors = (isDark) => {
  if (isDark) {
    return {
      bg: '#0B141A', header: '#1F2C34', out: '#005C4B', in: '#1F2C34',
      input: '#2A3942', divider: '#2D3B44', teal: '#00A884', green: '#25D366',
      light: '#E9EDEF', sub: '#8696A0', amber: '#F59E0B', red: '#EF4444',
      overlay: 'rgba(0,0,0,0.6)', sheet: '#1A2633', menuBg: '#233138',
    };
  }
  return {
    bg: '#FFFFFF', header: '#F5F5F5', out: '#E8F5E9', in: '#F0F0F0',
    input: '#E8E8E8', divider: '#E0E0E0', teal: '#009688', green: '#4CAF50',
    light: '#212121', sub: '#757575', amber: '#FBC02D', red: '#F44336',
    overlay: 'rgba(0,0,0,0.4)', sheet: '#FAFAFA', menuBg: '#F5F5F5',
  };
};

const AV_COLORS = ['#C2185B','#7B1FA2','#1976D2','#00796B','#F57C00','#D32F2F','#455A64','#388E3C'];
const avatarColor = (s) => AV_COLORS[(s || '').charCodeAt(0) % AV_COLORS.length];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SEED_MESSAGES = [
  { id: 'seed1', from: 'system', text: '📢 This is a broadcast channel. Your messages will be sent to all selected recipients.', time: nowTime(), date: 'Today' },
];

function Tick({ status, C }) {
  if (!status) return null;
  const color = status === 'read' ? '#53BDEB' : C.sub;
  const mark  = status === 'sent' ? '✓' : '✓✓';
  return <Text style={{ color, fontSize: 11, lineHeight: 14 }}>{mark}</Text>;
}

function DateSep({ label, C }) {
  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View style={{ backgroundColor: '#182533', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5 }}>
        <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600' }}>{label}</Text>
      </View>
    </View>
  );
}

function Bubble({ msg, onLongPress, C }) {
  const isMe     = msg.from === 'me';
  const isSystem = msg.from === 'system';
  const appear   = useRef(new Animated.Value(0)).current;
  const slideY   = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(appear, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 180, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isSystem) {
    return (
      <Animated.View style={{ opacity: appear, transform: [{ translateY: slideY }], alignItems: 'center', marginVertical: 6 }}>
        <View style={{ backgroundColor: '#182533', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, maxWidth: IS_LARGE ? 500 : SW * 0.85 }}>
          <Text style={{ fontSize: 12.5, color: C.sub, textAlign: 'center', lineHeight: 18 }}>{msg.text}</Text>
        </View>
      </Animated.View>
    );
  }

  const handleLP = () => { if (isMe) onLongPress && onLongPress(msg); };
  const outBg = { backgroundColor: C.out, borderTopRightRadius: 3 };
  const inBg  = { backgroundColor: C.in,  borderTopLeftRadius: 3 };
  const tailR = { position: 'absolute', top: 0, right: -7, width: 0, height: 0, borderStyle: 'solid', borderTopWidth: 8, borderLeftWidth: 8, borderTopColor: C.out, borderLeftColor: 'transparent' };
  const tailL = { position: 'absolute', top: 0, left: -7, width: 0, height: 0, borderStyle: 'solid', borderTopWidth: 8, borderRightWidth: 8, borderTopColor: C.in, borderRightColor: 'transparent' };

  if (msg.type === 'image') {
    return (
      <Animated.View style={[{ marginHorizontal: IS_LARGE ? 16 : 8, marginBottom: 4, maxWidth: BUBBLE_MAX }, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { opacity: appear, transform: [{ translateY: slideY }] }]}>
        <TouchableOpacity activeOpacity={0.92} onLongPress={handleLP} delayLongPress={380}>
          <View style={[{ borderRadius: 10, position: 'relative', padding: 4, paddingBottom: 6 }, isMe ? outBg : inBg]}>
            {msg.uri ? <Image source={{ uri: msg.uri }} style={[{ height: IS_LARGE ? 200 : Math.round(SW * 0.45), borderRadius: 8 }, { width: Math.min(BUBBLE_MAX - 10, IS_LARGE ? 280 : SW * 0.6) }]} resizeMode="cover" />
              : <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2a35', height: IS_LARGE ? 200 : Math.round(SW * 0.45), borderRadius: 8 }, { width: IS_LARGE ? 280 : SW * 0.6 }]}><Text style={{ fontSize: 40 }}>🖼️</Text></View>
            }
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 6, paddingTop: 4 }}>
              <Text style={{ fontSize: 11, color: C.sub }}>{msg.time}</Text>
              {isMe && <Tick status={msg.status} C={C} />}
            </View>
          </View>
          {isMe ? <View style={tailR} /> : <View style={tailL} />}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (msg.type === 'document') {
    return (
      <Animated.View style={[{ marginHorizontal: IS_LARGE ? 16 : 8, marginBottom: 4, maxWidth: BUBBLE_MAX }, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { opacity: appear, transform: [{ translateY: slideY }] }]}>
        <TouchableOpacity activeOpacity={0.92} onLongPress={handleLP} delayLongPress={380}>
          <View style={[{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, position: 'relative', minWidth: IS_LARGE ? 240 : 200 }, isMe ? outBg : inBg]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 26 }}>📄</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: IS_LARGE ? 14 : 13, color: C.light, fontWeight: '600', lineHeight: 19 }} numberOfLines={2}>{msg.fileName}</Text>
                {msg.fileSize ? <Text style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{msg.fileSize}</Text> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 11, color: C.sub }}>{msg.time}</Text>
              {isMe && <Tick status={msg.status} C={C} />}
            </View>
          </View>
          {isMe ? <View style={tailR} /> : <View style={tailL} />}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ marginHorizontal: IS_LARGE ? 16 : 8, marginBottom: 4, maxWidth: BUBBLE_MAX }, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { opacity: appear, transform: [{ translateY: slideY }] }]}>
      <TouchableOpacity activeOpacity={0.92} onLongPress={handleLP} delayLongPress={380}>
        <View style={[{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, position: 'relative' }, isMe ? outBg : inBg]}>
          <Text style={{ fontSize: IS_LARGE ? 15 : 14.5, color: C.light, lineHeight: IS_LARGE ? 22 : 21 }}>{msg.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: C.sub }}>{msg.time}</Text>
            {isMe && <Tick status={msg.status} C={C} />}
          </View>
        </View>
        {isMe ? <View style={tailR} /> : <View style={tailL} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

function AttachSheet({ visible, onClose, onImage, onDoc, C }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay }} onPress={onClose}>
        <Pressable style={{ backgroundColor: C.sheet, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: IS_LARGE ? 32 : 20, paddingTop: 14, paddingBottom: IS_IOS ? 34 : 24 }} onPress={() => {}}>
          <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: '#3A4A55', alignSelf: 'center', marginBottom: 20 }} />
          <Text style={{ fontSize: IS_LARGE ? 18 : 16, fontWeight: '800', color: C.light, textAlign: 'center', marginBottom: 24 }}>Add Attachment</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: IS_LARGE ? 40 : 28, marginBottom: 24 }}>
            <TouchableOpacity style={{ alignItems: 'center', gap: 8, width: IS_LARGE ? 110 : 90 }} activeOpacity={0.8} onPress={() => { onImage(); onClose(); }}>
              <View style={{ width: IS_LARGE ? 76 : 64, height: IS_LARGE ? 76 : 64, borderRadius: 20, backgroundColor: '#0D2744', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: IS_LARGE ? 32 : 28 }}>🖼️</Text>
              </View>
              <Text style={{ fontSize: IS_LARGE ? 14 : 13, color: C.light, fontWeight: '700', textAlign: 'center' }}>Photo / Video</Text>
              <Text style={{ fontSize: 11, color: C.sub, textAlign: 'center' }}>From gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', gap: 8, width: IS_LARGE ? 110 : 90 }} activeOpacity={0.8} onPress={() => { onDoc(); onClose(); }}>
              <View style={{ width: IS_LARGE ? 76 : 64, height: IS_LARGE ? 76 : 64, borderRadius: 20, backgroundColor: '#0D2E1A', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: IS_LARGE ? 32 : 28 }}>📄</Text>
              </View>
              <Text style={{ fontSize: IS_LARGE ? 14 : 13, color: C.light, fontWeight: '700', textAlign: 'center' }}>Document</Text>
              <Text style={{ fontSize: 11, color: C.sub, textAlign: 'center' }}>PDF, Word, etc.</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ backgroundColor: C.input, borderRadius: 14, paddingVertical: IS_LARGE ? 16 : 14, alignItems: 'center' }} onPress={onClose} activeOpacity={0.8}>
            <Text style={{ fontSize: IS_LARGE ? 16 : 15, color: C.light, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DeleteMenu({ visible, onClose, onDelete, C }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.menuBg, borderRadius: 20, width: '100%', maxWidth: 340, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.sub, textAlign: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider }}>Message Options</Text>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 }} onPress={() => { onDelete(); onClose(); }} activeOpacity={0.8}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>🗑️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: IS_LARGE ? 16 : 15, color: C.red, fontWeight: '600' }}>Delete for everyone</Text>
              <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>This action cannot be undone</Text>
            </View>
          </TouchableOpacity>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.divider }} />
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 }} onPress={onClose} activeOpacity={0.8}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>✕</Text></View>
            <Text style={{ fontSize: IS_LARGE ? 16 : 15, color: C.light, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
// Gets isDark from AdminDashboard's ThemeContext
export default function MessagingScreen({ context, onBack }) {
  const themeCtx = useContext(ThemeContext);
  const isDark = themeCtx.isDark;
  const C = getMsgColors(isDark);

  const [messages,   setMessages]   = useState(SEED_MESSAGES);
  const [input,      setInput]      = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [targetMsg,  setTargetMsg]  = useState(null);
  const scrollRef = useRef(null);
  const ctx = context || {};

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  const sendText = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(prev => [...prev, { id: `m${Date.now()}`, from: 'me', text: txt, time: nowTime(), date: 'Today', status: 'sent' }]);
    setInput('');
  };

  const pickImage = async () => {
    try {
      if (!IS_WEB) {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setMessages(prev => [...prev, { id: `m${Date.now()}`, from: 'me', type: 'image', uri: a.uri, fileName: a.fileName || 'photo.jpg', time: nowTime(), date: 'Today', status: 'sent' }]);
      }
    } catch { Alert.alert('Error', 'Could not open photo library.'); }
  };

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      const asset = res.assets?.[0] || (res.type !== 'cancel' ? res : null);
      if (asset?.name) {
        setMessages(prev => [...prev, { id: `m${Date.now()}`, from: 'me', type: 'document', uri: asset.uri, fileName: asset.name, fileSize: asset.size ? `${(asset.size / 1024).toFixed(1)} KB` : null, time: nowTime(), date: 'Today', status: 'sent' }]);
      }
    } catch { Alert.alert('Error', 'Could not open document picker.'); }
  };

  const deleteMsg = () => {
    if (!targetMsg) return;
    setMessages(prev => prev.filter(m => m.id !== targetMsg.id));
    setTargetMsg(null);
  };

  const grouped = [];
  let lastDate = null;
  messages.forEach(m => {
    const d = m.date || 'Today';
    if (d !== lastDate) { grouped.push({ _sep: true, label: d, key: `sep_${d}_${m.id}` }); lastDate = d; }
    grouped.push(m);
  });

  const ctxLine = [ctx.roleLabel, ctx.yearLabel, ctx.division ? `Div ${ctx.division}` : null].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={[sc.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={[sc.header, { backgroundColor: C.header, borderBottomColor: C.divider }]}>
        <TouchableOpacity onPress={onBack} style={sc.backBtn} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[sc.backIcon, { color: C.light }]}>‹</Text>
        </TouchableOpacity>
        <View style={[sc.avatar, { backgroundColor: avatarColor(ctx.roleLabel || 'B') }]}>
          <Text style={sc.avatarEmoji}>
            {ctx.role === 'teacher' ? '👨‍🏫' : ctx.role === 'student' ? '🧑‍🎓' : ctx.role === 'parent' ? '👨‍👩‍👧' : '📢'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sc.headerName, { color: C.light }]} numberOfLines={1}>{ctxLine || 'Broadcast'}</Text>
          <Text style={[sc.headerSub, { color: C.sub }]}>~1,050 recipients · Broadcast channel</Text>
        </View>
        {/* GLOBAL THEME TOGGLE — controlled by AdminDashboard */}
        {/* Theme toggle removed - controlled at AdminDashboard level */}
      </View>

      {/* CHAT AREA */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={IS_IOS ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView ref={scrollRef} style={[sc.chatArea, { backgroundColor: C.bg }]} contentContainerStyle={{ paddingTop: 10, paddingBottom: 6 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {grouped.map(item =>
            item._sep
              ? <DateSep key={item.key} label={item.label} C={C} />
              : <Bubble key={item.id} msg={item} onLongPress={setTargetMsg} C={C} />
          )}
          <View style={{ height: 6 }} />
        </ScrollView>

        {/* INPUT BAR */}
        <View style={[sc.inputBar, { backgroundColor: C.header, borderTopColor: C.divider }]}>
          <TouchableOpacity style={sc.iconBtn} onPress={() => setShowAttach(true)} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: IS_LARGE ? 24 : 22, lineHeight: IS_LARGE ? 28 : 26 }}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={[sc.textInput, { backgroundColor: C.input, color: C.light }]}
            value={input} onChangeText={setInput}
            placeholder="Message" placeholderTextColor={C.sub}
            multiline maxLength={3000} returnKeyType="default"
          />
          <TouchableOpacity
            style={[sc.sendBtn, { backgroundColor: C.teal }, !input.trim() && { backgroundColor: C.input }]}
            onPress={sendText} activeOpacity={0.8} disabled={!input.trim()}
          >
            <Text style={sc.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AttachSheet visible={showAttach} onClose={() => setShowAttach(false)} onImage={pickImage} onDoc={pickDocument} C={C} />
      <DeleteMenu visible={!!targetMsg} onClose={() => setTargetMsg(null)} onDelete={deleteMsg} C={C} />
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  safe: {
    flex: 1,
    ...(IS_LARGE ? { maxWidth: CHAT_MAX, alignSelf: 'center', width: '100%' } : {}),
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: IS_LARGE ? 20 : 12, paddingVertical: IS_LARGE ? 12 : 10, gap: IS_LARGE ? 14 : 10, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: IS_LARGE ? 64 : 56 },
  backBtn:     { justifyContent: 'center', alignItems: 'center', minWidth: 32, minHeight: 44 },
  backIcon:    { fontSize: IS_LARGE ? 36 : 32, lineHeight: IS_LARGE ? 40 : 36, marginTop: -4 },
  avatar:      { width: IS_LARGE ? 46 : 40, height: IS_LARGE ? 46 : 40, borderRadius: IS_LARGE ? 23 : 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarEmoji: { fontSize: IS_LARGE ? 22 : 20 },
  headerName:  { fontSize: IS_LARGE ? 17 : 15, fontWeight: '700' },
  headerSub:   { fontSize: IS_LARGE ? 13 : 11.5, marginTop: 1 },
  themeBtn:    { justifyContent: 'center', alignItems: 'center', minWidth: 44, minHeight: 44 },
  themeIcon:   { fontSize: IS_LARGE ? 20 : 18 },
  chatArea:    { flex: 1 },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', gap: IS_LARGE ? 10 : 8, paddingHorizontal: IS_LARGE ? 16 : 10, paddingVertical: IS_LARGE ? 12 : 8, paddingBottom: IS_IOS ? 10 : IS_LARGE ? 14 : 10, borderTopWidth: StyleSheet.hairlineWidth },
  iconBtn:     { width: IS_LARGE ? 46 : 40, height: IS_LARGE ? 46 : 40, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  textInput:   { flex: 1, borderRadius: IS_LARGE ? 26 : 22, paddingHorizontal: IS_LARGE ? 18 : 15, paddingVertical: IS_LARGE ? 12 : 9, fontSize: IS_LARGE ? 16 : 15, maxHeight: IS_LARGE ? 160 : 130, lineHeight: IS_LARGE ? 22 : 20 },
  sendBtn:     { width: IS_LARGE ? 48 : 42, height: IS_LARGE ? 48 : 42, borderRadius: IS_LARGE ? 24 : 21, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendIcon:    { fontSize: IS_LARGE ? 18 : 16, color: '#fff', marginLeft: 2 },
});