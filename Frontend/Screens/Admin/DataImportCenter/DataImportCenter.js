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

import React, { useState, useCallback, useContext, useEffect } from 'react';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
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
const UPLOAD_HISTORY_INIT = [];

const IMPORT_SOURCES = [
  {
    id: 'student',
    title: 'Student Data',
    icon: '🎓',
    iconBg: '#1a2a4a',
    iconAccent: '#4a8aff',
    status: 'Ready for upload',
    hint: 'Required fields: name, email, password, id, prn, roll_no, branch, division, year. Optional: subjects[], lab[], batch.',
  },
  {
    id: 'teacher',
    title: 'Teacher Data',
    icon: '👨‍🏫',
    iconBg: '#2a1a4a',
    iconAccent: '#a855f7',
    status: 'Ready for upload',
    hint: 'Required fields: id, name, password. Optional: years[], divisions[], course_codes, subjects.',
  },
  {
    id: 'parent',
    title: 'Parent Data',
    icon: '👨‍👩‍👧',
    iconBg: '#2a1a0a',
    iconAccent: '#f97316',
    status: 'Ready for upload',
    hint: 'Required fields: id, name, email, password. Link to student via prn or roll_no.',
  },
  {
    id: 'admin',
    title: 'Admin Data',
    icon: '🛡️',
    iconBg: '#0e2a1a',
    iconAccent: '#10b981',
    status: 'Ready for upload',
    hint: 'Required fields: id, email, password, branch.',
  },
];

// ─── JSON Templates ────────────────────────────────────────────────────────────
const JSON_TEMPLATES = {
  student: [
    {
      name: 'Aditya Ambaji Bailkar',
      email: 'aditya.bailkar@gmail.com',
      password: 'CSE@123',
      id: '252141001',
      prn: 'PRN252141001',
      roll_no: 'FY-A1-01',
      branch: 'Computer Science',
      division: 'A',
      year: '1',
      subjects: [
        'Calculus and Probability',
        'Modern Physics',
        'Data Communication and Computer Networks',
        'Design Thinking',
        'AICSE',
        'Python Programming',
      ],
      lab: [
        'Modern Physics Lab',
        'Design Thinking Lab',
        'Web Development Lab',
        'Python Programing Lab',
      ],
    },
  ],
  teacher: [
    {
      id: 'Priyanka Patil',
      name: 'Mrs. Priyanka Patil',
      password: '1201',
      divisions: ['A'],
      subjects: { year1: ['Calculus and Probability'] },
      course_codes: { year1: ['USTBS203'] },
    },
  ],
  parent: [
    {
      id: '252141001',
      name: 'Aditya Ambaji Bailkar',
      email: 'aditya.bailkar@gmail.com',
      password: 'Pass@123',
      branch: 'Computer Science',
      division: 'A',
      year: '1',
      prn: 'PRN252141001',
      roll_no: 'FY-A1-01',
      subjects: [
        'Calculus and Probability',
        'Modern Physics',
        'Data Communication and Computer Networks',
        'Design Thinking',
        'AICSE',
        'Python Programming',
      ],
      lab: [
        'Modern Physics Lab',
        'Design Thinking Lab',
        'Web Development Lab',
        'Python Programing Lab',
      ],
    },
  ],
  admin: [
    {
      id: 'ADMIN001',
      email: 'admin.comps1@college.edu',
      password: 'admin123',
      branch: 'Computer Science',
    },
  ],
};

// ─── Cross-platform JSON template download ─────────────────────────────────────
// Web  → creates a hidden <a download> link and clicks it (instant browser download)
// iOS/Android → writes to documentDirectory then opens expo-sharing share sheet
async function downloadTemplate(sourceId, sourceTitle) {
  try {
    const template = JSON_TEMPLATES[sourceId];
    if (!template) {
      Alert.alert('Error', `No template found for ${sourceTitle}.`);
      return;
    }

    const json     = JSON.stringify(template, null, 2);
    const fileName = `${sourceId}_template.json`;

    // ── Web ──────────────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // ── iOS / Android ─────────────────────────────────────────────────────────
    const savePath = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(savePath, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Try expo-sharing (opens native share / "Save to Files" sheet)
    try {
      const Sharing = await import('expo-sharing');
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(savePath, {
          mimeType:    'application/json',
          dialogTitle: `Save ${fileName}`,
          UTI:         'public.json',
        });
        return;
      }
    } catch (_) { /* expo-sharing not installed */ }

    // Fallback: saved to Documents, tell user where
    Alert.alert(
      '✅ Template Saved',
      `${fileName} saved to app Documents.\n\nFor a "Save to Files" dialog, install expo-sharing:\n  npx expo install expo-sharing`,
      [{ text: 'OK' }],
    );
  } catch (err) {
    console.error('downloadTemplate error:', err);
    Alert.alert('Download Failed', err.message || 'Could not write template file.');
  }
}

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

// ─── Normalise a raw JSON object per entity type ──────────────────────────────
function normaliseStudent(row) {
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
    batch:    row.batch ? String(row.batch).trim() : null,
    subjects: Array.isArray(row.subjects)
      ? row.subjects.map((s) => String(s).trim()).filter(Boolean)
      : row.subjects ? String(row.subjects).split(',').map((s) => s.trim()).filter(Boolean) : [],
    lab: Array.isArray(row.lab)
      ? row.lab.map((s) => String(s).trim()).filter(Boolean)
      : row.lab ? String(row.lab).split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

// For teacher/parent/admin we send the raw object as-is (backend handles schema)
function normaliseRaw(row) { return row; }

// ─── Parse JSON text into an array of objects ─────────────────────────────────
function parseJSON(text, sourceId) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Invalid JSON — could not parse file.'); }

  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.students) ? parsed.students
    : Array.isArray(parsed.teachers) ? parsed.teachers
    : Array.isArray(parsed.parents)  ? parsed.parents
    : Array.isArray(parsed.admins)   ? parsed.admins
    : Array.isArray(parsed.data)     ? parsed.data
    : null;

  if (!arr) throw new Error('JSON must be an array or { students/teachers/parents/admins: [...] }');
  if (arr.length === 0) throw new Error('JSON array is empty.');

  return sourceId === 'student' ? arr.map(normaliseStudent) : arr.map(normaliseRaw);
}

// ─── Cross-platform JSON file picker + parser ─────────────────────────────────
async function pickAndParseFile(sourceId) {
  // ── WEB ───────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

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
        if (!file.name.toLowerCase().endsWith('.json')) return reject(new Error('Please select a .json file.'));

        const sizeLabel = file.size > 1048576
          ? `${(file.size / 1048576).toFixed(2)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`;

        const reader = new FileReader();
        reader.onload = (ev) => {
          try { resolve({ name: file.name, size: sizeLabel, rows: parseJSON(ev.target.result, sourceId) }); }
          catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // ── NATIVE (Expo) ─────────────────────────────────────────────────────────
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) throw new Error('CANCELLED');

  const asset = result.assets[0];
  const name  = asset.name ?? asset.uri.split('/').pop();

  if (!name.toLowerCase().endsWith('.json')) throw new Error('Please select a .json file.');

  const size = asset.size
    ? asset.size > 1048576
      ? `${(asset.size / 1048576).toFixed(2)} MB`
      : `${(asset.size / 1024).toFixed(1)} KB`
    : 'Unknown size';

  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { name, size, rows: parseJSON(text, sourceId) };
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

// ─── Student Detail Sheet ─────────────────────────────────────────────────────
// Shows every field of one student record, matching the DB structure exactly
function StudentDetailSheet({ visible, student, onClose, onBack }) {
  const { colors } = useContext(ThemeContext);
  if (!student) return null;

  const sid = typeof student._id === 'object' ? (student._id?.$oid || JSON.stringify(student._id)) : String(student._id || '');

  const fields = [
    { key: '_id',       label: 'MongoDB _id',  val: sid },
    { key: 'id',        label: 'Student ID',   val: student.id },
    { key: 'name',      label: 'Name',         val: student.name },
    { key: 'email',     label: 'Email',        val: student.email },
    { key: 'password',  label: 'Password Hash',val: student.password },
    { key: 'prn',       label: 'PRN',          val: student.prn },
    { key: 'roll_no',   label: 'Roll No',      val: student.roll_no },
    { key: 'branch',    label: 'Branch',       val: student.branch },
    { key: 'division',  label: 'Division',     val: student.division },
    { key: 'year',      label: 'Year',         val: student.year },
    { key: 'batch',     label: 'Batch',        val: student.batch },
    { key: 'subjects',  label: 'Subjects',     val: Array.isArray(student.subjects) && student.subjects.length ? student.subjects : null },
    { key: 'lab',       label: 'Lab',          val: Array.isArray(student.lab) && student.lab.length ? student.lab : null },
    { key: '__v',       label: '__v',          val: student.__v ?? student['__v'] },
    { key: 'createdAt', label: 'Created At',   val: student.createdAt?.$date || student.createdAt },
    { key: 'updatedAt', label: 'Updated At',   val: student.updatedAt?.$date || student.updatedAt },
  ].filter(f => f.val !== undefined && f.val !== null && f.val !== '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', justifyContent: 'flex-end' }} onPress={onBack}>
        <Pressable style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, maxHeight: '90%', backgroundColor: colors.surface, borderColor: colors.border }} onPress={() => {}}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, backgroundColor: colors.border }} />
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 }}>
            <TouchableOpacity onPress={onBack} style={{ marginRight: 10, padding: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
              <Text style={{ fontSize: 22, color: colors.accentBlue }}>‹</Text>
            </TouchableOpacity>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a2a4a', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ fontSize: 18 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrim }} numberOfLines={1}>{student.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{student.roll_no}  ·  Year {student.year}  ·  Div {student.division}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSec }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {fields.map(({ key, label, val }) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginBottom: 4 }}>
                  {label.toUpperCase()}
                </Text>
                {Array.isArray(val) ? (
                  <View style={{ backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    {val.map((item, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: i < val.length - 1 ? 8 : 0 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4a8aff', marginTop: 6, marginRight: 8 }} />
                        <Text style={{ fontSize: 13, color: colors.textPrim, flex: 1, lineHeight: 20 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    <Text style={{ fontSize: 13, color: key === 'password' ? colors.textMuted : colors.textPrim, lineHeight: 20, fontFamily: key === 'password' || key === '_id' ? Platform.OS === 'ios' ? 'Menlo' : 'monospace' : undefined }}>
                      {String(val)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Student List Sheet ───────────────────────────────────────────────────────
// Fetches all students from GET /students and shows a tappable list.
// Tapping a name opens StudentDetailSheet.
function StudentListSheet({ visible, onClose }) {
  const { colors } = useContext(ThemeContext);
  const [students,       setStudents]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    axiosInstance.get('/students')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Student list fetch error:', err);
        setStudents([]);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const handleClose = () => { setSelectedStudent(null); onClose(); };

  return (
    <>
      <Modal visible={visible && !selectedStudent} transparent animationType="slide" onRequestClose={handleClose}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={handleClose}>
          <Pressable style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%', backgroundColor: colors.surface, borderColor: colors.border }} onPress={() => {}}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, backgroundColor: colors.border }} />
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#1a2a4a', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 18 }}>🎓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrim }}>All Students</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                  {loading ? 'Loading…' : `${students.length} record${students.length !== 1 ? 's' : ''} — tap a name to view full details`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSec }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />

            {loading ? (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4a8aff" />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Fetching students…</Text>
              </View>
            ) : students.length === 0 ? (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>📭</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No students found in database</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {students.map((student, idx) => (
                  <TouchableOpacity
                    key={student._id || student.id || idx}
                    onPress={() => setSelectedStudent(student)}
                    activeOpacity={0.72}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 18, paddingVertical: 14,
                      borderBottomWidth: 1, borderBottomColor: colors.border,
                      backgroundColor: idx % 2 === 1 ? colors.bg : colors.surface,
                    }}>
                    {/* Avatar initials */}
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a2a4a', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ color: '#4a8aff', fontSize: 13, fontWeight: '800' }}>
                        {(student.name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrim }} numberOfLines={1}>{student.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {student.roll_no}  ·  Year {student.year}  ·  Div {student.division}  ·  {student.branch}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 20, color: '#4a8aff', marginLeft: 8 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Detail sheet slides over the list */}
      <StudentDetailSheet
        visible={!!selectedStudent}
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onClose={handleClose}
      />
    </>
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
      const info = await pickAndParseFile(source?.id);
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
      const payload = fileInfo.rows;
      const response = await axiosInstance.post(endpoint, payload);
      const count = response.data?.count ?? fileInfo.rows.length;

      setUploadCount(count);
      setStage('success');
      onUploadSuccess?.({ fileName: fileInfo.name, targetGroup: source?.title?.replace(' Data', 's') || 'Records', count, records: fileInfo.rows });
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
                  <Text style={um.dropIcon}>📂</Text>
                  <Text style={[um.dropTitle, { color: colors.textPrim }]}>
                    Tap to Select{' '}
                    <Text style={{ color: source.iconAccent, fontWeight: '700' }}>.json File</Text>
                  </Text>
                  <Text style={[um.dropSub, { color: colors.textSec }]}>JSON array of objects  ·  Up to 10 MB</Text>
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
              onPress={() => downloadTemplate(source.id, source.title)}
              activeOpacity={0.75}>
              <Text style={um.templateBtnIcon}>⬇️</Text>
              <Text style={[um.templateTxt, { color: colors.textPrim }]}>Download JSON Template</Text>
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

  const [activeSource,      setActiveSource]      = useState(null);
  const [modalVisible,      setModalVisible]      = useState(false);
  const [actionRow,         setActionRow]         = useState(null);
  const [history,           setHistory]           = useState(UPLOAD_HISTORY_INIT);
  const [studentListVisible, setStudentListVisible] = useState(false);

  // ── Real stats from API ──────────────────────────────────────────────────
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [totalProcessed, setTotalProcessed] = useState(null);
  const [lastUploadDate, setLastUploadDate] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await axiosInstance.get('/admins/dashboard/stats');
        if (res.data?.success) {
          const d = res.data.data;
          const total = (d.students || 0) + (d.faculty || 0) + (d.parents || 0) + (d.admins || 0);
          setTotalProcessed(total.toLocaleString());
        }
      } catch (err) {
        console.error('Stats fetch error:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [history]); // re-fetch when a new upload succeeds

  const openUpload = useCallback((source) => {
    setActiveSource(source);
    setModalVisible(true);
  }, []);

  const handleUploadSuccess = useCallback(({ fileName, targetGroup, records }) => {
    const now = nowLabel();
    setLastUploadDate(now);
    setHistory((prev) => [
      {
        id: Date.now(),
        fileName,
        targetGroup,
        status: 'Success',
        date: now,
        adminName: 'Admin',
        initials: 'A',
        avatarColor: '#1d4ed8',
        _records: records || [],
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

  const statCards = [
    {
      iconBg: '#0e2044', icon: '🗃️',
      label: 'Total Records in DB',
      value: statsLoading ? '…' : (totalProcessed ?? '—'),
      badge: 'Students + Teachers + Parents + Admins',
      badgeColor: '#22c55e',
      onPress: () => {},
    },
    {
      iconBg: '#2a1200', icon: '📅',
      label: 'Last Upload Date',
      value: lastUploadDate ? lastUploadDate.split(',')[0] : '—',
      sub: lastUploadDate ? lastUploadDate.split(',').slice(1).join(',').trim() : 'No uploads yet',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Navbar */}
      <View style={[s.navbar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Text style={[s.navTitle, { color: colors.textPrim }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          Data Import Center
        </Text>
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
              {/* Header: tap icon/title area to upload; tap › arrow to view last uploaded records */}
              <View style={s.sourceCardHeader}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => openUpload(source)} activeOpacity={0.8}>
                  <View style={[s.sourceIconBox, { backgroundColor: source.iconBg, borderColor: source.iconAccent + '55' }]}>
                    <Text style={s.sourceIconTxt}>{source.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[s.sourceTitle, { color: colors.textPrim }]}>{source.title}</Text>
                    <Text style={[s.sourceStatus, { color: '#22c55e' }]}>● {source.status}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (source.id === 'student') {
                      setStudentListVisible(true);
                    } else {
                      Alert.alert('Coming Soon', `Record viewer for ${source.title} is coming soon.`);
                    }
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
                  activeOpacity={0.6}>
                  <Text style={[s.sourceArrow, { color: source.iconAccent }]}>›</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[s.sourceDropZone, { backgroundColor: colors.bg, borderColor: source.iconAccent + '44' }]}
                onPress={() => openUpload(source)}
                activeOpacity={0.75}>
                <Text style={s.sourceDropIcon}>📂</Text>
                <Text style={[s.sourceDropText, { color: colors.textPrim }]}>
                  Tap to Upload{' '}
                  <Text style={[s.browseLink, { color: source.iconAccent }]}>.json File</Text>
                </Text>
                <Text style={[s.sourceDropSub, { color: colors.textMuted }]}>JSON array of objects  ·  Up to 10 MB</Text>
              </TouchableOpacity>

              <Text style={[s.sourceHint, { color: colors.textMuted }]} numberOfLines={isTablet ? 3 : 2}>{source.hint}</Text>

              <TouchableOpacity
                style={[s.templateBtn, { backgroundColor: colors.bg, borderColor: source.iconAccent + '33' }]}
                onPress={() => downloadTemplate(source.id, source.title)}
                activeOpacity={0.75}>
                <Text style={s.templateIcon}>⬇️</Text>
                <Text style={[s.templateTxt, { color: colors.textPrim }]}>Download JSON Template</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Upload History */}
        <View style={[s.historySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.historyHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrim }]}>Recent Upload History</Text>
            
          </View>

          {isTablet && (
            <View style={[s.tableHead, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
              <Text style={[s.thTxt, { flex: 2, color: colors.textMuted }]}>FILE NAME</Text>
              <Text style={[s.thTxt, { flex: 1, color: colors.textMuted }]}>GROUP</Text>
              <Text style={[s.thTxt, { flex: 1, color: colors.textMuted }]}>STATUS</Text>
              <Text style={[s.thTxt, { flex: 1.6, color: colors.textMuted }]}>DATE</Text>
              <Text style={[s.thTxt, { flex: 1.2, color: colors.textMuted }]}>ADMIN</Text>
             
            </View>
          )}

          {history.length === 0 ? (
            <View style={s.emptyHistory}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={[s.emptyTxt, { color: colors.textMuted }]}>No uploads yet — import a JSON file to get started</Text>
            </View>
          ) : (
            history.map((row, idx) =>
              isTablet ? (
                <HistoryTableRow key={row.id} row={row} isAlt={idx % 2 === 1}
                  onPress={() => handleViewDetails(row)}
                  onMorePress={() => setActionRow(row)} />
              ) : (
                <HistoryCardRow key={row.id} row={row} isAlt={idx % 2 === 1}
                  onPress={() => handleViewDetails(row)}
                  onMorePress={() => setActionRow(row)} />
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
      <StudentListSheet
        visible={studentListVisible}
        onClose={() => setStudentListVisible(false)}
      />
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