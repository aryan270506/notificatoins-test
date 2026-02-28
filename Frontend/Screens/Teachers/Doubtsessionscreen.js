// Screens/Teacher/DoubtSessionscreen.js

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Animated, Dimensions, Platform, StatusBar, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');
const IS_TABLET = W >= 768;
const COLORS = {
  bg: '#080A14', surface: '#0F1322', surfaceEl: '#161B2E', border: '#1C2240',
  accent: '#06B6D4', accentSoft: 'rgba(6,182,212,0.12)',
  green: '#22C55E', greenSoft: 'rgba(34,197,94,0.12)',
  orange: '#F97316', orangeSoft: 'rgba(249,115,22,0.12)',
  purple: '#A855F7', purpleSoft: 'rgba(168,85,247,0.12)',
  textPrimary: '#EDF4FF', textSecondary: '#8A96B8', textMuted: '#3A4260',
};
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const doubts = [
  { id: 1, name: 'John S.', class: 'TY-B', initials: 'JS', time: '4 mins ago', question: 'Could you explain the entropy change in an isothermal process again?', subject: 'Thermodynamics', priority: 'HIGH', color: COLORS.orange },
  { id: 2, name: 'Priya R.', class: 'SY-A', initials: 'PR', time: '12 mins ago', question: 'What is the difference between Heisenberg and Schrodinger picture?', subject: 'Quantum Physics', priority: 'MEDIUM', color: COLORS.accent },
  { id: 3, name: 'Dev P.', class: 'TY-B', initials: 'DP', time: '28 mins ago', question: 'Can you share the derivation for the work-energy theorem in non-inertial frames?', subject: 'Mechanics', priority: 'LOW', color: COLORS.green },
  { id: 4, name: 'Sneha I.', class: 'FY-C', initials: 'SI', time: '1 hr ago', question: 'What exactly is wave-particle duality? I am confused with the double slit experiment.', subject: 'Quantum Physics', priority: 'HIGH', color: COLORS.orange },
];

export default function DoubtSession({ navigation }) {
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [sendState, setSendState] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sendScaleAnim = useRef(new Animated.Value(1)).current;
  const sendRotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, []);

  const handleSend = () => {
    if (reply.length === 0 || sendState !== 'idle') return;
    setSendState('sending');
    Animated.sequence([
      Animated.timing(sendScaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(sendScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.timing(sendRotateAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      { iterations: 2 }
    ).start();
    setTimeout(() => {
      setSendState('sent');
      setReply('');
      setTimeout(() => {
        setSendState('idle');
        sendRotateAnim.setValue(0);
      }, 1200);
    }, 800);
  };

  const spin = sendRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const showList = !IS_TABLET ? !selected : true;
  const showReply = !IS_TABLET ? !!selected : !!selected;

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: COLORS.bg }, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" />
      <View style={[ds.mainLayout, IS_TABLET && { flexDirection: 'row' }]}>
        {showList && (
          <ScrollView style={[ds.list, IS_TABLET && { width: 340, borderRightWidth: 1, borderRightColor: COLORS.border }]}>
            <View style={ds.listHeader}>
              <View>
                <Text style={ds.screenTitle}>Doubt Sessions</Text>
                <Text style={ds.screenSub}>8 active doubts awaiting response</Text>
              </View>
              <View style={ds.liveBadge}>
                <View style={ds.liveDot} />
                <Text style={ds.liveText}>LIVE</Text>
              </View>
            </View>
            {doubts.map((doubt) => (
              <TouchableOpacity key={doubt.id} style={[ds.doubtCard, selected?.id === doubt.id && { borderColor: COLORS.accent }]} onPress={() => setSelected(doubt)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <View style={[ds.doubtAvatar, { backgroundColor: doubt.color + '20' }]}>
                    <Text style={[ds.doubtAvatarText, { color: doubt.color }]}>{doubt.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={ds.doubtName}>{doubt.name} · {doubt.class}</Text>
                      <Text style={ds.doubtTime}>{doubt.time}</Text>
                    </View>
                    <Text style={[ds.doubtSubject, { color: doubt.color }]}>{doubt.subject}</Text>
                  </View>
                </View>
                <Text style={ds.doubtQuestion} numberOfLines={2}>{doubt.question}</Text>
                <View style={[ds.priorityPill, { backgroundColor: doubt.color + '20' }]}>
                  <Text style={[ds.priorityText, { color: doubt.color }]}>{doubt.priority}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {showReply && selected && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={ds.replyHeader}>
              {!IS_TABLET && (
                <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: 12 }}>
                  <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={ds.replyTo}>Replying to {selected.name}</Text>
                <Text style={ds.replyClass}>{selected.class} · {selected.subject}</Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1, padding: 16 }}>
              <View style={ds.questionBubble}>
                <Text style={ds.questionText}>{selected.question}</Text>
                <Text style={ds.questionTime}>{selected.time}</Text>
              </View>
            </ScrollView>
            <View style={ds.inputArea}>
              <TextInput style={ds.textInput} placeholder="Type your response..." placeholderTextColor={COLORS.textMuted} value={reply} onChangeText={setReply} multiline maxLength={500} />
              <TouchableOpacity onPress={handleSend} disabled={reply.length === 0 || sendState !== 'idle'} activeOpacity={0.8}>
                <Animated.View style={[
                  ds.sendBtn,
                  reply.length > 0 && { backgroundColor: sendState === 'sent' ? COLORS.green : COLORS.accent },
                  { transform: [{ scale: sendScaleAnim }] }
                ]}>
                  <Animated.View style={{ transform: [{ rotate: sendState === 'sending' ? spin : '0deg' }] }}>
                    <Ionicons
                      name={sendState === 'sent' ? 'checkmark' : sendState === 'sending' ? 'sync' : 'send'}
                      size={18}
                      color={reply.length > 0 ? '#fff' : COLORS.textMuted}
                    />
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Animated.View>
  );
}

const ds = StyleSheet.create({
  mainLayout: { flex: 1 },
  list: { flex: 1 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, fontFamily: FONTS.heading },
  screenSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.greenSoft, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green },
  liveText: { fontSize: 11, fontWeight: '800', color: COLORS.green, letterSpacing: 0.5 },
  doubtCard: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  doubtAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  doubtAvatarText: { fontWeight: '800', fontSize: 13 },
  doubtName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  doubtTime: { fontSize: 11, color: COLORS.textMuted },
  doubtSubject: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  doubtQuestion: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  replyTo: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  replyClass: { fontSize: 12, color: COLORS.textSecondary },
  questionBubble: { backgroundColor: COLORS.surfaceEl, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: COLORS.accent, marginBottom: 16 },
  questionText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, marginBottom: 6 },
  questionTime: { fontSize: 11, color: COLORS.textMuted },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  textInput: { flex: 1, backgroundColor: COLORS.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
});