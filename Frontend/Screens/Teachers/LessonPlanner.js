// Screens/Teacher/LessonPlanner.js

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, Linking, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const COLORS = {
  bg:          '#080B12',
  surface:     '#10141F',
  surfaceEl:   '#181D2E',
  border:      '#1E2440',
  accent:      '#8B5CF6',
  accentSoft:  'rgba(139,92,246,0.15)',
  green:       '#10B981',
  greenSoft:   'rgba(16,185,129,0.12)',
  red:         '#EF4444',
  redSoft:     'rgba(239,68,68,0.12)',
  blue:        '#3B82F6',
  blueSoft:    'rgba(59,130,246,0.12)',
  textPrimary:   '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted:     '#475569',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const CLASSES   = ['FY', 'SY', 'TY'];
const DIVISIONS = { FY: ['A', 'B', 'C'], SY: ['A', 'B'], TY: ['A', 'B', 'C', 'D'] };

/* ─── Syllabus data per type ─────────────────────────────────────────────── */
const SYLLABUS = {
  Theory: [
    {
      id: 1,
      unit: 'Unit 1',
      title: 'Introduction to Quantum Mechanics',
      subtopics: [
        'Wave-particle duality',
        'Photoelectric effect',
        'De Broglie hypothesis',
        'Davisson–Germer experiment',
      ],
    },
    {
      id: 2,
      unit: 'Unit 2',
      title: "Schrödinger's Wave Equation",
      subtopics: [
        'Time-dependent Schrödinger equation',
        'Time-independent Schrödinger equation',
        'Wave function and its interpretation',
        'Probability density and normalisation',
      ],
    },
    {
      id: 3,
      unit: 'Unit 3',
      title: "Heisenberg's Uncertainty Principle",
      subtopics: [
        'Position–momentum uncertainty',
        'Energy–time uncertainty',
        'Thought experiments',
        'Practical implications',
      ],
    },
    {
      id: 4,
      unit: 'Unit 4',
      title: 'Quantum Tunnelling',
      subtopics: [
        'Barrier penetration concept',
        'Tunnel diode operation',
        'Scanning tunnelling microscope',
        'Nuclear fusion via tunnelling',
      ],
    },
  ],
  Lab: [
    {
      id: 5,
      unit: 'Lab 1',
      title: 'Photoelectric Effect Experiment',
      subtopics: [
        'Apparatus setup and calibration',
        'Measuring stopping potential',
        'Frequency vs stopping voltage graph',
        "Calculating Planck's constant",
      ],
    },
    {
      id: 6,
      unit: 'Lab 2',
      title: 'Electron Diffraction',
      subtopics: [
        'Electron gun operation',
        'Crystal lattice targets',
        'Diffraction pattern analysis',
        'Calculating de Broglie wavelength',
      ],
    },
    {
      id: 7,
      unit: 'Lab 3',
      title: 'Emission Spectral Analysis',
      subtopics: [
        'Hydrogen emission spectrum',
        'Spectrometer operation',
        'Identifying spectral lines',
        'Rydberg formula verification',
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LessonPlanner({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* ── Selection state ── */
  const [selClass,    setSelClass]    = useState('SY');
  const [selDivision, setSelDivision] = useState('A');
  const [selType,     setSelType]     = useState('Theory'); // 'Theory' | 'Lab'

  /* ── Syllabus expansion ── */
  const [expanded, setExpanded] = useState({});
  const toggleExpanded = (id) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  /* ── Update Syllabus modal ── */
  const [syllabusModal,  setSyllabusModal]  = useState(false);
  const [newTopicTitle,  setNewTopicTitle]  = useState('');
  const [newSubtopics,   setNewSubtopics]   = useState('');

  /* ── Resource state ── */
  const [uploadedNotes,    setUploadedNotes]    = useState([]);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkInput,        setLinkInput]        = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  /* ── Helpers ── */
  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  /* ── Document picker ── */
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', copyToCacheDirectory: true, multiple: true,
      });
      if (result.canceled) return;
      const files = result.assets ?? [];
      if (!files.length) return;
      setUploadedNotes(prev => [
        ...prev,
        ...files.map(f => ({
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          name: f.name, size: formatBytes(f.size), uri: f.uri,
        })),
      ]);
      Alert.alert(
        'Notes Uploaded',
        files.length === 1
          ? `"${files[0].name}" has been added to your Resource Library.`
          : `${files.length} files have been added to your Resource Library.`,
      );
    } catch {
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const handleRemoveNote = (id) =>
    setUploadedNotes(prev => prev.filter(n => n.id !== id));

  /* ── External link ── */
  const handleOpenExternalLink = () => { setLinkInput(''); setLinkModalVisible(true); };
  const handleLaunchLink = async () => {
    const url = linkInput.trim();
    if (!url) { Alert.alert('No URL', 'Please enter a link to open.'); return; }
    const full = url.startsWith('http') ? url : `https://${url}`;
    setLinkModalVisible(false);
    try {
      if (await Linking.canOpenURL(full)) await Linking.openURL(full);
      else Alert.alert('Cannot Open', `Unable to open: ${full}`);
    } catch { Alert.alert('Error', 'Something went wrong while opening the link.'); }
  };

  /* ── Save new topic ── */
  const handleSaveTopic = () => {
    if (!newTopicTitle.trim()) {
      Alert.alert('Required', 'Please enter a topic title.'); return;
    }
    Alert.alert('✅ Saved', `"${newTopicTitle}" added to the ${selType} syllabus for ${selClass}-${selDivision}.`);
    setNewTopicTitle(''); setNewSubtopics(''); setSyllabusModal(false);
  };

  /* ── Resources list ── */
  const resources = [
    {
      id: 'notes',
      icon: uploadedNotes.length > 0 ? 'checkmark-circle-outline' : 'cloud-upload-outline',
      name: uploadedNotes.length > 0
        ? `${uploadedNotes.length} Note${uploadedNotes.length > 1 ? 's' : ''} Uploaded`
        : 'Upload Notes',
      size: uploadedNotes.length > 0 ? 'Tap to add more' : 'Tap to upload',
      color: COLORS.red, bg: COLORS.redSoft,
      onPress: handlePickDocument,
    },
    {
      id: 'external',
      icon: 'link-outline',
      name: 'External Resource',
      size: 'YouTube / Browser',
      color: COLORS.green, bg: COLORS.greenSoft,
      onPress: handleOpenExternalLink,
    },
  ];

  const syllabus = SYLLABUS[selType] || [];

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <View style={s.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── External Link Modal ────────────────────────────────────────── */}
      <Modal visible={linkModalVisible} transparent animationType="fade"
        onRequestClose={() => setLinkModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Open External Resource</Text>
            <Text style={s.modalSub}>Paste a YouTube link, website URL, or any browser link.</Text>
            <TextInput
              style={s.modalInput}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={COLORS.textMuted}
              value={linkInput} onChangeText={setLinkInput}
              autoCapitalize="none" keyboardType="url"
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setLinkModalVisible(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={handleLaunchLink}>
                <Text style={s.modalConfirmText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Update Syllabus Modal ──────────────────────────────────────── */}
      <Modal visible={syllabusModal} transparent animationType="slide"
        onRequestClose={() => setSyllabusModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={s.modalTitle}>Update Syllabus</Text>
              <TouchableOpacity
                onPress={() => setSyllabusModal(false)}
                style={s.modalCloseBtn}>
                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalSub}>
              Add a new topic to {selClass}-{selDivision} · {selType}
            </Text>

            <Text style={s.inputLabel}>Topic Title</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Wave Functions"
              placeholderTextColor={COLORS.textMuted}
              value={newTopicTitle} onChangeText={setNewTopicTitle}
            />

            <Text style={s.inputLabel}>
              Subtopics{'  '}
              <Text style={{ fontWeight: '400', color: COLORS.textMuted }}>(one per line)</Text>
            </Text>
            <TextInput
              style={[s.modalInput, { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder={'Introduction\nMath formulation\nApplications'}
              placeholderTextColor={COLORS.textMuted}
              value={newSubtopics} onChangeText={setNewSubtopics}
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setSyllabusModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={handleSaveTopic}>
                <Text style={s.modalConfirmText}>Save Topic</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Main scroll ───────────────────────────────────────────────── */}
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Dashboard  ›  Lesson Planner</Text>
              <Text style={s.screenTitle}>Lesson Planner</Text>
              <Text style={s.screenSub}>Manage your curriculum for {selClass}-{selDivision}</Text>
            </View>
            <TouchableOpacity
              style={s.updateBtn}
              onPress={() => setSyllabusModal(true)}
              activeOpacity={0.85}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={s.updateBtnText}>Update Syllabus</Text>
            </TouchableOpacity>
          </View>

          {/* ── Class chips ── */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipScroll}>
              {CLASSES.map(cls => (
                <TouchableOpacity
                  key={cls}
                  onPress={() => {
                    setSelClass(cls);
                    setSelDivision(DIVISIONS[cls][0]);
                    setExpanded({});
                  }}
                  style={[s.chip, selClass === cls && s.chipActive]}
                  activeOpacity={0.8}>
                  <Text style={[s.chipText, selClass === cls && s.chipTextActive]}>{cls}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Division chips ── */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionLabel}>Division</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipScroll}>
              {DIVISIONS[selClass].map(div => (
                <TouchableOpacity
                  key={div}
                  onPress={() => { setSelDivision(div); setExpanded({}); }}
                  style={[s.chip, selDivision === div && s.chipActive]}
                  activeOpacity={0.8}>
                  <Text style={[s.chipText, selDivision === div && s.chipTextActive]}>
                    Division {div}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Theory / Lab toggle ── */}
          <View style={s.typeToggleWrap}>
            {['Theory', 'Lab'].map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => { setSelType(type); setExpanded({}); }}
                style={[s.typeBtn, selType === type && s.typeBtnActive]}
                activeOpacity={0.8}>
                <Ionicons
                  name={type === 'Theory' ? 'book-outline' : 'flask-outline'}
                  size={18}
                  color={selType === type ? COLORS.accent : COLORS.textMuted}
                />
                <Text style={[s.typeBtnText, selType === type && s.typeBtnTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Context banner ── */}
          <View style={s.contextBanner}>
            <View style={[s.contextDot, { backgroundColor: selType === 'Theory' ? COLORS.accent : COLORS.green }]} />
            <Text style={s.contextText}>
              {selClass}-{selDivision}  ·  {selType}  ·  {syllabus.length} {syllabus.length === 1 ? 'unit' : 'units'}
            </Text>
          </View>

          {/* ── Syllabus accordion ── */}
          <View style={s.syllabusWrap}>
            {syllabus.map((topic, idx) => {
              const isOpen = !!expanded[topic.id];
              const typeColor = selType === 'Theory' ? COLORS.accent : COLORS.green;
              return (
                <View key={topic.id} style={[s.topicCard, { borderLeftColor: typeColor }]}>
                  <TouchableOpacity
                    style={s.topicRow}
                    onPress={() => toggleExpanded(topic.id)}
                    activeOpacity={0.8}>
                    {/* Index badge */}
                    <View style={[s.indexBadge, { backgroundColor: typeColor + '20' }]}>
                      <Text style={[s.indexText, { color: typeColor }]}>
                        {String(idx + 1).padStart(2, '0')}
                      </Text>
                    </View>

                    {/* Title block */}
                    <View style={{ flex: 1 }}>
                      <Text style={[s.unitLabel, { color: typeColor }]}>{topic.unit}</Text>
                      <Text style={s.topicTitle}>{topic.title}</Text>
                    </View>

                    {/* Subtopic count */}
                    <View style={[s.countPill, { backgroundColor: typeColor + '20' }]}>
                      <Text style={[s.countText, { color: typeColor }]}>{topic.subtopics.length}</Text>
                    </View>

                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16} color={COLORS.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  {/* Subtopics */}
                  {isOpen && (
                    <View style={s.subtopicWrap}>
                      {topic.subtopics.map((sub, si) => (
                        <View key={si} style={s.subtopicRow}>
                          <View style={[s.subtopicDot, { backgroundColor: typeColor }]} />
                          <Text style={s.subtopicText}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* ── Resource Library ── */}
          <View style={[s.card, { marginHorizontal: 20, marginTop: 6 }]}>
            <View style={s.cardHeader}>
              <Ionicons name="library-outline" size={16} color={COLORS.accent} />
              <Text style={s.cardTitle}>Resource Library</Text>
            </View>

            <View style={s.resourceGrid}>
              {resources.map(res => (
                <TouchableOpacity
                  key={res.id}
                  style={[s.resourceItem, { backgroundColor: res.bg, borderColor: res.color + '30' }]}
                  onPress={res.onPress}
                  activeOpacity={0.75}>
                  <Ionicons name={res.icon} size={26} color={res.color} />
                  <Text style={s.resourceName} numberOfLines={2}>{res.name}</Text>
                  <Text style={s.resourceSize}>{res.size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Uploaded notes list */}
            {uploadedNotes.length > 0 && (
              <View style={s.notesList}>
                <Text style={s.notesListTitle}>Uploaded Notes</Text>
                {uploadedNotes.map(note => (
                  <View key={note.id} style={s.noteRow}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.red} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.noteRowName} numberOfLines={1}>{note.name}</Text>
                      <Text style={s.noteRowSize}>{note.size}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveNote(note.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const CARD_BASE = {
  backgroundColor: COLORS.surface,
  borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16,
};

const s = StyleSheet.create({
  wrapper:   { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    gap: 12,
  },
  breadcrumb:  { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, fontFamily: SERIF, marginBottom: 2 },
  screenSub:   { fontSize: 13, color: COLORS.textSecondary },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
    marginTop: 4,
  },
  updateBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Section blocks */
  sectionBlock: { marginBottom: 10 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8,
  },
  chipScroll: { gap: 8, paddingHorizontal: 20 },

  /* Chips */
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surfaceEl,
  },
  chipActive:     { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  chipText:       { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accent },

  /* Theory / Lab toggle */
  typeToggleWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.surfaceEl,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 12, borderRadius: 11,
  },
  typeBtnActive: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1, borderColor: COLORS.accent + '60',
  },
  typeBtnText:       { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  typeBtnTextActive: { color: COLORS.accent },

  /* Context banner */
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.surfaceEl,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  contextDot: { width: 8, height: 8, borderRadius: 4 },
  contextText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  /* Syllabus */
  syllabusWrap: { paddingHorizontal: 20, gap: 10, marginBottom: 18 },
  topicCard: {
    ...CARD_BASE,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: 0,
    overflow: 'hidden',
  },
  topicRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  indexBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  indexText:  { fontSize: 13, fontWeight: '900' },
  unitLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 },
  topicTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  countPill: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, flexShrink: 0,
  },
  countText: { fontSize: 12, fontWeight: '800' },
  subtopicWrap: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
    backgroundColor: COLORS.surfaceEl,
  },
  subtopicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subtopicDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  subtopicText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  /* Resource Library */
  card:       { ...CARD_BASE },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resourceItem: { width: '47%', borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  resourceName: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  resourceSize: { fontSize: 11, color: COLORS.textSecondary },

  /* Uploaded notes */
  notesList:      { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 8 },
  notesListTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 4 },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.surfaceEl, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  noteRowName: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  noteRowSize: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  /* Modals */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%', backgroundColor: COLORS.surface,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 24,
  },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: COLORS.surfaceEl, alignItems: 'center', justifyContent: 'center',
  },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  modalSub:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 18 },
  inputLabel:   { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  modalInput: {
    backgroundColor: COLORS.surfaceEl, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 13,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  modalActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  modalCancelText:  { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalConfirm: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.accent, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});