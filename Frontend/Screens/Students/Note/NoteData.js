import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';

// Native-only imports — wrapped so web bundler doesn't crash
let FileSystem, IntentLauncher, Sharing;
if (Platform.OS !== 'web') {
  FileSystem     = require('expo-file-system');
  IntentLauncher = require('expo-intent-launcher');
  Sharing        = require('expo-sharing');
}

const BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, '');

// ─── Type badge colours ───────────────────────────────────────────────────────
const TYPE_COLORS = {
  Lecture:     { bg: '#1E3A5F', text: '#60A5FA', border: '#2563AB' },
  'Lab Sheet': { bg: '#1A3D2E', text: '#34D399', border: '#059669' },
  Tutorial:    { bg: '#3B2A1A', text: '#FB923C', border: '#C2410C' },
  Link:        { bg: '#2A1A55', text: '#B06EFF', border: '#7C3AED' },
};

// ─── iOS UTI map ──────────────────────────────────────────────────────────────
function mimeTypeToUTI(mime = '') {
  const map = {
    'application/pdf': 'com.adobe.pdf',
    'image/jpeg':      'public.jpeg',
    'image/png':       'public.png',
    'image/gif':       'com.compuserve.gif',
    'video/mp4':       'public.mpeg-4',
    'video/quicktime': 'com.apple.quicktime-movie',
    'application/vnd.ms-powerpoint': 'com.microsoft.powerpoint.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'org.openxmlformats.presentationml.presentation',
    'application/msword': 'com.microsoft.word.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'org.openxmlformats.wordprocessingml.document',
    'application/vnd.ms-excel': 'com.microsoft.excel.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      'org.openxmlformats.spreadsheetml.sheet',
    'application/zip': 'public.zip-archive',
  };
  return map[mime] || 'public.data';
}

// ─── File type helpers ────────────────────────────────────────────────────────
function getFileIcon(mimeType = '', fileName = '') {
  const n = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || n.endsWith('.pdf'))                  return '📄';
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)/.test(n)) return '🖼️';
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi)/.test(n))           return '🎬';
  if (/ppt|pptx/.test(mimeType)    || /\.(ppt|pptx)/.test(n))              return '📊';
  if (/word|doc/.test(mimeType)    || /\.(doc|docx)/.test(n))              return '📝';
  if (/excel|sheet|csv/.test(mimeType) || /\.(xls|xlsx|csv)/.test(n))      return '📊';
  if (/zip|rar|tar/.test(mimeType) || /\.(zip|rar|gz)/.test(n))            return '🗜️';
  return '📎';
}

// What renderer to use for web inline preview
function getWebViewerType(mimeType = '', fileName = '') {
  const n = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || n.endsWith('.pdf'))                  return 'pdf';
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)/.test(n)) return 'image';
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|webm)/.test(n))      return 'video';
  if (/word|doc|excel|sheet|ppt|presentation/.test(mimeType) ||
      /\.(doc|docx|xls|xlsx|ppt|pptx)/.test(n))                             return 'office';
  return 'other';
}

// ─── Web File Viewer (pure DOM — rendered outside RN tree via dangerouslySetInnerHTML trick)
// We render a fixed-position div directly so it sits on top of everything.
function WebFileViewer({ visible, url, mimeType, fileName, onClose }) {
  if (!visible || Platform.OS !== 'web') return null;

  const viewerType = getWebViewerType(mimeType, fileName);
  const iframeSrc  = viewerType === 'office'
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    : url;

  // Render using React DOM elements (valid in RNW / Expo web)
  return (
    <div style={ws.overlay}>
      {/* Header */}
      <div style={ws.header}>
        <div style={ws.headerLeft}>
          <span style={{ fontSize: 20 }}>{getFileIcon(mimeType, fileName)}</span>
          <span style={ws.fileName}>{fileName}</span>
        </div>
        <div style={ws.headerRight}>
          <a href={url} download={fileName} style={ws.dlBtn}>⬇ Download</a>
          <button onClick={onClose} style={ws.closeBtn}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={ws.body}>
        {(viewerType === 'pdf' || viewerType === 'office') && (
          <iframe src={iframeSrc} style={ws.iframe} title={fileName} allowFullScreen />
        )}

        {viewerType === 'image' && (
          <div style={ws.imgWrap}>
            <img src={url} alt={fileName} style={ws.img} />
          </div>
        )}

        {viewerType === 'video' && (
          <div style={ws.videoWrap}>
            <video src={url} controls style={ws.video} />
          </div>
        )}

        {viewerType === 'other' && (
          <div style={ws.unsupported}>
            <span style={{ fontSize: 48 }}>📎</span>
            <p style={{ color: '#8B98C8', marginTop: 16, fontSize: 15 }}>
              This file type cannot be previewed inline.
            </p>
            <a href={url} download={fileName} style={ws.dlBtnLg}>⬇ Download File</a>
          </div>
        )}
      </div>
    </div>
  );
}

// Plain-object styles for web DOM elements
const ws = {
  overlay:   { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,9,18,0.97)', zIndex: 9999, display: 'flex', flexDirection: 'column' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: '#0C1221', borderBottom: '1px solid #1C2640', flexShrink: 0 },
  headerLeft:{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' },
  fileName:  { color: '#F1F5FF', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  dlBtn:     { padding: '7px 14px', borderRadius: 20, border: '1px solid #3B82F6', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' },
  closeBtn:  { width: 36, height: 36, borderRadius: '50%', border: '1px solid #1C2640', backgroundColor: '#111827', color: '#8B98C8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body:      { flex: 1, overflow: 'hidden', display: 'flex' },
  iframe:    { width: '100%', height: '100%', border: 'none', flex: 1 },
  imgWrap:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 20, backgroundColor: '#060912' },
  img:       { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 },
  videoWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  video:     { maxWidth: '100%', maxHeight: '100%' },
  unsupported:{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  dlBtnLg:   { marginTop: 20, padding: '12px 28px', borderRadius: 12, border: '1px solid #3B82F6', backgroundColor: 'rgba(59,130,246,0.2)', color: '#3B82F6', fontSize: 15, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' },
};

// ─── Native file opener ───────────────────────────────────────────────────────
async function openNative(url, mimeType, fileName, setLoading) {
  try {
    setLoading(true);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localUri = FileSystem.cacheDirectory + safeName;
    const { uri }  = await FileSystem.downloadAsync(url, localUri);

    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data:  contentUri,
        flags: 1,
        type:  mimeType,
      });
    } else {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType,
          UTI:         mimeTypeToUTI(mimeType),
          dialogTitle: fileName,
        });
      } else {
        Alert.alert('Cannot Open', 'No app available to open this file type.');
      }
    }
  } catch (err) {
    console.error('openNative error:', err);
    Alert.alert('Error', 'Could not open file: ' + err.message);
  } finally {
    setLoading(false);
  }
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────
const NoteCard = ({ note, accentColor, C, onOpen }) => {
  const typeStyle = TYPE_COLORS[note.type] ?? TYPE_COLORS.Lecture;
  const hasUrl    = !!note.url;
  const fileIcon  = note.type === 'Link' ? '🔗' : getFileIcon(note.mimeType, note.fileName);

  return (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={() => onOpen(note)}
      activeOpacity={0.8}
    >
      {/* Top row */}
      <View style={styles.noteTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.fileIconBadge, { backgroundColor: typeStyle.bg }]}>
            <Text style={styles.fileIconEmoji}>{fileIcon}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
            <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>{note.type}</Text>
          </View>
        </View>
        <Text style={[styles.noteTag, { color: C.textMuted }]}>{note.tag}</Text>
      </View>

      {/* Title */}
      <Text style={[styles.noteTitle, { color: C.textPrimary }]}>{note.title}</Text>

      {/* Description preview */}
      {!!note.preview && note.preview !== note.title && (
        <Text style={[styles.notePreview, { color: C.textSub ?? C.textMuted }]} numberOfLines={2}>
          {note.preview}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.noteFooter}>
        {note.type !== 'Link' && (
          <Text style={[styles.noteMeta, { color: C.textMuted }]}>
            {note.pages > 0 ? `~${note.pages} pages` : 'File'}
          </Text>
        )}
        <Text style={[styles.noteMeta, { color: C.textMuted }]}>{note.date}</Text>

        <TouchableOpacity
          style={[
            styles.openBtn,
            {
              backgroundColor: hasUrl ? accentColor + '22' : '#88888822',
              borderColor:     hasUrl ? accentColor + '66' : '#88888844',
            },
          ]}
          onPress={() => onOpen(note)}
          activeOpacity={0.75}
          disabled={!hasUrl}
        >
          <Text style={[styles.openBtnText, { color: hasUrl ? accentColor : '#888' }]}>
            {note.type === 'Link' ? '↗ Open' : '▶ Open'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main NotesData Screen ────────────────────────────────────────────────────
export default function NotesData({ course, onBack, C, onThemeToggle, user }) {
  const [notes,         setNotes]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [viewerNote,    setViewerNote]    = useState(null);  // web viewer state
  const [nativeLoading, setNativeLoading] = useState(false); // native loading overlay

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  useEffect(() => {
    if (!user?.id || !course?.title) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const subjectName = encodeURIComponent(course.title);
        const res  = await axiosInstance.get(
          `/lesson-planner/student/${user.id}/subject/${subjectName}`
        );
        const json = res.data;

        if (json.success && json.resources?.length > 0) {
          setNotes(
            json.resources.map((r, i) => ({
              id:       r.id || r._id || `note-${i}`,
              title:    r.name,
              fileName: r.name,
              mimeType: r.mimeType || 'application/octet-stream',
              type:     r.type === 'link'
                ? 'Link'
                : course.type === 'Lab' ? 'Lab Sheet' : 'Lecture',
              pages:    r.size ? Math.ceil(r.size / 50000) : 0,
              date:     r.uploadedAt
                ? new Date(r.uploadedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })
                : '',
              tag:      json.topics?.[i]?.unit  || '',
              preview:  r.description || json.topics?.[i]?.title || '',
              url: r.type === 'link'
                ? (r.uri || r.url || '')
                : (r.url ? `${BASE_URL}${r.url}` : ''),
            }))
          );
        } else {
          setNotes([]);
        }
      } catch (err) {
        console.log('Error fetching notes:', err);
        Alert.alert('Error', 'Could not load notes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user, course]);

  // ── Open handler ─────────────────────────────────────────────────────────
  const handleOpen = (note) => {
    if (!note.url) {
      Alert.alert('Unavailable', 'No file attached to this note.');
      return;
    }

    // External links → browser on all platforms
    if (note.type === 'Link') {
      Linking.openURL(note.url).catch(() =>
        Alert.alert('Error', 'Could not open link.')
      );
      return;
    }

    if (Platform.OS === 'web') {
      // Show in-app iframe/image/video viewer
      setViewerNote(note);
    } else {
      // Android/iOS: download to cache then hand off to native viewer
      openNative(note.url, note.mimeType, note.fileName, setNativeLoading);
    }
  };

  const fileCount = notes.filter(n => n.type !== 'Link').length;
  const linkCount = notes.filter(n => n.type === 'Link').length;
  const pageCount = notes.reduce((s, n) => s + n.pages, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar ?? 'light-content'} backgroundColor={C.bg} />

      {/* ── Web in-app viewer (fixed overlay, rendered as plain DOM) ── */}
      {Platform.OS === 'web' && (
        <WebFileViewer
          visible={!!viewerNote}
          url={viewerNote?.url}
          mimeType={viewerNote?.mimeType}
          fileName={viewerNote?.fileName}
          onClose={() => setViewerNote(null)}
        />
      )}

      {/* ── Native opening overlay ── */}
      {nativeLoading && (
        <View style={styles.nativeOverlay}>
          <View style={styles.nativeCard}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.nativeCardText}>Opening file…</Text>
          </View>
        </View>
      )}

      {/* ── Header ── */}
      <View style={[styles.header, isWide && styles.headerWide, { backgroundColor: C.card }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={[styles.backArrow, { color: C.textMuted }]}>←</Text>
            <Text style={[styles.backLabel,  { color: C.textMuted }]}>Back</Text>
          </TouchableOpacity>
          {onThemeToggle && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.iconBtn, { backgroundColor: C.bg, borderColor: C.border }]}
              onPress={onThemeToggle}
            >
              <Text style={styles.iconBtnText}>{C.moonIcon ?? '🌙'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerBody}>
          <View style={[styles.headerIcon, { backgroundColor: course.bg }]}>
            <Text style={[styles.headerIconText, { color: course.color }]}>{course.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseIdLabel, { color: C.textMuted }]}>{course.id}</Text>
            <Text style={[styles.courseTitle, { color: C.textPrimary }]} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum,   { color: course.color }]}>{fileCount}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> Files</Text>
          </View>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum,   { color: course.color }]}>{pageCount}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> Pages</Text>
          </View>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum,   { color: course.color }]}>{linkCount}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> Links</Text>
          </View>
        </View>
      </View>

      <View style={[styles.accentLine, { backgroundColor: course.color }]} />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>All Notes</Text>
        <Text style={[styles.sectionCount, { color: C.textMuted }]}>{notes.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={course.color} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Loading notes…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.notesList, isWide && styles.notesListWide]}
          showsVerticalScrollIndicator={false}
        >
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: C.textMuted }]}>
                No notes available for this course yet.
              </Text>
            </View>
          ) : (
            notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                accentColor={course.color}
                C={C}
                onOpen={handleOpen}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header:         { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 12, paddingBottom: 16 },
  headerWide:     { paddingHorizontal: 36 },
  headerTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backArrow:      { fontSize: 20, lineHeight: 22 },
  backLabel:      { fontSize: 14, fontWeight: '600' },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtnText:    { fontSize: 16 },
  headerBody:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  headerIcon:     { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 24, fontWeight: '700' },
  courseIdLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  courseTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statsRow:       { flexDirection: 'row', gap: 10 },
  statPill:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statNum:        { fontSize: 14, fontWeight: '800' },
  statLabel:      { fontSize: 13, fontWeight: '500' },

  accentLine:    { height: 2, opacity: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  sectionCount:  { fontSize: 12, fontWeight: '500' },

  loadingState:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyState:    { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:     { fontSize: 40 },
  emptyText:     { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingHorizontal: 30 },

  notesList:     { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  notesListWide: { paddingHorizontal: 36 },

  noteCard: {
    borderRadius: 14, padding: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, overflow: 'hidden',
  },
  noteTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fileIconBadge: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fileIconEmoji: { fontSize: 16 },
  typeBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  noteTag:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  noteTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  notePreview:   { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  noteFooter:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteMeta:      { fontSize: 12, fontWeight: '500' },
  openBtn:       { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  openBtnText:   { fontSize: 12, fontWeight: '700' },

  // Native overlay
  nativeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  nativeCard:    { backgroundColor: '#0C1221', borderRadius: 16, borderWidth: 1, borderColor: '#1C2640', padding: 28, alignItems: 'center', gap: 14 },
  nativeCardText:{ color: '#F1F5FF', fontSize: 15, fontWeight: '600' },
});