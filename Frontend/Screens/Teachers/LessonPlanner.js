// Screens/Teacher/LessonPlannerScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
//  Campus360 — Notes  (Teacher View)
//
//  FLOW:
//  SubjectListView  →  tap subject  →  SubjectDetailView
//    SubjectDetailView shows all uploaded resources + FAB → AddResourceModal
//    AddResourceModal has two tabs: "Document" (file upload) | "Link" (URL)
//
//  APIs:
//  • GET  /api/timetable/teacher/:id         → years, divisions, subjects
//  • POST /api/lesson-planner                → upsert plan
//  • GET  /api/lesson-planner/:id            → fetch single plan (for resources)
//  • POST /api/lesson-planner/:id/resources/upload  → file upload
//  • POST /api/lesson-planner/:id/resources         → add link
//  • DELETE /api/lesson-planner/:id/resources/:rid  → remove resource
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Linking, Modal,
  Platform, RefreshControl, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import axiosInstance from '../../Src/Axios';

/* ─── Palette ────────────────────────────────────────────────────────────── */
const P = {
  bg: '#060912', panel: '#0C1221', card: '#111827', border: '#1C2640',
  blue: '#3B82F6', blueMid: '#2563EB', blueSoft: 'rgba(59,130,246,0.14)',
  teal: '#14B8A6', tealSoft: 'rgba(20,184,166,0.14)',
  violet: '#8B5CF6', violetSoft: 'rgba(139,92,246,0.14)',
  amber: '#F59E0B', amberSoft: 'rgba(245,158,11,0.14)',
  green: '#22C55E', greenSoft: 'rgba(34,197,94,0.14)',
  red: '#EF4444', redSoft: 'rgba(239,68,68,0.14)',
  cyan: '#06B6D4', cyanSoft: 'rgba(6,182,212,0.14)',
  t1: '#F1F5FF', t2: '#8B98C8', t3: '#3D4F7A', t4: '#1E2D50',
};

const { width: SW } = Dimensions.get('window');
const IS_TABLET = SW >= 768;
const SAFE_T = Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 0) + 10;
const SAFE_B = Platform.OS === 'ios' ? 28 : 16;

/* ─── Colour palette ─────────────────────────────────────────────────────── */
const PALETTE = [
  { text: P.blue,   bg: P.blueSoft   },
  { text: P.violet, bg: P.violetSoft },
  { text: P.cyan,   bg: P.cyanSoft   },
  { text: P.teal,   bg: P.tealSoft   },
  { text: P.amber,  bg: P.amberSoft  },
  { text: P.green,  bg: P.greenSoft  },
  { text: P.red,    bg: P.redSoft    },
];

const buildColorMap = (subjects) => {
  const m = {};
  subjects.forEach((s, i) => { m[s.toLowerCase()] = PALETTE[i % PALETTE.length]; });
  return m;
};

const getSubColor = (subject = '', map) => {
  const k = subject.toLowerCase().trim();
  if (map[k]) return map[k];
  const hit = Object.keys(map).find(key => k.includes(key) || key.includes(k));
  if (hit) return map[hit];
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/* ─── Chip row ───────────────────────────────────────────────────────────── */
function ChipRow({ items, selected, onSelect, color = P.blue, soft }) {
  const bg = soft || (color + '22');
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {items.map((item) => {
        const key   = typeof item === 'string' ? item : item.key;
        const label = typeof item === 'string' ? item : item.label;
        const active = selected === key;
        return (
          <TouchableOpacity key={key} onPress={() => onSelect(key)}
            style={[ch.base, active && { backgroundColor: bg, borderColor: color }]}>
            <Text style={[ch.txt, active && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const ch = StyleSheet.create({
  base: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: P.border, backgroundColor: P.card },
  txt:  { fontSize: 13, fontWeight: '600', color: P.t2 },
});

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (name = '', type = 'file') => {
  if (type === 'link') return 'link-outline';
  const n = name.toLowerCase();
  if (n.endsWith('.pdf'))                      return 'document-text-outline';
  if (/\.(png|jpg|jpeg|gif|webp)/.test(n))    return 'image-outline';
  if (/\.(mp4|mov|avi)/.test(n))              return 'videocam-outline';
  if (/\.(ppt|pptx)/.test(n))                return 'easel-outline';
  if (/\.(doc|docx)/.test(n))                return 'reader-outline';
  if (/\.(xls|xlsx|csv)/.test(n))             return 'grid-outline';
  if (/\.(zip|rar|tar|gz)/.test(n))           return 'archive-outline';
  return 'attach-outline';
};

const relativeTime = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  ADD RESOURCE MODAL
 *  Two tabs: Document (file) | Link (URL)
 * ═══════════════════════════════════════════════════════════════════════════ */
function AddResourceModal({ visible, subject, onClose, onSaveFile, onSaveLink, saving }) {
  const [tab,         setTab]         = useState('document'); // 'document' | 'link'
  const [description, setDescription] = useState('');
  const [pickedFile,  setPickedFile]  = useState(null);
  const [linkUrl,     setLinkUrl]     = useState('');
  const [linkName,    setLinkName]    = useState('');

  const reset = () => {
    setTab('document');
    setDescription('');
    setPickedFile(null);
    setLinkUrl('');
    setLinkName('');
  };

  const handleClose = () => { reset(); onClose(); };

 const pickFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      if (Platform.OS === "web") {
        setPickedFile(asset.file); // important
      } else {
        setPickedFile(asset);
      }
    }
  } catch (err) {
    Alert.alert("Error", "Could not open file picker.");
  }
};

  const handleSave = () => {
  if (!description.trim()) { Alert.alert('Required', 'Please add a description.'); return; }

  if (tab === 'document') {
    if (!pickedFile) { Alert.alert('Required', 'Please select a file.'); return; }
    
    // Pass the raw pickedFile — handleSaveFile will handle platform differences
    onSaveFile({ description: description.trim(), file: pickedFile });
    reset();
  } else {
    if (!linkUrl.trim()) { Alert.alert('Required', 'Please enter a URL.'); return; }
    const name = linkName.trim() || linkUrl.trim();
    onSaveLink({ description: description.trim(), name, uri: linkUrl.trim() });
    reset();
  }
};

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={am.overlay}>
        <View style={am.sheet}>

          {/* Handle */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: P.t4 }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={[am.iconBox, { backgroundColor: P.blueSoft }]}>
              <Ionicons name="add-circle-outline" size={20} color={P.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={am.title}>Add Resource</Text>
              {!!subject && <Text style={am.subtitle}>{subject}</Text>}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={P.t2} />
            </TouchableOpacity>
          </View>

          {/* ── Tab switcher ── */}
          <View style={am.tabRow}>
            <TouchableOpacity
              onPress={() => setTab('document')}
              style={[am.tabBtn, tab === 'document' && am.tabBtnActive]}
            >
              <Ionicons name="document-attach-outline" size={15}
                color={tab === 'document' ? P.blue : P.t3} />
              <Text style={[am.tabTxt, tab === 'document' && { color: P.blue }]}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab('link')}
              style={[am.tabBtn, tab === 'link' && am.tabBtnActive]}
            >
              <Ionicons name="link-outline" size={15}
                color={tab === 'link' ? P.teal : P.t3} />
              <Text style={[am.tabTxt, tab === 'link' && { color: P.teal }]}>Link</Text>
            </TouchableOpacity>
          </View>

          {/* ── Description (shared) ── */}
          <Text style={am.label}>Description</Text>
          <TextInput
            style={am.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Chapter 3 notes — Newton's Laws and derivations"
            placeholderTextColor={P.t3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* ── Document tab ── */}
          {tab === 'document' && (
            <>
              <Text style={[am.label, { marginTop: 18 }]}>File</Text>
              {!pickedFile ? (
                <TouchableOpacity onPress={pickFile} style={am.pickArea} activeOpacity={0.8}>
                  <View style={[am.pickIconBox, { backgroundColor: P.blueSoft }]}>
                    <Ionicons name="cloud-upload-outline" size={26} color={P.blue} />
                  </View>
                  <Text style={am.pickTitle}>Tap to choose a file</Text>
                  <Text style={am.pickSub}>PDF · Word · PPT · Image · Video · up to 20 MB</Text>
                </TouchableOpacity>
              ) : (
                <View style={am.filePreview}>
                  <View style={[am.fileIconBox, { backgroundColor: P.blueSoft }]}>
                    <Ionicons name={fileIcon(pickedFile.name)} size={20} color={P.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={am.fileName} numberOfLines={1}>{pickedFile.name}</Text>
                    <Text style={am.fileMeta}>{formatSize(pickedFile.size)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPickedFile(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={P.t3} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── Link tab ── */}
          {tab === 'link' && (
            <>
              <Text style={[am.label, { marginTop: 18 }]}>URL</Text>
              <TextInput
                style={am.input}
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://drive.google.com/..."
                placeholderTextColor={P.t3}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={[am.label, { marginTop: 14 }]}>Display Name (optional)</Text>
              <TextInput
                style={am.input}
                value={linkName}
                onChangeText={setLinkName}
                placeholder="e.g. Google Drive — Unit 3 Slides"
                placeholderTextColor={P.t3}
              />
            </>
          )}

          {/* ── Actions ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <TouchableOpacity onPress={handleClose}
              style={[am.btn, { flex: 1, borderColor: P.border, backgroundColor: P.card }]}>
              <Text style={{ color: P.t2, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[am.btn, {
                flex: 2,
                backgroundColor: tab === 'document' ? P.blueMid : P.teal,
                borderColor:     tab === 'document' ? P.blueMid : P.teal,
                opacity: saving ? 0.6 : 1,
              }]}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons
                      name={tab === 'document' ? 'cloud-upload-outline' : 'link-outline'}
                      size={15} color="#fff"
                    />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {tab === 'document' ? 'Upload' : 'Save Link'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: P.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: SAFE_B + 16, borderWidth: 1, borderBottomWidth: 0, borderColor: P.border },
  iconBox:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 17, fontWeight: '800', color: P.t1 },
  subtitle:    { fontSize: 12, color: P.t3, marginTop: 2 },
  tabRow:      { flexDirection: 'row', backgroundColor: P.card, borderRadius: 12, borderWidth: 1, borderColor: P.border, padding: 4, gap: 4, marginBottom: 20 },
  tabBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  tabBtnActive:{ backgroundColor: P.panel },
  tabTxt:      { fontSize: 13, fontWeight: '700', color: P.t3 },
  label:       { fontSize: 11, fontWeight: '700', color: P.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  textArea:    { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 13, fontSize: 14, color: P.t1, minHeight: 80, textAlignVertical: 'top' },
  input:       { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 13, fontSize: 14, color: P.t1 },
  pickArea:    { borderWidth: 1.5, borderColor: P.border, borderRadius: 14, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 7 },
  pickIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pickTitle:   { fontSize: 14, fontWeight: '700', color: P.t2 },
  pickSub:     { fontSize: 11, color: P.t3, textAlign: 'center' },
  filePreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.card, borderRadius: 12, borderWidth: 1, borderColor: P.border, padding: 12 },
  fileIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName:    { fontSize: 13, fontWeight: '700', color: P.t1 },
  fileMeta:    { fontSize: 11, color: P.t3, marginTop: 2 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  RESOURCE CARD
 * ═══════════════════════════════════════════════════════════════════════════ */
function ResourceCard({ resource: r, onDelete }) {
  const isLink  = r.type === 'link';
  const accent  = isLink ? P.teal : P.blue;
  const accentSoft = isLink ? P.tealSoft : P.blueSoft;

  return (
    <View style={rc.card}>
      {/* Left icon */}
      <View style={[rc.iconBox, { backgroundColor: accentSoft }]}>
        <Ionicons name={fileIcon(r.name, r.type)} size={20} color={accent} />
      </View>

      {/* Body */}
      <View style={{ flex: 1, gap: 3 }}>
        {/* Type badge + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[rc.typeBadge, { backgroundColor: accentSoft }]}>
            <Text style={[rc.typeTxt, { color: accent }]}>{isLink ? 'LINK' : 'FILE'}</Text>
          </View>
          <Text style={rc.time}>{relativeTime(r.uploadedAt || r.createdAt)}</Text>
        </View>

        {/* Name */}
        <Text style={rc.name} numberOfLines={1}>{r.name}</Text>

        {/* Description */}
        {!!r.description && (
          <Text style={rc.desc} numberOfLines={2}>{r.description}</Text>
        )}

        {/* Size or URL */}
        {r.size
          ? <Text style={rc.meta}>{formatSize(r.size)}</Text>
          : isLink
            ? <Text style={rc.meta} numberOfLines={1}>{r.uri}</Text>
            : null
        }
      </View>

      {/* Actions */}
      <View style={{ gap: 6 }}>
        {isLink && (
          <TouchableOpacity
            onPress={() => Linking.openURL(r.uri).catch(() => Alert.alert('Error', 'Could not open link.'))}
            style={[rc.actionBtn, { backgroundColor: P.tealSoft }]}
          >
            <Ionicons name="open-outline" size={15} color={P.teal} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onDelete}
          style={[rc.actionBtn, { backgroundColor: P.redSoft }]}
        >
          <Ionicons name="trash-outline" size={15} color={P.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: P.card, borderRadius: 14, borderWidth: 1, borderColor: P.border, padding: 14 },
  iconBox:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  typeTxt:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  time:      { fontSize: 11, color: P.t3 },
  name:      { fontSize: 14, fontWeight: '700', color: P.t1 },
  desc:      { fontSize: 12, color: P.t2, lineHeight: 17 },
  meta:      { fontSize: 11, color: P.t3 },
  actionBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  SUBJECT DETAIL VIEW  (shown when a subject is tapped)
 * ═══════════════════════════════════════════════════════════════════════════ */
function SubjectDetailView({ subject, plan, sc, onBack, onResourceAdded }) {
  const [resources,    setResources]    = useState(plan?.resources || []);
  const [loadingPlan,  setLoadingPlan]  = useState(!plan);
  const [planId,       setPlanId]       = useState(plan?._id || null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (plan?._id) {
      setPlanId(plan._id);
      setResources(plan.resources || []);
      setLoadingPlan(false);
    }
  }, [plan]);

  const refreshPlan = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await axiosInstance.get(`/lesson-planner/${planId}`);
      if (res.data?.success) setResources(res.data.data?.resources || []);
    } catch (e) {
      console.warn('refreshPlan:', e.message);
    }
  }, [planId]);

  const onRefresh = async () => { setRefreshing(true); await refreshPlan(); setRefreshing(false); };

  /* Upload file */
const handleSaveFile = async ({ description, file }) => {
  const formData = new FormData();

  if (Platform.OS === "web") {
    // On web, file is already a browser File object — append directly
    formData.append("resource", file, file.name);
  } else {
    // On native, file is { uri, name, mimeType }
    formData.append("resource", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    });
  }

  formData.append("description", description);

  setSaving(true);
  try {
    const res = await axiosInstance.post(
      `/lesson-planner/${planId}/resources/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (res.data?.success) {
      await refreshPlan();
      setShowAdd(false);
      onResourceAdded?.();
    }
  } catch (err) {
    Alert.alert("Error", err.response?.data?.message || "Could not upload file.");
    console.log("Upload error:", err.response?.data);
  } finally {
    setSaving(false);
  }
};

  /* Save link */
  const handleSaveLink = useCallback(async ({ description, name, uri }) => {
    if (!planId) return;
    setSaving(true);
    try {
      const res = await axiosInstance.post(`/lesson-planner/${planId}/resources`, { name, uri, description });
      if (res.data?.success) {
        await refreshPlan();
        setShowAdd(false);
        onResourceAdded?.();
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save link.');
    } finally {
      setSaving(false);
    }
  }, [planId, refreshPlan]);

  /* Delete resource */
  const handleDelete = (rid) => {
    Alert.alert('Remove Resource', 'Are you sure you want to delete this resource?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await axiosInstance.delete(`/lesson-planner/${planId}/resources/${rid}`);
            setResources(prev => prev.filter(r => r._id !== rid));
          } catch (e) {
            Alert.alert('Error', 'Could not delete resource.');
          }
        },
      },
    ]);
  };

  const fileResources = resources.filter(r => r.type === 'file');
  const linkResources = resources.filter(r => r.type === 'link');

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {/* Sub-header */}
      <View style={[dv.subHeader, { borderBottomColor: sc.text + '33' }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.78}>
          <Ionicons name="chevron-back" size={20} color={P.t2} />
        </TouchableOpacity>
        <View style={[dv.subjectPill, { backgroundColor: sc.bg, borderColor: sc.text + '44' }]}>
          <Text style={[dv.subjectPillTxt, { color: sc.text }]}>{subject}</Text>
        </View>
        <Text style={dv.countTxt}>{resources.length} resource{resources.length !== 1 ? 's' : ''}</Text>
      </View>

      {loadingPlan ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={P.blue} />
          <Text style={s.mutedTxt}>Loading resources…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.blue} colors={[P.blue]} />}
          contentContainerStyle={{ paddingHorizontal: IS_TABLET ? 32 : 16, paddingTop: 18, paddingBottom: 100, gap: 20 }}
        >

          {/* Empty state */}
          {resources.length === 0 && (
            <View style={s.center}>
              <View style={[s.emptyIcon, { backgroundColor: sc.bg }]}>
                <Ionicons name="folder-open-outline" size={30} color={sc.text} />
              </View>
              <Text style={s.emptyTitle}>No Resources Yet</Text>
              <Text style={s.mutedTxt}>Tap the button below to add your first document or link.</Text>
            </View>
          )}

          {/* Documents section */}
          {fileResources.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={dv.sectionHead}>
                <Ionicons name="document-attach-outline" size={14} color={P.blue} />
                <Text style={[dv.sectionTitle, { color: P.blue }]}>Documents</Text>
                <Text style={dv.sectionCount}>{fileResources.length}</Text>
              </View>
              {fileResources.map(r => (
                <ResourceCard key={r._id} resource={r} onDelete={() => handleDelete(r._id)} />
              ))}
            </View>
          )}

          {/* Links section */}
          {linkResources.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={dv.sectionHead}>
                <Ionicons name="link-outline" size={14} color={P.teal} />
                <Text style={[dv.sectionTitle, { color: P.teal }]}>Links</Text>
                <Text style={dv.sectionCount}>{linkResources.length}</Text>
              </View>
              {linkResources.map(r => (
                <ResourceCard key={r._id} resource={r} onDelete={() => handleDelete(r._id)} />
              ))}
            </View>
          )}

        </ScrollView>
      )}

      {/* FAB */}
      <View style={dv.fab}>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[dv.fabBtn, { backgroundColor: sc.text }]} activeOpacity={0.88}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={dv.fabTxt}>Add Resource</Text>
        </TouchableOpacity>
      </View>

      {/* Add modal */}
      <AddResourceModal
        visible={showAdd}
        subject={subject}
        onClose={() => setShowAdd(false)}
        onSaveFile={handleSaveFile}
        onSaveLink={handleSaveLink}
        saving={saving}
      />
    </Animated.View>
  );
}

const dv = StyleSheet.create({
  subHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  subjectPill:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  subjectPillTxt:{ fontSize: 13, fontWeight: '800' },
  countTxt:      { marginLeft: 'auto', fontSize: 12, color: P.t3, fontWeight: '500' },
  sectionHead:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionCount:  { fontSize: 11, color: P.t3, marginLeft: 2 },
  fab:           { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: IS_TABLET ? 32 : 16, paddingBottom: SAFE_B + 8, paddingTop: 12, backgroundColor: P.panel + 'f0', borderTopWidth: 1, borderTopColor: P.border },
  fabBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, paddingVertical: 15 },
  fabTxt:        { fontSize: 14, fontWeight: '800', color: '#fff' },
});

/* ═══════════════════════════════════════════════════════════════════════════
 *  MAIN SCREEN
 * ═══════════════════════════════════════════════════════════════════════════ */
export default function LessonPlannerScreen() {
  const navigation = useNavigation();

  const [teacherId,   setTeacherId]   = useState(null);
  const [teacherName, setTeacherName] = useState('Teacher');

  /* Timetable-derived */
  const [years,     setYears]     = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [colorMap,  setColorMap]  = useState({});

  /* Filters */
  const [selYear, setSelYear] = useState(null);
  const [selDiv,  setSelDiv]  = useState(null);
  const [selType, setSelType] = useState('theory');

  /* Navigation state: null = subject list, else = { subject, plan } */
  const [activeSubject, setActiveSubject] = useState(null);
  const [activePlan,    setActivePlan]    = useState(null);

  const [ttLoading,  setTtLoading]  = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    initLoad();
  }, []);

  const initLoad = async () => {
    try {
      const id   = await AsyncStorage.getItem('teacherId');
      const name = await AsyncStorage.getItem('teacherName');
      if (id)   setTeacherId(id);
      if (name) setTeacherName(name);
      if (id)   await fetchTimetable(id);
    } catch (e) {
      console.warn('LessonPlanner initLoad:', e.message);
    }
  };

  /* GET /api/timetable/teacher/:id — same as DoubtSessionScreen */
  const fetchTimetable = useCallback(async (id) => {
    if (!id) return;
    setTtLoading(true);
    try {
      const res = await axiosInstance.get(`/timetable/teacher/${id}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const rows = res.data.data;
        const uniqueYears = [...new Set(rows.map(r => String(r.year)).filter(Boolean))].sort();
        setYears(uniqueYears);
        setSelYear(prev => prev || uniqueYears[0] || null);
        const uniqueDivs = [...new Set(rows.map(r => r.division).filter(Boolean))].sort();
        setDivisions(uniqueDivs);
        setSelDiv(prev => prev || uniqueDivs[0] || null);
        const uniqueSubs = [...new Set(rows.map(r => r.subject).filter(Boolean))].sort();
        setSubjects(uniqueSubs);
        setColorMap(buildColorMap(uniqueSubs));
      }
    } catch (e) {
      console.warn('LessonPlanner fetchTimetable:', e.message);
    } finally {
      setTtLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimetable(teacherId);
    setRefreshing(false);
  };

  // Map frontend values to backend enums
  const YEAR_MAP = { '1': 'FY', '2': 'SY', '3': 'TY' };
  const TYPE_MAP = { 'theory': 'Theory', 'practical': 'Lab', 'tutorial': 'Theory' };

  const openSubject = useCallback(async (subject) => {
    if (!teacherId || !selYear || !selDiv) {
      Alert.alert('Select filters', 'Please choose a year and division first.');
      return;
    }
    setActiveSubject(subject);
    setPlanLoading(true);
    try {
      const mappedYear = YEAR_MAP[selYear] || selYear;
      const mappedType = TYPE_MAP[selType] || selType;
      const res = await axiosInstance.post('/lesson-planner', {
        teacherId,
        year: mappedYear,
        division: selDiv,
        type: mappedType,
        subject,
      });
      if (res.data?.success) setActivePlan(res.data.data);
    } catch (e) {
      Alert.alert('Error', 'Could not open plan. Please try again.');
      setActiveSubject(null);
    } finally {
      setPlanLoading(false);
    }
  }, [teacherId, selYear, selDiv, selType]);

  const goBack = () => { setActiveSubject(null); setActivePlan(null); };

  /* Chip data */
  const yearItems = years.map(y => ({
    key: y,
    label: { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' }[y] || `Year ${y}`,
  }));
  const divItems  = divisions.map(d => ({ key: d, label: `Div ${d}` }));
  const typeItems = [
    { key: 'theory',    label: 'Theory'    },
    { key: 'practical', label: 'Practical' },
    { key: 'tutorial',  label: 'Tutorial'  },
  ];

  /* ═══════════════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════════════ */
  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor={P.panel} />

      {/* ── Main header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={activeSubject ? goBack : () => navigation.goBack()}
          style={s.backBtn} activeOpacity={0.78}
        >
          <Ionicons name="chevron-back" size={20} color={P.t2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {activeSubject || 'Notes'}
          </Text>
          <Text style={s.headerSub}>
            {activeSubject ? 'Notes & resources' : 'Select a subject to manage resources'}
          </Text>
        </View>
        {teacherName ? (
          <View style={s.pill}>
            <Text style={s.pillTxt} numberOfLines={1}>👩‍🏫 {teacherName.split(' ')[0]}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Plan loading overlay ── */}
      {planLoading && (
        <View style={s.planLoadingBar}>
          <ActivityIndicator size="small" color={P.blue} />
          <Text style={{ color: P.t2, fontSize: 12, marginLeft: 8 }}>Opening {activeSubject}…</Text>
        </View>
      )}

      <Animated.View style={[{ flex: 1 }, { transform: [{ translateY: slideAnim }] }]}>

        {/* ══ SUBJECT DETAIL VIEW ══ */}
        {activeSubject && !planLoading ? (
          <SubjectDetailView
            subject={activeSubject}
            plan={activePlan}
            sc={getSubColor(activeSubject, colorMap)}
            onBack={goBack}
            onResourceAdded={() => {}}
          />
        ) : (

          /* ══ SUBJECT LIST VIEW ══ */
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.blue} colors={[P.blue]} />}
            contentContainerStyle={{ paddingHorizontal: IS_TABLET ? 32 : 16, paddingTop: 18, paddingBottom: 60, gap: 20 }}
          >

            {/* Filter panel */}
            <View style={s.filterPanel}>

              <View style={s.filterRow}>
                <View style={s.filterLabelRow}>
                  <Ionicons name="school-outline" size={13} color={P.teal} />
                  <Text style={[s.filterLabel, { color: P.teal }]}>Academic Year</Text>
                </View>
                {ttLoading
                  ? <Text style={s.mutedTxt}>Fetching from timetable…</Text>
                  : years.length === 0
                    ? <Text style={s.mutedTxt}>No years found.</Text>
                    : <ChipRow items={yearItems} selected={selYear} onSelect={setSelYear} color={P.teal} soft={P.tealSoft} />
                }
              </View>

              <View style={s.filterRow}>
                <View style={s.filterLabelRow}>
                  <Ionicons name="people-outline" size={13} color={P.violet} />
                  <Text style={[s.filterLabel, { color: P.violet }]}>Division</Text>
                </View>
                {ttLoading
                  ? <Text style={s.mutedTxt}>Fetching from timetable…</Text>
                  : divisions.length === 0
                    ? <Text style={s.mutedTxt}>No divisions found.</Text>
                    : <ChipRow items={divItems} selected={selDiv} onSelect={setSelDiv} color={P.violet} soft={P.violetSoft} />
                }
              </View>

              <View style={s.filterRow}>
                <View style={s.filterLabelRow}>
                  <Ionicons name="book-outline" size={13} color={P.amber} />
                  <Text style={[s.filterLabel, { color: P.amber }]}>Type</Text>
                </View>
                <ChipRow items={typeItems} selected={selType} onSelect={setSelType} color={P.amber} soft={P.amberSoft} />
              </View>

            </View>

            {/* Subject list */}
            {ttLoading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={P.blue} />
                <Text style={s.mutedTxt}>Loading your subjects…</Text>
              </View>
            ) : subjects.length === 0 ? (
              <View style={s.center}>
                <View style={s.emptyIcon}>
                  <Ionicons name="alert-circle-outline" size={30} color={P.t3} />
                </View>
                <Text style={s.emptyTitle}>No Subjects Found</Text>
                <Text style={s.mutedTxt}>No subjects were found in your timetable.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ gap: 2, marginBottom: 4 }}>
                  <Text style={s.sectionTitle}>Your Subjects</Text>
                  <Text style={s.sectionSub}>Tap to view and manage notes & resources</Text>
                </View>

                {subjects.map((sub) => {
                  const sc = getSubColor(sub, colorMap);
                  return (
                    <TouchableOpacity
                      key={sub}
                      onPress={() => openSubject(sub)}
                      activeOpacity={0.83}
                      style={[s.subjectRow, { borderLeftColor: sc.text }]}
                    >
                      {/* Icon */}
                      <View style={[s.subjectRowIcon, { backgroundColor: sc.bg }]}>
                        <Ionicons name="book-outline" size={20} color={sc.text} />
                      </View>

                      {/* Label */}
                      <View style={{ flex: 1 }}>
                        <Text style={[s.subjectRowName, { color: sc.text }]}>{sub}</Text>
                        <Text style={s.subjectRowMeta}>
                          Year {selYear} · Div {selDiv} · {selType}
                        </Text>
                      </View>

                      <Ionicons name="chevron-forward" size={16} color={P.t3} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          </ScrollView>
        )}
      </Animated.View>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: P.bg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: SAFE_T, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: P.panel, borderBottomWidth: 1, borderBottomColor: P.border },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: P.t1, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: P.t3, marginTop: 1 },
  pill:        { backgroundColor: P.blueSoft, borderRadius: 20, borderWidth: 1, borderColor: P.blue + '40', paddingHorizontal: 12, paddingVertical: 6 },
  pillTxt:     { fontSize: 11, fontWeight: '700', color: P.blue },

  planLoadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: P.card, borderBottomWidth: 1, borderBottomColor: P.border },

  filterPanel:    { backgroundColor: P.panel, borderRadius: 16, borderWidth: 1, borderColor: P.border, padding: 16, gap: 16 },
  filterRow:      { gap: 8 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mutedTxt:       { fontSize: 12, color: P.t3 },

  sectionTitle:   { fontSize: 16, fontWeight: '800', color: P.t1 },
  sectionSub:     { fontSize: 12, color: P.t3 },

  subjectRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: P.card, borderRadius: 14, borderWidth: 1, borderColor: P.border, borderLeftWidth: 3, paddingHorizontal: 14, paddingVertical: 14 },
  subjectRowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subjectRowName: { fontSize: 15, fontWeight: '800' },
  subjectRowMeta: { fontSize: 11, color: P.t3, marginTop: 2 },

  center:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: P.t1 },
});