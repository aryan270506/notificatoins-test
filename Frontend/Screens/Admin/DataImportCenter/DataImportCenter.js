/**
 * DataImportCenter.jsx
 *
 * Dependencies to install:
 *   npx expo install expo-document-picker expo-file-system
 *   npm install xlsx
 *
 * axiosInstance baseURL should point to your Express server,
 * e.g. "http://192.168.137.4:5000/api"
 */

import React, { useState, useCallback, useContext, useRef } from 'react';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Pressable,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const TABLET_BP = 600;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const UPLOAD_HISTORY_INIT = [
  {
    id: 1,
    fileName: 'fall_enrollment_v2.csv',
    targetGroup: 'Students',
    status: 'Success',
    date: 'Oct 24, 2023, 14:32',
    adminName: 'Dr. Harrison',
    initials: 'DH',
    avatarColor: '#1a3a5c',
  },
  {
    id: 2,
    fileName: 'faculty_profiles_new.xlsx',
    targetGroup: 'Faculty',
    status: 'Failed',
    date: 'Oct 23, 2023, 09:15',
    adminName: 'Sarah Miller',
    initials: 'SM',
    avatarColor: '#c2440a',
  },
  {
    id: 3,
    fileName: 'parent_contacts_export.csv',
    targetGroup: 'Parents',
    status: 'Success',
    date: 'Oct 22, 2023, 16:45',
    adminName: 'Dr. Harrison',
    initials: 'DH',
    avatarColor: '#1a3a5c',
  },
];

const IMPORT_SOURCES = [
  {
    id: 'student',
    title: 'Student Data',
    icon: '🎓',
    iconBg: '#1a2a4a',
    iconAccent: '#4a8aff',
    status: 'Ready for upload',
    hint: 'Required columns: name, email, password, id, prn, roll_no, branch, division, year. Optional: subjects, lab. Accepts CSV, XLSX, or JSON (array of objects or { students: [...] }).',
  },
  {
    id: 'teacher',
    title: 'Teacher Data',
    icon: '👨‍🏫',
    iconBg: '#2a1a4a',
    iconAccent: '#a855f7',
    status: 'Ready for upload',
    hint: 'Faculty profiles require valid department IDs and employee certification numbers.',
  },
  {
    id: 'parent',
    title: 'Parent Data',
    icon: '👨‍👩‍👧',
    iconBg: '#2a1a0a',
    iconAccent: '#f97316',
    status: 'Ready for upload',
    hint: 'Map parents to students using the StudentID field to enable communication features.',
  },
  {
    id: 'admin',
    title: 'Admin Data',
    icon: '🛡️',
    iconBg: '#0e2a1a',
    iconAccent: '#10b981',
    status: 'Ready for upload',
    hint: 'Required columns: name, email, password, role, department. Admins will have access to the dashboard based on their assigned role permissions.',
  },
];

const NOTIFICATIONS = [
  { id: 1, icon: '✅', title: 'Upload Complete',   msg: 'fall_enrollment_v2.csv processed successfully.',      time: '2m ago',  unread: true  },
  { id: 2, icon: '❌', title: 'Upload Failed',     msg: 'faculty_profiles_new.xlsx — invalid department IDs.', time: '1h ago',  unread: true  },
  { id: 3, icon: '⚙️', title: 'Queue Processing', msg: 'Process queue started by admin_01.',                   time: '3h ago',  unread: false },
  { id: 4, icon: '📋', title: 'Template Updated', msg: 'Student CSV template v2 is now available.',            time: '1d ago',  unread: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s) =>
  s === 'Success' ? '#22c55e' : s === 'Failed' ? '#ef4444' : '#f59e0b';
const statusBg = (s) =>
  s === 'Success' ? '#052e16' : s === 'Failed' ? '#2d0a0a' : '#2d1a00';

const nowLabel = () =>
  new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Convert base64 string to Uint8Array ──────────────────────────────────────
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Normalise a single raw row into a student object ─────────────────────────
function normaliseRow(row) {
  return {
    name:     String(row.name     || '').trim(),
    email:    String(row.email    || '').trim(),
    password: String(row.password || '').trim(),
    id:       String(row.id       || '').trim(),
    prn:      String(row.prn      || '').trim(),
    roll_no:  String(row.roll_no  || '').trim(),
    branch:   String(row.branch   || '').trim(),
    division: String(row.division || '').trim(),
    year:     String(row.year     || '').trim(),
    subjects: Array.isArray(row.subjects)
      ? row.subjects.map((s) => String(s).trim()).filter(Boolean)
      : row.subjects
        ? String(row.subjects).split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    lab: Array.isArray(row.lab)
      ? row.lab.map((s) => String(s).trim()).filter(Boolean)
      : row.lab
        ? String(row.lab).split(',').map((s) => s.trim()).filter(Boolean)
        : [],
  };
}

// ─── Parse workbook bytes (CSV / XLSX) into student objects ───────────────────
function parseWorkbook(data) {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) throw new Error('File is empty or has no data rows.');
  return rows.map(normaliseRow);
}
const handleTeacherUpload = async () => {
  const formData = new FormData();

  formData.append("file", {
    uri: selectedFile.uri,
    name: selectedFile.name,
    type: selectedFile.mimeType,
  });

  try {
    const response = await fetch("http://192.168.137.121:5001/api/teachers/upload", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = await response.json();
    alert(data.message);
  } catch (error) {
    console.log(error);
    alert("Upload failed");
  }
};
// ─── Parse JSON text into student objects ─────────────────────────────────────
function parseJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON — could not parse file.');
  }
  // Accept either a plain array or { students: [...] } / { data: [...] }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.students)
      ? parsed.students
      : Array.isArray(parsed.data)
        ? parsed.data
        : null;
  if (!arr) throw new Error('JSON must be an array of student objects (or { students: [...] }).');
  if (arr.length === 0) throw new Error('JSON array is empty.');
  return arr.map(normaliseRow);
}

// ─── Cross-platform file picker + parser ──────────────────────────────────────
async function pickAndParseFile() {
  // ── WEB ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.xlsx,.xls,.json';

      let resolved = false;
      const onFocus = () => {
        setTimeout(() => { if (!resolved) reject(new Error('CANCELLED')); }, 500);
        window.removeEventListener('focus', onFocus);
      };
      window.addEventListener('focus', onFocus);

      input.onchange = (e) => {
        resolved = true;
        window.removeEventListener('focus', onFocus);
        const file = e.target.files?.[0];
        if (!file) return reject(new Error('No file selected.'));

        const sizeLabel = file.size > 1048576
          ? `${(file.size / 1048576).toFixed(2)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

        const isJSON = file.name.toLowerCase().endsWith('.json');

        const reader = new FileReader();

        if (isJSON) {
          reader.onload = (ev) => {
            try { resolve({ name: file.name, size: sizeLabel, rows: parseJSON(ev.target.result) }); }
            catch (err) { reject(err); }
          };
          reader.onerror = () => reject(new Error('Could not read file.'));
          reader.readAsText(file);
        } else {
          reader.onload = (ev) => {
            try { resolve({ name: file.name, size: sizeLabel, rows: parseWorkbook(new Uint8Array(ev.target.result)) }); }
            catch (err) { reject(err); }
          };
          reader.onerror = () => reject(new Error('Could not read file.'));
          reader.readAsArrayBuffer(file);
        }
      };
      input.click();
    });
  }

  // ── NATIVE (Expo) ─────────────────────────────────────────────────────────
  const result = await DocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    throw new Error('CANCELLED');
  }

  const asset = result.assets[0];
  const name  = asset.name ?? asset.uri.split('/').pop();
  const size  = asset.size
    ? asset.size > 1048576
      ? `${(asset.size / 1048576).toFixed(2)} MB`
      : `${(asset.size / 1024).toFixed(1)} KB`
    : 'Unknown size';

  const isJSON = name.toLowerCase().endsWith('.json');
  let rows;

  if (isJSON) {
    const text = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    rows = parseJSON(text);
  } else {
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    rows = parseWorkbook(base64ToUint8Array(base64));
  }

  return { name, size, rows };
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowActionMenu({ visible, row, onClose, onRetry, onDelete, onView }) {
  const { colors } = useContext(ThemeContext);
  if (!visible || !row) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={am.backdrop} onPress={onClose}>
        <Pressable style={[am.menu, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
          <View style={[am.handle, { backgroundColor: colors.border }]} />
          <Text style={[am.menuTitle, { color: colors.textSec }]} numberOfLines={1}>{row.fileName}</Text>
          <View style={[am.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={am.menuItem} onPress={() => { onView(row); onClose(); }} activeOpacity={0.75}>
            <Text style={am.menuItemIcon}>👁️</Text>
            <Text style={[am.menuItemTxt, { color: colors.textPrim }]}>View Details</Text>
            <Text style={[am.menuItemArrow, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          {row.status === 'Failed' && (
            <TouchableOpacity style={am.menuItem} onPress={() => { onRetry(row); onClose(); }} activeOpacity={0.75}>
              <Text style={am.menuItemIcon}>🔄</Text>
              <Text style={[am.menuItemTxt, { color: '#f59e0b' }]}>Retry Upload</Text>
              <Text style={[am.menuItemArrow, { color: '#f59e0b' }]}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={am.menuItem} onPress={() => { Alert.alert('Download', `Downloading ${row.fileName}`); onClose(); }} activeOpacity={0.75}>
            <Text style={am.menuItemIcon}>⬇️</Text>
            <Text style={[am.menuItemTxt, { color: colors.textPrim }]}>Download File</Text>
            <Text style={[am.menuItemArrow, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={am.menuItem} onPress={() => { Alert.alert('Share', `Sharing ${row.fileName}`); onClose(); }} activeOpacity={0.75}>
            <Text style={am.menuItemIcon}>📤</Text>
            <Text style={[am.menuItemTxt, { color: colors.textPrim }]}>Share</Text>
            <Text style={[am.menuItemArrow, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>

          <View style={[am.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={am.menuItem} onPress={() => { onDelete(row); onClose(); }} activeOpacity={0.75}>
            <Text style={am.menuItemIcon}>🗑️</Text>
            <Text style={[am.menuItemTxt, { color: '#ef4444' }]}>Delete Record</Text>
            <Text style={[am.menuItemArrow, { color: '#ef4444' }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[am.cancelBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={[am.cancelTxt, { color: colors.textSec }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotificationPanel({ visible, onClose }) {
  const { colors } = useContext(ThemeContext);
  const [notes, setNotes] = useState(NOTIFICATIONS);
  const markAllRead = () => setNotes((n) => n.map((x) => ({ ...x, unread: false })));
  const unreadCount = notes.filter((n) => n.unread).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={np.backdrop} onPress={onClose}>
        <Pressable style={[np.panel, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
          <View style={[np.handle, { backgroundColor: colors.border }]} />
          <View style={np.header}>
            <Text style={[np.title, { color: colors.textPrim }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={np.badge}><Text style={np.badgeTxt}>{unreadCount}</Text></View>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[np.markRead, { color: colors.accentBlue }]}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={[np.closeBtn, { backgroundColor: colors.surfaceAlt }]} activeOpacity={0.7}>
              <Text style={[np.closeTxt, { color: colors.textSec }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[np.divider, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {notes.map((n, idx) => (
              <TouchableOpacity
                key={n.id}
                style={[
                  np.item,
                  { backgroundColor: colors.surface },
                  n.unread && { backgroundColor: colors.surfaceAlt },
                  idx < notes.length - 1 && [np.itemBorder, { borderBottomColor: colors.border }],
                ]}
                onPress={() => setNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, unread: false } : x))}
                activeOpacity={0.75}>
                <Text style={np.itemIcon}>{n.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[np.itemTitle, { color: colors.textSec }, n.unread && { color: colors.textPrim, fontWeight: '700' }]}>{n.title}</Text>
                  <Text style={[np.itemMsg, { color: colors.textMuted }]} numberOfLines={2}>{n.msg}</Text>
                  <Text style={[np.itemTime, { color: colors.textMuted }]}>{n.time}</Text>
                </View>
                {n.unread && <View style={[np.dot, { backgroundColor: colors.accentBlue }]} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
// Stages: 'idle' | 'reading' | 'ready' | 'uploading' | 'success' | 'error'
function UploadModal({ visible, source, onClose, onUploadSuccess }) {
  const { colors } = useContext(ThemeContext);

  const [stage,    setStage]    = useState('idle');
  const [fileInfo, setFileInfo] = useState(null);   // { name, size, rows }
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadCount, setUploadCount] = useState(0);

  const reset = () => { setStage('idle'); setFileInfo(null); setErrorMsg(''); setUploadCount(0); };
  const handleClose = useCallback(() => { reset(); onClose(); }, [onClose]);

  // ── Step 1: pick & parse ───────────────────────────────────────────────────
  const handlePickFile = async () => {
    if (stage === 'reading' || stage === 'uploading') return;
    setStage('reading');
    setErrorMsg('');
    try {
      const info = await pickAndParseFile();
      setFileInfo(info);
      setStage('ready');
    } catch (err) {
      if (err.message === 'CANCELLED') {
        setStage(fileInfo ? 'ready' : 'idle');
      } else {
        setErrorMsg(err.message || 'Could not parse file.');
        setStage('error');
      }
    }
  };

  // ── Step 2: POST to backend ────────────────────────────────────────────────
  const handleProcess = async () => {
    if (stage !== 'ready' || !fileInfo) return;

    const endpointMap = {
      student: '/students/upload',
      teacher: '/teachers/upload',
      parent:  '/parents/upload',
      admin:   '/admins/upload',
    };

    const endpoint = endpointMap[source?.id];
    if (!endpoint) {
      Alert.alert('Coming Soon', `Backend for "${source?.title}" is not yet connected.`);
      return;
    }

    setStage('uploading');
    try {
let payload = fileInfo.rows;

// If teacher upload, do NOT normalise as student
if (source.id === "teacher") {
  payload = fileInfo.rows; // send raw teacher JSON
}

const response = await axiosInstance.post(endpoint, payload);
      const count = response.data?.count ?? fileInfo.rows.length;

      setUploadCount(count);
      setStage('success');
      onUploadSuccess?.({ fileName: fileInfo.name, targetGroup: source?.title?.replace(' Data', 's') || 'Records', count });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Upload failed.';
      setErrorMsg(msg);
      setStage('error');
    }
  };

  if (!source) return null;

  const isIdle      = stage === 'idle';
  const isReading   = stage === 'reading';
  const isReady     = stage === 'ready';
  const isUploading = stage === 'uploading';
  const isSuccess   = stage === 'success';
  const isError     = stage === 'error';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={um.overlay}>
        <View style={[um.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[um.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={um.header}>
            <View style={[um.iconBox, { backgroundColor: source.iconBg, borderColor: source.iconAccent + '55', borderWidth: 1 }]}>
              <Text style={um.iconTxt}>{source.icon}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[um.headerTitle, { color: colors.textPrim }]}>{source.title}</Text>
              <Text style={[um.statusBadge, { color: '#22c55e' }]}>● {source.status}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[um.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              activeOpacity={0.7}>
              <Text style={[um.closeTxt, { color: colors.textSec }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[um.accentBar, { backgroundColor: source.iconAccent }]} />

          <ScrollView contentContainerStyle={um.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Drop Zone */}
            <TouchableOpacity
              style={[
                um.dropZone,
                { borderColor: colors.border, backgroundColor: colors.bg },
                isReading  && { borderColor: '#f59e0b', backgroundColor: colors.surfaceAlt },
                isReady    && { borderColor: '#22c55e', backgroundColor: colors.surfaceAlt, borderStyle: 'solid' },
                isSuccess  && { borderColor: '#22c55e', backgroundColor: '#052e1688', borderStyle: 'solid' },
                isError    && { borderColor: '#ef4444', backgroundColor: '#2d0a0a', borderStyle: 'solid' },
              ]}
              onPress={handlePickFile}
              activeOpacity={0.8}
              disabled={isReading || isUploading || isSuccess}>

              {isReading && (
                <>
                  <ActivityIndicator color="#f59e0b" size="large" style={{ marginBottom: 12 }} />
                  <Text style={[um.dropTitle, { color: colors.textPrim }]}>Reading file…</Text>
                  <Text style={[um.dropSub, { color: colors.textSec }]}>Please wait</Text>
                </>
              )}

              {isError && (
                <>
                  <Text style={um.dropIcon}>⚠️</Text>
                  <Text style={[um.dropTitle, { color: '#ef4444' }]}>Something went wrong</Text>
                  <Text style={[um.dropSub, { color: '#ef4444', textAlign: 'center', paddingHorizontal: 16 }]}>{errorMsg}</Text>
                  <View style={[um.reuploadBtn, { borderColor: '#ef444433', marginTop: 14 }]}>
                    <Text style={[um.reuploadTxt, { color: '#ef4444' }]}>↺  Tap to try again</Text>
                  </View>
                </>
              )}

              {isSuccess && (
                <>
                  <Text style={[um.dropIcon, { fontSize: 48 }]}>✅</Text>
                  <Text style={[um.dropTitle, { color: '#22c55e', fontSize: 17 }]}>Data Uploaded Successfully!</Text>
                  <Text style={[um.dropSub, { color: '#22c55e', marginTop: 4 }]}>
                    {uploadCount} records saved to the database
                  </Text>
                  <Text style={[um.dropSub, { color: colors.textMuted, marginTop: 6 }]}>
                    {fileInfo?.name}
                  </Text>
                  <TouchableOpacity
                    style={[um.reuploadBtn, { borderColor: '#22c55e44', backgroundColor: colors.bg, marginTop: 14 }]}
                    onPress={() => { reset(); }}
                    activeOpacity={0.7}>
                    <Text style={um.reuploadTxt}>↺  Upload another file</Text>
                  </TouchableOpacity>
                </>
              )}

              {isReady && (
                <>
                  <Text style={um.dropIcon}>✅</Text>
                  <Text style={[um.dropTitle, { color: '#22c55e' }]}>{fileInfo.name}</Text>
                  <Text style={[um.dropSub, { color: colors.textSec }]}>
                    {fileInfo.size}  ·  {fileInfo.rows.length} rows detected
                  </Text>
                  <TouchableOpacity
                    style={[um.reuploadBtn, { borderColor: '#22c55e44', backgroundColor: colors.bg }]}
                    onPress={() => { reset(); setTimeout(handlePickFile, 80); }}
                    activeOpacity={0.7}>
                    <Text style={um.reuploadTxt}>↺  Choose a different file</Text>
                  </TouchableOpacity>
                </>
              )}

              {(isIdle || isUploading) && (
                <>
                  <Text style={um.dropIcon}>☁️</Text>
                  <Text style={[um.dropTitle, { color: colors.textPrim }]}>
                    Tap to Select File or{' '}
                    <Text style={{ color: source.iconAccent, fontWeight: '700' }}>Browse</Text>
                  </Text>
                  <Text style={[um.dropSub, { color: colors.textSec }]}>CSV, XLSX, or JSON  ·  Up to 10 MB</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Preview row */}
            {isReady && fileInfo?.rows?.length > 0 && (
              <View style={[um.previewBox, { backgroundColor: colors.bg, borderColor: source.iconAccent + '44' }]}>
                <Text style={um.previewIcon}>📊</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[um.previewTitle, { color: colors.textPrim }]}>
                    {fileInfo.rows.length} records ready
                  </Text>
                  <Text style={[um.previewSub, { color: colors.textMuted }]} numberOfLines={1}>
                    First row: {fileInfo.rows[0]?.name || '—'}  ·  {fileInfo.rows[0]?.email || '—'}  ·  {fileInfo.rows[0]?.branch || '—'}
                  </Text>
                </View>
              </View>
            )}

            {/* Hint */}
            <View style={[um.hintBox, { backgroundColor: colors.bg, borderColor: source.iconAccent + '33' }]}>
              <Text style={um.hintIcon}>ℹ️</Text>
              <Text style={[um.hintText, { color: colors.textSec }]}>{source.hint}</Text>
            </View>

            {/* Template */}
            <TouchableOpacity
              style={[um.templateBtn, { backgroundColor: colors.bg, borderColor: source.iconAccent + '44' }]}
              onPress={() => Alert.alert('Download', `${source.title} CSV template downloaded.`)}
              activeOpacity={0.75}>
              <Text style={um.templateBtnIcon}>⬇️</Text>
              <Text style={[um.templateTxt, { color: colors.textPrim }]}>Download CSV Template</Text>
            </TouchableOpacity>

          </ScrollView>

          {/* Footer */}
          <View style={[um.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                um.processBtn,
                { backgroundColor: isReady ? source.iconAccent : isSuccess ? '#22c55e' : colors.surfaceAlt },
                isUploading && { opacity: 0.8 },
              ]}
              onPress={isSuccess ? handleClose : handleProcess}
              activeOpacity={0.85}
              disabled={(!isReady && !isSuccess) || isUploading}>
              {isUploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={um.processTxt}>Saving to database…</Text>
                </View>
              ) : isSuccess ? (
                <Text style={um.processTxt}>✅  Upload Complete — {uploadCount} Records Saved</Text>
              ) : isReady ? (
                <Text style={um.processTxt}>
                  ▶  Upload {fileInfo?.rows?.length ?? ''} Records to Database
                </Text>
              ) : (
                <Text style={[um.processTxt, { color: colors.textMuted }]}>
                  Select a file to continue
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ iconBg, icon, label, value, sub, badge, badgeColor, onPress, style }) {
  const { colors } = useContext(ThemeContext);
  return (
    <TouchableOpacity
      style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      onPress={onPress}
      activeOpacity={0.72}>
      <View style={[s.statIconBox, { backgroundColor: iconBg }]}>
        <Text style={s.statIconTxt}>{icon}</Text>
      </View>
      <Text style={[s.statLabel, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
      <Text style={[s.statValue, { color: colors.textPrim }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      {sub && <Text style={[s.statSubTxt, { color: colors.textSec }]} numberOfLines={2}>{sub}</Text>}
      {badge && (
        <View style={[s.statBadge, {
          borderColor: (badgeColor || '#22c55e') + '55',
          backgroundColor: (badgeColor || '#22c55e') + '12',
        }]}>
          <Text style={[s.statBadgeTxt, { color: badgeColor || '#22c55e' }]} numberOfLines={2}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── History Card Row (mobile) ────────────────────────────────────────────────
function HistoryCardRow({ row, onPress, onMorePress, isAlt }) {
  const { colors } = useContext(ThemeContext);
  const isProcessing = row.status === 'Processing';
  const chipColor = isProcessing ? '#84cc16' : statusColor(row.status);
  const chipBg    = isProcessing ? '#1c2a05' : statusBg(row.status);
  return (
    <TouchableOpacity
      style={[s.historyCard, { borderBottomColor: colors.border }, isAlt && { backgroundColor: colors.bg }]}
      onPress={onPress}
      activeOpacity={0.72}>
      <View style={s.historyCardTop}>
        <View style={[s.historyCardFileIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={{ fontSize: 14 }}>📄</Text>
        </View>
        <Text style={[s.historyCardFileName, { color: colors.textPrim }]} numberOfLines={1}>{row.fileName}</Text>
        <View style={[s.statusChip, { backgroundColor: chipBg, borderColor: chipColor + '66' }]}>
          <Text style={[s.statusChipTxt, { color: chipColor }]}>{isProcessing ? '⏳' : row.status}</Text>
        </View>
      </View>
      <View style={s.historyCardMeta}>
        <Text style={[s.historyCardMetaTxt, { color: colors.textSec }]}>
          <Text style={{ color: colors.accentBlue }}>{row.targetGroup}</Text>
          {'  ·  '}
          <Text style={{ color: colors.textMuted }}>{row.date}</Text>
        </Text>
        <View style={s.historyCardAdmin}>
          <View style={[s.adminAvatar, { backgroundColor: row.avatarColor }]}>
            <Text style={s.adminAvatarTxt}>{row.initials}</Text>
          </View>
          <Text style={[s.adminName, { color: colors.textSec }]} numberOfLines={1}>{row.adminName}</Text>
          <TouchableOpacity style={s.moreBtn} onPress={onMorePress} hitSlop={{ top: 12, bottom: 12, left: 16, right: 8 }} activeOpacity={0.55}>
            <Text style={[s.moreIcon, { color: colors.textMuted }]}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── History Table Row (tablet) ───────────────────────────────────────────────
function HistoryTableRow({ row, onPress, onMorePress, isAlt }) {
  const { colors } = useContext(ThemeContext);
  const isProcessing = row.status === 'Processing';
  const chipColor = isProcessing ? '#84cc16' : statusColor(row.status);
  const chipBg    = isProcessing ? '#1c2a05' : statusBg(row.status);
  return (
    <TouchableOpacity
      style={[s.tableRow, { borderBottomColor: colors.border }, isAlt && { backgroundColor: colors.bg }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.tdFile, { flex: 2 }]}>
        <View style={[s.fileIcon, { backgroundColor: colors.surfaceAlt, borderColor: chipColor + '44', borderWidth: 1 }]}>
          <Text style={s.fileIconTxt}>📄</Text>
        </View>
        <Text style={[s.fileNameTxt, { color: colors.textPrim }]} numberOfLines={2}>{row.fileName}</Text>
      </View>
      <Text style={[s.tdTxt, { flex: 1, color: colors.textSec, fontSize: 12 }]}>{row.targetGroup}</Text>
      <View style={{ flex: 1 }}>
        <View style={[s.statusChip, { backgroundColor: chipBg, borderColor: chipColor + '66' }]}>
          <Text style={[s.statusChipTxt, { color: chipColor }]}>{isProcessing ? '⏳' : row.status}</Text>
        </View>
      </View>
      <Text style={[s.tdTxt, { flex: 1.6, color: colors.textMuted, fontSize: 11 }]}>{row.date}</Text>
      <View style={[s.tdAdmin, { flex: 1.2 }]}>
        <View style={[s.adminAvatar, { backgroundColor: row.avatarColor }]}>
          <Text style={s.adminAvatarTxt}>{row.initials}</Text>
        </View>
        <Text style={[s.adminName, { color: colors.textSec }]} numberOfLines={1}>{row.adminName}</Text>
      </View>
      <TouchableOpacity style={[s.moreBtn, { flex: 0.4 }]} onPress={onMorePress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.55}>
        <Text style={[s.moreIcon, { color: colors.textMuted }]}>⋮</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DataImportCenter() {
  const { colors } = useContext(ThemeContext);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= TABLET_BP;

  const [search,        setSearch]        = useState('');
  const [activeSource,  setActiveSource]  = useState(null);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [notifVisible,  setNotifVisible]  = useState(false);
  const [actionRow,     setActionRow]     = useState(null);
  const [history,       setHistory]       = useState(UPLOAD_HISTORY_INIT);
  const [searchFocused, setSearchFocused] = useState(false);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  const openUpload = useCallback((source) => {
    setActiveSource(source);
    setModalVisible(true);
  }, []);

  const handleUploadSuccess = useCallback(({ fileName, targetGroup }) => {
    setHistory((prev) => [
      {
        id: Date.now(),
        fileName,
        targetGroup,
        status: 'Success',
        date: nowLabel(),
        adminName: 'Admin',
        initials: 'A',
        avatarColor: '#1d4ed8',
      },
      ...prev,
    ]);
  }, []);

  const handleRetry = useCallback((row) => {
    setHistory((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Processing' } : r));
    setTimeout(() => {
      setHistory((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Success' } : r));
    }, 1800);
  }, []);

  const handleDelete = useCallback((row) => {
    Alert.alert('🗑️ Delete Record', `Remove "${row.fileName}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setHistory((prev) => prev.filter((r) => r.id !== row.id)) },
    ]);
  }, []);

  const handleViewDetails = useCallback((row) => {
    Alert.alert('📄 File Details',
      `File: ${row.fileName}\nGroup: ${row.targetGroup}\nStatus: ${row.status}\nDate: ${row.date}\nAdmin: ${row.adminName}`);
  }, []);

  const filteredHistory = history.filter(
    (r) =>
      !search.trim() ||
      r.fileName.toLowerCase().includes(search.toLowerCase()) ||
      r.targetGroup.toLowerCase().includes(search.toLowerCase()) ||
      r.adminName.toLowerCase().includes(search.toLowerCase()),
  );

  const statCards = [
    {
      iconBg: '#0e2044', icon: '🗃️',
      label: 'Total Records Processed', value: '1,284,592',
      badge: '↑ +12.5% this month', badgeColor: '#22c55e',
      onPress: () => Alert.alert('Records', 'Total: 1,284,592 records processed.'),
    },
    {
      iconBg: '#2a1200', icon: '📅',
      label: 'Last Upload Date', value: 'Oct 24, 2023',
      sub: '14:32 PM by admin_01',
      onPress: () => Alert.alert('Last Upload', 'fall_enrollment_v2.csv — Oct 24 at 14:32'),
    },
    {
      iconBg: '#052e16', icon: '🛡️',
      label: 'System Health', value: '99.9%',
      badge: '● All services operational', badgeColor: '#22c55e',
      onPress: () => Alert.alert('System Health', 'All microservices running normally.'),
    },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Navbar */}
      <View style={[s.navbar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {(!searchFocused || isTablet) && (
          <Text style={[s.navTitle, { color: colors.textPrim }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            Data Import Center
          </Text>
        )}
        <View style={[s.navRight, searchFocused && !isTablet && { flex: 1 }]}>
          <View style={[
            s.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
            searchFocused && !isTablet && s.searchBarExpanded,
          ]}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={[s.searchInput, { color: colors.textPrim }]}
              placeholder="Search imports…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={s.searchClearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[s.searchClearTxt, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.navIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}>
          
            {unreadCount > 0 && (
              <View style={[s.notifDot, { borderColor: colors.bg }]}>
                <Text style={s.notifDotTxt}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatar} onPress={() => Alert.alert('Profile', 'Admin profile & settings.')} activeOpacity={0.8}>
            <Text style={s.avatarTxt}>A</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingHorizontal: isTablet ? 20 : 14 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Stat Cards */}
        {isTablet ? (
          <View style={s.statsRowTablet}>
            {statCards.map((c, i) => (
              <StatCard key={i} {...c} style={[s.statCardTablet, i === statCards.length - 1 && { marginRight: 0 }]} />
            ))}
          </View>
        ) : (
          <View style={s.statsColMobile}>
            {statCards.map((c, i) => (
              <StatCard key={i} {...c} style={s.statCardMobile} />
            ))}
          </View>
        )}

        {/* Section Header */}
        <View style={[s.sectionHeader, !isTablet && s.sectionHeaderMobile]}>
          <Text style={[s.sectionTitle, { color: colors.textPrim }]}>Import Data Sources</Text>
          <View style={[s.sectionActions, !isTablet && s.sectionActionsMobile]}>
           
            <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline, { borderColor: colors.border }]} onPress={() => Alert.alert('Export Logs', 'Activity logs exported.')} activeOpacity={0.8}>
              <Text style={[s.actionBtnTxt, { color: colors.textPrim }]}>📄  Export Logs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Source Cards */}
        <View style={[isTablet ? s.sourcesRow : s.sourcesCol]}>
          {IMPORT_SOURCES.map((source) => (
            <View
              key={source.id}
              style={[
                s.sourceCard,
                { backgroundColor: colors.surface, borderColor: source.iconAccent + '33' },
                isTablet ? s.sourceCardTablet : s.sourceCardMobile,
              ]}>
              <TouchableOpacity style={s.sourceCardHeader} onPress={() => openUpload(source)} activeOpacity={0.8}>
                <View style={[s.sourceIconBox, { backgroundColor: source.iconBg, borderColor: source.iconAccent + '55' }]}>
                  <Text style={s.sourceIconTxt}>{source.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.sourceTitle, { color: colors.textPrim }]}>{source.title}</Text>
                  <Text style={[s.sourceStatus, { color: '#22c55e' }]}>● {source.status}</Text>
                </View>
                <Text style={[s.sourceArrow, { color: source.iconAccent }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.sourceDropZone, { backgroundColor: colors.bg, borderColor: source.iconAccent + '44' }]}
                onPress={() => openUpload(source)}
                activeOpacity={0.75}>
                <Text style={s.sourceDropIcon}>☁️</Text>
                <Text style={[s.sourceDropText, { color: colors.textPrim }]}>
                  Tap to Upload{' '}
                  <Text style={[s.browseLink, { color: source.iconAccent }]}>Browse</Text>
                </Text>
                <Text style={[s.sourceDropSub, { color: colors.textMuted }]}>CSV, XLSX, or JSON up to 10 MB</Text>
              </TouchableOpacity>

              <Text style={[s.sourceHint, { color: colors.textMuted }]} numberOfLines={isTablet ? 3 : 2}>{source.hint}</Text>

              <TouchableOpacity
                style={[s.templateBtn, { backgroundColor: colors.bg, borderColor: source.iconAccent + '33' }]}
                onPress={() => Alert.alert('Download', `${source.title} CSV template downloaded.`)}
                activeOpacity={0.75}>
                <Text style={s.templateIcon}>⬇️</Text>
                <Text style={[s.templateTxt, { color: colors.textPrim }]}>Download CSV Template</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Upload History */}
        <View style={[s.historySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.historyHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrim }]}>Recent Upload History</Text>
            <TouchableOpacity onPress={() => Alert.alert('History', 'Navigating to full history…')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.viewAllTxt, { color: colors.accentWarn }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          {isTablet && (
            <View style={[s.tableHead, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
              <Text style={[s.thTxt, { flex: 2, color: colors.textMuted }]}>FILE NAME</Text>
              <Text style={[s.thTxt, { flex: 1, color: colors.textMuted }]}>GROUP</Text>
              <Text style={[s.thTxt, { flex: 1, color: colors.textMuted }]}>STATUS</Text>
              <Text style={[s.thTxt, { flex: 1.6, color: colors.textMuted }]}>DATE</Text>
              <Text style={[s.thTxt, { flex: 1.2, color: colors.textMuted }]}>ADMIN</Text>
              <Text style={[s.thTxt, { flex: 0.4, textAlign: 'center', color: colors.textMuted }]}>⋮</Text>
            </View>
          )}

          {filteredHistory.length === 0 ? (
            <View style={s.emptyHistory}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={[s.emptyTxt, { color: colors.textMuted }]}>No records match "{search}"</Text>
            </View>
          ) : (
            filteredHistory.map((row, idx) =>
              isTablet ? (
                <HistoryTableRow key={row.id} row={row} isAlt={idx % 2 === 1} onPress={() => handleViewDetails(row)} onMorePress={() => setActionRow(row)} />
              ) : (
                <HistoryCardRow key={row.id} row={row} isAlt={idx % 2 === 1} onPress={() => handleViewDetails(row)} onMorePress={() => setActionRow(row)} />
              )
            )
          )}
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 40 : 24 }} />
      </ScrollView>

      {/* Modals */}
      <UploadModal
        visible={modalVisible}
        source={activeSource}
        onClose={() => setModalVisible(false)}
        onUploadSuccess={handleUploadSuccess}
      />
      <NotificationPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <RowActionMenu
        visible={!!actionRow}
        row={actionRow}
        onClose={() => setActionRow(null)}
        onRetry={handleRetry}
        onDelete={handleDelete}
        onView={handleViewDetails}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const am = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  menu:         { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  menuTitle:    { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, letterSpacing: 0.3 },
  menuDivider:  { height: 1, marginHorizontal: 20, marginVertical: 4 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, minHeight: 56 },
  menuItemIcon: { fontSize: 20, width: 30, textAlign: 'center', marginRight: 14 },
  menuItemTxt:  { fontSize: 16, fontWeight: '600', flex: 1 },
  menuItemArrow:{ fontSize: 20 },
  cancelBtn:    { marginHorizontal: 20, marginTop: 10, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, minHeight: 52 },
  cancelTxt:    { fontSize: 16, fontWeight: '700' },
});

const np = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-end' },
  panel:     { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, maxHeight: '75%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 },
  title:     { fontSize: 17, fontWeight: '800', marginRight: 8 },
  badge:     { backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt:  { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  markRead:  { fontSize: 13, fontWeight: '600', marginRight: 8 },
  closeBtn:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 14, fontWeight: '700' },
  divider:   { height: 1 },
  item:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingVertical: 16, minHeight: 72 },
  itemBorder:{ borderBottomWidth: 1 },
  itemIcon:  { fontSize: 22, marginRight: 12, marginTop: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemMsg:   { fontSize: 13, marginTop: 3, lineHeight: 18 },
  itemTime:  { fontSize: 12, marginTop: 4 },
  dot:       { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});

const um = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', justifyContent: 'flex-end' },
  sheet:          { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%' },
  handle:         { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  iconBox:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconTxt:        { fontSize: 24 },
  headerTitle:    { fontSize: 17, fontWeight: '700' },
  statusBadge:    { fontSize: 13, fontWeight: '600', marginTop: 2 },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  closeTxt:       { fontSize: 15, fontWeight: '700' },
  accentBar:      { height: 2, marginBottom: 4 },
  body:           { padding: 18, paddingBottom: 12 },
  dropZone:       { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 160 },
  dropIcon:       { fontSize: 40, marginBottom: 8 },
  dropTitle:      { fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  dropSub:        { fontSize: 13 },
  reuploadBtn:    { marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  reuploadTxt:    { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  previewBox:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  previewIcon:    { fontSize: 22, marginRight: 10 },
  previewTitle:   { fontSize: 13, fontWeight: '700' },
  previewSub:     { fontSize: 11, marginTop: 3 },
  hintBox:        { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  hintIcon:       { fontSize: 15, marginRight: 8, marginTop: 1 },
  hintText:       { fontSize: 13, flex: 1, lineHeight: 20 },
  templateBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 14, minHeight: 50 },
  templateBtnIcon:{ fontSize: 17, marginRight: 8 },
  templateTxt:    { fontSize: 15, fontWeight: '600' },
  footer:         { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1 },
  processBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  processTxt:     { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});

const s = StyleSheet.create({
  container:            { flex: 1 },
  scroll:               { paddingTop: 12, paddingBottom: 24 },
  navbar:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, minHeight: 56 },
  navTitle:             { fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  navRight:             { flexDirection: 'row', alignItems: 'center' },
  searchBar:            { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, height: 38, width: 130, marginRight: 8 },
  searchBarExpanded:    { flex: 1, width: undefined },
  searchIcon:           { fontSize: 13, marginRight: 6 },
  searchInput:          { flex: 1, fontSize: 13 },
  searchClearBtn:       { padding: 4 },
  searchClearTxt:       { fontSize: 13, fontWeight: '700' },
  navIconBtn:           { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8, position: 'relative' },
  navIconTxt:           { fontSize: 17 },
  notifDot:             { position: 'absolute', top: -2, right: -2, width: 17, height: 17, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  notifDotTxt:          { color: '#fff', fontSize: 9, fontWeight: '900' },
  avatar:               { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:            { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  statsColMobile:       { marginTop: 16, marginBottom: 20 },
  statCardMobile:       { width: '100%', marginBottom: 10 },
  statsRowTablet:       { flexDirection: 'row', marginTop: 16, marginBottom: 20 },
  statCardTablet:       { flex: 1, marginRight: 10 },
  statCard:             { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'column', alignItems: 'flex-start' },
  statIconBox:          { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statIconTxt:          { fontSize: 20 },
  statLabel:            { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4, flexShrink: 1 },
  statValue:            { fontSize: 20, fontWeight: '800', flexShrink: 1 },
  statSubTxt:           { fontSize: 11, marginTop: 3, flexShrink: 1 },
  statBadge:            { alignSelf: 'flex-start', marginTop: 6, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, maxWidth: '100%' },
  statBadgeTxt:         { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' },
  sectionHeaderMobile:  { flexDirection: 'column', alignItems: 'flex-start' },
  sectionTitle:         { fontSize: 15, fontWeight: '700' },
  sectionActions:       { flexDirection: 'row' },
  sectionActionsMobile: { marginTop: 10, width: '100%' },
  actionBtn:            { backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, minHeight: 40, justifyContent: 'center' },
  actionBtnOutline:     { backgroundColor: 'transparent', borderWidth: 1 },
  actionBtnTxt:         { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  sourcesCol:           { flexDirection: 'column', marginBottom: 22 },
  sourcesRow:           { flexDirection: 'row', marginBottom: 22 },
  sourceCard:           { borderRadius: 14, padding: 14, borderWidth: 1 },
  sourceCardMobile:     { width: '100%', marginBottom: 12 },
  sourceCardTablet:     { flex: 1, marginRight: 10 },
  sourceCardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12, minHeight: 44 },
  sourceIconBox:        { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sourceIconTxt:        { fontSize: 20 },
  sourceTitle:          { fontSize: 13, fontWeight: '700' },
  sourceStatus:         { fontSize: 11, fontWeight: '600', marginTop: 2 },
  sourceArrow:          { fontSize: 22, fontWeight: '300', marginLeft: 4 },
  sourceDropZone:       { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, minHeight: 80 },
  sourceDropIcon:       { fontSize: 24, marginBottom: 6 },
  sourceDropText:       { fontSize: 12, fontWeight: '600' },
  browseLink:           { fontWeight: '700' },
  sourceDropSub:        { fontSize: 11, marginTop: 4 },
  sourceHint:           { fontSize: 11, lineHeight: 16, marginBottom: 10 },
  templateBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9, paddingVertical: 10, minHeight: 44 },
  templateIcon:         { fontSize: 14, marginRight: 6 },
  templateTxt:          { fontSize: 12, fontWeight: '600' },
  historySection:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  historyHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  viewAllTxt:           { fontSize: 13, fontWeight: '700' },
  tableHead:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  thTxt:                { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tableRow:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, minHeight: 56 },
  tdFile:               { flexDirection: 'row', alignItems: 'center', paddingRight: 6 },
  fileIcon:             { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  fileIconTxt:          { fontSize: 13 },
  fileNameTxt:          { fontSize: 11, fontWeight: '600', flex: 1 },
  tdTxt:                { fontSize: 12 },
  statusChip:           { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusChipTxt:        { fontSize: 11, fontWeight: '800' },
  tdAdmin:              { flexDirection: 'row', alignItems: 'center' },
  adminAvatar:          { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  adminAvatarTxt:       { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  adminName:            { fontSize: 11, fontWeight: '600', flex: 1 },
  moreBtn:              { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minWidth: 36, minHeight: 44 },
  moreIcon:             { fontSize: 24, fontWeight: '700' },
  historyCard:          { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1 },
  historyCardTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyCardFileIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  historyCardFileName:  { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  historyCardMeta:      { paddingLeft: 40 },
  historyCardMetaTxt:   { fontSize: 12, marginBottom: 6 },
  historyCardAdmin:     { flexDirection: 'row', alignItems: 'center' },
  emptyHistory:         { paddingVertical: 40, alignItems: 'center' },
  emptyIcon:            { fontSize: 32, marginBottom: 10 },
  emptyTxt:             { fontSize: 14 },
});