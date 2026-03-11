// Screens/Teacher/AttendanceRecord.js
// ✅ FULLY FUNCTIONAL
//    — Loads sessions from BOTH backend (GET /attendance/teacher/:id)
//      AND locally-stored AsyncStorage recent sessions (merged, deduped)
//    — Edit attendance, delete session
//    — Filter by All / Theory / Lab
//    — Stats strip, animated cards

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Theme ──────────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:         '#080A10', surface:   '#0F1220', surfaceEl: '#161C2E',
  border:     '#1C2235', accent:    '#22D3EE', accentSoft:'rgba(34,211,238,0.12)',
  green:      '#22C55E', greenSoft: 'rgba(34,197,94,0.15)',
  red:        '#F43F5E', redSoft:   'rgba(244,63,94,0.15)',
  yellow:     '#FBBF24', yellowSoft:'rgba(251,191,36,0.15)',
  purple:     '#A78BFA', purpleSoft:'rgba(167,139,250,0.15)',
  textPri:    '#EEF2FF', textSec:   '#8B96B2', textMuted: '#3B4260',
};
const C_LIGHT = {
  bg:         '#F1F4FD', surface:   '#FFFFFF', surfaceEl: '#EAEEf9',
  border:     '#DDE3F4', accent:    '#0891B2', accentSoft:'rgba(8,145,178,0.10)',
  green:      '#16A34A', greenSoft: 'rgba(22,163,74,0.10)',
  red:        '#DC2626', redSoft:   'rgba(220,38,38,0.10)',
  yellow:     '#D97706', yellowSoft:'rgba(217,119,6,0.10)',
  purple:     '#7C3AED', purpleSoft:'rgba(124,58,237,0.10)',
  textPri:    '#0F172A', textSec:   '#4B5563', textMuted: '#9CA3AF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const RECENT_KEY = 'recentAttendanceSessions';

const TYPE_META_FN = (C) => ({
  Theory: { color: C.accent,  bg: C.accentSoft,  icon: 'book-outline'  },
  Lab:    { color: C.purple,  bg: C.purpleSoft,  icon: 'flask-outline' },
});

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const fmtRelTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const extractSid = (sid, idx) => {
  if (!sid) return `fallback_${idx}`;
  if (typeof sid === 'object' && sid._id) return String(sid._id);
  const s = String(sid);
  return s === 'undefined' || s === 'null' ? `fallback_${idx}` : s;
};

const sessionToRecord = (session) => {
  const students = (session.students ?? []).map((s, i) => ({
    studentId:  extractSid(s.studentId, i),
    name:       s.studentId?.name ?? s.name ?? 'Unknown',
    rollNumber: s.studentId?.roll_no ?? s.studentId?.rollNumber ?? s.rollNumber ?? '',
    status:     s.status,
  }));
  const presentCount = students.filter(s => s.status === 'Present').length;
  const totalCount = students.length;
  return {
    id:           String(session._id),
    sessionId:    String(session._id),
    class:        session.year,
    division:     session.division,
    subject:      session.subject,
    type:         session.batch ? 'Lab' : 'Theory',
    batch:        session.batch ?? null,
    date:         session.date,
    time:         fmtTime(session.createdAt ?? session.date),
    createdAt:    session.createdAt ?? session.date,
    presentCount: Number(presentCount) || 0,
    totalCount:   Number(totalCount) || 0,
    percentage:   totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0,
    students,
    source:       'backend',
  };
};

/* ─── Transform locally-stored recent session → record ────────────────────── */
const localToRecord = (local) => ({
  id:           String(local.id),
  sessionId:    String(local.id),
  class:        local.year,
  division:     local.division,
  subject:      local.subject,
  type:         local.type || (local.batch ? 'Lab' : 'Theory'),
  batch:        local.batch ?? null,
  date:         local.date,
  time:         fmtTime(local.createdAt ?? local.date),
  createdAt:    local.createdAt ?? local.date,
  presentCount: Number(local.presentCount) || 0,
  totalCount:   Number(local.totalCount) || 0,
  percentage:   Number(local.percentage) || (Number(local.totalCount) > 0 ? Math.round((Number(local.presentCount) / Number(local.totalCount)) * 100) : 0),
  students:     [],
  source:       'local',
});

/* ══════════════════════════════════════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════════════════════════════════════════ */
const EditModal = ({ visible, record, onClose, onSave }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const em = makeEm(C);
  const TYPE_META = TYPE_META_FN(C);
  const [localAtt, setLocalAtt] = useState({});
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!record) return;
    const map = {};
    (record.students ?? []).forEach((s, i) => {
      map[extractSid(s.studentId, i)] = s.status;
    });
    setLocalAtt(map);
  }, [record]);

  if (!record) return null;
  if (record.source === 'local' || record.students.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={em.overlay}>
          <View style={[em.sheet, { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }]}>
            <Ionicons name="information-circle-outline" size={44} color={C.textMuted} />
            <Text style={[em.title, { marginTop: 12 }]}>Student Details Unavailable</Text>
            <Text style={[em.sub, { textAlign: 'center', marginTop: 6, paddingHorizontal: 24 }]}>
              This session was stored locally. Full student details are available once synced with the server.
            </Text>
            <TouchableOpacity style={[em.saveBtn, { marginTop: 24, flex: 0, paddingHorizontal: 32 }]} onPress={onClose}>
              <Text style={em.saveText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const students  = record.students ?? [];
  const toggle    = (sid) => setLocalAtt(p => ({ ...p, [sid]: p[sid] === 'Present' ? 'Absent' : 'Present' }));
  const present   = students.filter((s, i) => localAtt[extractSid(s.studentId, i)] === 'Present').length;
  const absent    = students.length - present;
  const pct       = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
  const typeMeta  = TYPE_META[record.type] ?? TYPE_META.Theory;

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
      if (buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = students.map((s, i) => {
        const sid = extractSid(s.studentId, i);
        return { studentId: sid, status: localAtt[sid] ?? s.status };
      });
      await axiosInstance.put(`/attendance/update/${record.sessionId}`, { students: updated });
      onSave(record.id, updated, present, students.length);
      onClose();
      showAlert('✅ Saved', 'Attendance updated successfully.');
    } catch (err) {
      showAlert('Error', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          {/* Header */}
          <View style={em.header}>
            <View style={em.headerLeft}>
              <View style={[em.typeIcon, { backgroundColor: typeMeta.bg }]}>
                <Ionicons name={typeMeta.icon} size={18} color={typeMeta.color} />
              </View>
              <View>
                <Text style={em.title}>Edit Attendance</Text>
                <Text style={em.sub}>{record.class}-{record.division}  ·  {record.subject}{record.batch ? `  ·  ${record.batch}` : ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={em.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textSec} />
            </TouchableOpacity>
          </View>

          {/* Counters */}
          <View style={em.counters}>
            {[
              { label: 'Present', val: present,         color: C.green,  bg: C.greenSoft  },
              { label: 'Absent',  val: absent,          color: C.red,    bg: C.redSoft    },
              { label: 'Total',   val: students.length, color: C.accent, bg: C.accentSoft },
              { label: 'Rate',    val: `${pct}%`,       color: pct >= 75 ? C.green : C.red, bg: pct >= 75 ? C.greenSoft : C.redSoft },
            ].map(item => (
              <View key={item.label} style={[em.counter, { backgroundColor: item.bg, borderColor: item.color + '40' }]}>
                <Text style={[em.counterVal,   { color: item.color }]}>{item.val}</Text>
                <Text style={[em.counterLabel, { color: item.color + 'AA' }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Info */}
          <View style={em.infoStrip}>
            <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
            <Text style={em.infoText}>{fmtDate(record.date)}</Text>
            <View style={em.infoDot} />
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={em.infoText}>{record.time}</Text>
            <View style={em.infoDot} />
            <View style={[em.typePill, { backgroundColor: typeMeta.bg }]}>
              <Text style={[em.typePillText, { color: typeMeta.color }]}>{record.type}</Text>
            </View>
          </View>

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}>
            {students.map((student, idx) => {
              const sid       = extractSid(student.studentId, idx);
              const isPresent = localAtt[sid] === 'Present';
              return (
                <TouchableOpacity key={sid} onPress={() => toggle(sid)} activeOpacity={0.8}
                  style={[em.studentRow, {
                    borderColor:     isPresent ? C.green + '40' : C.red + '40',
                    backgroundColor: isPresent ? 'rgba(34,197,94,0.06)' : 'rgba(244,63,94,0.06)',
                  }]}>
                  <View style={[em.avatar, { backgroundColor: isPresent ? C.greenSoft : C.redSoft }]}>
                    <Text style={[em.avatarText, { color: isPresent ? C.green : C.red }]}>
                      {(student.name || '?').split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={em.studentName}>{student.name}</Text>
                    <Text style={em.studentMeta}>Roll {student.rollNumber || '—'}</Text>
                  </View>
                  <View style={[em.toggle, { backgroundColor: isPresent ? C.green : C.red, borderColor: isPresent ? C.green : C.red }]}>
                    <Ionicons name={isPresent ? 'checkmark' : 'close'} size={15} color="#fff" />
                    <Text style={em.toggleText}>{isPresent ? 'Present' : 'Absent'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={em.footer}>
            <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
              <Text style={em.cancelText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[em.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={em.saveText}>Save Changes</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Record Card ────────────────────────────────────────────────────────── */
const RecordCard = ({ record, index, onEdit, onDelete }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const rc = makeRc(C);
  const TYPE_META = TYPE_META_FN(C);
  const anim     = useRef(new Animated.Value(0)).current;
  const typeMeta = TYPE_META[record.type] ?? TYPE_META.Theory;
  const pct      = Number(record.percentage) || 0;
  const pctColor = pct >= 75 ? C.green : pct >= 60 ? C.yellow : C.red;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: index * 55, tension: 70, friction: 12, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [18, 0] }) }] }}>
      <View style={rc.card}>
        <View style={rc.topRow}>
          <View style={[rc.typeIcon, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={16} color={typeMeta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={rc.titleRow}>
              <Text style={rc.classLabel}>
                {record.class}-{record.division}{record.batch ? `  ·  ${record.batch}` : ''}
              </Text>
              <View style={[rc.typeBadge, { backgroundColor: typeMeta.bg }]}>
                <Text style={[rc.typeBadgeText, { color: typeMeta.color }]}>{record.type}</Text>
              </View>
              {record.source === 'local' && (
                <View style={rc.localBadge}>
                  <Text style={rc.localBadgeText}>Local</Text>
                </View>
              )}
            </View>
            <Text style={rc.subject} numberOfLines={1}>{record.subject}</Text>
          </View>
          <View style={[rc.pctBadge, { borderColor: pctColor + '50', backgroundColor: pctColor + '12' }]}>
            <Text style={[rc.pctText, { color: pctColor }]}>{pct}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={rc.barTrack}>
          <View style={[rc.barFill, { width: `${pct}%`, backgroundColor: pctColor }]} />
        </View>

        {/* Stats */}
        <View style={rc.statsRow}>
          <View style={rc.statItem}><View style={[rc.statDot, { backgroundColor: C.green }]} /><Text style={rc.statText}>{Number(record.presentCount) || 0} Present</Text></View>
          <View style={rc.statItem}><View style={[rc.statDot, { backgroundColor: C.red }]} /><Text style={rc.statText}>{(Number(record.totalCount) || 0) - (Number(record.presentCount) || 0)} Absent</Text></View>
          <Text style={rc.statSep}>·</Text>
          <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
          <Text style={rc.statText}>{fmtDate(record.date)}</Text>
          <Text style={rc.statSep}>·</Text>
          <Ionicons name="time-outline" size={11} color={C.textMuted} />
          <Text style={rc.statText}>{record.time || fmtTime(record.createdAt)}</Text>
        </View>

        {/* Relative time */}
        {record.createdAt && (
          <Text style={rc.relTime}>{fmtRelTime(record.createdAt)}</Text>
        )}

        {/* Actions */}
        <View style={rc.actions}>
          <TouchableOpacity style={rc.editBtn} onPress={() => onEdit(record)} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={14} color={C.accent} />
            <Text style={rc.editBtnText}>
              {record.source === 'local' ? 'Details' : 'Edit Attendance'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={rc.deleteBtn} onPress={() => onDelete(record)} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={14} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════════════════ */
export default function AttendanceRecord() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const TYPE_META = TYPE_META_FN(C);
  const em = makeEm(C);
  const rc = makeRc(C);
  const s  = makeS(C);
  const navigation = useNavigation();
  const route      = useRoute();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;

  const teacherId = route?.params?.teacherId;

  const [records,     setRecords]     = useState([]);
  const [editRecord,  setEditRecord]  = useState(null);
  const [editVisible, setEditVisible] = useState(false);
  const [filter,      setFilter]      = useState('All');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState(null);

  /* ── Timetable ── */
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [years,          setYears]          = useState([]);
  const [divisions,      setDivisions]      = useState([]);
  const [subjects,       setSubjects]       = useState([]);

  /* ── Selections ── */
  const [selYear,     setSelYear]     = useState(null);
  const [selDivision, setSelDivision] = useState(null);
  const [selSubject,  setSelSubject]  = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  /* ─── Entrance animation ────────────────────────────────────────────── */
  const runEntrance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 13, useNativeDriver: true }),
    ]).start();
  }, []);

  /* ─── Load timetable ────────────────────────────────────────────────── */
  const loadTimetable = useCallback(async () => {
    if (!teacherId) return;
    try {
      const res = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
      const slots = res.data?.data || [];
      setTimetableSlots(slots);
      // Derive years
      const yrs = [...new Set(slots.map(s => s.year))].sort();
      setYears(yrs);
      // Divisions and subjects will be derived based on selections
    } catch (err) {
      console.error('Failed to load timetable:', err);
    }
  }, [teacherId]);

  /* ─── Merge backend + local records (deduped by id) ─────────────────── */
  const mergeRecords = useCallback((backendRecords, localSessions) => {
    const map = new Map();
    // Backend records take priority
    backendRecords.forEach(r => map.set(r.id, r));
    // Add local ones that aren't already in backend
    localSessions.forEach(l => {
      const r = localToRecord(l);
      if (!map.has(r.id)) map.set(r.id, r);
    });
    // Sort newest first
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, []);

  /* ─── Fetch sessions ─────────────────────────────────────────────────── */
  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      // 1. Load locally stored recents (always available, even offline)
      const localSessions = await AsyncStorage.getItem(RECENT_KEY);
      const parsed = localSessions ? JSON.parse(localSessions) : [];

      // 2. Try fetching from backend
      let backendRecords = [];
      if (teacherId) {
        try {
          const res = await axiosInstance.get(`/attendance/teacher/${teacherId}`);
          backendRecords = (res.data?.sessions ?? []).map(sessionToRecord);
        } catch (err) {
          // Backend unavailable — use local only
          setError('Could not reach server. Showing locally-stored sessions.');
        }
      }

      // 3. Merge
      const merged = mergeRecords(backendRecords, parsed);
      setRecords(merged);
    } catch (err) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
      setRefreshing(false);
      runEntrance();
    }
  }, [teacherId, mergeRecords, runEntrance]);

  /* ─── Focus effect: re-fetch + handle new record from Attendance screen ─ */
  useFocusEffect(
    useCallback(() => {
      const newRecord = route?.params?.newAttendanceRecord;
      if (newRecord) {
        const mapped = sessionToRecord(newRecord);
        setRecords(prev => {
          const exists = prev.find(r => r.id === mapped.id);
          return exists ? prev : [mapped, ...prev];
        });
        navigation.setParams({ newAttendanceRecord: undefined });
      }
      fetchSessions();
      loadTimetable();
    }, [fetchSessions, loadTimetable, route?.params?.newAttendanceRecord])
  );

  /* ── Year → Divisions ── */
  useEffect(() => {
    if (!selYear) {
      setDivisions([]);
      setSelDivision(null);
      return;
    }
    const divs = [...new Set(timetableSlots.filter(s => s.year === selYear).map(s => s.division))].sort();
    setDivisions(divs);
    setSelDivision(null);
  }, [selYear, timetableSlots]);

  /* ── Year + Division → Subjects ── */
  useEffect(() => {
    if (!selYear || !selDivision) {
      setSubjects([]);
      setSelSubject(null);
      return;
    }
    const subs = [...new Set(timetableSlots.filter(s => s.year === selYear && s.division === selDivision).map(s => s.subject))].sort();
    setSubjects(subs);
    setSelSubject(null);
  }, [selYear, selDivision, timetableSlots]);

  /* ─── Edit / Save / Delete ──────────────────────────────────────────── */
  const handleEdit = (record) => { setEditRecord(record); setEditVisible(true); };

  const handleSave = (id, updatedStudents, newPresent, newTotal) => {
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      const pct = Number(newTotal) > 0 ? Math.round((Number(newPresent) / Number(newTotal)) * 100) : 0;
      return { ...r, students: updatedStudents, presentCount: Number(newPresent) || 0, totalCount: Number(newTotal) || 0, percentage: pct };
    }));
  };

  const handleDelete = (record) => {
    const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
      if (Platform.OS === 'web') {
        if (buttons.length === 1) {
          // Simple alert for single button
          alert(`${title}\n\n${message}`);
          if (buttons[0] && buttons[0].onPress) {
            buttons[0].onPress();
          }
        } else {
          // Confirmation dialog for multiple buttons (OK/Cancel)
          const confirmed = window.confirm(`${title}\n\n${message}`);
          if (confirmed && buttons[1] && buttons[1].onPress) {
            buttons[1].onPress(); // Assume second button is the action (Delete)
          }
        }
      } else {
        // For mobile, use React Native Alert
        Alert.alert(title, message, buttons);
      }
    };

    const confirmDelete = async () => {
      setDeleting(true);
      try {
        let dbDeleteSuccess = false;
        // Try to delete from database if sessionId exists
        if (record.sessionId) {
          try {
            const res = await axiosInstance.delete(`/attendance/session/${record.sessionId}`);
            if (res.data?.success || res.status === 200) {
              dbDeleteSuccess = true;
            }
          } catch (dbErr) {
            console.warn('Database delete failed:', dbErr.message);
          }
        }

        // Remove from local storage
        const raw  = await AsyncStorage.getItem(RECENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const updated = list.filter(s => String(s.id) !== String(record.id));
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));

        // Update UI immediately
        setRecords(prev => prev.filter(r => String(r.id) !== String(record.id)));
        setDeleting(false);

        // Show feedback
        showAlert(
          '✅ Deleted',
          dbDeleteSuccess
            ? 'Session deleted from database and local storage.'
            : 'Session removed. (Local deletion only - database may have issues)'
        );
      } catch (err) {
        console.error('Delete error:', err);
        setDeleting(false);
        showAlert('Error', 'Failed to delete session: ' + (err.message || 'Unknown error'));
      }
    };

    showAlert(
      'Delete Record',
      'Are you sure you want to delete this attendance record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  /* ─── Derived values ─────────────────────────────────────────────────── */
  const displayed = records
    .filter(r => filter === 'All' || r.type === filter)
    .filter(r => !selYear || r.class === selYear)
    .filter(r => !selDivision || r.division === selDivision)
    .filter(r => !selSubject || r.subject === selSubject)
    .filter(r => {
      // Only show sessions from the last 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      return new Date(r.createdAt) >= sixHoursAgo;
    });
  const totalSessions = records.length;
  const totalStudents = records.reduce((a, r) => a + (Number(r.totalCount) || 0),   0);
  const totalPresent  = records.reduce((a, r) => a + (Number(r.presentCount) || 0), 0);
  const overallPct    = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textSec, marginTop: 12 }}>Loading records…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSessions(true)}
            tintColor={C.accent} colors={[C.accent]}
          />
        }>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Dashboard  ›  Attendance Records</Text>
              <Text style={s.title}>Recent Classes</Text>
              <Text style={s.sub}>
                {totalSessions === 0
                  ? 'No sessions in the last 6 hours'
                  : `${totalSessions} session${totalSessions !== 1 ? 's' : ''} in the last 6 hours  ·  ${overallPct}% overall`}
              </Text>
            </View>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={14} color={C.textPri} />
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={C.yellow} />
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchSessions(true)} style={s.retryBtn}>
                <Text style={s.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats strip */}
          {records.length > 0 && (
            <View style={s.statsStrip}>
              {[
                { label: 'Sessions', value: totalSessions,    color: C.accent  },
                { label: 'Students', value: totalStudents,    color: C.purple  },
                { label: 'Present',  value: totalPresent,     color: C.green   },
                { label: 'Avg Rate', value: `${overallPct}%`, color: overallPct >= 75 ? C.green : C.red },
              ].map(item => (
                <View key={item.label} style={[s.statCard, { borderColor: item.color + '30', backgroundColor: item.color + '0D' }]}>
                  <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Filters */}
          {years.length > 0 && (
            <>
              {/* Year */}
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8, color: C.textSec }}>Year</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {years.map(y => (
                    <TouchableOpacity key={y}
                      onPress={() => setSelYear(selYear === y ? null : y)}
                      style={[s.chip, selYear === y && { borderColor: C.accent, backgroundColor: C.accentSoft }]}>
                      <Text style={[s.chipText, selYear === y && { color: C.accent }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Division */}
              {selYear && divisions.length > 0 && (
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8, color: C.textSec }}>Division</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {divisions.map(d => (
                      <TouchableOpacity key={d}
                        onPress={() => setSelDivision(selDivision === d ? null : d)}
                        style={[s.chip, selDivision === d && { borderColor: C.accent, backgroundColor: C.accentSoft }]}>
                        <Text style={[s.chipText, selDivision === d && { color: C.accent }]}>Div {d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Subject */}
              {selDivision && subjects.length > 0 && (
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 8, color: C.textSec }}>Subject</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {subjects.map(sub => (
                      <TouchableOpacity key={sub}
                        onPress={() => setSelSubject(selSubject === sub ? null : sub)}
                        style={[s.chip, selSubject === sub && { borderColor: C.accent, backgroundColor: C.accentSoft }]}>
                        <Text style={[s.chipText, selSubject === sub && { color: C.accent }]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Type filter - show only if records exist */}
              {records.length > 0 && (
                <View style={s.filterRow}>
                  {['All', 'Theory', 'Lab'].map(f => {
                    const fColor = f === 'Lab' ? C.purple : C.accent;
                    const active = filter === f;
                    return (
                      <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.8}
                        style={[s.filterTab, active && { borderColor: fColor + '60', backgroundColor: fColor + '15' }]}>
                        <Ionicons
                          name={f === 'Theory' ? 'book-outline' : f === 'Lab' ? 'flask-outline' : 'layers-outline'}
                          size={12} color={active ? fColor : C.textMuted} />
                        <Text style={[s.filterTabText, active && { color: fColor }]}>{f}</Text>
                        <View style={[s.filterCount, { backgroundColor: (active ? fColor : C.textMuted) + '22' }]}>
                          <Text style={[s.filterCountText, { color: active ? fColor : C.textMuted }]}>
                            {displayed.length}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Record list */}
          <View style={s.list}>
            {displayed.length > 0
              ? displayed.map((rec, i) => (
                  <RecordCard key={rec.id} record={rec} index={i} onEdit={handleEdit} onDelete={handleDelete} />
                ))
              : (
                <View style={s.empty}>
                  <View style={s.emptyIcon}>
                    <Ionicons name="document-text-outline" size={40} color={C.textMuted} />
                  </View>
                  <Text style={s.emptyTitle}>{records.length === 0 ? 'No Records Yet' : `No ${filter} Sessions`}</Text>
                  <Text style={s.emptySub}>
                    {records.length === 0
                      ? 'Submit attendance and it will appear here automatically.'
                      : `Try a different filter.`}
                  </Text>
                  {records.length === 0 && (
                    <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={16} color={C.accent} />
                      <Text style={s.emptyBtnText}>Take Attendance</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
          </View>

        </Animated.View>
      </ScrollView>

      <EditModal
        visible={editVisible} record={editRecord}
        onClose={() => setEditVisible(false)} onSave={handleSave}
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeEm = (C) => StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%', borderTopWidth: 1, borderColor: C.border },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  typeIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 16, fontWeight: '800', color: C.textPri },
  sub:          { fontSize: 11, color: C.textSec, marginTop: 2 },
  closeBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  counters:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  counter:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  counterVal:   { fontSize: 18, fontWeight: '900', fontFamily: SERIF },
  counterLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  infoStrip:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  infoText:     { fontSize: 11, color: C.textMuted },
  infoDot:      { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textMuted },
  typePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: '800' },
  studentRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  avatar:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 12, fontWeight: '900' },
  studentName:  { fontSize: 13, fontWeight: '700', color: C.textPri },
  studentMeta:  { fontSize: 11, color: C.textSec, marginTop: 1 },
  toggle:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, minWidth: 82, justifyContent: 'center' },
  toggleText:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  footer:       { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  cancelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl },
  cancelText:   { fontSize: 14, fontWeight: '700', color: C.textSec },
  saveBtn:      { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: C.green, shadowColor: C.green, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  saveText:     { fontSize: 14, fontWeight: '800', color: '#fff' },
});
const makeRc = (C) => StyleSheet.create({
  card:          { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  topRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  typeIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  classLabel:    { fontSize: 15, fontWeight: '800', color: C.textPri },
  typeBadge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  localBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.yellowSoft, borderWidth: 1, borderColor: C.yellow + '40' },
  localBadgeText:{ fontSize: 9, fontWeight: '800', color: C.yellow },
  subject:       { fontSize: 12, color: C.textSec },
  pctBadge:      { alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 26, borderWidth: 1.5 },
  pctText:       { fontSize: 15, fontWeight: '900', fontFamily: SERIF },
  barTrack:      { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  barFill:       { height: '100%', borderRadius: 3 },
  statsRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  statItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot:       { width: 6, height: 6, borderRadius: 3 },
  statText:      { fontSize: 11, color: C.textMuted },
  statSep:       { fontSize: 11, color: C.textMuted, marginHorizontal: 2 },
  relTime:       { fontSize: 10, color: C.textMuted, marginBottom: 10 },
  actions:       { flexDirection: 'row', gap: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.accent + '50', backgroundColor: C.accentSoft },
  editBtnText:   { fontSize: 13, fontWeight: '700', color: C.accent },
  deleteBtn:     { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.red + '40', backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' },
});
const makeS = (C) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  header:      { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  headerWide:  { alignItems: 'center' },
  breadcrumb:  { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  title:       { fontSize: 28, fontWeight: '800', color: C.textPri, fontFamily: SERIF, marginBottom: 3 },
  sub:         { fontSize: 13, color: C.textSec },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl, alignSelf: 'flex-start', marginTop: 4 },
  backBtnText: { fontSize: 13, fontWeight: '600', color: C.textPri },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: C.yellowSoft, borderWidth: 1, borderColor: C.yellow + '40' },
  errorText:   { fontSize: 12, color: C.yellow, flex: 1 },
  retryBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.yellow + '25' },
  retryText:   { fontSize: 11, fontWeight: '700', color: C.yellow },
  statsStrip:  { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  statCard:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 2 },
  statVal:     { fontSize: 18, fontWeight: '900', fontFamily: SERIF },
  statLabel:   { fontSize: 9, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
  filterRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 18 },
  filterTab:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl },
  filterTabText:   { fontSize: 12, fontWeight: '700', color: C.textMuted },
  filterCount:     { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  filterCountText: { fontSize: 10, fontWeight: '800' },
  list:        { paddingHorizontal: 20 },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:   { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: C.textSec },
  emptySub:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.accent + '50', backgroundColor: C.accentSoft },
  emptyBtnText:{ fontSize: 13, fontWeight: '700', color: C.accent },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceEl },
  chipText:    { fontSize: 13, fontWeight: '600', color: C.textSec },
});