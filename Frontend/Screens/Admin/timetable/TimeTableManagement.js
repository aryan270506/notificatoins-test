import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, Dimensions, Modal, TextInput,
  KeyboardAvoidingView, TouchableWithoutFeedback,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = [
  '1st Year (B.Tech - CS)',
  '2nd Year (B.Tech - CS)',
  '3rd Year (B.Tech - CS)',
  '4th Year (B.Tech - CS)',
];
const DIVISIONS = ['Division A', 'Division B', 'Division C'];
const BATCHES   = {
  'Division A': ['A1', 'A2', 'A3'],
  'Division B': ['B1', 'B2', 'B3'],
  'Division C': ['C1', 'C2', 'C3'],
};
const TIME_SLOTS = [
  { id: 't1', label: '10:30 – 11:30', sub: 'LECTURE 1' },
  { id: 't2', label: '11:30 – 12:30', sub: 'LECTURE 2' },
  { id: 'lunch', label: '12:30',       sub: 'LUNCH',    isBreak: true },
  { id: 't3', label: '1:15 – 2:15',   sub: 'LECTURE 3' },
  { id: 't4', label: '2:15 – 3:15',   sub: 'LECTURE 4' },
  { id: 'break', label: '3:15',        sub: 'BREAK',    isBreak: true },
  { id: 't5', label: '3:30 – 4:30',   sub: 'LECTURE 5' },
  { id: 't6', label: '4:30 – 5:30',   sub: 'LECTURE 6' },
];
const DAYS      = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat'];

const COLOR_KEYS = ['teal','blue','purple','orange','green','pink'];

// Dark variant of subject card palettes
const COLORS_DARK = {
  teal:   { bg: '#0d3d3a', border: '#00b894', text: '#00d4b4' },
  blue:   { bg: '#0d2240', border: '#2d6cdf', text: '#5b9cf6' },
  purple: { bg: '#2a1a40', border: '#7c3aed', text: '#a78bfa' },
  orange: { bg: '#3b2000', border: '#f59e0b', text: '#fbbf24' },
  green:  { bg: '#0d2e1a', border: '#22c55e', text: '#4ade80' },
  pink:   { bg: '#3b0a2a', border: '#db2777', text: '#f472b6' },
};

// Light variant of subject card palettes
const COLORS_LIGHT_CARDS = {
  teal:   { bg: '#e0f7f4', border: '#00b894', text: '#007a68' },
  blue:   { bg: '#ddeeff', border: '#2d6cdf', text: '#1a4fa0' },
  purple: { bg: '#ede8ff', border: '#7c3aed', text: '#5b21b6' },
  orange: { bg: '#fff3e0', border: '#f59e0b', text: '#92550a' },
  green:  { bg: '#e2f7ea', border: '#22c55e', text: '#166534' },
  pink:   { bg: '#fce7f3', border: '#db2777', text: '#9d174d' },
};

// ─── Initial Data ──────────────────────────────────────────────────────────────

const INITIAL_TIMETABLE = {
  'Division A': {
    A1: {
      Monday:    { t1: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t2: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t4: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t6: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Tuesday:   { t2: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' }, t3: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t6: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' } },
      Wednesday: { t1: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' }, t4: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
      Thursday:  { t2: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t3: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t6: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Friday:    { t1: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' }, t4: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Saturday:  { t1: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t2: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' }, t6: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' } },
    },
    A2: {
      Monday:    { t1: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' }, t3: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Tuesday:   { t1: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t4: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Lab 01', color: 'teal' } },
      Wednesday: { t2: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t4: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Thursday:  { t1: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t3: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' } },
      Friday:    { t2: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t4: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Saturday:  { t1: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' }, t3: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' } },
    },
    A3: {
      Monday:    { t2: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t4: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' } },
      Tuesday:   { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t3: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Wednesday: { t1: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t3: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Thursday:  { t2: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' }, t4: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
      Friday:    { t1: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' }, t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' } },
      Saturday:  { t2: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t4: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
    },
  },
  'Division B': {
    B1: {
      Monday:    { t1: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' }, t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Lab 01', color: 'teal' } },
      Tuesday:   { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t4: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Wednesday: { t2: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t3: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' } },
      Thursday:  { t1: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' }, t2: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Friday:    { t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t4: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' } },
      Saturday:  { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t3: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
    },
    B2: {
      Monday:    { t2: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t4: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
      Tuesday:   { t1: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' }, t3: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Wednesday: { t1: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t4: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' } },
      Thursday:  { t2: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' }, t3: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Friday:    { t1: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t4: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Lab 01', color: 'teal' } },
      Saturday:  { t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' }, t4: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
    },
    B3: {
      Monday:    { t1: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' }, t3: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Tuesday:   { t2: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t4: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' } },
      Wednesday: { t3: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t4: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' } },
      Thursday:  { t1: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Lab 01', color: 'teal' }, t4: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Friday:    { t2: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' }, t3: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Saturday:  { t1: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t3: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' } },
    },
  },
  'Division C': {
    C1: {
      Monday:    { t2: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' }, t4: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' } },
      Tuesday:   { t1: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t3: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Wednesday: { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t2: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Thursday:  { t2: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t4: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' } },
      Friday:    { t1: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' }, t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' } },
      Saturday:  { t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' }, t4: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' } },
    },
    C2: {
      Monday:    { t1: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t3: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
      Tuesday:   { t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' }, t4: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Wednesday: { t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' }, t4: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' } },
      Thursday:  { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t3: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Friday:    { t2: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' }, t4: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 402', color: 'blue' } },
      Saturday:  { t1: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' }, t3: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Lab 01', color: 'teal' } },
    },
    C3: {
      Monday:    { t3: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t4: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
      Tuesday:   { t1: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' }, t2: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' } },
      Wednesday: { t1: { subject: 'PROFESSIONAL ETHICS', teacher: 'Dr. Mehta', room: 'Seminar Hall A', color: 'orange' }, t4: { subject: 'DATA STRUCTURES', teacher: 'Dr. Emily Watson', room: 'Room 402', color: 'teal' } },
      Thursday:  { t2: { subject: 'DISCRETE MATH', teacher: 'Dr. Sara Connor', room: 'Room 403', color: 'blue' }, t3: { subject: 'COMPUTER NETWORKS', teacher: 'Prof. Alice Zhang', room: 'Room 301', color: 'purple' } },
      Friday:    { t1: { subject: 'DATABASE SYSTEMS', teacher: 'Prof. Robert Fox', room: 'Lab 02', color: 'blue' }, t4: { subject: 'SYSTEM ARCH. LAB', teacher: 'Prof. Victor Stone', room: 'Lab 04', color: 'orange' } },
      Saturday:  { t2: { subject: 'OS PRINCIPLES', teacher: 'Dr. Alan Turing', room: 'Room 201', color: 'green' }, t3: { subject: 'WEB TECHNOLOGIES', teacher: 'Prof. Jane Cooper', room: 'Lab 01', color: 'teal' } },
    },
  },
};

// ─── Helper: get correct card palette based on theme ─────────────────────────
function getCardPalette(colorKey, isDark) {
  return (isDark ? COLORS_DARK : COLORS_LIGHT_CARDS)[colorKey] || (isDark ? COLORS_DARK : COLORS_LIGHT_CARDS).teal;
}

// ─── Assign / Edit Modal ───────────────────────────────────────────────────────

function SlotModal({ visible, slotInfo, onSave, onDelete, onClose }) {
  const { isDark, colors } = useContext(ThemeContext);
  const isEditing = !!slotInfo?.existing;

  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room,    setRoom]    = useState('');
  const [color,   setColor]   = useState('teal');

  React.useEffect(() => {
    if (visible && slotInfo) {
      const e = slotInfo.existing;
      setSubject(e?.subject || '');
      setTeacher(e?.teacher || '');
      setRoom(e?.room || '');
      setColor(e?.color || 'teal');
    }
  }, [visible, slotInfo]);

  const canSave = subject.trim() && teacher.trim();
  const handleSave = () => {
    if (!canSave) return;
    onSave({ subject: subject.trim().toUpperCase(), teacher: teacher.trim(), room: room.trim() || null, color });
  };

  if (!slotInfo) return null;
  const slotLabel = TIME_SLOTS.find(s => s.id === slotInfo.slotId)?.label || '';
  const previewPalette = getCardPalette(color, isDark);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>

        <View style={[
          mStyles.sheet,
          {
            backgroundColor: isDark ? '#0f1d44' : colors.surface,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
          },
        ]}>
          <View style={[mStyles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border }]} />

          <View style={mStyles.titleRow}>
            <View>
              <Text style={[mStyles.modalTitle, { color: colors.textPrim }]}>
                {isEditing ? 'Edit Class' : 'Assign Class'}
              </Text>
              <Text style={[mStyles.modalSubtitle, { color: colors.textMuted }]}>
                {slotInfo.day}  •  {slotLabel}
              </Text>
            </View>
            {isEditing && (
              <TouchableOpacity style={mStyles.deleteBtn} onPress={onDelete}>
                <Text style={mStyles.deleteBtnText}>🗑 Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Subject Name *</Text>
          <TextInput
            style={[mStyles.input, {
              backgroundColor: isDark ? '#131f45' : colors.surfaceAlt,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
              color: colors.textPrim,
            }]}
            placeholder="e.g. DATA STRUCTURES"
            placeholderTextColor={colors.textMuted}
            value={subject}
            onChangeText={setSubject}
            autoCapitalize="characters"
          />

          <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Faculty / Teacher *</Text>
          <TextInput
            style={[mStyles.input, {
              backgroundColor: isDark ? '#131f45' : colors.surfaceAlt,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
              color: colors.textPrim,
            }]}
            placeholder="e.g. Dr. Emily Watson"
            placeholderTextColor={colors.textMuted}
            value={teacher}
            onChangeText={setTeacher}
          />

          <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Room / Venue</Text>
          <TextInput
            style={[mStyles.input, {
              backgroundColor: isDark ? '#131f45' : colors.surfaceAlt,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
              color: colors.textPrim,
            }]}
            placeholder="e.g. Room 402 or Lab 01"
            placeholderTextColor={colors.textMuted}
            value={room}
            onChangeText={setRoom}
          />

          <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Card Colour</Text>
          <View style={mStyles.colorRow}>
            {COLOR_KEYS.map((ck) => {
              const p = getCardPalette(ck, isDark);
              return (
                <TouchableOpacity
                  key={ck}
                  onPress={() => setColor(ck)}
                  style={[
                    mStyles.colorDot,
                    { backgroundColor: p.border },
                    color === ck && mStyles.colorDotActive,
                  ]}
                >
                  {color === ck && <Text style={mStyles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {subject.trim() ? (
            <View style={[mStyles.preview, { backgroundColor: previewPalette.bg, borderColor: previewPalette.border }]}>
              <Text style={[mStyles.previewSubject, { color: previewPalette.text }]}>
                {subject.trim().toUpperCase()}
              </Text>
              {teacher.trim() ? (
                <Text style={[mStyles.previewTeacher, { color: colors.textSec }]}>{teacher.trim()}</Text>
              ) : null}
              {room.trim() ? (
                <Text style={[mStyles.previewRoom, { color: previewPalette.text }]}>{room.trim()}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={mStyles.actions}>
            <TouchableOpacity
              style={[mStyles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border }]}
              onPress={onClose}
            >
              <Text style={[mStyles.cancelText, { color: colors.textSec }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mStyles.saveBtn, !canSave && mStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={mStyles.saveText}>{isEditing ? 'Save Changes' : 'Assign'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Mobile lecture row ────────────────────────────────────────────────────────

function MobileLectureRow({ slot, data, onPress }) {
  const { isDark, colors } = useContext(ThemeContext);

  if (slot.isBreak) {
    const lineColor = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
    const textColor = isDark ? 'rgba(255,255,255,0.2)' : colors.textMuted;
    return (
      <View style={mStyles.breakRow}>
        <View style={[mStyles.breakLine, { backgroundColor: lineColor }]} />
        <Text style={[mStyles.breakLabel, { color: textColor }]}>{slot.sub}  •  {slot.label}</Text>
        <View style={[mStyles.breakLine, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  const palette = data ? getCardPalette(data.color, isDark) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={mStyles.lectureRow}>
      <View style={mStyles.timeCol}>
        <Text style={[mStyles.timeSub, { color: isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted }]}>
          {slot.sub}
        </Text>
        <Text style={[mStyles.timeLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textSec }]}>
          {slot.label.replace(' – ', '\n')}
        </Text>
      </View>
      {data ? (
        <View style={[mStyles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <View style={mStyles.cardTop}>
            <Text style={[mStyles.cardSubject, { color: palette.text }]}>{data.subject}</Text>
            <Text style={mStyles.editHintEmoji}>✏️</Text>
          </View>
          <Text style={[mStyles.cardTeacher, { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSec }]}>
            {data.teacher}
          </Text>
          {data.room && (
            <View style={[mStyles.roomBadge, { borderColor: palette.border }]}>
              <Text style={[mStyles.roomText, { color: palette.text }]}>{data.room}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[mStyles.emptyCard, {
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
        }]}>
          <Text style={[mStyles.emptyIcon, { color: isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted }]}>＋</Text>
          <Text style={[mStyles.emptyLabel, { color: isDark ? 'rgba(255,255,255,0.25)' : colors.textMuted }]}>
            TAP TO ASSIGN
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Tablet grid sub-components ───────────────────────────────────────────────

function SubjectCard({ data, onPress }) {
  const { isDark, colors } = useContext(ThemeContext);
  const palette = getCardPalette(data.color, isDark);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[tStyles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}
    >
      <Text style={[tStyles.cardSubject, { color: palette.text }]}>{data.subject}</Text>
      <Text style={[tStyles.cardTeacher, { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSec }]}>
        {data.teacher}
      </Text>
      {data.room && <Text style={[tStyles.cardRoom, { color: palette.text }]}>{data.room}</Text>}
      <Text style={[tStyles.editHint, { color: isDark ? 'rgba(255,255,255,0.2)' : colors.textMuted }]}>
        ✏️ tap to edit
      </Text>
    </TouchableOpacity>
  );
}

function AssignCell({ onPress }) {
  const { isDark, colors } = useContext(ThemeContext);
  return (
    <TouchableOpacity
      style={[tStyles.assignCell, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[tStyles.assignPlus, { color: isDark ? 'rgba(255,255,255,0.2)' : colors.textMuted }]}>＋</Text>
      <Text style={[tStyles.assignLabel, { color: isDark ? 'rgba(255,255,255,0.18)' : colors.textMuted }]}>ASSIGN</Text>
    </TouchableOpacity>
  );
}

function BreakCell({ label }) {
  const { isDark, colors } = useContext(ThemeContext);
  return (
    <View style={[tStyles.breakCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.surfaceAlt }]}>
      <Text style={[tStyles.breakCellText, { color: isDark ? 'rgba(255,255,255,0.15)' : colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function TimeTableManagement() {
  const { isDark, colors } = useContext(ThemeContext);

  const [selectedYear,     setSelectedYear]     = useState(ACADEMIC_YEARS[0]);
  const [selectedDivision, setSelectedDivision] = useState(DIVISIONS[0]);
  const [selectedBatch,    setSelectedBatch]    = useState(BATCHES['Division A'][0]);
  const [selectedDay,      setSelectedDay]      = useState(0);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [savedMsg,         setSavedMsg]         = useState(false);
  const [timetable,        setTimetable]        = useState(INITIAL_TIMETABLE);
  const [modalVisible,     setModalVisible]     = useState(false);
  const [slotInfo,         setSlotInfo]         = useState(null);

  // ── Derived theme colors ──────────────────────────────────────────────────
  const screenBg          = isDark ? '#0d1b3e' : colors.bg;
  const headerBorder      = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
  const headerSubColor    = isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted;
  const btnOutlineBorder  = isDark ? 'rgba(255,255,255,0.2)' : colors.border;
  const dropdownBg        = isDark ? '#131f45' : colors.surface;
  const dropdownBorder    = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const dropdownMenuItemBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
  const filterLabelColor  = isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted;
  const divTabsBg         = isDark ? '#0b1437' : colors.surfaceAlt;
  const divTabsBorder     = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
  const divTabInactiveText= isDark ? 'rgba(255,255,255,0.45)' : colors.textSec;
  const pillBg            = isDark ? '#131f45' : colors.surface;
  const pillBorder        = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
  const pillInactiveText  = isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted;
  const breadcrumbBg      = isDark ? 'rgba(255,255,255,0.05)' : colors.surfaceAlt;
  const breadcrumbText    = isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted;
  // Tablet grid
  const gridHeaderBg      = isDark ? '#0b1437' : colors.surface;
  const gridHeaderBorder  = isDark ? 'rgba(255,255,255,0.08)' : colors.border;
  const gridRowBorder     = isDark ? 'rgba(255,255,255,0.05)' : colors.border;
  const dayCellBg         = isDark ? '#0b1741' : colors.surfaceAlt;
  const dayCellBorder     = isDark ? 'rgba(255,255,255,0.05)' : colors.border;
  const gridHeaderText    = isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted;
  const timeSubColor      = isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted;
  const cellBorder        = isDark ? 'rgba(255,255,255,0.04)' : colors.border;
  const breakHeaderBg     = isDark ? 'rgba(255,255,255,0.03)' : colors.surfaceAlt;
  const extraIconColor    = isDark ? 'rgba(255,255,255,0.2)' : colors.textMuted;

  const handleDivisionChange = (div) => {
    setSelectedDivision(div);
    setSelectedBatch(BATCHES[div][0]);
  };

  const currentBatches = BATCHES[selectedDivision];
  const currentGrid    = timetable[selectedDivision]?.[selectedBatch] || {};

  const openSlot = (day, slotId) => {
    const existing = timetable[selectedDivision]?.[selectedBatch]?.[day]?.[slotId] || null;
    setSlotInfo({ division: selectedDivision, batch: selectedBatch, day, slotId, existing });
    setModalVisible(true);
  };

  const handleSave = (entry) => {
    setTimetable(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[slotInfo.division][slotInfo.batch][slotInfo.day]) {
        next[slotInfo.division][slotInfo.batch][slotInfo.day] = {};
      }
      next[slotInfo.division][slotInfo.batch][slotInfo.day][slotInfo.slotId] = entry;
      return next;
    });
    setModalVisible(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleDelete = () => {
    setTimetable(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[slotInfo.division]?.[slotInfo.batch]?.[slotInfo.day]) {
        delete next[slotInfo.division][slotInfo.batch][slotInfo.day][slotInfo.slotId];
      }
      return next;
    });
    setModalVisible(false);
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
  const renderFilters = () => (
    <>
      {/* Header */}
      <View style={[fStyles.header, { borderBottomColor: headerBorder }]}>
        <View style={fStyles.headerLeft}>
          <Text style={[fStyles.headerTitle, { color: colors.textPrim }]}>Master Timetable</Text>
          <Text style={[fStyles.headerSub, { color: headerSubColor }]}>Tap any slot to assign or edit</Text>
        </View>
        <View style={fStyles.headerActions}>
          <TouchableOpacity style={[fStyles.btnOutline, { borderColor: btnOutlineBorder }]}>
            <Text style={[fStyles.btnOutlineText, { color: colors.textPrim }]}>⬇ PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={fStyles.btnPrimary}
            onPress={() => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }}
          >
            <Text style={fStyles.btnPrimaryText}>{savedMsg ? '✓ Saved!' : '💾 Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Year dropdown */}
      <View style={fStyles.yearRow}>
        <View style={fStyles.dropdownWrapper}>
          <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>ACADEMIC YEAR</Text>
          <TouchableOpacity
            style={[fStyles.dropdown, { backgroundColor: dropdownBg, borderColor: dropdownBorder }]}
            onPress={() => setShowYearDropdown(!showYearDropdown)}
            activeOpacity={0.8}
          >
            <Text style={[fStyles.dropdownValue, { color: colors.textPrim }]} numberOfLines={1}>
              {selectedYear}
            </Text>
            <Text style={[fStyles.dropdownCaret, { color: isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted }]}>
              {showYearDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showYearDropdown && (
            <View style={[fStyles.dropdownMenu, { backgroundColor: dropdownBg, borderColor: dropdownBorder }]}>
              {ACADEMIC_YEARS.map((yr) => (
                <TouchableOpacity
                  key={yr}
                  style={[
                    fStyles.dropdownMenuItem,
                    { borderBottomColor: dropdownMenuItemBorder },
                    yr === selectedYear && fStyles.dropdownMenuItemActive,
                  ]}
                  onPress={() => { setSelectedYear(yr); setShowYearDropdown(false); }}
                >
                  <Text style={[
                    fStyles.dropdownMenuItemText,
                    { color: yr === selectedYear ? colors.textPrim : colors.textSec },
                    yr === selectedYear && { fontWeight: '600' },
                  ]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Division + Batch */}
      <View style={fStyles.divBatchRow}>
        <View style={fStyles.divBatchGroup}>
          <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>DIVISION</Text>
          <View style={[fStyles.divisionTabs, { backgroundColor: divTabsBg, borderColor: divTabsBorder }]}>
            {DIVISIONS.map((div) => {
              const isActive = div === selectedDivision;
              return (
                <TouchableOpacity
                  key={div}
                  style={[fStyles.divTab, isActive && fStyles.divTabActive]}
                  onPress={() => handleDivisionChange(div)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    fStyles.divTabText,
                    { color: isActive ? '#ffffff' : divTabInactiveText },
                    isActive && { fontWeight: '700' },
                  ]}>
                    {IS_TABLET ? div : div.replace('Division ', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={fStyles.divBatchGroup}>
          <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>BATCH</Text>
          <View style={fStyles.batchPills}>
            {currentBatches.map((batch) => {
              const isActive = batch === selectedBatch;
              return (
                <TouchableOpacity
                  key={batch}
                  style={[
                    fStyles.batchPill,
                    { backgroundColor: pillBg, borderColor: pillBorder },
                    isActive && fStyles.batchPillActive,
                  ]}
                  onPress={() => setSelectedBatch(batch)}
                  activeOpacity={0.8}
                >
                  {isActive && <View style={fStyles.batchPillDot} />}
                  <Text style={[
                    fStyles.batchPillText,
                    { color: isActive ? colors.textPrim : pillInactiveText },
                  ]}>
                    {batch}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Badges */}
      <View style={fStyles.badgeRow}>
        <View style={fStyles.activeBadge}>
          <View style={fStyles.activeDot} />
          <Text style={fStyles.activeBadgeText}>ACTIVE SEMESTER</Text>
        </View>
        <View style={[fStyles.breadcrumb, { backgroundColor: breadcrumbBg }]}>
          <Text style={[fStyles.breadcrumbText, { color: breadcrumbText }]}>
            {selectedDivision}  ›  Batch {selectedBatch}
          </Text>
        </View>
      </View>
    </>
  );

  // ── MOBILE layout ──────────────────────────────────────────────────────────
  if (!IS_TABLET) {
    const activeDayName = DAYS[selectedDay];
    const activeDayData = currentGrid[activeDayName] || {};

    return (
      <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={screenBg}
        />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderFilters()}

          {/* Day strip */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={mStyles.dayStrip}
            contentContainerStyle={mStyles.dayStripContent}
          >
            {DAYS.map((day, idx) => {
              const isActive = idx === selectedDay;
              const hasClasses = TIME_SLOTS.some(s => !s.isBreak && currentGrid[day]?.[s.id]);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    mStyles.dayPill,
                    { backgroundColor: pillBg, borderColor: pillBorder },
                    isActive && mStyles.dayPillActive,
                  ]}
                  onPress={() => setSelectedDay(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    mStyles.dayPillText,
                    { color: isActive ? '#ffffff' : pillInactiveText },
                  ]}>
                    {DAY_SHORT[idx]}
                  </Text>
                  {hasClasses && (
                    <View style={[
                      mStyles.dayDot,
                      { backgroundColor: isActive
                          ? (isDark ? 'rgba(255,255,255,0.8)' : colors.accentBlue)
                          : (isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted)
                      },
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Day header */}
          <View style={mStyles.dayHeader}>
            <Text style={[mStyles.dayHeaderText, { color: colors.textPrim }]}>{activeDayName}</Text>
            <View style={[mStyles.dayCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt }]}>
              <Text style={[mStyles.dayCount, { color: isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted }]}>
                {TIME_SLOTS.filter(s => !s.isBreak && activeDayData[s.id]).length} classes
              </Text>
            </View>
          </View>

          {/* Lecture list */}
          <View style={mStyles.lectureList}>
            {TIME_SLOTS.map((slot) => (
              <MobileLectureRow
                key={slot.id}
                slot={slot}
                data={slot.isBreak ? null : activeDayData[slot.id]}
                onPress={() => !slot.isBreak && openSlot(activeDayName, slot.id)}
              />
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>

        <SlotModal visible={modalVisible} slotInfo={slotInfo} onSave={handleSave} onDelete={handleDelete} onClose={() => setModalVisible(false)} />
      </View>
    );
  }

  // ── TABLET layout ──────────────────────────────────────────────────────────
  const CELL_WIDTH  = 148;
  const DAY_COL     = 90;
  const BREAK_WIDTH = 54;

  return (
    <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={screenBg}
      />
      {renderFilters()}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tStyles.hScroll}>
          <View>
            {/* Header row */}
            <View style={[tStyles.gridRow, { backgroundColor: gridHeaderBg, borderBottomColor: gridHeaderBorder, borderBottomWidth: 1 }]}>
              <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: gridHeaderBg, borderRightColor: dayCellBorder }]}>
                <Text style={[tStyles.gridHeaderText, { color: gridHeaderText }]}>DAY / TIME</Text>
              </View>
              {TIME_SLOTS.map((slot) => (
                <View
                  key={slot.id}
                  style={[
                    tStyles.timeHeaderCell,
                    { width: slot.isBreak ? BREAK_WIDTH : CELL_WIDTH, borderRightColor: dayCellBorder },
                    slot.isBreak && { backgroundColor: breakHeaderBg },
                  ]}
                >
                  <Text style={[tStyles.timeLabel, { color: colors.textPrim }]}>{slot.label}</Text>
                  {!slot.isBreak && <Text style={[tStyles.timeSub, { color: timeSubColor }]}>{slot.sub}</Text>}
                </View>
              ))}
            </View>

            {/* Day rows */}
            {DAYS.map((day) => {
              const dayData = currentGrid[day] || {};
              return (
                <View key={day} style={[tStyles.gridRow, { borderBottomColor: gridRowBorder }]}>
                  <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: dayCellBorder }]}>
                    <Text style={[tStyles.dayLabel, { color: colors.textPrim }]}>{day}</Text>
                  </View>
                  {TIME_SLOTS.map((slot) => {
                    if (slot.isBreak) {
                      return (
                        <View key={slot.id} style={[tStyles.cellWrapper, { width: BREAK_WIDTH, borderRightColor: cellBorder }]}>
                          <BreakCell label={slot.sub} />
                        </View>
                      );
                    }
                    const cellData = dayData[slot.id];
                    return (
                      <View key={slot.id} style={[tStyles.cellWrapper, { width: CELL_WIDTH, borderRightColor: cellBorder }]}>
                        {cellData
                          ? <SubjectCard data={cellData} onPress={() => openSlot(day, slot.id)} />
                          : <AssignCell onPress={() => openSlot(day, slot.id)} />
                        }
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Extra curricular row */}
            <View style={[tStyles.gridRow, { borderBottomWidth: 0 }]}>
              <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: dayCellBorder }]} />
              {TIME_SLOTS.map((slot) => (
                <View key={slot.id} style={[tStyles.cellWrapper, { width: slot.isBreak ? BREAK_WIDTH : CELL_WIDTH, borderRightColor: cellBorder }]}>
                  {!slot.isBreak && slot.id === 't6' && (
                    <View style={tStyles.extraBadge}>
                      <Text style={[tStyles.extraIcon, { color: extraIconColor }]}>☆</Text>
                      <Text style={[tStyles.extraText, { color: extraIconColor }]}>EXTRA CURRICULAR{'\n'}ACTIVITIES</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <SlotModal visible={modalVisible} slotInfo={slotInfo} onSave={handleSave} onDelete={handleDelete} onClose={() => setModalVisible(false)} />
    </View>
  );
}

// ─── Base ─────────────────────────────────────────────────────────────────────
const baseStyles = StyleSheet.create({
  screen: { flex: 1 },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  // Modal sheet
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginTop: 3 },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  deleteBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.7, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  colorDotActive: { opacity: 1, transform: [{ scale: 1.2 }], borderWidth: 2, borderColor: '#fff' },
  colorCheck: { color: '#fff', fontSize: 14, fontWeight: '800' },
  preview: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  previewSubject: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 3 },
  previewTeacher: { fontSize: 11 },
  previewRoom: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: 'rgba(37,99,235,0.35)' },
  saveText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Mobile lecture rows
  dayStrip: { paddingVertical: 4 },
  dayStripContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  dayPill: { alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 52 },
  dayPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayPillText: { fontSize: 12, fontWeight: '700' },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dayHeaderText: { fontSize: 18, fontWeight: '700' },
  dayCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dayCount: { fontSize: 12, fontWeight: '600' },
  lectureList: { paddingHorizontal: 16, gap: 6 },
  lectureRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12, minHeight: 80 },
  timeCol: { width: 72, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4, paddingVertical: 4, flexShrink: 0 },
  timeSub: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 3 },
  timeLabel: { fontSize: 10.5, fontWeight: '600', textAlign: 'right', lineHeight: 15 },
  card: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardSubject: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  editHintEmoji: { fontSize: 13, marginLeft: 4 },
  cardTeacher: { fontSize: 11, lineHeight: 15 },
  roomBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  roomText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  emptyCard: { flex: 1, borderWidth: 1, borderRadius: 14, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: 0.6 },
  emptyIcon: { fontSize: 16 },
  emptyLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 84 },
  breakLine: { flex: 1, height: 1 },
  breakLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
});

// ─── Filter Styles ────────────────────────────────────────────────────────────
const fStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : 14, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: IS_TABLET ? 18 : 16, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  btnOutline: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  btnOutlineText: { fontSize: 12, fontWeight: '600' },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnPrimaryText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  yearRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, zIndex: 100 },
  dropdownWrapper: { position: 'relative', zIndex: 100 },
  filterLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.9, marginBottom: 5 },
  dropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dropdownValue: { fontSize: 13, fontWeight: '500', flex: 1 },
  dropdownCaret: { fontSize: 10, marginLeft: 8 },
  dropdownMenu: { position: 'absolute', top: 62, left: 0, right: 0, borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 200, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  dropdownMenuItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  dropdownMenuItemActive: { backgroundColor: 'rgba(37,99,235,0.2)' },
  dropdownMenuItemText: { fontSize: 13 },
  divBatchRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 16, flexWrap: 'wrap' },
  divBatchGroup: { flex: 1 },
  divisionTabs: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', alignSelf: 'flex-start' },
  divTab: { paddingHorizontal: 12, paddingVertical: 9 },
  divTabActive: { backgroundColor: '#2563eb' },
  divTabText: { fontSize: 12, fontWeight: '500' },
  batchPills: { flexDirection: 'row', gap: 6 },
  batchPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, gap: 5 },
  batchPillActive: { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: '#2563eb' },
  batchPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  batchPillText: { fontSize: 12, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
  activeBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  breadcrumb: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  breadcrumbText: { fontSize: 10, fontWeight: '600' },
});

// ─── Tablet Grid Styles ───────────────────────────────────────────────────────
const tStyles = StyleSheet.create({
  hScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'flex-start' },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1 },
  dayCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRightWidth: 1 },
  dayLabel: { fontSize: 12, fontWeight: '600' },
  gridHeaderText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  timeHeaderCell: { paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeLabel: { fontSize: 10.5, fontWeight: '600', textAlign: 'center' },
  timeSub: { fontSize: 9, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  cellWrapper: { padding: 5, borderRightWidth: 1, minHeight: 100, justifyContent: 'center' },
  card: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 9, justifyContent: 'space-between', minHeight: 88 },
  cardSubject: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, lineHeight: 14, marginBottom: 4 },
  cardTeacher: { fontSize: 9.5, lineHeight: 13, flex: 1 },
  cardRoom: { fontSize: 9.5, fontWeight: '600', marginTop: 5 },
  editHint: { fontSize: 8, marginTop: 4 },
  assignCell: { flex: 1, minHeight: 88, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  assignPlus: { fontSize: 20 },
  assignLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  breakCell: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  breakCellText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.6, transform: [{ rotate: '-90deg' }] },
  extraBadge: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  extraIcon: { fontSize: 16 },
  extraText: { fontSize: 8, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});