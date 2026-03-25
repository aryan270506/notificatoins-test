// Screens/Teachers/AssignmentScreen.js
// ✅ Resources (photos / docs) attached to assignments
// ✅ Teacher can view each student's submitted file + AI % + similarity %
// ✅ Teacher approves / rejects individual submissions (pending until verified)

import React, {
  useRef, useEffect, useState, useCallback, useContext,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';
import { Linking } from 'react-native';

/* ─── Cross-platform alert ──────────────────────────────────────────────── */
const showAlert = (title, message, buttons = []) => {
  if (Platform.OS === 'web') {
    const confirmBtn = buttons.find(b => b.style !== 'cancel');
    const hasConfirm = buttons.length > 1 && confirmBtn;
    if (hasConfirm) {
      if (window.confirm([title, message].filter(Boolean).join('\n\n')))
        confirmBtn?.onPress?.();
    } else {
      window.alert([title, message].filter(Boolean).join('\n\n'));
      buttons.find(b => b.style !== 'cancel' && b.style !== 'destructive')?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons.length ? buttons : undefined);
  }
};

/* ─── Colors ─────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:'#0B0E1C',surface:'#111827',surfaceEl:'#1A2236',card:'#141D2E',
  border:'#1E2A40',borderDash:'#2A3650',accent:'#3B6EF5',accentSoft:'rgba(59,110,245,0.15)',
  green:'#22C55E',greenSoft:'rgba(34,197,94,0.15)',yellow:'#F59E0B',yellowSoft:'rgba(245,158,11,0.15)',
  red:'#EF4444',redSoft:'rgba(239,68,68,0.15)',purple:'#8B5CF6',purpleSoft:'rgba(139,92,246,0.15)',
  teal:'#14B8A6',tealSoft:'rgba(20,184,166,0.15)',orange:'#F97316',orangeSoft:'rgba(249,115,22,0.15)',
  textPri:'#EEF2FF',textSec:'#8B96B2',textMuted:'#3D4A6A',white:'#FFFFFF',
};
const C_LIGHT = {
  bg:'#F1F4FD',surface:'#FFFFFF',surfaceEl:'#EAEEf9',card:'#FFFFFF',
  border:'#DDE3F4',borderDash:'#CBD5E1',accent:'#2563EB',accentSoft:'rgba(37,99,235,0.09)',
  green:'#059669',greenSoft:'rgba(5,150,105,0.10)',yellow:'#D97706',yellowSoft:'rgba(217,119,6,0.10)',
  red:'#DC2626',redSoft:'rgba(220,38,38,0.10)',purple:'#7C3AED',purpleSoft:'rgba(124,58,237,0.10)',
  teal:'#0D9488',tealSoft:'rgba(13,148,136,0.10)',orange:'#EA580C',orangeSoft:'rgba(234,88,12,0.10)',
  textPri:'#0F172A',textSec:'#4B5563',textMuted:'#9CA3AF',white:'#FFFFFF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const STATUS_META_FN = (C) => ({
  ACTIVE:   { color: C.green,     bg: C.greenSoft,           label: 'Active'   },
  APPROVED: { color: C.teal,      bg: C.tealSoft,            label: 'Approved' },
  CLOSED:   { color: C.textMuted, bg: 'rgba(61,74,106,0.3)', label: 'Closed'   },
});
const STATUSES = ['All Statuses', 'ACTIVE', 'APPROVED', 'CLOSED'];

const VERIFY_META = (C) => ({
  pending:  { color: C.yellow,    bg: C.yellowSoft, label: 'Pending',  icon: 'time-outline'           },
  verified: { color: C.teal,      bg: C.tealSoft,   label: 'Verified', icon: 'checkmark-circle-outline' },
  rejected: { color: C.red,       bg: C.redSoft,    label: 'Rejected', icon: 'close-circle-outline'   },
});

/* ─── Format backend document ────────────────────────────────────────────── */
const fmt = (a) => ({
  id:           a._id,
  status:       a.status,
  title:        a.title,
  subject:      a.subject,
  unit:         a.unit        || 'General',
  description:  a.description || '',
  year:         a.year        || null,
  division:     a.division    || null,
  subdivision:  a.subdivision || null,
  resources:    a.resources   || [],
  submitted:    a.submissions?.length ?? 0,
  total:        a.total       ?? 30,
  dueDate:      a.dueDate     || 'TBD',
  dueTime:      a.dueTime     || null,
  tag:          a.tag         || null,
  approved:     a.approved    || false,
  submissions:  (a.submissions || []).map(s => ({
    _id:               s._id,
    name:              s.name,
    roll:              s.roll              || '',
    comment:           s.comment          || '',
    fileName:          s.fileName         || '',
    fileUrl:           s.fileUrl          || '',
    aiPercent:         s.aiPercent        != null ? s.aiPercent        : null,
    similarityPercent: s.similarityPercent != null ? s.similarityPercent : null,
    analysisAvailable:
  s.aiPercent != null || s.similarityPercent != null,
    verificationStatus: s.verificationStatus || 'pending',
    teacherNote:       s.teacherNote      || '',
    verifiedAt:        s.verifiedAt       || null,
    submittedAt:       s.submittedAt
      ? new Date(s.submittedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : '',
  })),
});

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED STYLE HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const makeEm = (C) => StyleSheet.create({
  overlay:'{flex:1}',   // real styles below
});

/* ─── Month / time helpers ─────────────────────────────────────────────── */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES   = ['S','M','T','W','T','F','S'];
const TIME_SLOTS  = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','04:00 PM','06:00 PM','08:00 PM'];

/* ════════════════════════════════════════════════════════════════════════════
   DATE-TIME PICKER
════════════════════════════════════════════════════════════════════════════ */
const DateTimePicker = ({ onDateChange, onTimeChange, initialDate, initialTime }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const today = new Date(); today.setHours(0,0,0,0);

  const parsedInit = React.useMemo(() => {
    if (!initialDate || initialDate === 'TBD') return null;
    const d = new Date(initialDate);
    if (isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }, [initialDate]);

  const [viewYear,  setViewYear]  = useState(parsedInit?.year  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedInit?.month ?? today.getMonth());
  const [selDay,    setSelDay]    = useState(parsedInit?.day   ?? null);
  const [selTime,   setSelTime]   = useState(initialTime || null);

  useEffect(() => {
    if (parsedInit) { setViewYear(parsedInit.year); setViewMonth(parsedInit.month); setSelDay(parsedInit.day); }
    else { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelDay(null); }
    setSelTime(initialTime || null);
  }, [initialDate, initialTime]);

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const goNext = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y=>y+1)) : setViewMonth(m=>m+1);
  const goPrev = () => {
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    viewMonth === 0 ? (setViewMonth(11), setViewYear(y=>y-1)) : setViewMonth(m=>m-1);
  };
  const isExistingDate = (d) => d === parsedInit?.day && viewMonth === parsedInit?.month && viewYear === parsedInit?.year;
  const isPast = (d) => d && new Date(viewYear, viewMonth, d) < today && !isExistingDate(d);
  const pickDay = (d) => {
    if (!d) return;
    const picked = new Date(viewYear, viewMonth, d);
    if (picked < today && !isExistingDate(d)) return;
    setSelDay(d);
    onDateChange(`${MONTH_SHORT[viewMonth]} ${String(d).padStart(2,'0')}, ${viewYear}`);
  };
  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  return (
    <View style={{ gap: 8 }}>
      <View style={{ backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={goPrev} disabled={!canGoPrev} style={{ padding: 4, opacity: canGoPrev ? 1 : 0.25 }}>
            <Ionicons name="chevron-back" size={14} color={C.textPri} />
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.textPri }}>{MONTH_SHORT[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={goNext} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={14} color={C.textPri} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 2 }}>
          {DAY_NAMES.map((d,i) => <Text key={i} style={{ flex:1, textAlign:'center', fontSize:9, fontWeight:'700', color:C.textMuted }}>{d}</Text>)}
        </View>
        {Array.from({ length: cells.length / 7 }, (_,ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {cells.slice(ri*7, ri*7+7).map((d,ci) => {
              const sel = d === selDay; const past = isPast(d);
              return (
                <TouchableOpacity key={ci} onPress={() => pickDay(d)} disabled={!d || past}
                  style={{ flex:1, height:28, alignItems:'center', justifyContent:'center', margin:1, borderRadius:6,
                    backgroundColor: sel ? C.accent : 'transparent', borderWidth: (!sel && d === parsedInit?.day && viewMonth === parsedInit?.month) ? 1 : 0, borderColor: C.accent }}>
                  <Text style={{ fontSize:11, fontWeight: sel?'800':'500', color: sel?'#fff':past?C.textMuted:C.textPri, opacity:(!d||past)?0.3:1 }}>{d||''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TIME_SLOTS.map(t => (
          <TouchableOpacity key={t} onPress={() => { setSelTime(t); onTimeChange(t); }}
            style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1,
              borderColor: selTime===t ? C.teal : C.border, backgroundColor: selTime===t ? C.tealSoft : C.surfaceEl }}>
            <Text style={{ fontSize:11, fontWeight:'700', color: selTime===t ? C.teal : C.textMuted }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {(selDay || selTime) && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:C.accentSoft, borderRadius:8, borderWidth:1, borderColor:C.accent+'40', paddingHorizontal:10, paddingVertical:6 }}>
          <Ionicons name="calendar-outline" size={12} color={C.accent} />
          <Text style={{ fontSize:11, fontWeight:'700', color:C.accent }}>
            {selDay ? `${MONTH_SHORT[viewMonth]} ${String(selDay).padStart(2,'0')}, ${viewYear}` : '—'}
            {selTime ? `  ·  ${selTime}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   RESOURCE PICKER (teacher attaches files / photos)
════════════════════════════════════════════════════════════════════════════ */
const ResourcePicker = ({ resources, onChange }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf','application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true, multiple: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newItems = result.assets.map(a => ({
          name: a.name, uri: a.uri, mimeType: a.mimeType || 'application/octet-stream',
          size: a.size || 0, type: 'document', _local: true,
        }));
        onChange([...resources, ...newItems]);
      }
    } catch (e) { console.warn('DocumentPicker:', e); }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const newItems = result.assets.map(a => ({
          name: a.fileName || `image_${Date.now()}.jpg`,
          uri: a.uri, mimeType: a.mimeType || 'image/jpeg',
          size: a.fileSize || 0, type: 'image', _local: true,
        }));
        onChange([...resources, ...newItems]);
      }
    } catch (e) { console.warn('ImagePicker:', e); }
  };

  const removeResource = (idx) => onChange(resources.filter((_,i) => i !== idx));

  return (
    <View style={{ gap: 10 }}>
      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={pickDocument} activeOpacity={0.8}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.accent, backgroundColor: C.accentSoft }}>
          <Ionicons name="document-attach-outline" size={15} color={C.accent} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent }}>Add Document</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.purple, backgroundColor: C.purpleSoft }}>
          <Ionicons name="image-outline" size={15} color={C.purple} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.purple }}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Resource list */}
      {resources.length > 0 && (
        <View style={{ gap: 6 }}>
          {resources.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: C.surfaceEl, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10 }}>
              {r.type === 'image'
                ? <View style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', backgroundColor: C.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
                    {(r.uri || r.url) ? <Image source={{ uri: r.uri || r.url }} style={{ width: 36, height: 36 }} /> : <Ionicons name="image-outline" size={18} color={C.purple} />}
                  </View>
                : <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-outline" size={18} color={C.accent} />
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.textPri }} numberOfLines={1}>{r.name}</Text>
                <Text style={{ fontSize: 10, color: C.textMuted }}>
                  {r.type === 'image' ? 'Image' : 'Document'}
                  {r.size ? `  ·  ${(r.size/1024).toFixed(0)} KB` : ''}
                  {r._local ? '  ·  pending upload' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeResource(i)}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={12} color={C.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {resources.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 14, gap: 4 }}>
          <Ionicons name="attach-outline" size={24} color={C.textMuted} />
          <Text style={{ fontSize: 12, color: C.textMuted }}>No resources added (optional)</Text>
        </View>
      )}
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TIMETABLE ACADEMIC PICKER
════════════════════════════════════════════════════════════════════════════ */
const TimetableAcademicPicker = ({ timetableData, classOptions, divisionOptions, subjectOptions, year, division, subject, onYearChange, onDivisionChange, onSubjectChange, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;

  const filteredSubjects = React.useMemo(() => {
    if (year && division && timetableData.length > 0) {
      const subs = [...new Set(timetableData.filter(item => item.year === year && item.division === division).map(item => item.subject))].sort();
      return subs.length > 0 ? subs : subjectOptions;
    }
    return subjectOptions;
  }, [year, division, timetableData, subjectOptions]);

  const yearMeta = accentColors[year] || { color: C.accent, bg: C.accentSoft };
  const chip = { paddingHorizontal:16, paddingVertical:9, borderRadius:22, borderWidth:1, borderColor:C.border, backgroundColor:C.surfaceEl };
  const chipActive = { borderColor:C.accent, backgroundColor:C.accentSoft };
  const chipText = { fontSize:13, fontWeight:'700', color:C.textSec };
  const chipTextActive = { color:C.accent };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.6, marginBottom:10 }}>Class (Year)</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
          {classOptions.length > 0 ? classOptions.map(c => {
            const meta = accentColors[c] || { color:C.accent, bg:C.accentSoft };
            return (
              <TouchableOpacity key={c} onPress={() => { onYearChange(year===c?null:c); onDivisionChange(null); onSubjectChange(null); }}
                style={[chip, year===c && { borderColor:meta.color, backgroundColor:meta.bg }]}>
                <Text style={[chipText, year===c && { color:meta.color }]}>{c}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic' }}>Loading…</Text>}
        </View>
      </View>
      <View>
        <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.6, marginBottom:10 }}>Division</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
          {year ? (divisionOptions[year]||[]).map(d => (
            <TouchableOpacity key={d} onPress={() => { onDivisionChange(division===d?null:d); onSubjectChange(null); }}
              style={[chip, division===d && { borderColor:C.teal, backgroundColor:C.tealSoft }]}>
              <Text style={[chipText, division===d && { color:C.teal }]}>Div {d}</Text>
            </TouchableOpacity>
          )) : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic' }}>Select a class first</Text>}
        </View>
      </View>
      <View>
        <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.6, marginBottom:10 }}>Subject</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
          {year && division ? filteredSubjects.length > 0 ? filteredSubjects.map(sub => (
            <TouchableOpacity key={sub} onPress={() => onSubjectChange(subject===sub?null:sub)}
              style={[chip, subject===sub && chipActive]}>
              <Text style={[chipText, subject===sub && chipTextActive]}>{sub}</Text>
            </TouchableOpacity>
          )) : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic' }}>No subjects found</Text>
          : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic' }}>Select class and division first</Text>}
        </View>
      </View>
      {year && (
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.greenSoft, borderRadius:10, borderWidth:1, borderColor:C.green+'40', paddingHorizontal:12, paddingVertical:9 }}>
          <Ionicons name="school-outline" size={13} color={C.green} />
          <Text style={{ flex:1, fontSize:12, color:C.textSec }}>
            {year}{division?`  ›  Div ${division}`:''}{subject?`  ›  ${subject}`:''}
          </Text>
          <TouchableOpacity onPress={() => { onYearChange(null); onDivisionChange(null); onSubjectChange(null); }}
            style={{ width:20, height:20, borderRadius:10, backgroundColor:C.surfaceEl, alignItems:'center', justifyContent:'center' }}>
            <Ionicons name="close" size={11} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   SUBMISSION DETAIL MODAL  (teacher sees student's work + AI score)
════════════════════════════════════════════════════════════════════════════ */
const SubmissionDetailModal = ({ visible, submission, assignmentId, onClose, onVerified }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const [note, setNote]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (submission) setNote(submission.teacherNote || ''); }, [submission]);

  if (!submission) return null;

  const vm = VERIFY_META(C);
  const curMeta = vm[submission.verificationStatus] || vm.pending;

  const doVerify = async (action) => {
    setLoading(true);
    try {
      const res = await axiosInstance.patch(
        `/assignments/${assignmentId}/submissions/${submission._id}/verify`,
        { action, teacherNote: note }
      );
      if (res.data.success) { onVerified(res.data.data); onClose(); }
    } catch (e) { showAlert('Error', 'Could not update submission.'); }
    finally { setLoading(false); }
  };

  const aiColor  = submission.aiPercent        > 50 ? C.red : submission.aiPercent        > 25 ? C.yellow : C.green;
  const simColor = submission.similarityPercent > 40 ? C.red : submission.similarityPercent > 20 ? C.yellow : C.green;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' }}>
        <View style={{ backgroundColor:C.surface, borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:'92%' }}>
          {/* Header */}
          <View style={{ flexDirection:'row', alignItems:'flex-start', padding:20, borderBottomWidth:1, borderBottomColor:C.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:16, fontWeight:'800', color:C.textPri }}>{submission.name}</Text>
              <Text style={{ fontSize:12, color:C.textSec, marginTop:2 }}>
                {submission.roll ? `Roll: ${submission.roll}  ·  ` : ''}{submission.submittedAt}
              </Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
              <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:8, backgroundColor:curMeta.bg }}>
                <Text style={{ fontSize:11, fontWeight:'800', color:curMeta.color }}>{curMeta.label}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width:32, height:32, borderRadius:16, backgroundColor:C.surfaceEl, alignItems:'center', justifyContent:'center' }}>
                <Ionicons name="close" size={18} color={C.textSec} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:20, gap:16 }}>

            {/* File submitted */}
            {submission.fileName ? (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={() => {
      if (!submission.fileUrl) {
        showAlert(
          'File Not Available',
          'This submission was made before file storage was enabled. No file can be retrieved.'
        );
        return;
      }

      if (Platform.OS === 'web') {
        if (submission.fileUrl.startsWith('data:')) {
          // base64 stored in DB — open in new tab via iframe
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(`<!DOCTYPE html>
              <html>
                <head><title>${submission.fileName}</title></head>
                <body style="margin:0;background:#111;">
                  <iframe src="${submission.fileUrl}"
                    style="width:100vw;height:100vh;border:none;"/>
                </body>
              </html>`);
            win.document.close();
          } else {
            showAlert('Popup Blocked', 'Please allow popups for this site to view the file.');
          }
        } else {
          // regular http/https URL
          window.open(submission.fileUrl, '_blank');
        }
      } else {
        // mobile
        Linking.openURL(submission.fileUrl).catch(() =>
          showAlert('Cannot Open', 'Unable to open this file on mobile.'));
      }
    }}
    style={{
      backgroundColor: C.surfaceEl,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: submission.fileUrl ? C.accent : C.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}>
    <View style={{
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: submission.fileUrl ? C.accentSoft : C.surfaceEl,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons
        name={submission.fileUrl ? 'document-text-outline' : 'document-outline'}
        size={18}
        color={submission.fileUrl ? C.accent : C.textMuted}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.textPri }} numberOfLines={1}>
        {submission.fileName}
      </Text>
      <Text style={{ fontSize: 11, color: submission.fileUrl ? C.accent : C.textMuted, marginTop: 2 }}>
        {submission.fileUrl ? 'Tap to open document' : 'File not available (old submission)'}
      </Text>
    </View>
    <Ionicons
      name={submission.fileUrl ? 'open-outline' : 'ban-outline'}
      size={18}
      color={submission.fileUrl ? C.accent : C.textMuted}
    />
  </TouchableOpacity>
) : (
  <View style={{
    backgroundColor: C.surfaceEl, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderDash,
    padding: 14, alignItems: 'center',
  }}>
    <Text style={{ fontSize: 12, color: C.textMuted }}>No file attached to this submission</Text>
  </View>
)}

            {/* Comment */}
            {submission.comment ? (
              <View style={{ backgroundColor:C.surfaceEl, borderRadius:12, borderWidth:1, borderColor:C.border, padding:14 }}>
                <Text style={{ fontSize:11, fontWeight:'700', color:C.textMuted, marginBottom:6 }}>STUDENT COMMENT</Text>
                <Text style={{ fontSize:13, color:C.textSec, lineHeight:20 }}>{submission.comment}</Text>
              </View>
            ) : null}

            {/* AI Analysis */}
            {submission.analysisAvailable ? (
              <View style={{ backgroundColor:C.surfaceEl, borderRadius:14, borderWidth:1, borderColor:C.border, padding:16, gap:14 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <View style={{ width:28, height:28, borderRadius:8, backgroundColor:C.purpleSoft, alignItems:'center', justifyContent:'center' }}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={C.purple} />
                  </View>
                  <Text style={{ fontSize:13, fontWeight:'800', color:C.textPri }}>Integrity Analysis</Text>
                </View>

                {/* Meters row */}
                <View style={{ flexDirection:'row', gap:10 }}>
                  {[
                    { label:'AI Content', value:submission.aiPercent, color:aiColor },
                    { label:'Similarity', value:submission.similarityPercent, color:simColor },
                  ].map(m => (
                    <View key={m.label} style={{ flex:1, backgroundColor:C.card, borderRadius:12, borderWidth:1, borderColor:C.border, padding:12, alignItems:'center', gap:6 }}>
                      <View style={{ width:64, height:64, borderRadius:32, borderWidth:5, borderColor:m.color, alignItems:'center', justifyContent:'center', backgroundColor:C.surfaceEl }}>
                        <Text style={{ fontSize:18, fontWeight:'800', color:m.color }}>{m.value ?? 0}%</Text>
                      </View>
                      <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec }}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Bar breakdown */}
                {[
                  { label:'AI-Generated Content', value:submission.aiPercent??0, color:aiColor },
                  { label:'Similarity Index',     value:submission.similarityPercent??0, color:simColor },
                ].map(bar => (
                  <View key={bar.label}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                      <Text style={{ fontSize:11, color:C.textSec }}>{bar.label}</Text>
                      <Text style={{ fontSize:11, fontWeight:'800', color:bar.color }}>{bar.value}%</Text>
                    </View>
                    <View style={{ height:6, backgroundColor:C.border, borderRadius:4, overflow:'hidden' }}>
                      <View style={{ height:'100%', width:`${bar.value}%`, backgroundColor:bar.color, borderRadius:4 }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor:C.yellowSoft, borderRadius:12, borderWidth:1, borderColor:C.yellow+'50', padding:12, flexDirection:'row', alignItems:'center', gap:8 }}>
                <Ionicons name="warning-outline" size={14} color={C.yellow} />
                <Text style={{ fontSize:12, color:C.yellow, flex:1 }}>AI analysis was not available for this submission</Text>
              </View>
            )}

            {/* Teacher note */}
            <View>
              <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, marginBottom:6 }}>Note to Student (optional)</Text>
              <TextInput
                style={{ backgroundColor:C.surfaceEl, borderRadius:10, borderWidth:1, borderColor:C.border,
                  paddingHorizontal:14, paddingVertical:12, fontSize:13, color:C.textPri, minHeight:72, textAlignVertical:'top' }}
                value={note} onChangeText={setNote}
                placeholder="Add feedback or reason for approval/rejection…"
                placeholderTextColor={C.textMuted} multiline
              />
            </View>

            {/* Action buttons */}
            {submission.verificationStatus !== 'verified' && (
              <View style={{ flexDirection:'row', gap:10 }}>
                <TouchableOpacity
                  onPress={() => doVerify('rejected')} disabled={loading}
                  style={{ flex:1, paddingVertical:13, borderRadius:12, borderWidth:1, borderColor:C.red, backgroundColor:C.redSoft, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6 }}>
                  <Ionicons name="close-circle-outline" size={15} color={C.red} />
                  <Text style={{ fontSize:13, fontWeight:'700', color:C.red }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => doVerify('verified')} disabled={loading}
                  style={{ flex:1.5, paddingVertical:13, borderRadius:12, backgroundColor:C.teal, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:6,
                    shadowColor:C.teal, shadowOpacity:0.35, shadowRadius:10, elevation:4 }}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={{ fontSize:13, fontWeight:'700', color:'#fff' }}>Verify & Approve</Text>
                  </>}
                </TouchableOpacity>
              </View>
            )}

            {submission.verificationStatus === 'verified' && (
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.tealSoft, borderRadius:12, borderWidth:1, borderColor:C.teal+'50', padding:14 }}>
                <Ionicons name="checkmark-circle" size={18} color={C.teal} />
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:C.teal }}>Verified</Text>
                  {submission.verifiedAt && <Text style={{ fontSize:11, color:C.textSec, marginTop:2 }}>
                    {new Date(submission.verifiedAt).toLocaleString([], { dateStyle:'medium', timeStyle:'short' })}
                  </Text>}
                </View>
                <TouchableOpacity onPress={() => doVerify('rejected')} disabled={loading}
                  style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:8, backgroundColor:C.surfaceEl, borderWidth:1, borderColor:C.border }}>
                  <Text style={{ fontSize:11, fontWeight:'700', color:C.textMuted }}>Revoke</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   SUBMISSIONS LIST MODAL  (replaces old basic modal)
════════════════════════════════════════════════════════════════════════════ */
const SubmissionsModal = ({ visible, assignment, onClose, onUpdated }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const [selSub, setSelSub] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!assignment) return null;
  const vm = VERIFY_META(C);

  const counts = { pending:0, verified:0, rejected:0 };
  assignment.submissions.forEach(s => { counts[s.verificationStatus] = (counts[s.verificationStatus]||0)+1; });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' }}>
        <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'88%' }}>
          {/* Header */}
          <View style={{ flexDirection:'row', alignItems:'flex-start', padding:20, borderBottomWidth:1, borderBottomColor:C.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:16, fontWeight:'800', color:C.textPri, marginBottom:3 }}>{assignment.title}</Text>
              <Text style={{ fontSize:12, color:C.textSec }}>{assignment.submitted} submissions  ·  {assignment.subject}</Text>
            </View>
            <TouchableOpacity onPress={onClose}
              style={{ width:32, height:32, borderRadius:16, backgroundColor:C.surfaceEl, alignItems:'center', justifyContent:'center' }}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>

          {/* Summary chips */}
          <View style={{ flexDirection:'row', gap:8, paddingHorizontal:16, paddingVertical:12 }}>
            {Object.entries(counts).map(([k, v]) => {
              const m = vm[k];
              return (
                <View key={k} style={{ flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:8, backgroundColor:m.bg }}>
                  <Ionicons name={m.icon} size={12} color={m.color} />
                  <Text style={{ fontSize:11, fontWeight:'800', color:m.color }}>{v} {m.label}</Text>
                </View>
              );
            })}
          </View>

          <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, gap:10 }}>
            {assignment.submissions.map((sub, i) => {
              const m = vm[sub.verificationStatus] || vm.pending;
              return (
                <TouchableOpacity key={i} onPress={() => { setSelSub(sub); setDetailOpen(true); }} activeOpacity={0.8}
                  style={{ flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.card,
                    borderRadius:12, padding:12, borderWidth:1, borderColor:C.border }}>
                  {/* Avatar */}
                  <View style={{ width:38, height:38, borderRadius:19, backgroundColor:C.accentSoft, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:12, fontWeight:'800', color:C.accent }}>{sub.name.split(' ').map(n=>n[0]).join('')}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:C.textPri }}>{sub.name}</Text>
                    <Text style={{ fontSize:11, color:C.textSec, marginTop:1 }}>
                      {sub.roll ? `Roll ${sub.roll}  ·  ` : ''}{sub.submittedAt}
                    </Text>
                    {/* Mini AI badges */}
                    {sub.analysisAvailable && (
                      <View style={{ flexDirection:'row', gap:6, marginTop:4 }}>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:2, borderRadius:5,
                          backgroundColor: (sub.aiPercent>50?C.redSoft:sub.aiPercent>25?C.yellowSoft:C.greenSoft) }}>
                          <Ionicons name="hardware-chip-outline" size={9} color={sub.aiPercent>50?C.red:sub.aiPercent>25?C.yellow:C.green} />
                          <Text style={{ fontSize:9, fontWeight:'800', color:sub.aiPercent>50?C.red:sub.aiPercent>25?C.yellow:C.green }}>
                            AI {sub.aiPercent??0}%
                          </Text>
                        </View>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:2, borderRadius:5,
                          backgroundColor: (sub.similarityPercent>40?C.redSoft:sub.similarityPercent>20?C.yellowSoft:C.greenSoft) }}>
                          <Ionicons name="git-compare-outline" size={9} color={sub.similarityPercent>40?C.red:sub.similarityPercent>20?C.yellow:C.green} />
                          <Text style={{ fontSize:9, fontWeight:'800', color:sub.similarityPercent>40?C.red:sub.similarityPercent>20?C.yellow:C.green }}>
                            Sim {sub.similarityPercent??0}%
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {/* Status badge */}
                  <View style={{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:8, backgroundColor:m.bg }}>
                    <Ionicons name={m.icon} size={11} color={m.color} />
                    <Text style={{ fontSize:10, fontWeight:'800', color:m.color }}>{m.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </TouchableOpacity>
              );
            })}
            {assignment.submissions.length === 0 && (
              <View style={{ alignItems:'center', paddingVertical:32, gap:8 }}>
                <Ionicons name="document-outline" size={36} color={C.textMuted} />
                <Text style={{ fontSize:14, color:C.textMuted }}>No submissions yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <SubmissionDetailModal
        visible={detailOpen}
        submission={selSub}
        assignmentId={assignment.id}
        onClose={() => setDetailOpen(false)}
        onVerified={(updated) => {
          setDetailOpen(false);
          onUpdated(updated);
        }}
      />
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   SHARED MODAL FIELD STYLES
════════════════════════════════════════════════════════════════════════════ */
const makeModalStyles = (C) => StyleSheet.create({
  overlay:   { flex:1, backgroundColor:'rgba(0,0,0,0.78)', justifyContent:'flex-end' },
  sheet:     { backgroundColor:C.surface, borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:'95%' },
  header:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:20, borderBottomWidth:1, borderBottomColor:C.border },
  titleCol:  { flex:1 },
  title:     { fontSize:17, fontWeight:'800', color:C.textPri },
  titleSub:  { fontSize:11, color:C.textSec, marginTop:2 },
  closeBtn:  { width:32, height:32, borderRadius:16, backgroundColor:C.surfaceEl, alignItems:'center', justifyContent:'center' },
  section:   { paddingHorizontal:20, paddingTop:18, gap:14 },
  divider:   { height:1, backgroundColor:C.border, marginHorizontal:20, marginVertical:8 },
  secHead:   { flexDirection:'row', alignItems:'center', gap:8, marginBottom:2 },
  secIcon:   { width:26, height:26, borderRadius:8, alignItems:'center', justifyContent:'center' },
  secLabel:  { fontSize:12, fontWeight:'800', color:C.textPri, letterSpacing:0.3 },
  label:     { fontSize:11, fontWeight:'700', color:C.textSec, marginBottom:6, letterSpacing:0.3 },
  input:     { backgroundColor:C.surfaceEl, borderRadius:10, borderWidth:1, borderColor:C.border, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:C.textPri },
  textarea:  { backgroundColor:C.surfaceEl, borderRadius:10, borderWidth:1, borderColor:C.border, paddingHorizontal:14, paddingVertical:12, fontSize:14, color:C.textPri, minHeight:88, textAlignVertical:'top' },
  btnRow:    { flexDirection:'row', gap:10, padding:20, paddingTop:12 },
  cancelBtn: { flex:1, paddingVertical:14, borderRadius:12, borderWidth:1, borderColor:C.border, backgroundColor:C.surfaceEl, alignItems:'center' },
  cancelTxt: { fontSize:14, fontWeight:'700', color:C.textSec },
  saveBtn:   { flex:1.5, paddingVertical:14, borderRadius:12, backgroundColor:C.accent, alignItems:'center', shadowColor:C.accent, shadowOpacity:0.4, shadowRadius:10, elevation:4 },
  saveTxt:   { fontSize:14, fontWeight:'700', color:C.white },
});

/* ════════════════════════════════════════════════════════════════════════════
   EDIT MODAL
════════════════════════════════════════════════════════════════════════════ */
const EditModal = ({ visible, assignment, onClose, onSave, saving, timetableData, classOptions, divisionOptions, subjectOptions, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const ms = makeModalStyles(C);

  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState(null);
  const [unit,        setUnit]        = useState('');
  const [description, setDescription] = useState('');
  const [dueDate,     setDueDate]     = useState('TBD');
  const [dueTime,     setDueTime]     = useState('');
  const [year,        setYear]        = useState(null);
  const [division,    setDivision]    = useState(null);
  const [resources,   setResources]   = useState([]);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title||''); setSubject(assignment.subject||null);
      setUnit(assignment.unit||''); setDescription(assignment.description||'');
      setDueDate(assignment.dueDate||'TBD'); setDueTime(assignment.dueTime||'');
      setYear(assignment.year||null); setDivision(assignment.division||null);
      setResources(assignment.resources||[]);
    }
  }, [assignment]);

  if (!assignment) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.header}>
            <View style={ms.titleCol}><Text style={ms.title}>Edit Assignment</Text><Text style={ms.titleSub}>Update the details below</Text></View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}><Ionicons name="close" size={18} color={C.textSec} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:10 }}>

            {/* Basic */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.accentSoft }]}><Ionicons name="document-text-outline" size={14} color={C.accent} /></View>
                <Text style={ms.secLabel}>Basic Information</Text>
              </View>
              <View><Text style={ms.label}>Title *</Text><TextInput style={ms.input} value={title} onChangeText={setTitle} placeholderTextColor={C.textMuted} /></View>
              <View><Text style={ms.label}>Unit / Topic</Text><TextInput style={ms.input} value={unit} onChangeText={setUnit} placeholderTextColor={C.textMuted} /></View>
              <View>
                <Text style={ms.label}>Description</Text>
                <TextInput style={ms.textarea} value={description} onChangeText={setDescription} placeholder="Objectives, instructions…" placeholderTextColor={C.textMuted} multiline numberOfLines={4} />
              </View>
            </View>

            <View style={ms.divider} />

            {/* Resources */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.orangeSoft }]}><Ionicons name="attach-outline" size={14} color={C.orange} /></View>
                <Text style={ms.secLabel}>Resources (optional)</Text>
              </View>
              <ResourcePicker resources={resources} onChange={setResources} />
            </View>

            <View style={ms.divider} />

            {/* Class */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.purpleSoft }]}><Ionicons name="school-outline" size={14} color={C.purple} /></View>
                <Text style={ms.secLabel}>Target Class & Subject</Text>
              </View>
              <TimetableAcademicPicker
                timetableData={timetableData} classOptions={classOptions} divisionOptions={divisionOptions} subjectOptions={subjectOptions}
                year={year} division={division} subject={subject}
                onYearChange={setYear} onDivisionChange={setDivision} onSubjectChange={setSubject} accentColors={accentColors}
              />
            </View>

            <View style={ms.divider} />

            {/* Date */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.yellowSoft }]}><Ionicons name="calendar-outline" size={14} color={C.yellow} /></View>
                <Text style={ms.secLabel}>Due Date & Time</Text>
              </View>
              <DateTimePicker onDateChange={setDueDate} onTimeChange={setDueTime} initialDate={dueDate} initialTime={dueTime} />
            </View>

            <View style={ms.btnRow}>
              <TouchableOpacity style={ms.cancelBtn} onPress={onClose}><Text style={ms.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[ms.saveBtn, saving&&{opacity:0.6}]} disabled={saving}
                onPress={() => onSave(assignment.id, { title, subject, unit, description, dueDate, dueTime, year, division, resources })}>
                {saving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ms.saveTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   NEW ASSIGNMENT MODAL
════════════════════════════════════════════════════════════════════════════ */
const NewAssignmentModal = ({ visible, onClose, onCreate, creating, defaultYear, defaultDivision, timetableData, classOptions, divisionOptions, subjectOptions, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const ms = makeModalStyles(C);

  const [title,       setTitle]       = useState('');
  const [subject,     setSubject]     = useState(null);
  const [unit,        setUnit]        = useState('');
  const [description, setDescription] = useState('');
  const [year,        setYear]        = useState(null);
  const [division,    setDivision]    = useState(null);
  const [dueDate,     setDueDate]     = useState('TBD');
  const [dueTime,     setDueTime]     = useState('');
  const [resources,   setResources]   = useState([]);

  useEffect(() => { if (!visible) { setTitle(''); setSubject(null); setUnit(''); setDescription(''); setYear(null); setDivision(null); setResources([]); setDueDate('TBD'); setDueTime(''); } }, [visible]);
  useEffect(() => { setYear(defaultYear||null); }, [defaultYear]);
  useEffect(() => { setDivision(defaultDivision||null); }, [defaultDivision]);

  const handleCreate = () => {
    if (!title.trim())         { showAlert('Required','Please fill in the title.'); return; }
    if (!year || !division)    { showAlert('Required','Please select Year and Division.'); return; }
    if (!subject)              { showAlert('Required','Please select a subject.'); return; }
    onCreate({ title, subject, unit, description, year, division, dueDate, dueTime, resources });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.header}>
            <View style={ms.titleCol}><Text style={ms.title}>New Assignment</Text><Text style={ms.titleSub}>Fill in all details below</Text></View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}><Ionicons name="close" size={18} color={C.textSec} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:10 }}>

            {/* Details */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.accentSoft }]}><Ionicons name="document-text-outline" size={14} color={C.accent} /></View>
                <Text style={ms.secLabel}>Assignment Details</Text>
              </View>
              <View><Text style={ms.label}>Title *</Text><TextInput style={ms.input} value={title} onChangeText={setTitle} placeholder="e.g. Mid-term Calculus Quiz" placeholderTextColor={C.textMuted} /></View>
              <View><Text style={ms.label}>Unit / Topic</Text><TextInput style={ms.input} value={unit} onChangeText={setUnit} placeholder="e.g. Unit 4: Integrals" placeholderTextColor={C.textMuted} /></View>
              <View>
                <Text style={ms.label}>Description</Text>
                <TextInput style={ms.textarea} value={description} onChangeText={setDescription} placeholder="Objectives, instructions, requirements…" placeholderTextColor={C.textMuted} multiline numberOfLines={4} />
              </View>
            </View>

            <View style={ms.divider} />

            {/* Resources */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.orangeSoft }]}><Ionicons name="attach-outline" size={14} color={C.orange} /></View>
                <Text style={ms.secLabel}>Resources (optional)</Text>
              </View>
              <ResourcePicker resources={resources} onChange={setResources} />
            </View>

            <View style={ms.divider} />

            {/* Class */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.purpleSoft }]}><Ionicons name="school-outline" size={14} color={C.purple} /></View>
                <Text style={ms.secLabel}>Target Class & Subject *</Text>
              </View>
              <TimetableAcademicPicker
                timetableData={timetableData} classOptions={classOptions} divisionOptions={divisionOptions} subjectOptions={subjectOptions}
                year={year} division={division} subject={subject}
                onYearChange={setYear} onDivisionChange={setDivision} onSubjectChange={setSubject} accentColors={accentColors}
              />
            </View>

            <View style={ms.divider} />

            {/* Date */}
            <View style={ms.section}>
              <View style={ms.secHead}>
                <View style={[ms.secIcon,{ backgroundColor:C.yellowSoft }]}><Ionicons name="calendar-outline" size={14} color={C.yellow} /></View>
                <Text style={ms.secLabel}>Due Date & Time</Text>
              </View>
              <DateTimePicker onDateChange={setDueDate} onTimeChange={setDueTime} />
            </View>

            <View style={ms.btnRow}>
              <TouchableOpacity style={ms.cancelBtn} onPress={onClose}><Text style={ms.cancelTxt}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[ms.saveBtn, creating&&{opacity:0.6}]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color={C.white} size="small" /> : <Text style={ms.saveTxt}>Create Assignment</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   PROGRESS BAR
════════════════════════════════════════════════════════════════════════════ */
const ProgressBar = ({ submitted, total, status }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const pct    = Math.min(100, Math.round((submitted/total)*100));
  const barClr = status==='APPROVED'?C.teal:status==='CLOSED'?C.textMuted:C.accent;
  return (
    <View style={{ marginBottom:10 }}>
      <Text style={{ fontSize:12, fontWeight:'800', color:barClr, textAlign:'right', marginBottom:5 }}>{submitted} / {total}</Text>
      <View style={{ height:5, backgroundColor:C.border, borderRadius:3, overflow:'hidden' }}>
        <View style={{ height:'100%', width:`${pct}%`, backgroundColor:barClr, borderRadius:3 }} />
      </View>
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   ASSIGNMENT CARD
════════════════════════════════════════════════════════════════════════════ */
const AssignmentCard = ({ item, onEdit, onView, onApprove, onDelete, accentColors }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const STATUS_META = STATUS_META_FN(C);
  const meta     = STATUS_META[item.status] ?? STATUS_META.ACTIVE;
  const yearMeta = item.year ? (accentColors[item.year]||{color:C.accent,bg:C.accentSoft}) : null;
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const vm = VERIFY_META(C);

  // Count verified vs pending submissions
  const verifiedCount = item.submissions.filter(s=>s.verificationStatus==='verified').length;
  const pendingCount  = item.submissions.filter(s=>s.verificationStatus==='pending').length;

  return (
    <View style={{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, flex:1 }}>
      {/* Top row */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:12, flexWrap:'wrap' }}>
        <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:6, backgroundColor:meta.bg }}>
          <Text style={{ fontSize:10, fontWeight:'800', letterSpacing:0.6, color:meta.color }}>{meta.label}</Text>
        </View>
        {item.year && (
          <View style={{ paddingHorizontal:9, paddingVertical:4, borderRadius:6, borderWidth:1, backgroundColor:yearMeta?.bg||C.accentSoft, borderColor:(yearMeta?.color||C.accent)+'60' }}>
            <Text style={{ fontSize:10, fontWeight:'800', letterSpacing:0.4, color:yearMeta?.color||C.accent }}>
              {item.year}{item.division?`-${item.division}`:''}
            </Text>
          </View>
        )}
        {item.resources?.length > 0 && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:7, paddingVertical:4, borderRadius:6, backgroundColor:C.orangeSoft }}>
            <Ionicons name="attach-outline" size={10} color={C.orange} />
            <Text style={{ fontSize:10, fontWeight:'700', color:C.orange }}>{item.resources.length}</Text>
          </View>
        )}
        <View style={{ marginLeft:'auto' }}>
          <TouchableOpacity style={{ padding:4 }} activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS==='web') setMenuOpen(o=>!o);
              else showAlert(item.title,'Options',[
                {text:'Edit',onPress:onEdit},{text:'Delete',style:'destructive',onPress:onDelete},{text:'Cancel',style:'cancel'},
              ]);
            }}>
            <Ionicons name="ellipsis-vertical" size={16} color={C.textMuted} />
          </TouchableOpacity>
          {menuOpen && Platform.OS==='web' && (
            <View style={{ position:'absolute', top:28, right:0, backgroundColor:C.surface, borderRadius:10, borderWidth:1, borderColor:C.border, zIndex:99, minWidth:130, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8, elevation:8 }}>
              <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:11 }}
                onPress={() => { setMenuOpen(false); onEdit(); }}>
                <Ionicons name="create-outline" size={13} color={C.textPri} />
                <Text style={{ fontSize:13, fontWeight:'700', color:C.textPri }}>Edit</Text>
              </TouchableOpacity>
              <View style={{ height:1, backgroundColor:C.border }} />
              <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:11 }}
                onPress={() => { setMenuOpen(false); onDelete(); }}>
                <Ionicons name="trash-outline" size={13} color={C.red} />
                <Text style={{ fontSize:13, fontWeight:'700', color:C.red }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Text style={{ fontSize:16, fontWeight:'800', color:C.textPri, marginBottom:4, lineHeight:22 }}>{item.title}</Text>
      <Text style={{ fontSize:12, color:C.textSec, marginBottom:10 }}>{item.subject}{item.unit!=='General'?` · ${item.unit}`:''}</Text>

      {item.description ? (
        <TouchableOpacity onPress={() => setExpanded(p=>!p)} activeOpacity={0.85}
          style={{ backgroundColor:C.surfaceEl, borderRadius:10, borderWidth:1, borderColor:C.border, padding:10, marginBottom:12 }}>
          <Text style={{ fontSize:12, color:C.textSec, lineHeight:18 }} numberOfLines={expanded?undefined:2}>{item.description}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:3, marginTop:5 }}>
            <Ionicons name={expanded?'chevron-up':'chevron-down'} size={11} color={C.textMuted} />
            <Text style={{ fontSize:10, color:C.textMuted, fontWeight:'600' }}>{expanded?'Show less':'Read more'}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Resources preview */}
      {item.resources?.length > 0 && (
        <View style={{ flexDirection:'row', gap:6, marginBottom:12, flexWrap:'wrap' }}>
          {item.resources.slice(0,3).map((r,i) => (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:8, backgroundColor:r.type==='image'?C.purpleSoft:C.accentSoft }}>
              <Ionicons name={r.type==='image'?'image-outline':'document-outline'} size={11} color={r.type==='image'?C.purple:C.accent} />
              <Text style={{ fontSize:10, fontWeight:'700', color:r.type==='image'?C.purple:C.accent }} numberOfLines={1}>{r.name}</Text>
            </View>
          ))}
          {item.resources.length > 3 && <Text style={{ fontSize:10, color:C.textMuted, paddingVertical:4 }}>+{item.resources.length-3} more</Text>}
        </View>
      )}

      <Text style={{ fontSize:11, color:C.textSec, marginBottom:4 }}>Submissions</Text>
      <ProgressBar submitted={item.submitted} total={item.total} status={item.status} />

      {/* Verification summary */}
      {item.submitted > 0 && (
        <View style={{ flexDirection:'row', gap:6, marginBottom:10 }}>
          {pendingCount > 0 && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:7, paddingVertical:3, borderRadius:6, backgroundColor:C.yellowSoft }}>
              <Ionicons name="time-outline" size={10} color={C.yellow} />
              <Text style={{ fontSize:9, fontWeight:'800', color:C.yellow }}>{pendingCount} Pending</Text>
            </View>
          )}
          {verifiedCount > 0 && (
            <View style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:7, paddingVertical:3, borderRadius:6, backgroundColor:C.tealSoft }}>
              <Ionicons name="checkmark-circle-outline" size={10} color={C.teal} />
              <Text style={{ fontSize:9, fontWeight:'800', color:C.teal }}>{verifiedCount} Verified</Text>
            </View>
          )}
        </View>
      )}

      {/* Meta row */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16, alignItems:'center' }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
          <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
          <Text style={{ fontSize:11, color:C.textMuted }}>{item.dueDate}</Text>
        </View>
        {item.dueTime && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={{ fontSize:11, color:C.textMuted }}>{item.dueTime}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap' }}>
        {item.status !== 'APPROVED' && (
          <TouchableOpacity style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:11, borderRadius:10, borderWidth:1, borderColor:C.border, backgroundColor:C.surfaceEl, minWidth:70 }}
            onPress={onEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color={C.textPri} />
            <Text style={{ fontSize:13, fontWeight:'700', color:C.textPri }}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ flex:1.5, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:11, borderRadius:10, backgroundColor:item.status==='APPROVED'?C.teal:C.accent, minWidth:110, shadowColor:item.status==='APPROVED'?C.teal:C.accent, shadowOpacity:0.3, shadowRadius:8, elevation:4 }}
          onPress={onView} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={13} color={C.white} />
          <Text style={{ fontSize:13, fontWeight:'700', color:C.white }}>View Submissions</Text>
          {pendingCount > 0 && (
            <View style={{ width:18, height:18, borderRadius:9, backgroundColor:C.yellow, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:9, fontWeight:'900', color:'#000' }}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {item.submitted === item.total && item.status === 'ACTIVE' && (
          <TouchableOpacity style={{ flexBasis:'100%', flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:11, borderRadius:10, backgroundColor:C.green, shadowColor:C.green, shadowOpacity:0.35, shadowRadius:8, elevation:4, marginTop:4 }}
            onPress={onApprove} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle-outline" size={13} color={C.white} />
            <Text style={{ fontSize:13, fontWeight:'700', color:C.white }}>Approve Assignment</Text>
          </TouchableOpacity>
        )}
        {item.status === 'APPROVED' && (
          <View style={{ flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:11, borderRadius:10, backgroundColor:C.tealSoft, borderWidth:1, borderColor:C.teal+'50' }}>
            <Ionicons name="checkmark-circle" size={14} color={C.teal} />
            <Text style={{ fontSize:13, fontWeight:'700', color:C.teal }}>Approved</Text>
          </View>
        )}
      </View>
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   CREATE PLACEHOLDER CARD
════════════════════════════════════════════════════════════════════════════ */
const CreateCard = ({ onPress }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{ flex:1, borderRadius:16, borderWidth:2, borderColor:C.borderDash, borderStyle:'dashed', alignItems:'center', justifyContent:'center', gap:8, padding:24, minHeight:200 }}>
      <View style={{ width:60, height:60, borderRadius:30, backgroundColor:C.surfaceEl, alignItems:'center', justifyContent:'center', marginBottom:4 }}>
        <Ionicons name="add-circle-outline" size={36} color={C.textMuted} />
      </View>
      <Text style={{ fontSize:16, fontWeight:'800', color:C.textPri }}>Create Assignment</Text>
      <Text style={{ fontSize:13, color:C.textMuted, textAlign:'center', lineHeight:19 }}>Draft a new task or project{'\n'}for your students</Text>
    </TouchableOpacity>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════════════════════ */
export default function AssignmentScreen() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const STATUS_META = STATUS_META_FN(C);
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;
  const colCount   = width >= 1024 ? 3 : isWide ? 2 : 1;

  const [timetableData,    setTimetableData]    = useState([]);
  const [classOptions,     setClassOptions]     = useState([]);
  const [divisionOptions,  setDivisionOptions]  = useState({});
  const [subjectOptions,   setSubjectOptions]   = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  const [selYear,    setSelYear]    = useState(null);
  const [selDiv,     setSelDiv]     = useState(null);
  const [selSubject, setSelSubject] = useState(null);

  const filteredOuterSubjects = React.useMemo(() => {
    if (selYear && selDiv && timetableData.length > 0) {
      const subs = [...new Set(timetableData.filter(i=>i.year===selYear&&i.division===selDiv).map(i=>i.subject))].sort();
      return subs.length > 0 ? subs : subjectOptions;
    }
    return subjectOptions;
  }, [selYear, selDiv, timetableData, subjectOptions]);

  const [assignments,  setAssignments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [selStatus,    setSelStatus]    = useState('All Statuses');
  const [showFilters,  setShowFilters]  = useState(false);

  const [viewModal,  setViewModal]  = useState(false);
  const [editModal,  setEditModal]  = useState(false);
  const [newModal,   setNewModal]   = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [teacherId,  setTeacherId]  = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const accentColors = React.useMemo(() => {
    const palette = [
      {color:C.accent,bg:C.accentSoft},{color:C.teal,bg:C.tealSoft},
      {color:C.purple,bg:C.purpleSoft},{color:C.orange,bg:C.orangeSoft},
    ];
    const map = {};
    classOptions.forEach((yr,i) => { map[yr] = palette[i%palette.length]; });
    return map;
  }, [classOptions, C]);

  const fetchTimetableOptions = useCallback(async (tId) => {
    if (!tId) return;
    setTimetableLoading(true);
    try {
      const res  = await axiosInstance.get(`/timetable/teacher/${tId}`);
      const data = res.data?.data || [];
      setTimetableData(data);
      const years = [...new Set(data.map(i=>i.year))].sort();
      setClassOptions(years);
      const divs = {};
      years.forEach(year => { divs[year] = [...new Set(data.filter(i=>i.year===year).map(i=>i.division))].sort(); });
      setDivisionOptions(divs);
      setSubjectOptions([...new Set(data.map(i=>i.subject))].sort());
    } catch (e) { console.error('Timetable fetch:', e); }
    finally { setTimetableLoading(false); }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:500, useNativeDriver:true }),
      Animated.spring(slideAnim, { toValue:0, tension:80, friction:14, useNativeDriver:true }),
    ]).start();
    (async () => {
      const id = await AsyncStorage.getItem('teacherId');
      setTeacherId(id);
      await fetchTimetableOptions(id);
      fetchAssignments(id);
    })();
  }, []);

  const fetchAssignments = useCallback(async (tId, opts={}) => {
    try {
      const params = {};
      if (tId)           params.teacherId  = tId;
      if (opts.year)     params.year       = opts.year;
      if (opts.division) params.division   = opts.division;
      if (opts.subject)  params.subject    = opts.subject;
      const res = await axiosInstance.get('/assignments', { params });
      if (res.data.success) setAssignments(res.data.data.map(fmt));
    } catch (err) { console.warn('fetchAssignments:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(teacherId, { year:selYear||undefined, division:selDiv||undefined, subject:selSubject||undefined });
  };

  useEffect(() => {
    if (teacherId !== null) fetchAssignments(teacherId, { year:selYear||undefined, division:selDiv||undefined, subject:selSubject||undefined });
  }, [selYear, selDiv, selSubject]);

  const pickYear    = (v) => { setSelYear(v);   setSelDiv(null);  setSelSubject(null); };
  const pickDiv     = (v) => { setSelDiv(v);    setSelSubject(null); };
  const pickSubject = (v) => setSelSubject(v);

  const handleEdit    = (item) => { setActiveItem(item); setEditModal(true); };
  const handleView    = (item) => { setActiveItem(item); setViewModal(true); };

  const handleApprove = (item) => {
    if (item.status==='APPROVED') { showAlert('Already Approved'); return; }
    showAlert('Approve Assignment', `Approve "${item.title}"?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Approve', onPress: async () => {
        try {
          const res = await axiosInstance.patch(`/assignments/${item.id}/approve`);
          if (res.data.success) setAssignments(prev => prev.map(a => a.id===item.id ? fmt(res.data.data) : a));
        } catch { showAlert('Error','Failed to approve.'); }
      }},
    ]);
  };

  const handleDelete = (item) => {
    showAlert('Delete', `Delete "${item.title}"?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: async () => {
        try {
          await axiosInstance.delete(`/assignments/${item.id}`);
          setAssignments(prev => prev.filter(a => a.id!==item.id));
        } catch { showAlert('Error','Failed to delete.'); }
      }},
    ]);
  };

  /* ── Upload local resources to server then save ── */
  const uploadAndSave = async (id, changes) => {
    // Separate already-uploaded (server) from local-only (just picked)
    const serverResources = (changes.resources||[]).filter(r => !r._local);
    const localResources  = (changes.resources||[]).filter(r =>  r._local);

    if (localResources.length === 0) {
      // No new files — JSON PUT
      return axiosInstance.put(`/assignments/${id}`, {
        title: changes.title, subject: changes.subject, unit: changes.unit||'',
        description: changes.description||'', dueDate: changes.dueDate||'TBD',
        dueTime: changes.dueTime||'', year: changes.year, division: changes.division,
      });
    }

    // Has new local files — multipart PUT
    const fd = new FormData();
    const fields = { title:changes.title, subject:changes.subject, unit:changes.unit||'', description:changes.description||'', dueDate:changes.dueDate||'TBD', dueTime:changes.dueTime||'', year:changes.year, division:changes.division };
    Object.entries(fields).forEach(([k,v]) => v != null && fd.append(k, v));

    for (const r of localResources) {
      if (Platform.OS === 'web') {
        const blob = await fetch(r.uri).then(res => res.blob());
        fd.append('resources', new File([blob], r.name, { type: r.mimeType }));
      } else {
        fd.append('resources', { uri: r.uri, name: r.name, type: r.mimeType });
      }
    }

    return axiosInstance.put(`/assignments/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSaveEdit = async (id, changes) => {
    setSaving(true);
    try {
      const res = await uploadAndSave(id, changes);
      if (res.data.success) {
        setAssignments(prev => prev.map(a => a.id===id ? fmt(res.data.data) : a));
        setEditModal(false);
      }
    } catch { showAlert('Error','Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleCreate = async (data) => {
    setCreating(true);
    try {
      const localResources = (data.resources||[]).filter(r => r._local);
      let res;

      if (localResources.length > 0) {
        const fd = new FormData();
        const fields = { title:data.title, subject:data.subject, unit:data.unit||'', description:data.description||'', dueDate:data.dueDate||'TBD', dueTime:data.dueTime||'', year:data.year, division:data.division, teacherId };
        Object.entries(fields).forEach(([k,v]) => v!=null && fd.append(k, String(v)));
        for (const r of localResources) {
          if (Platform.OS==='web') {
            const blob = await fetch(r.uri).then(re=>re.blob());
            fd.append('resources', new File([blob], r.name, { type:r.mimeType }));
          } else {
            fd.append('resources', { uri:r.uri, name:r.name, type:r.mimeType });
          }
        }
        res = await axiosInstance.post('/assignments', fd, { headers:{'Content-Type':'multipart/form-data'} });
      } else {
        res = await axiosInstance.post('/assignments', { title:data.title, subject:data.subject, unit:data.unit||'', description:data.description||'', dueDate:data.dueDate||'TBD', dueTime:data.dueTime||'', year:data.year, division:data.division, teacherId });
      }

      if (res.data.success) {
        setAssignments(prev => [fmt(res.data.data), ...prev]);
        setNewModal(false);
        showAlert('✅ Created', `"${data.title}" created.`);
      }
    } catch { showAlert('Error','Failed to create.'); }
    finally { setCreating(false); }
  };

  /* When teacher verifies a submission, refresh the affected assignment */
  const handleVerificationUpdate = (updatedDoc) => {
    setAssignments(prev => prev.map(a => a.id===updatedDoc._id ? fmt(updatedDoc) : a));
    if (activeItem) setActiveItem(fmt(updatedDoc));
  };

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    return (a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q))
        && (selStatus==='All Statuses' || a.status===selStatus);
  });

  const rows = [];
  for (let i = 0; i < filtered.length; i += colCount) rows.push(filtered.slice(i, i+colCount));
  const showCreate = selStatus==='All Statuses' && search==='';

  const kpis = [
    { label:'Active',           value:assignments.filter(a=>a.status==='ACTIVE').length,                                   icon:'clipboard-outline',        color:C.accent,  bg:C.accentSoft  },
    { label:'Pending Approval', value:assignments.filter(a=>a.status==='ACTIVE'&&a.submitted===a.total).length,            icon:'hourglass-outline',        color:C.yellow,  bg:C.yellowSoft  },
    { label:'Approved',         value:assignments.filter(a=>a.status==='APPROVED').length,                                  icon:'checkmark-circle-outline', color:C.teal,    bg:C.tealSoft    },
    { label:'Total',            value:assignments.length,                                                                    icon:'albums-outline',           color:C.purple,  bg:C.purpleSoft  },
  ];

  const SERIF_FONT = Platform.OS==='ios'?'Georgia':'serif';

  if (loading) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator size="large" color={C.accent} />
      <Text style={{ color:C.textSec, marginTop:14, fontSize:14 }}>Loading assignments…</Text>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <SubmissionsModal
        visible={viewModal} assignment={activeItem}
        onClose={() => setViewModal(false)}
        onUpdated={handleVerificationUpdate}
      />
      <EditModal
        visible={editModal} assignment={activeItem} onClose={() => setEditModal(false)}
        onSave={handleSaveEdit} saving={saving}
        timetableData={timetableData} classOptions={classOptions}
        divisionOptions={divisionOptions} subjectOptions={subjectOptions} accentColors={accentColors}
      />
      <NewAssignmentModal
        visible={newModal} onClose={() => setNewModal(false)}
        onCreate={handleCreate} creating={creating}
        defaultYear={selYear} defaultDivision={selDiv}
        timetableData={timetableData} classOptions={classOptions}
        divisionOptions={divisionOptions} subjectOptions={subjectOptions} accentColors={accentColors}
      />

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingBottom:52 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <Animated.View style={{ opacity:fadeAnim, transform:[{translateY:slideAnim}] }}>

          {/* Header */}
          <View style={[{ padding:20, paddingTop:Platform.OS==='ios'?24:20, gap:14, marginBottom:4 }, isWide&&{flexDirection:'row',alignItems:'center'}]}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:26, fontWeight:'800', color:C.textPri, fontFamily:SERIF_FONT, marginBottom:4 }}>Assignment Dashboard</Text>
              <Text style={{ fontSize:13, color:C.textSec }}>
                {selYear&&selDiv?`${selYear} · Div ${selDiv}${selSubject?` · ${selSubject}`:''}`:selYear?`${selYear} · Select a division`:'Select year & division to filter'}
              </Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <TouchableOpacity style={{ width:42, height:42, borderRadius:12, backgroundColor:C.surfaceEl, borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' }}>
                <Ionicons name="notifications-outline" size={20} color={C.textPri} />
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:7, backgroundColor:C.accent, paddingHorizontal:16, paddingVertical:11, borderRadius:12, shadowColor:C.accent, shadowOpacity:0.35, shadowRadius:10, elevation:4 }}
                onPress={() => setNewModal(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color={C.white} />
                <Text style={{ fontSize:13, fontWeight:'700', color:C.white }}>New Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Academic picker panel */}
          <View style={{ marginHorizontal:20, marginBottom:18, backgroundColor:C.surfaceEl, borderRadius:16, borderWidth:1, borderColor:C.border, padding:16, gap:16 }}>
            {timetableLoading ? (
              <View style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:8 }}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={{ fontSize:13, color:C.textSec }}>Loading your timetable…</Text>
              </View>
            ) : (
              <>
                {/* Year chips */}
                <View>
                  <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.4, marginBottom:8 }}>
                    <Ionicons name="school-outline" size={11} color={C.accent} />{'  '}Select Year
                  </Text>
                  {classOptions.length > 0 ? (
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                      {classOptions.map(key => {
                        const meta = accentColors[key]||{color:C.accent,bg:C.accentSoft};
                        return (
                          <TouchableOpacity key={key} onPress={() => pickYear(selYear===key?null:key)} activeOpacity={0.8}
                            style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:selYear===key?meta.color:C.border, backgroundColor:selYear===key?meta.bg:C.card, alignItems:'center', minWidth:72 }}>
                            <Text style={{ fontSize:17, fontWeight:'900', color:selYear===key?meta.color:C.textMuted, fontFamily:SERIF_FONT }}>{key}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic', paddingVertical:6 }}>No timetable data found</Text>}
                </View>

                {selYear && (
                  <View>
                    <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.4, marginBottom:8 }}>
                      <Ionicons name="git-branch-outline" size={11} color={C.teal} />{'  '}Division
                    </Text>
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                      {(divisionOptions[selYear]||[]).map(d => (
                        <TouchableOpacity key={d} onPress={() => pickDiv(selDiv===d?null:d)} activeOpacity={0.8}
                          style={{ paddingHorizontal:16, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:selDiv===d?C.teal:C.border, backgroundColor:selDiv===d?C.tealSoft:C.card, minWidth:76, alignItems:'center' }}>
                          <Text style={{ fontSize:13, fontWeight:'700', color:selDiv===d?C.teal:C.textMuted }}>Div {d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {selYear && selDiv && (
                  <View>
                    <Text style={{ fontSize:11, fontWeight:'700', color:C.textSec, letterSpacing:0.4, marginBottom:8 }}>
                      <Ionicons name="book-outline" size={11} color={C.purple} />{'  '}Subject (optional)
                    </Text>
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
                      {filteredOuterSubjects.length > 0 ? filteredOuterSubjects.map(sub => (
                        <TouchableOpacity key={sub} onPress={() => pickSubject(selSubject===sub?null:sub)} activeOpacity={0.8}
                          style={{ paddingHorizontal:14, paddingVertical:9, borderRadius:9, borderWidth:1, borderColor:selSubject===sub?C.purple:C.border, backgroundColor:selSubject===sub?C.purpleSoft:C.card }}>
                          <Text style={{ fontSize:12, fontWeight:'700', color:selSubject===sub?C.purple:C.textMuted }}>{sub}</Text>
                        </TouchableOpacity>
                      )) : <Text style={{ fontSize:12, color:C.textMuted, fontStyle:'italic', paddingVertical:6 }}>No subjects found</Text>}
                    </View>
                  </View>
                )}

                {selYear && (
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.greenSoft, borderRadius:10, borderWidth:1, borderColor:C.green+'40', paddingHorizontal:12, paddingVertical:9 }}>
                    <Ionicons name="checkmark-circle" size={14} color={C.green} />
                    <Text style={{ flex:1, fontSize:12, color:C.textSec }}>
                      {selYear}{selDiv?<Text style={{ color:C.teal, fontWeight:'800' }}>{'  ›  Div '}{selDiv}</Text>:null}
                      {selSubject?<Text style={{ color:C.purple, fontWeight:'800' }}>{'  ›  '}{selSubject}</Text>:null}
                    </Text>
                    <TouchableOpacity onPress={() => pickYear(null)}
                      style={{ flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:8, paddingVertical:4, borderRadius:6, backgroundColor:C.surfaceEl, borderWidth:1, borderColor:C.border }}>
                      <Ionicons name="close" size={11} color={C.textMuted} />
                      <Text style={{ fontSize:10, color:C.textMuted, fontWeight:'600' }}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* KPIs */}
          {isWide ? (
            <View style={{ flexDirection:'row', gap:12, paddingHorizontal:20, marginBottom:18 }}>
              {kpis.map((k,i) => (
                <View key={i} style={{ flex:1, borderRadius:14, borderWidth:1, padding:14, overflow:'hidden', backgroundColor:k.bg, borderColor:k.color+'35' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:4 }}>
                    <View style={{ width:40, height:40, borderRadius:11, alignItems:'center', justifyContent:'center', backgroundColor:k.color+'20' }}>
                      <Ionicons name={k.icon} size={20} color={k.color} />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontSize:12, color:C.textSec, marginBottom:2 }}>{k.label}</Text>
                      <Text style={{ fontSize:28, fontWeight:'900', fontFamily:SERIF_FONT, color:k.color }}>{k.value}</Text>
                    </View>
                  </View>
                  <View style={{ position:'absolute', bottom:0, left:0, right:0, height:3, borderBottomLeftRadius:14, borderBottomRightRadius:14, opacity:0.6, backgroundColor:k.color }} />
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:12, paddingHorizontal:20, paddingVertical:2 }} style={{ marginBottom:18 }}>
              {kpis.map((k,i) => (
                <View key={i} style={{ width:130, borderRadius:14, borderWidth:1, padding:14, gap:6, overflow:'hidden', backgroundColor:k.bg, borderColor:k.color+'35' }}>
                  <View style={{ width:40, height:40, borderRadius:11, alignItems:'center', justifyContent:'center', backgroundColor:k.color+'20' }}>
                    <Ionicons name={k.icon} size={18} color={k.color} />
                  </View>
                  <Text style={{ fontSize:12, color:C.textSec, marginBottom:2 }}>{k.label}</Text>
                  <Text style={{ fontSize:28, fontWeight:'900', fontFamily:SERIF_FONT, color:k.color }}>{k.value}</Text>
                  <View style={{ position:'absolute', bottom:0, left:0, right:0, height:3, borderBottomLeftRadius:14, borderBottomRightRadius:14, opacity:0.6, backgroundColor:k.color }} />
                </View>
              ))}
            </ScrollView>
          )}

          {/* Search + filter */}
          <View style={[{ paddingHorizontal:20, gap:10, marginBottom:6 }, isWide&&{flexDirection:'row',alignItems:'center'}]}>
            <View style={{ flex:1, flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.surfaceEl, borderRadius:12, borderWidth:1, borderColor:C.border, paddingHorizontal:12, paddingVertical:11 }}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput style={{ flex:1, fontSize:14, color:C.textPri }} placeholder="Search assignments…" placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch} />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={15} color={C.textMuted} /></TouchableOpacity>}
            </View>
            <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:C.surfaceEl, borderRadius:12, borderWidth:1, borderColor:C.border, paddingHorizontal:12, paddingVertical:11 }}
              onPress={() => setShowFilters(p=>!p)}>
              <Ionicons name="options-outline" size={14} color={C.textSec} />
              <Text style={{ fontSize:13, fontWeight:'600', color:C.textSec }}>Filters</Text>
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={{ marginHorizontal:20, marginBottom:14, backgroundColor:C.surfaceEl, borderRadius:14, borderWidth:1, borderColor:C.border, padding:14 }}>
              <Text style={{ fontSize:11, fontWeight:'700', color:C.textMuted, letterSpacing:0.8, marginBottom:8 }}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8 }}>
                {STATUSES.map(st => {
                  const meta = st==='All Statuses'?{color:C.accent}:STATUS_META[st];
                  return (
                    <TouchableOpacity key={st} onPress={() => setSelStatus(st)}
                      style={{ paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:selStatus===st?meta.color:C.border, backgroundColor:selStatus===st?meta.color+'20':C.card }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color:selStatus===st?meta.color:C.textSec }}>{st}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Grid */}
          <View style={{ paddingHorizontal:16, gap:14, marginTop:10 }}>
            {rows.map((row,ri) => (
              <View key={ri} style={[{ gap:14 }, isWide&&{flexDirection:'row'}]}>
                {row.map(item => (
                  <View key={item.id} style={[{}, isWide&&{flex:1}]}>
                    <AssignmentCard item={item}
                      onEdit={() => handleEdit(item)} onView={() => handleView(item)}
                      onApprove={() => handleApprove(item)} onDelete={() => handleDelete(item)}
                      accentColors={accentColors}
                    />
                  </View>
                ))}
                {ri===rows.length-1 && row.length<colCount && (
                  <>
                    {showCreate && <View style={[{}, isWide&&{flex:1}]}><CreateCard onPress={() => setNewModal(true)} /></View>}
                    {Array.from({length:colCount-row.length-(showCreate?1:0)}).map((_,ei) => isWide?<View key={ei} style={{flex:1}} />:null)}
                  </>
                )}
              </View>
            ))}
            {showCreate && filtered.length%colCount===0 && (
              <View style={[{gap:14},isWide&&{flexDirection:'row'}]}>
                <View style={[{},isWide&&{flex:1}]}><CreateCard onPress={() => setNewModal(true)} /></View>
                {isWide && Array.from({length:colCount-1}).map((_,ei) => <View key={ei} style={{flex:1}} />)}
              </View>
            )}
          </View>

          {filtered.length===0 && !loading && (
            <View style={{ alignItems:'center', paddingVertical:48, gap:8 }}>
              <Ionicons name="search" size={44} color={C.textMuted} />
              <Text style={{ fontSize:16, fontWeight:'700', color:C.textSec }}>No assignments found</Text>
              <Text style={{ fontSize:13, color:C.textMuted }}>Try adjusting your search or filters</Text>
            </View>
          )}

          <Text style={{ textAlign:'center', fontSize:12, color:C.textMuted, marginTop:24, paddingHorizontal:20 }}>
            © 2024 UniVerse Educational Systems. All Rights Reserved.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
