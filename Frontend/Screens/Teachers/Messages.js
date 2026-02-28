// Screens/Teacher/Messagesscreen.js

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Animated, Dimensions, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');
const IS_TABLET = W >= 768;
const COLORS = {
  bg: '#07090F', surface: '#0D1120', surfaceEl: '#141826', border: '#1A2035',
  accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.15)',
  green: '#22C55E',
  textPrimary: '#EEF2FF', textSecondary: '#8E97BB', textMuted: '#384062',
};
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const conversations = [
  { id: 1, name: 'Dr. Sarah Johnson', role: 'Head of Physics Dept.', last: 'Ensure homework includes wave equation derivation...', time: '2h', unread: 2, online: true, initials: 'SJ', color: '#A855F7' },
  { id: 2, name: 'Prof. Mehta', role: 'Mathematics Dept.', last: 'The schedule for next week has been updated.', time: '5h', unread: 0, online: false, initials: 'PM', color: '#F97316' },
  { id: 3, name: 'TY-B Class Group', role: '45 Students', last: 'John: Will the notes be uploaded today?', time: '1h', unread: 12, online: true, initials: 'TB', color: '#06B6D4' },
  { id: 4, name: 'Principal Kumar', role: 'Administration', last: 'Please submit the monthly report by Friday.', time: '1d', unread: 1, online: false, initials: 'PK', color: '#22C55E' },
];

const demoMessages = [
  { id: 1, from: 'other', text: 'Ensure the homework for this week includes the wave equation derivation practice.', time: '10:30 AM' },
  { id: 2, from: 'me', text: "Understood, I will include it in Thursday's assignment sheet.", time: '10:35 AM' },
  { id: 3, from: 'other', text: 'Also please review the updated syllabus for Quantum Mechanics.', time: '10:38 AM' },
  { id: 4, from: 'me', text: 'I will upload revised notes by tomorrow evening.', time: '10:42 AM' },
];

export default function Messages({ navigation }) {
  const [activeConv, setActiveConv] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [search, setSearch] = useState('');
  const [sendState, setSendState] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sendScaleAnim = useRef(new Animated.Value(1)).current;
  const sendRotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, []);

  const handleSend = () => {
    if (msgText.length === 0 || sendState !== 'idle') return;
    setSendState('sending');
    // Pulse scale animation
    Animated.sequence([
      Animated.timing(sendScaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    // Spin the icon while sending
    Animated.loop(
      Animated.timing(sendRotateAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      { iterations: 2 }
    ).start();
    setTimeout(() => {
      setSendState('sent');
      setMsgText('');
      setTimeout(() => {
        setSendState('idle');
        sendRotateAnim.setValue(0);
      }, 1200);
    }, 800);
  };

  const spin = sendRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const filtered = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const showList = !IS_TABLET ? !activeConv : true;
  const showChat = activeConv !== null;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: COLORS.bg, opacity: fadeAnim }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, flexDirection: IS_TABLET ? 'row' : 'column' }}>
        {showList && (
          <View style={{ width: IS_TABLET ? 320 : undefined, flex: IS_TABLET ? undefined : 1, borderRightWidth: IS_TABLET ? 1 : 0, borderRightColor: COLORS.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 }}>
              <Text style={msg.screenTitle}>Messages</Text>
              <TouchableOpacity style={msg.composeBtn}><Ionicons name="create-outline" size={20} color={COLORS.accent} /></TouchableOpacity>
            </View>
            <View style={msg.searchBox}>
              <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
              <TextInput style={msg.searchInput} placeholder="Search conversations..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
            </View>
            <ScrollView>
              {filtered.map(conv => (
                <TouchableOpacity key={conv.id} style={[msg.convItem, activeConv?.id === conv.id && { backgroundColor: COLORS.accentSoft }]} onPress={() => setActiveConv(conv)}>
                  <View style={{ position: 'relative' }}>
                    <View style={[msg.convAvatar, { backgroundColor: conv.color + '20' }]}>
                      <Text style={[msg.convAvatarText, { color: conv.color }]}>{conv.initials}</Text>
                    </View>
                    {conv.online && <View style={msg.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={msg.convName} numberOfLines={1}>{conv.name}</Text>
                      <Text style={msg.convTime}>{conv.time}</Text>
                    </View>
                    <Text style={msg.convRole}>{conv.role}</Text>
                    <Text style={msg.convLast} numberOfLines={1}>{conv.last}</Text>
                  </View>
                  {conv.unread > 0 && <View style={msg.unreadBadge}><Text style={msg.unreadText}>{conv.unread}</Text></View>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showChat && activeConv ? (
          <View style={{ flex: 1 }}>
            <View style={msg.chatHeader}>
              {!IS_TABLET && (
                <TouchableOpacity onPress={() => setActiveConv(null)} style={{ marginRight: 10 }}>
                  <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={[msg.convAvatar, { width: 38, height: 38, borderRadius: 19, backgroundColor: activeConv.color + '20' }]}>
                <Text style={[msg.convAvatarText, { color: activeConv.color, fontSize: 14 }]}>{activeConv.initials}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={msg.chatName}>{activeConv.name}</Text>
                <Text style={msg.chatRole}>{activeConv.online ? '🟢 Online' : activeConv.role}</Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {demoMessages.map(m => (
                <View key={m.id} style={[msg.bubbleWrap, m.from === 'me' && { alignSelf: 'flex-end' }]}>
                  <View style={[msg.bubble, m.from === 'me' ? msg.bubbleMe : msg.bubbleOther]}>
                    <Text style={[msg.bubbleText, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
                  </View>
                  <Text style={msg.bubbleTime}>{m.time}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={msg.inputBar}>
              <TextInput style={msg.msgInput} placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} value={msgText} onChangeText={setMsgText} />
              <TouchableOpacity onPress={handleSend} disabled={msgText.length === 0 || sendState !== 'idle'} activeOpacity={0.8}>
                <Animated.View style={[
                  msg.sendBtn,
                  msgText.length > 0 && { backgroundColor: sendState === 'sent' ? COLORS.green : COLORS.accent },
                  { transform: [{ scale: sendScaleAnim }] }
                ]}>
                  <Animated.View style={{ transform: [{ rotate: sendState === 'sending' ? spin : '0deg' }] }}>
                    <Ionicons
                      name={sendState === 'sent' ? 'checkmark' : sendState === 'sending' ? 'sync' : 'send'}
                      size={18}
                      color={msgText.length > 0 ? '#fff' : COLORS.textMuted}
                    />
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        ) : !IS_TABLET ? null : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
            <Text style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 12 }}>Select a conversation</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const msg = StyleSheet.create({
  screenTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, fontFamily: FONTS.heading },
  composeBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  convItem: { flexDirection: 'row', gap: 10, padding: 14, marginHorizontal: 8, borderRadius: 12, marginBottom: 2, alignItems: 'flex-start' },
  convAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { fontWeight: '800', fontSize: 15 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.green, borderWidth: 2, borderColor: COLORS.bg },
  convName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  convTime: { fontSize: 11, color: COLORS.textMuted },
  convRole: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  convLast: { fontSize: 12, color: COLORS.textMuted },
  unreadBadge: { backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: Platform.OS === 'ios' ? 56 : 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  chatName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  chatRole: { fontSize: 12, color: COLORS.textSecondary },
  bubbleWrap: { marginBottom: 14, maxWidth: '75%', alignSelf: 'flex-start' },
  bubble: { borderRadius: 16, padding: 12 },
  bubbleOther: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderTopLeftRadius: 4 },
  bubbleMe: { backgroundColor: COLORS.accent, borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  msgInput: { flex: 1, backgroundColor: COLORS.surfaceEl, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceEl, alignItems: 'center', justifyContent: 'center' },
});