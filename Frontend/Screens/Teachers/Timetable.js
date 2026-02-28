// Screens/Teacher/TimetableScreen.js
// Full Weekly Timetable — Teacher View (admin-assigned schedule)

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar, Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/* ─── Colors ─────────────────────────────────────────────────────────────── */
const C = {
  bg:           '#07090F',
  surface:      '#0D1120',
  surfaceEl:    '#111827',
  card:         '#0F1523',
  border:       '#1A2035',
  borderLight:  '#1E2845',
  accent:       '#3B82F6',
  accentSoft:   'rgba(59,130,246,0.14)',
  accentGlow:   'rgba(59,130,246,0.06)',
  cyan:         '#06B6D4',
  cyanSoft:     'rgba(6,182,212,0.14)',
  green:        '#10B981',
  greenSoft:    'rgba(16,185,129,0.14)',
  purple:       '#8B5CF6',
  purpleSoft:   'rgba(139,92,246,0.14)',
  orange:       '#F59E0B',
  orangeSoft:   'rgba(245,158,11,0.14)',
  red:          '#EF4444',
  redSoft:      'rgba(239,68,68,0.14)',
  textPrimary:  '#EEF2FF',
  textSec:      '#8B96BE',
  textMuted:    '#3D4A6A',
  cancelled:    '#EF4444',
  cancelledSoft:'rgba(239,68,68,0.14)',
  postponed:    '#F59E0B',
  postponedSoft:'rgba(245,158,11,0.14)',
  nowLine:      '#10B981',
  lunchBg:      'rgba(245,158,11,0.06)',
  breakBg:      'rgba(59,130,246,0.05)',
  white:        '#FFFFFF',
};

/* ─── Teacher data (simulating admin-assigned schedules) ─────────────────── */
const TEACHERS = {
  'T001': {
    name: 'Dr. Arjun Mehta',
    subject: 'Physics',
    dept: 'Science Dept.',
    avatar: 'AM',
    avatarColor: C.accent,
    schedule: {
      MON: [
        { id: 's1', subject: 'Classical Mechanics', code: 'PHY301', section: 'TY-A', room: 'Room 402', start: '09:00', end: '10:30', type: 'LECTURE', color: C.accent },
        { id: 's2', subject: 'Thermodynamics Lab', code: 'PHY302L', section: 'TY-B', room: 'Lab 01', start: '13:00', end: '15:00', type: 'LAB', color: C.cyan },
      ],
      TUE: [
        { id: 's3', subject: 'Quantum Physics', code: 'PHY401', section: 'SY-A', room: 'Room 303', start: '10:30', end: '12:00', type: 'LECTURE', color: C.accent },
        { id: 's4', subject: 'Faculty Meeting', code: '—', section: 'All Faculty', room: 'Conf. Hall B', start: '14:00', end: '15:00', type: 'MEETING', color: C.orange },
      ],
      WED: [
        { id: 's5', subject: 'Classical Mechanics', code: 'PHY301', section: 'TY-A', room: 'Room 402', start: '09:00', end: '10:30', type: 'LECTURE', color: C.accent },
        { id: 's6', subject: 'Wave Optics', code: 'PHY205', section: 'FY-C', room: 'Room 105', start: '11:30', end: '13:00', type: 'LECTURE', color: C.purple },
        { id: 's7', subject: 'Doubt Session', code: 'PHY301', section: 'TY-A', room: 'Room 402', start: '15:30', end: '16:30', type: 'DOUBT', color: C.green },
      ],
      THU: [
        { id: 's8', subject: 'Quantum Physics Lab', code: 'PHY401L', section: 'SY-A', room: 'Lab 02', start: '10:30', end: '12:30', type: 'LAB', color: C.cyan },
        { id: 's9', subject: 'Wave Optics', code: 'PHY205', section: 'FY-C', room: 'Room 105', start: '14:00', end: '15:30', type: 'LECTURE', color: C.purple },
      ],
      FRI: [
        { id: 's10', subject: 'Thermodynamics', code: 'PHY302', section: 'TY-B', room: 'Room 210', start: '09:00', end: '10:30', type: 'LECTURE', color: C.accent },
        { id: 's11', subject: 'Research Lab', code: 'PHY500R', section: 'PG-A', room: 'Research Wing 3', start: '13:00', end: '17:00', type: 'LAB', color: C.cyan },
      ],
    },
  },
  'T002': {
    name: 'Prof. Sneha Kapoor',
    subject: 'Mathematics',
    dept: 'Math Dept.',
    avatar: 'SK',
    avatarColor: C.purple,
    schedule: {
      MON: [
        { id: 'm1', subject: 'Linear Algebra', code: 'MAT201', section: 'SY-B', room: 'Room 201', start: '10:30', end: '12:00', type: 'LECTURE', color: C.purple },
        { id: 'm2', subject: 'Calculus II', code: 'MAT102', section: 'FY-A', room: 'Room 305', start: '14:00', end: '15:30', type: 'LECTURE', color: C.orange },
      ],
      TUE: [
        { id: 'm3', subject: 'Differential Equations', code: 'MAT301', section: 'TY-A', room: 'Room 402', start: '09:00', end: '10:30', type: 'LECTURE', color: C.purple },
        { id: 'm4', subject: 'Linear Algebra', code: 'MAT201', section: 'SY-B', room: 'Room 201', start: '13:00', end: '14:30', type: 'LECTURE', color: C.purple },
      ],
      WED: [
        { id: 'm5', subject: 'Calculus II', code: 'MAT102', section: 'FY-A', room: 'Room 305', start: '11:30', end: '13:00', type: 'LECTURE', color: C.orange },
      ],
      THU: [
        { id: 'm6', subject: 'Differential Equations', code: 'MAT301', section: 'TY-A', room: 'Room 402', start: '09:00', end: '10:30', type: 'LECTURE', color: C.purple },
        { id: 'm7', subject: 'Math Doubt Session', code: 'MAT201', section: 'SY-B', room: 'Room 201', start: '15:00', end: '16:00', type: 'DOUBT', color: C.green },
      ],
      FRI: [
        { id: 'm8', subject: 'Linear Algebra', code: 'MAT201', section: 'SY-B', room: 'Room 201', start: '10:30', end: '12:00', type: 'LECTURE', color: C.purple },
      ],
    },
  },
};

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday' };
const DAY_DATES  = { MON: 'Oct 23', TUE: 'Oct 24', WED: 'Oct 25', THU: 'Oct 26', FRI: 'Oct 27' };

const TYPE_LABELS = {
  LECTURE: { label: 'Lecture', icon: 'book-outline',        bg: C.accentSoft,  color: C.accent  },
  LAB:     { label: 'Lab',     icon: 'flask-outline',       bg: C.cyanSoft,    color: C.cyan    },
  MEETING: { label: 'Meeting', icon: 'people-outline',      bg: C.orangeSoft,  color: C.orange  },
  DOUBT:   { label: 'Doubt',   icon: 'help-circle-outline', bg: C.greenSoft,   color: C.green   },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const formatTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ap}`;
};

const GRID_START = 8 * 60;   // 8:00 AM
const GRID_END   = 18 * 60;  // 6:00 PM
const PX_PER_MIN = 1.6;      // pixels per minute

const BREAKS = [
  { start: '12:30', end: '13:00', label: '🍽  LUNCH BREAK  (12:30 – 1:00 PM)', type: 'lunch' },
  { start: '15:15', end: '15:30', label: 'SHORT BREAK  (3:15 – 3:30)', type: 'short' },
];

const TIME_SLOTS = [];
for (let h = 8; h <= 18; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function TimetableScreen({ navigation, route }) {
  // In a real app: const teacherId = route?.params?.teacherId || 'T001';
  const teacherId = 'T001';
  const teacher   = TEACHERS[teacherId];

  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 768;

  const [view, setView]           = useState('weekly'); // 'weekly' | 'daily' | 'list'
  const [activeDay, setActiveDay] = useState('TUE');
  const [selectedClass, setSelectedClass] = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [uploadState, setUploadState]     = useState('idle'); // 'idle' | 'picking' | 'uploading' | 'success' | 'error'
  const [uploadedFile, setUploadedFile]   = useState(null);
  const [exportState, setExportState]     = useState('idle'); // 'idle' | 'generating' | 'done'
  const uploadProgressAnim = useRef(new Animated.Value(0)).current;

  // Cancel / Postpone state
  const [cancelledIds, setCancelledIds]     = useState(new Set());
  const [postponedMap, setPostponedMap]     = useState({}); // { classId: { newDate, newTime } }
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [postponeDate, setPostponeDate]     = useState('');
  const [postponeTime, setPostponeTime]     = useState('');
  const POSTPONE_DATE_OPTIONS = ['Mon, Oct 30', 'Tue, Oct 31', 'Wed, Nov 1', 'Thu, Nov 2', 'Fri, Nov 3'];
  const POSTPONE_TIME_OPTIONS = ['08:00 AM', '09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM'];

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const totalClasses = useMemo(() =>
    Object.values(teacher.schedule).reduce((acc, day) => acc + day.length, 0),
  [teacher]);

  const todayClasses = teacher.schedule[activeDay] || [];

  /* ── Class card press ── */
  const handleClassPress = (cls) => {
    setSelectedClass(cls);
    setModalVisible(true);
  };

  /* ── Cancel Lecture ── */
  const handleCancelLecture = () => {
    if (!selectedClass) return;
    setCancelledIds(prev => {
      const next = new Set(prev);
      if (next.has(selectedClass.id)) {
        next.delete(selectedClass.id); // toggle off
      } else {
        next.add(selectedClass.id);
        // remove postpone if was postponed
        setPostponedMap(pm => { const nm = { ...pm }; delete nm[selectedClass.id]; return nm; });
      }
      return next;
    });
    setModalVisible(false);
  };

  /* ── Postpone Lecture ── */
  const openPostponeModal = () => {
    setPostponeDate(POSTPONE_DATE_OPTIONS[0]);
    setPostponeTime(POSTPONE_TIME_OPTIONS[0]);
    setPostponeModalVisible(true);
  };

  const confirmPostpone = () => {
    if (!selectedClass) return;
    setPostponedMap(prev => ({ ...prev, [selectedClass.id]: { newDate: postponeDate, newTime: postponeTime } }));
    // Remove from cancelled if was cancelled
    setCancelledIds(prev => { const next = new Set(prev); next.delete(selectedClass.id); return next; });
    setPostponeModalVisible(false);
    setModalVisible(false);
  };

  /* ── Export Timetable as PDF ─────────────────────────────────────────── */
  const handleExportPDF = async () => {
    if (exportState === 'generating') return;
    setExportState('generating');

    try {
      const days     = DAYS;
      const schedule = teacher.schedule;

      // ── Print-safe type colors ──────────────────────────────────────────
      const TYPE_COLORS = {
        LECTURE: { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF', header: '#DBEAFE' },
        LAB:     { bg: '#ECFEFF', border: '#67E8F9', text: '#0E7490', header: '#CFFAFE' },
        MEETING: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', header: '#FEF3C7' },
        DOUBT:   { bg: '#ECFDF5', border: '#6EE7B7', text: '#065F46', header: '#D1FAE5' },
      };

      // ── Summary stats ───────────────────────────────────────────────────
      const allClasses   = Object.values(schedule).flat();
      const totalCount   = allClasses.length;
      const lectureCount = allClasses.filter(c => c.type === 'LECTURE').length;
      const labCount     = allClasses.filter(c => c.type === 'LAB').length;
      const meetCount    = allClasses.filter(c => c.type === 'MEETING' || c.type === 'DOUBT').length;
      const totalMinutes = allClasses.reduce((acc, c) => acc + (toMinutes(c.end) - toMinutes(c.start)), 0);
      const totalHours   = (totalMinutes / 60).toFixed(1);
      const genDate      = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

      // ── Build all unique time slots across the schedule ─────────────────
      const allTimes = new Set();
      DAYS.forEach(day => {
        (schedule[day] || []).forEach(cls => {
          allTimes.add(cls.start);
          allTimes.add(cls.end);
        });
      });
      for (let h = 8; h <= 18; h++) {
        allTimes.add(String(h).padStart(2,'0') + ':00');
      }
      const sortedTimes = Array.from(allTimes).sort((a,b) => toMinutes(a) - toMinutes(b));
      const classStartMin = Math.min(...allClasses.map(c => toMinutes(c.start)));
      const classEndMax   = Math.max(...allClasses.map(c => toMinutes(c.end)));
      const timeSlots = sortedTimes.filter(t => {
        const m = toMinutes(t);
        return m >= classStartMin && m <= classEndMax;
      });

      // ── Find class occupying a slot in a given day ─────────────────────
      const getClassAt = (day, timeStr) => {
        const tMin = toMinutes(timeStr);
        return (schedule[day] || []).find(cls =>
          toMinutes(cls.start) <= tMin && tMin < toMinutes(cls.end)
        ) || null;
      };

      const getRowspan = (cls) =>
        timeSlots.filter(t => {
          const m = toMinutes(t);
          return m >= toMinutes(cls.start) && m < toMinutes(cls.end);
        }).length;

      // ── Build the grid rows HTML ────────────────────────────────────────
      const buildGridRows = () => {
        const consumed = {};
        return timeSlots.map((slot, si) => {
          const rowCells = DAYS.map((day) => {
            const key = day + '-' + slot;
            if (consumed[key]) return null;

            const cls = getClassAt(day, slot);
            if (!cls) {
              return '<td style="background:#FAFAFA;border:1px solid #E5E7EB;padding:0;min-height:20px;"></td>';
            }
            if (cls.start !== slot) {
              consumed[key] = true;
              return null;
            }

            const span = getRowspan(cls);
            timeSlots.slice(si + 1).forEach(futureSlot => {
              if (toMinutes(futureSlot) < toMinutes(cls.end)) {
                consumed[day + '-' + futureSlot] = true;
              }
            });

            const tc  = TYPE_COLORS[cls.type] || TYPE_COLORS.LECTURE;
            const dur = toMinutes(cls.end) - toMinutes(cls.start);
            return '<td rowspan="' + span + '" style="background:' + tc.bg + ';border:1px solid ' + tc.border + ';border-left:3px solid ' + tc.border + ';padding:6px 8px;vertical-align:top;">'
              + '<div style="font-size:7pt;font-weight:800;color:' + tc.text + ';letter-spacing:0.5px;margin-bottom:3px;text-transform:uppercase;">' + cls.type + '</div>'
              + '<div style="font-size:9pt;font-weight:700;color:#111827;line-height:1.25;margin-bottom:2px;">' + cls.subject + '</div>'
              + '<div style="font-size:7.5pt;color:#6B7280;font-family:monospace;margin-bottom:3px;">' + cls.code + '</div>'
              + '<div style="font-size:7.5pt;color:#374151;margin-bottom:1px;">Sec: ' + cls.section + '</div>'
              + '<div style="font-size:7.5pt;color:#374151;">Rm: ' + cls.room + '</div>'
              + '<div style="font-size:7pt;color:#9CA3AF;margin-top:3px;">' + dur + ' min</div>'
              + '</td>';
          });

          const validCells = rowCells.filter(c => c !== null).join('');
          const isHour  = slot.endsWith(':00');
          const timeBg  = isHour ? '#F1F5F9' : '#FAFAFA';
          const timeFw  = isHour ? '700' : '400';
          const timeClr = isHour ? '#111827' : '#9CA3AF';

          return '<tr>'
            + '<td style="background:' + timeBg + ';border:1px solid #E5E7EB;border-right:2px solid #CBD5E1;padding:5px 8px;text-align:right;white-space:nowrap;vertical-align:top;">'
            + '<span style="font-size:8pt;font-weight:' + timeFw + ';color:' + timeClr + ';">' + formatTime(slot) + '</span>'
            + '</td>'
            + validCells
            + '</tr>';
        }).join('');
      };

      // ── Full A4 landscape HTML ──────────────────────────────────────────
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
@page { size: A4 landscape; margin: 12mm 12mm 14mm 12mm; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:9pt; color:#111827; background:#fff; line-height:1.3; }

.lh { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:8px; border-bottom:3px solid #1E3A5F; margin-bottom:9px; }
.org { font-size:16pt; font-weight:900; color:#1E3A5F; letter-spacing:-0.5px; line-height:1; }
.org span { color:#3B82F6; }
.org-tag { font-size:6.5pt; color:#9CA3AF; letter-spacing:1.5px; text-transform:uppercase; margin-top:2px; }
.lh-c { text-align:center; }
.doc-t { font-size:13pt; font-weight:800; color:#111827; }
.doc-s { font-size:7.5pt; color:#6B7280; margin-top:2px; }
.lh-r { text-align:right; font-size:8pt; color:#6B7280; line-height:1.7; }
.lh-r strong { color:#111827; font-size:9pt; }

.istrip { display:flex; border:1px solid #E5E7EB; border-radius:3px; overflow:hidden; margin-bottom:7px; }
.ic { flex:1; padding:5px 10px; border-right:1px solid #E5E7EB; }
.ic:last-child { border-right:none; }
.il { font-size:6pt; font-weight:700; color:#9CA3AF; letter-spacing:1px; text-transform:uppercase; }
.iv { font-size:8.5pt; font-weight:700; color:#111827; margin-top:1px; }

.legend { display:flex; align-items:center; gap:14px; margin-bottom:7px; padding:4px 10px; border:1px solid #E5E7EB; border-radius:3px; background:#F9FAFB; }
.ll { font-size:6.5pt; font-weight:700; color:#9CA3AF; letter-spacing:1px; text-transform:uppercase; margin-right:2px; }
.li { display:flex; align-items:center; gap:4px; font-size:7pt; color:#374151; }
.ls { width:10px; height:10px; border-radius:2px; }

.gt { width:100%; border-collapse:collapse; table-layout:fixed; font-size:8pt; margin-bottom:7px; }
.gt .tc { width:62px; }
.gt .dc { width:calc((100% - 62px) / 5); }
.dh { background:#1E3A5F; color:#fff; text-align:center; padding:6px 4px; border:1px solid #1E3A5F; font-size:8.5pt; font-weight:800; }
.dh-d { font-size:6.5pt; font-weight:400; color:#93C5FD; margin-top:1px; }
.th { background:#1E3A5F; border:1px solid #1E3A5F; padding:6px 4px; text-align:center; }
.th span { font-size:6.5pt; font-weight:700; color:#93C5FD; letter-spacing:0.5px; text-transform:uppercase; }

.sbar { display:flex; border:1px solid #E5E7EB; border-top:3px solid #3B82F6; border-radius:0 0 3px 3px; overflow:hidden; margin-bottom:10px; }
.sc { flex:1; padding:5px 8px; text-align:center; border-right:1px solid #E5E7EB; background:#F8FAFC; }
.sc:last-child { border-right:none; }
.sn { font-size:13pt; font-weight:900; color:#1E3A5F; line-height:1; }
.sl { font-size:6pt; font-weight:700; color:#9CA3AF; letter-spacing:0.8px; text-transform:uppercase; margin-top:1px; }

.df { display:flex; justify-content:space-between; font-size:6.5pt; color:#9CA3AF; border-top:1px solid #E5E7EB; padding-top:5px; margin-top:6px; }
.df strong { color:#6B7280; }
</style>
</head>
<body>

<div class="lh">
  <div>
    <div class="org">Campus<span>360</span></div>
    <div class="org-tag">University Portal &middot; Academic Management System</div>
  </div>
  <div class="lh-c">
    <div class="doc-t">Weekly Teaching Timetable</div>
    <div class="doc-s">Academic Year 2024&ndash;25 &middot; Semester I &middot; Week 12: Oct 23&ndash;27, 2024</div>
  </div>
  <div class="lh-r">
    <strong>${teacher.name}</strong><br/>
    ${teacher.subject} Dept. &middot; ${teacher.dept}<br/>
    Generated: ${genDate}
  </div>
</div>

<div class="istrip">
  <div class="ic"><div class="il">Faculty</div><div class="iv">${teacher.name}</div></div>
  <div class="ic"><div class="il">Department</div><div class="iv">${teacher.subject}</div></div>
  <div class="ic"><div class="il">Schedule Period</div><div class="iv">Oct 23 &ndash; Oct 27, 2024</div></div>
  <div class="ic"><div class="il">Teaching Load</div><div class="iv">${totalHours} hrs &middot; ${totalCount} sessions</div></div>
  <div class="ic"><div class="il">Reference No.</div><div class="iv">TT-2024-W12-${teacher.avatar}</div></div>
</div>

<div class="legend">
  <span class="ll">Session Types</span>
  <span class="li"><span class="ls" style="background:#BFDBFE;border:1px solid #93C5FD;"></span>Lecture</span>
  <span class="li"><span class="ls" style="background:#A5F3FC;border:1px solid #67E8F9;"></span>Lab</span>
  <span class="li"><span class="ls" style="background:#FDE68A;border:1px solid #FCD34D;"></span>Meeting</span>
  <span class="li"><span class="ls" style="background:#A7F3D0;border:1px solid #6EE7B7;"></span>Doubt Session</span>
  <span style="margin-left:auto;font-size:6.5pt;color:#9CA3AF;">Merged cells span the full session duration</span>
</div>

<table class="gt">
  <colgroup><col class="tc"/>${DAYS.map(() => '<col class="dc"/>').join('')}</colgroup>
  <thead>
    <tr>
      <th class="th"><span>TIME</span></th>
      ${DAYS.map(day => '<th class="dh"><div>' + DAY_LABELS[day].toUpperCase() + '</div><div class="dh-d">' + DAY_DATES[day] + ', 2024</div></th>').join('')}
    </tr>
  </thead>
  <tbody>${buildGridRows()}</tbody>
</table>

<div class="sbar">
  <div class="sc"><div class="sn">${totalCount}</div><div class="sl">Total Sessions</div></div>
  <div class="sc"><div class="sn">${lectureCount}</div><div class="sl">Lectures</div></div>
  <div class="sc"><div class="sn">${labCount}</div><div class="sl">Lab Sessions</div></div>
  <div class="sc"><div class="sn">${meetCount}</div><div class="sl">Meetings / Doubts</div></div>
  <div class="sc"><div class="sn">${totalHours}</div><div class="sl">Total Hours</div></div>
</div>

<table style="width:100%;border-collapse:collapse;border-top:1px solid #E5E7EB;">
  <tr>
    <td style="width:33%;padding:16px 12px 0 0;vertical-align:bottom;">
      <div style="border-top:1px solid #374151;padding-top:4px;font-size:8pt;font-weight:700;color:#374151;">${teacher.name}</div>
      <div style="font-size:7pt;color:#9CA3AF;">Faculty Signature &amp; Date</div>
    </td>
    <td style="width:33%;padding:16px 12px 0;vertical-align:bottom;text-align:center;">
      <div style="border-top:1px solid #374151;padding-top:4px;font-size:8pt;font-weight:700;color:#374151;">Head of Department &ndash; ${teacher.subject}</div>
      <div style="font-size:7pt;color:#9CA3AF;">HOD Signature &amp; Date</div>
    </td>
    <td style="width:33%;padding:16px 0 0 12px;vertical-align:bottom;text-align:right;">
      <div style="border-top:1px solid #374151;padding-top:4px;font-size:8pt;font-weight:700;color:#374151;">Principal / Dean of Faculty</div>
      <div style="font-size:7pt;color:#9CA3AF;">Authorised Signatory &amp; Stamp</div>
    </td>
  </tr>
</table>

<div class="df">
  <span><strong>Campus360</strong> &ndash; University Portal &nbsp;|&nbsp; System-generated document &middot; Confidential &middot; Do not alter.</span>
  <span>Ref: TT-2024-W12-${teacher.avatar} &nbsp;|&nbsp; ${genDate}</span>
</div>

</body>
</html>`;


      // ── Generate PDF via expo-print ─────────────────────────────────────
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      // ── Rename to something meaningful ──────────────────────────────────
      const fileName  = `Timetable_${teacher.name.replace(/\s+/g, '_')}_Week12.pdf`;
      const destUri   = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: destUri });

      setExportState('done');

      // ── Share / Save dialog ─────────────────────────────────────────────
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save Timetable PDF`,
          UTI: 'com.adobe.pdf',
        });
      }

      setTimeout(() => setExportState('idle'), 2000);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportState('idle');
    }
  };

  /* ── Upload Material — opens device file picker ── */
  const handleUploadMaterial = async () => {
    try {
      setUploadState('picking');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/*',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setUploadState('idle');
        return;
      }

      const file = result.assets[0];
      setUploadedFile(file);
      setUploadState('uploading');

      // Animate progress bar
      uploadProgressAnim.setValue(0);
      Animated.timing(uploadProgressAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      }).start();

      // ── Replace this block with your actual API upload call ──────────────
      // Example:
      // const formData = new FormData();
      // formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType });
      // formData.append('classCode', selectedClass.code);
      // formData.append('section', selectedClass.section);
      // await fetch('https://your-api.com/upload', { method: 'POST', body: formData });
      // ─────────────────────────────────────────────────────────────────────
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadState('success');
      setTimeout(() => {
        setUploadState('idle');
        setUploadedFile(null);
        uploadProgressAnim.setValue(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setUploadState('error');
      setTimeout(() => {
        setUploadState('idle');
        setUploadedFile(null);
      }, 2500);
    }
  };

  const getFileSizeLabel = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'document-outline';
    if (mimeType.includes('pdf'))         return 'document-text-outline';
    if (mimeType.includes('image'))       return 'image-outline';
    if (mimeType.includes('sheet') || mimeType.includes('excel'))    return 'grid-outline';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel-outline';
    return 'document-outline';
  };

  /* ── Weekly grid ── */
  const renderWeeklyGrid = () => {
    const COL_W = Math.max((width - (isDesktop ? 290 : 260)) / 5, 100);
    const gridH  = (GRID_END - GRID_START) * PX_PER_MIN;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row' }}>

            {/* Time column */}
            <View style={[styles.timeCol, { height: gridH + 40 }]}>
              {TIME_SLOTS.map((slot) => {
                const top = (toMinutes(slot) - GRID_START) * PX_PER_MIN;
                return (
                  <View key={slot} style={[styles.timeSlotLabel, { top }]}>
                    <Text style={styles.timeText}>{formatTime(slot)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Day columns */}
            {DAYS.map((day) => {
              const isToday = day === activeDay;
              return (
                <View key={day} style={[styles.dayCol, { width: COL_W }]}>
                  {/* Day header */}
                  <View style={[styles.dayHeader, isToday && styles.dayHeaderActive]}>
                    <Text style={[styles.dayName, isToday && { color: C.accent }]}>{day}</Text>
                    <Text style={[styles.dayDate, isToday && { color: C.accent }]}>{DAY_DATES[day]}</Text>
                    {isToday && <View style={styles.todayUnderline} />}
                  </View>

                  {/* Grid background */}
                  <View style={{ height: gridH, position: 'relative' }}>
                    {/* Hour lines */}
                    {TIME_SLOTS.map((slot) => {
                      const top = (toMinutes(slot) - GRID_START) * PX_PER_MIN;
                      return <View key={slot} style={[styles.hourLine, { top }]} />;
                    })}

                    {/* Breaks */}
                    {BREAKS.map((brk, bi) => {
                      const top = (toMinutes(brk.start) - GRID_START) * PX_PER_MIN;
                      const h   = (toMinutes(brk.end) - toMinutes(brk.start)) * PX_PER_MIN;
                      return (
                        <View key={bi} style={[
                          styles.breakStripe,
                          { top, height: h, backgroundColor: brk.type === 'lunch' ? C.lunchBg : C.breakBg }
                        ]} />
                      );
                    })}

                    {/* Class cards */}
                    {(teacher.schedule[day] || []).map((cls) => {
                      const top = (toMinutes(cls.start) - GRID_START) * PX_PER_MIN;
                      const h   = (toMinutes(cls.end) - toMinutes(cls.start)) * PX_PER_MIN;
                      const typeMeta = TYPE_LABELS[cls.type];
                      const isCancelled = cancelledIds.has(cls.id);
                      const isPostponed = !!postponedMap[cls.id];
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          style={[
                            styles.classCard,
                            {
                              top,
                              height: h - 4,
                              backgroundColor: isCancelled ? C.cancelledSoft : isPostponed ? C.postponedSoft : cls.color + '18',
                              borderLeftColor: isCancelled ? C.cancelled : isPostponed ? C.postponed : cls.color,
                              width: COL_W - 8,
                              opacity: isCancelled ? 0.6 : 1,
                            }
                          ]}
                          onPress={() => handleClassPress(cls)}
                          activeOpacity={0.85}>
                          <View style={[styles.classTypePill, { backgroundColor: (isCancelled ? C.cancelled : isPostponed ? C.postponed : cls.color) + '30' }]}>
                            <Text style={[styles.classTypeText, { color: isCancelled ? C.cancelled : isPostponed ? C.postponed : cls.color }]}>
                              {isCancelled ? 'CANCELLED' : isPostponed ? 'POSTPONED' : cls.type}
                            </Text>
                          </View>
                          <Text style={[styles.classSubject, isCancelled && { textDecorationLine: 'line-through', color: C.textMuted }]} numberOfLines={2}>{cls.subject}</Text>
                          <Text style={styles.classTime}>{formatTime(cls.start)} – {formatTime(cls.end)}</Text>
                          {h > 80 && <Text style={styles.classRoom} numberOfLines={1}>📍 {cls.room}</Text>}
                          {isPostponed && h > 60 && (
                            <Text style={[styles.classRoom, { color: C.postponed, marginTop: 2 }]} numberOfLines={1}>
                              ↪ {postponedMap[cls.id].newDate}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Floating break labels */}
          <View style={[styles.breakLabelRow, { marginLeft: 64 }]}>
            {BREAKS.map((brk, bi) => {
              const top = (toMinutes(brk.start) - GRID_START) * PX_PER_MIN + 40;
              return (
                <View key={bi} style={[styles.breakLabel, { top, left: 4 }]}>
                  <Text style={[styles.breakLabelText, brk.type === 'lunch' && { color: C.orange }]}>{brk.label}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  };

  /* ── Daily view ── */
  const renderDailyView = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.daySelectorPill, activeDay === day && styles.daySelectorPillActive]}
              onPress={() => setActiveDay(day)}>
              <Text style={[styles.daySelectorText, activeDay === day && { color: C.white }]}>{day}</Text>
              <Text style={[styles.daySelectorDate, activeDay === day && { color: C.accent + 'CC' }]}>{DAY_DATES[day]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {todayClasses.length === 0 ? (
        <View style={styles.emptyDay}>
          <Ionicons name="calendar-outline" size={44} color={C.textMuted} />
          <Text style={styles.emptyText}>No classes on {DAY_LABELS[activeDay]}</Text>
        </View>
      ) : (
        todayClasses
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
          .map((cls, i) => {
            const typeMeta    = TYPE_LABELS[cls.type];
            const duration    = toMinutes(cls.end) - toMinutes(cls.start);
            const isCancelled = cancelledIds.has(cls.id);
            const isPostponed = !!postponedMap[cls.id];
            const statusColor = isCancelled ? C.cancelled : isPostponed ? C.postponed : cls.color;
            return (
              <TouchableOpacity
                key={cls.id}
                style={[styles.dailyCard, { borderLeftColor: statusColor, opacity: isCancelled ? 0.65 : 1 }]}
                onPress={() => handleClassPress(cls)}
                activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                  <View style={styles.dailyTimeBlock}>
                    <Text style={styles.dailyTimeStart}>{formatTime(cls.start)}</Text>
                    <View style={[styles.dailyTimeLine, { backgroundColor: statusColor }]} />
                    <Text style={styles.dailyTimeEnd}>{formatTime(cls.end)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={[styles.typeChip, { backgroundColor: statusColor + '22' }]}>
                        <Ionicons name={isCancelled ? 'close-circle-outline' : isPostponed ? 'arrow-forward-circle-outline' : typeMeta.icon} size={11} color={statusColor} />
                        <Text style={[styles.typeChipText, { color: statusColor }]}>
                          {isCancelled ? 'CANCELLED' : isPostponed ? 'POSTPONED' : typeMeta.label}
                        </Text>
                      </View>
                      <Text style={styles.durationText}>{duration} min</Text>
                    </View>
                    <Text style={[styles.dailySubject, isCancelled && { textDecorationLine: 'line-through', color: C.textMuted }]}>{cls.subject}</Text>
                    <Text style={styles.dailyCode}>{cls.code} · {cls.section}</Text>
                    {isPostponed && (
                      <Text style={{ fontSize: 11, color: C.postponed, marginTop: 4, fontWeight: '600' }}>
                        ↪ Rescheduled to {postponedMap[cls.id].newDate} at {postponedMap[cls.id].newTime}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={12} color={C.textMuted} />
                        <Text style={styles.dailyMeta}>{cls.room}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
      )}
    </ScrollView>
  );

  /* ── List view ── */
  const renderListView = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {DAYS.map((day) => {
        const classes = teacher.schedule[day] || [];
        return (
          <View key={day} style={{ marginBottom: 20 }}>
            <View style={styles.listDayHeader}>
              <Text style={styles.listDayName}>{DAY_LABELS[day]}</Text>
              <Text style={styles.listDayDate}>{DAY_DATES[day]}</Text>
              <View style={styles.listDayCount}>
                <Text style={styles.listDayCountText}>{classes.length} classes</Text>
              </View>
            </View>
            {classes.length === 0 ? (
              <Text style={styles.listEmpty}>Free day</Text>
            ) : (
              classes
                .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
                .map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={styles.listCard}
                    onPress={() => handleClassPress(cls)}
                    activeOpacity={0.8}>
                    <View style={[styles.listColorDot, { backgroundColor: cls.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listSubject}>{cls.subject}</Text>
                      <Text style={styles.listMeta}>{formatTime(cls.start)} – {formatTime(cls.end)}  ·  {cls.section}  ·  {cls.room}</Text>
                    </View>
                    <View style={[styles.listTypePill, { backgroundColor: cls.color + '22' }]}>
                      <Text style={[styles.listTypeText, { color: cls.color }]}>{cls.type}</Text>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  /* ── Class detail modal ── */
  const renderModal = () => {
    if (!selectedClass) return null;
    const cls       = selectedClass;
    const typeMeta  = TYPE_LABELS[cls.type];
    const duration  = toMinutes(cls.end) - toMinutes(cls.start);
    const isCancelled = cancelledIds.has(cls.id);
    const isPostponed = !!postponedMap[cls.id];
    const statusColor = isCancelled ? C.cancelled : isPostponed ? C.postponed : cls.color;
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={[styles.modalHeader, { borderLeftColor: statusColor }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={[styles.typeChip, { backgroundColor: statusColor + '22' }]}>
                    <Ionicons name={isCancelled ? 'close-circle-outline' : isPostponed ? 'arrow-forward-circle-outline' : typeMeta.icon} size={12} color={statusColor} />
                    <Text style={[styles.typeChipText, { color: statusColor }]}>
                      {isCancelled ? 'CANCELLED' : isPostponed ? 'POSTPONED' : typeMeta.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.modalSubject, isCancelled && { textDecorationLine: 'line-through', color: C.textMuted }]}>{cls.subject}</Text>
                <Text style={styles.modalCode}>{cls.code}</Text>
                {isPostponed && (
                  <Text style={{ fontSize: 12, color: C.postponed, marginTop: 4, fontWeight: '600' }}>
                    ↪ Rescheduled to {postponedMap[cls.id].newDate} at {postponedMap[cls.id].newTime}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.textSec} />
              </TouchableOpacity>
            </View>

            {/* Details grid */}
            <View style={styles.modalGrid}>
              {[
                { icon: 'time-outline',     label: 'Time',     value: `${formatTime(cls.start)} – ${formatTime(cls.end)}` },
                { icon: 'hourglass-outline',label: 'Duration', value: `${duration} minutes` },
                { icon: 'people-outline',   label: 'Section',  value: cls.section },
                { icon: 'location-outline', label: 'Room',     value: cls.room },
              ].map((item, i) => (
                <View key={i} style={styles.modalDetailRow}>
                  <View style={[styles.modalDetailIcon, { backgroundColor: cls.color + '18' }]}>
                    <Ionicons name={item.icon} size={16} color={cls.color} />
                  </View>
                  <View>
                    <Text style={styles.modalDetailLabel}>{item.label}</Text>
                    <Text style={styles.modalDetailValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={{ gap: 8, marginBottom: 10 }}>
              {/* Cancel / Postpone row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: isCancelled ? C.redSoft : C.surfaceEl, borderWidth: 1, borderColor: isCancelled ? C.cancelled : C.border }]}
                  onPress={handleCancelLecture}>
                  <Ionicons name={isCancelled ? 'refresh-outline' : 'close-circle-outline'} size={16} color={isCancelled ? C.cancelled : C.textSec} />
                  <Text style={[styles.modalBtnText, { color: isCancelled ? C.cancelled : C.textSec }]}>
                    {isCancelled ? 'Undo Cancel' : 'Cancel Lecture'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { flex: 1, backgroundColor: isPostponed ? C.postponedSoft : C.surfaceEl, borderWidth: 1, borderColor: isPostponed ? C.postponed : C.border }]}
                  onPress={openPostponeModal}>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={isPostponed ? C.postponed : C.textSec} />
                  <Text style={[styles.modalBtnText, { color: isPostponed ? C.postponed : C.textSec }]}>
                    {isPostponed ? 'Change Date' : 'Postpone'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message + Upload row */}
              <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accentSoft }]} onPress={() => setModalVisible(false)}>
                <Ionicons name="chatbubble-outline" size={16} color={C.accent} />
                <Text style={[styles.modalBtnText, { color: C.accent }]}>Message Class</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { flex: 1 },
                  uploadState === 'idle'      && { backgroundColor: cls.color + '20' },
                  uploadState === 'picking'   && { backgroundColor: cls.color + '15' },
                  uploadState === 'uploading' && { backgroundColor: cls.color + '15' },
                  uploadState === 'success'   && { backgroundColor: C.greenSoft },
                  uploadState === 'error'     && { backgroundColor: C.redSoft },
                ]}
                onPress={handleUploadMaterial}
                disabled={uploadState === 'uploading' || uploadState === 'picking'}>
                <Ionicons
                  name={
                    uploadState === 'success' ? 'checkmark-circle' :
                    uploadState === 'error'   ? 'alert-circle'     :
                    uploadState === 'uploading' || uploadState === 'picking' ? 'cloud-upload-outline' :
                    'cloud-upload-outline'
                  }
                  size={16}
                  color={
                    uploadState === 'success' ? C.green :
                    uploadState === 'error'   ? C.red   : cls.color
                  }
                />
                <Text style={[styles.modalBtnText, {
                  color: uploadState === 'success' ? C.green :
                         uploadState === 'error'   ? C.red   : cls.color
                }]}>
                  {uploadState === 'idle'      ? 'Upload Material' :
                   uploadState === 'picking'   ? 'Opening Files…'  :
                   uploadState === 'uploading' ? 'Uploading…'      :
                   uploadState === 'success'   ? 'Uploaded!'        :
                   'Upload Failed'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Upload progress / file info */}
            {(uploadState === 'uploading' || uploadState === 'success') && uploadedFile && (
              <View style={styles.uploadFeedback}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={[styles.fileIconWrap, { backgroundColor: cls.color + '20' }]}>
                    <Ionicons name={getFileIcon(uploadedFile.mimeType)} size={18} color={cls.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{uploadedFile.name}</Text>
                    <Text style={styles.fileSize}>{getFileSizeLabel(uploadedFile.size)}</Text>
                  </View>
                  {uploadState === 'success' && (
                    <Ionicons name="checkmark-circle" size={20} color={C.green} />
                  )}
                </View>
                {uploadState === 'uploading' && (
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressBar, {
                      width: uploadProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: cls.color,
                    }]} />
                  </View>
                )}
                {uploadState === 'success' && (
                  <Text style={styles.uploadSuccessText}>
                    ✓ Material uploaded to {cls.code} · {cls.section}
                  </Text>
                )}
              </View>
            )}

            {uploadState === 'error' && (
              <View style={[styles.uploadFeedback, { backgroundColor: C.redSoft, borderColor: C.red + '30' }]}>
                <Text style={[styles.uploadSuccessText, { color: C.red }]}>
                  ✕ Upload failed. Please try again.
                </Text>
              </View>
            )}
            </View>{/* end actions wrapper */}
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Postpone picker modal ── */
  const renderPostponeModal = () => (
    <Modal
      visible={postponeModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPostponeModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setPostponeModalVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 28 }]}>
          <View style={styles.modalHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.textPrimary }}>Postpone to…</Text>
            <TouchableOpacity onPress={() => setPostponeModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>

          {/* Date picker */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>SELECT DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {POSTPONE_DATE_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                    backgroundColor: postponeDate === d ? C.accentSoft : C.surfaceEl,
                    borderWidth: 1, borderColor: postponeDate === d ? C.accent : C.border,
                  }}
                  onPress={() => setPostponeDate(d)}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: postponeDate === d ? C.accent : C.textSec }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Time picker */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 8 }}>SELECT TIME</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {POSTPONE_TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: postponeTime === t ? C.accentSoft : C.surfaceEl,
                  borderWidth: 1, borderColor: postponeTime === t ? C.accent : C.border,
                }}
                onPress={() => setPostponeTime(t)}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: postponeTime === t ? C.accent : C.textSec }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.modalBtn, { backgroundColor: C.accentSoft, justifyContent: 'center' }]}
            onPress={confirmPostpone}>
            <Ionicons name="checkmark-circle-outline" size={18} color={C.accent} />
            <Text style={[styles.modalBtnText, { color: C.accent, fontSize: 15 }]}>Confirm Postpone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>ACADEMIC YEAR 2024/25 · <Text style={{ color: C.accent }}>SEMESTER 1</Text></Text>
            <Text style={styles.headerTitle}>Weekly Timetable</Text>
            <Text style={styles.headerWeek}>Week 12: Oct 23rd – Oct 27th</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.teacherChip, { borderColor: teacher.avatarColor + '50' }]}>
              <View style={[styles.teacherAvatar, { backgroundColor: teacher.avatarColor + '25' }]}>
                <Text style={[styles.teacherAvatarText, { color: teacher.avatarColor }]}>{teacher.avatar}</Text>
              </View>
              <View>
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <Text style={styles.teacherDept}>{teacher.dept}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Classes', value: totalClasses, icon: 'book-outline', color: C.accent },
            { label: 'This Week',     value: `${totalClasses}`, icon: 'calendar-outline', color: C.cyan },
            { label: 'Today',         value: `${todayClasses.length}`, icon: 'time-outline', color: C.green },
            { label: 'Labs',          value: Object.values(teacher.schedule).flat().filter(c => c.type === 'LAB').length, icon: 'flask-outline', color: C.orange },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderColor: stat.color + '30' }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon} size={14} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── View toggle + Download ─────────────────────────────────── */}
        <View style={styles.toolbar}>
          <View style={styles.viewToggle}>
            {['weekly', 'daily', 'list'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.viewBtn, view === v && styles.viewBtnActive]}
                onPress={() => setView(v)}>
                <Text style={[styles.viewBtnText, view === v && { color: C.white }]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, exportState === 'generating' && { opacity: 0.7 }, exportState === 'done' && { backgroundColor: C.greenSoft }]}
            onPress={handleExportPDF}
            disabled={exportState === 'generating'}
            activeOpacity={0.8}>
            <Ionicons
              name={exportState === 'done' ? 'checkmark-circle' : exportState === 'generating' ? 'sync' : 'download-outline'}
              size={16}
              color={exportState === 'done' ? C.green : C.accent}
            />
            <Text style={[styles.downloadText, exportState === 'done' && { color: C.green }]}>
              {exportState === 'generating' ? 'Generating…' : exportState === 'done' ? 'Saved!' : 'Export PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {view === 'weekly' && renderWeeklyGrid()}
          {view === 'daily'  && renderDailyView()}
          {view === 'list'   && renderListView()}
        </View>

      </Animated.View>

      {renderModal()}
      {renderPostponeModal()}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 12,
  },
  headerSub:   { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  headerWeek:  { fontSize: 12, color: C.textSec, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },

  /* Teacher chip */
  teacherChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceEl, borderRadius: 12, borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  teacherAvatar:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  teacherAvatarText: { fontWeight: '800', fontSize: 12 },
  teacherName:       { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  teacherDept:       { fontSize: 11, color: C.textSec },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard:  {
    flex: 1, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: 'center', gap: 4,
  },
  statIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '900', color: C.textPrimary },
  statLabel: { fontSize: 9, color: C.textMuted, textAlign: 'center', fontWeight: '600', letterSpacing: 0.3 },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 14, gap: 10,
  },
  viewToggle:    { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  viewBtn:       { paddingHorizontal: 16, paddingVertical: 8 },
  viewBtnActive: { backgroundColor: C.accent },
  viewBtnText:   { fontSize: 13, fontWeight: '600', color: C.textSec },
  downloadBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  downloadText:  { fontSize: 13, fontWeight: '600', color: C.accent },

  /* ── Weekly grid ── */
  timeCol:       { width: 60, paddingTop: 40, position: 'relative' },
  timeSlotLabel: { position: 'absolute', right: 8, width: 56 },
  timeText:      { fontSize: 10, color: C.textMuted, textAlign: 'right', fontWeight: '600' },
  dayCol:        { borderLeftWidth: 1, borderLeftColor: C.border },
  dayHeader: {
    height: 40, alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border, position: 'relative',
  },
  dayHeaderActive: { backgroundColor: C.accentGlow },
  dayName:         { fontSize: 12, fontWeight: '800', color: C.textSec, letterSpacing: 0.5 },
  dayDate:         { fontSize: 10, color: C.textMuted },
  todayUnderline:  { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: C.accent, borderRadius: 1 },
  hourLine:        { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.border + '80' },
  breakStripe:     { position: 'absolute', left: 0, right: 0 },
  classCard: {
    position: 'absolute', left: 3, borderRadius: 8,
    borderLeftWidth: 3, padding: 6, overflow: 'hidden',
  },
  classTypePill: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 4 },
  classTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  classSubject:  { fontSize: 11, fontWeight: '700', color: C.textPrimary, lineHeight: 14, marginBottom: 2 },
  classTime:     { fontSize: 9, color: C.textSec },
  classRoom:     { fontSize: 9, color: C.textMuted, marginTop: 2 },

  /* Break labels */
  breakLabel:     { position: 'absolute', right: 8, left: 0 },
  breakLabelText: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textAlign: 'center' },
  breakLabelRow:  { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },

  /* ── Daily view ── */
  daySelectorPill: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  daySelectorPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  daySelectorText:       { fontSize: 13, fontWeight: '800', color: C.textSec },
  daySelectorDate:       { fontSize: 10, color: C.textMuted, marginTop: 1 },
  emptyDay:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.textMuted },
  dailyCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, padding: 14, marginBottom: 10,
  },
  dailyTimeBlock:  { width: 52, alignItems: 'center' },
  dailyTimeStart:  { fontSize: 11, fontWeight: '700', color: C.textSec },
  dailyTimeLine:   { width: 2, flex: 1, marginVertical: 4, minHeight: 20, borderRadius: 1 },
  dailyTimeEnd:    { fontSize: 11, fontWeight: '600', color: C.textMuted },
  dailySubject:    { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  dailyCode:       { fontSize: 12, color: C.textSec },
  dailyMeta:       { fontSize: 12, color: C.textMuted },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeChipText:    { fontSize: 10, fontWeight: '700' },
  durationText:    { fontSize: 11, color: C.textMuted },

  /* ── List view ── */
  listDayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  listDayName:      { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  listDayDate:      { fontSize: 12, color: C.textMuted, flex: 1 },
  listDayCount:     { backgroundColor: C.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  listDayCountText: { fontSize: 10, fontWeight: '700', color: C.accent },
  listEmpty:        { fontSize: 12, color: C.textMuted, paddingVertical: 8, paddingLeft: 4 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 12, marginBottom: 6,
  },
  listColorDot:  { width: 10, height: 10, borderRadius: 5 },
  listSubject:   { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  listMeta:      { fontSize: 11, color: C.textSec, marginTop: 2 },
  listTypePill:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  listTypeText:  { fontSize: 10, fontWeight: '700' },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { borderLeftWidth: 4, paddingLeft: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start' },
  modalSubject: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  modalCode:    { fontSize: 13, color: C.textSec },
  modalClose:   { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceEl, alignItems: 'center', justifyContent: 'center' },
  modalGrid:    { gap: 12, marginBottom: 20 },
  modalDetailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalDetailIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalDetailLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  modalDetailValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  modalActions:     { flexDirection: 'row', gap: 10 },
  modalBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  modalBtnText:     { fontSize: 13, fontWeight: '700' },

  /* ── Upload feedback ── */
  uploadFeedback: {
    marginTop: 12, backgroundColor: C.surfaceEl, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: C.border,
  },
  fileIconWrap:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName:      { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  fileSize:      { fontSize: 11, color: C.textMuted, marginTop: 1 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressBar:   { height: 4, borderRadius: 2 },
  uploadSuccessText: { fontSize: 12, color: C.green, fontWeight: '600', marginTop: 4 },
});