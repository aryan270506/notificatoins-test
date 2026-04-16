import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, Dimensions, ActivityIndicator, Alert,
  TextInput, Modal,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = [
  { label: '1st Year (B.Tech - CS)', year: '1' },
  { label: '2nd Year (B.Tech - CS)', year: '2' },
  { label: '3rd Year (B.Tech - CS)', year: '3' },
  { label: '4th Year (B.Tech - CS)', year: '4' },
];

// ─── PRESET TEMPLATES REMOVED — only Custom template is used ──────────────────

const CUSTOM_TEMPLATE_KEY = 'custom';
const TEMPLATE_PREFS_KEY  = 'admin_timetable_template_prefs_v2';

const DAYS      = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const COLOR_KEYS = ['teal','blue','purple','orange','green','pink'];

// ─── Default blank custom config ──────────────────────────────────────────────

const DEFAULT_CUSTOM_CONFIG = {
  workingDays: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  slots: [],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return 's' + Math.random().toString(36).slice(2, 8);
}

function to12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = String(hhmm).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function validateHHMM(val) {
  return /^\d{1,2}:\d{2}$/.test(val.trim());
}

function buildSlotsFromConfig(config) {
  const slots = config?.slots || [];
  let lectureIdx = 0;
  return slots.map((s) => {
    if (s.type === 'break') {
      return {
        id: s.id,
        label: `${to12(s.startTime)} – ${to12(s.endTime)}`,
        sub: s.label || 'BREAK',
        isBreak: true,
      };
    }
    lectureIdx += 1;
    return {
      id: s.id,
      label: `${to12(s.startTime)} – ${to12(s.endTime)}`,
      sub: `LECTURE ${lectureIdx}`,
      _origId: s.id,
    };
  });
}

function slotIdToKey(config) {
  const map = {};
  let k = 1;
  (config?.slots || []).forEach((s) => {
    if (s.type !== 'break') {
      map[s.id] = `t${k}`;
      k += 1;
    }
  });
  return map;
}

function orderDays(days) {
  const selected = new Set((days || []).filter(Boolean));
  return DAYS.filter((d) => selected.has(d));
}

// ─── Palettes ──────────────────────────────────────────────────────────────────

const COLORS_DARK = {
  teal:   { bg: '#0d3d3a', border: '#00b894', text: '#00d4b4' },
  blue:   { bg: '#0d2240', border: '#2d6cdf', text: '#5b9cf6' },
  purple: { bg: '#2a1a40', border: '#7c3aed', text: '#a78bfa' },
  orange: { bg: '#3b2000', border: '#f59e0b', text: '#fbbf24' },
  green:  { bg: '#0d2e1a', border: '#22c55e', text: '#4ade80' },
  pink:   { bg: '#3b0a2a', border: '#db2777', text: '#f472b6' },
};

const COLORS_LIGHT_CARDS = {
  teal:   { bg: '#e0f7f4', border: '#00b894', text: '#007a68' },
  blue:   { bg: '#ddeeff', border: '#2d6cdf', text: '#1a4fa0' },
  purple: { bg: '#ede8ff', border: '#7c3aed', text: '#5b21b6' },
  orange: { bg: '#fff3e0', border: '#f59e0b', text: '#92550a' },
  green:  { bg: '#e2f7ea', border: '#22c55e', text: '#166534' },
  pink:   { bg: '#fce7f3', border: '#db2777', text: '#9d174d' },
};

function getCardPalette(colorKey, isDark) {
  return (isDark ? COLORS_DARK : COLORS_LIGHT_CARDS)[colorKey]
    || (isDark ? COLORS_DARK : COLORS_LIGHT_CARDS).teal;
}

// ─── Normalise DB timetable ────────────────────────────────────────────────────

function normaliseGrid(dbDoc, config) {
  if (!dbDoc) return {};
  const idMap  = slotIdToKey(config);
  const revMap = Object.fromEntries(Object.entries(idMap).map(([sid, tk]) => [tk, sid]));
  const grid   = {};
  DAYS.forEach((day) => {
    if (!dbDoc[day]) return;
    grid[day] = {};
    Object.entries(dbDoc[day]).forEach(([key, s]) => {
      const sid = revMap[key] || key;
      grid[day][sid] = s;
    });
  });
  return grid;
}

function generateBatches(division, count = 3) {
  return Array.from({ length: count }, (_, i) => `${division}${i + 1}`);
}

const YEAR_ACCENTS = {
  '1': { dark: { bg: '#0d2e1a', border: '#22c55e', text: '#4ade80', label: '#bbf7d0' },
         light: { bg: '#dcfce7', border: '#22c55e', text: '#166534', label: '#14532d' } },
  '2': { dark: { bg: '#0d2240', border: '#3b82f6', text: '#93c5fd', label: '#bfdbfe' },
         light: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', label: '#1e3a8a' } },
  '3': { dark: { bg: '#2a1a40', border: '#a855f7', text: '#d8b4fe', label: '#e9d5ff' },
         light: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8', label: '#581c87' } },
  '4': { dark: { bg: '#3b1a00', border: '#f97316', text: '#fdba74', label: '#fed7aa' },
         light: { bg: '#ffedd5', border: '#f97316', text: '#9a3412', label: '#7c2d12' } },
};

function getYearAccent(year, isDark) {
  const a = YEAR_ACCENTS[year];
  return a ? (isDark ? a.dark : a.light) : (isDark ? COLORS_DARK.teal : COLORS_LIGHT_CARDS.teal);
}

// ─── Time Input Component ──────────────────────────────────────────────────────

function TimeInput({ value, onChange, isDark, colors }) {
  const [local, setLocal] = useState(value || '');
  const [error, setError] = useState(false);

  useEffect(() => { setLocal(value || ''); }, [value]);

  const commit = () => {
    const v = local.trim();
    if (validateHHMM(v)) {
      setError(false);
      onChange(v);
    } else {
      setError(true);
    }
  };

  return (
    <TextInput
      style={[
        tiStyles.input,
        {
          color: isDark ? '#fff' : colors.textPrim,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : colors.surfaceAlt,
          borderColor: error ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.15)' : colors.border),
        },
      ]}
      value={local}
      onChangeText={setLocal}
      onBlur={commit}
      placeholder="HH:MM"
      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : colors.textMuted}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
    />
  );
}

const tiStyles = StyleSheet.create({
  input: {
    borderWidth: 1, borderRadius: 7,
    paddingHorizontal: 8, paddingVertical: 5,
    fontSize: 12, fontWeight: '600',
    width: 70, textAlign: 'center',
  },
});

// ─── Slot Editor Modal — with ScrollView ──────────────────────────────────────
// CHANGE 1: Wrapped sheet content in ScrollView so it scrolls on small screens

function SlotEditorModal({ visible, slot, onSave, onCancel, isDark, colors }) {
  const [form, setForm] = useState(slot || {});

  useEffect(() => { setForm(slot || {}); }, [slot]);

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const bg     = isDark ? '#0f1f4a' : colors.surface;
  const border = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const muted  = isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={seStyles.overlay}>
        <View style={[seStyles.sheet, { backgroundColor: bg, borderColor: border }]}>
          {/* ── Drag handle ── */}
          <View style={seStyles.handle} />

          {/* ── Scrollable content ── */}
          <ScrollView
            style={seStyles.scrollArea}
            contentContainerStyle={seStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[seStyles.title, { color: isDark ? '#fff' : colors.textPrim }]}>Edit Slot</Text>

            {/* Label */}
            <Text style={[seStyles.label, { color: muted }]}>LABEL</Text>
            <TextInput
              style={[seStyles.textInput, {
                color: isDark ? '#fff' : colors.textPrim,
                borderColor: border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt,
              }]}
              value={form.label || ''}
              onChangeText={v => update('label', v)}
              placeholder="e.g. Lunch, Lecture 3"
              placeholderTextColor={muted}
            />

            {/* Type toggle */}
            <Text style={[seStyles.label, { color: muted }]}>TYPE</Text>
            <View style={seStyles.typeRow}>
              {['lecture', 'break'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    seStyles.typeBtn,
                    { borderColor: border },
                    form.type === t && { backgroundColor: '#2563eb', borderColor: '#2563eb' },
                  ]}
                  onPress={() => update('type', t)}
                >
                  <Text style={{ color: form.type === t ? '#fff' : muted, fontWeight: '700', fontSize: 12 }}>
                    {t === 'lecture' ? '📘 Lecture' : '☕ Break'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start time */}
            <Text style={[seStyles.label, { color: muted }]}>START TIME (24h HH:MM)</Text>
            <TextInput
              style={[seStyles.textInput, {
                color: isDark ? '#fff' : colors.textPrim,
                borderColor: border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt,
              }]}
              value={form.startTime || ''}
              onChangeText={v => update('startTime', v)}
              placeholder="09:00"
              placeholderTextColor={muted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            {/* End time */}
            <Text style={[seStyles.label, { color: muted }]}>END TIME (24h HH:MM)</Text>
            <TextInput
              style={[seStyles.textInput, {
                color: isDark ? '#fff' : colors.textPrim,
                borderColor: border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt,
              }]}
              value={form.endTime || ''}
              onChangeText={v => update('endTime', v)}
              placeholder="10:00"
              placeholderTextColor={muted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            {/* Preview */}
            {form.startTime && form.endTime && validateHHMM(form.startTime) && validateHHMM(form.endTime) && (
              <View style={[seStyles.previewBox, { backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff', borderColor: isDark ? 'rgba(37,99,235,0.3)' : '#bfdbfe' }]}>
                <Text style={[seStyles.previewLabel, { color: muted }]}>PREVIEW</Text>
                <Text style={[seStyles.previewText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                  {to12(form.startTime)} – {to12(form.endTime)}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={seStyles.actions}>
              <TouchableOpacity style={[seStyles.cancelBtn, { borderColor: border }]} onPress={onCancel}>
                <Text style={{ color: muted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={seStyles.saveBtn}
                onPress={() => {
                  if (!validateHHMM(form.startTime || '') || !validateHHMM(form.endTime || '')) {
                    Alert.alert('Invalid Time', 'Please enter times in HH:MM format (24h).');
                    return;
                  }
                  onSave(form);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const seStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { maxHeight: '88%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  scrollArea:   { flexGrow: 0 },
  scrollContent:{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  title:        { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  label:        { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5, marginTop: 10 },
  textInput:    { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 4 },
  typeRow:      { flexDirection: 'row', gap: 10 },
  typeBtn:      { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  previewBox:   { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, alignItems: 'center' },
  previewLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  previewText:  { fontSize: 14, fontWeight: '700' },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:    { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtn:      { flex: 2, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});

// ─── Custom Template Builder ───────────────────────────────────────────────────

function CustomTemplateBuilder({ config, onChange, isDark, colors }) {
  const [editingSlot, setEditingSlot] = useState(null);
  const [editingIdx,  setEditingIdx]  = useState(null);

  const border     = isDark ? 'rgba(255,255,255,0.10)' : colors.border;
  const muted      = isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted;
  const cardBg     = isDark ? '#0f1f50' : colors.surface;

  const updateSlot = (idx, key, val) => {
    const next = config.slots.map((s, i) => i === idx ? { ...s, [key]: val } : s);
    onChange({ ...config, slots: next });
  };

  const addSlot = (type) => {
    const lastSlot = config.slots[config.slots.length - 1];
    const newSlot = {
      id:        uid(),
      type,
      label:     '',
      startTime: lastSlot?.endTime || '',
      endTime:   '',
    };
    onChange({ ...config, slots: [...config.slots, newSlot] });
  };

  const removeSlot = (idx) => {
    if (config.slots.length <= 1) return;
    const next = config.slots.filter((_, i) => i !== idx);
    onChange({ ...config, slots: next });
  };

  const moveSlot = (idx, dir) => {
    const arr  = [...config.slots];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    onChange({ ...config, slots: arr });
  };

  const toggleDay = (day) => {
    const exists = config.workingDays.includes(day);
    const next   = exists
      ? config.workingDays.filter(d => d !== day)
      : [...config.workingDays, day];
    onChange({ ...config, workingDays: next.length ? next : [day] });
  };

  return (
    <View style={[ctbStyles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <ScrollView
        style={ctbStyles.scrollArea}
        contentContainerStyle={ctbStyles.scrollContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >

      {/* ── Working days ── */}
      <Text style={[ctbStyles.sectionLabel, { color: muted }]}>WORKING DAYS</Text>
      <View style={ctbStyles.dayRow}>
        {DAYS.map(d => {
          const active = config.workingDays.includes(d);
          return (
            <TouchableOpacity
              key={d}
              style={[ctbStyles.dayPill, { borderColor: active ? '#2563eb' : border, backgroundColor: active ? 'rgba(37,99,235,0.2)' : 'transparent' }]}
              onPress={() => toggleDay(d)}
            >
              <Text style={[ctbStyles.dayPillTxt, { color: active ? (isDark ? '#93c5fd' : '#1e40af') : muted }]}>
                {d.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Slot list ── */}
      <Text style={[ctbStyles.sectionLabel, { color: muted, marginTop: 14 }]}>TIME SLOTS</Text>
      <Text style={[ctbStyles.hint, { color: muted }]}>Tap a slot to edit label/times. Use ↑↓ to reorder.</Text>

      {config.slots.length === 0 && (
        <View style={[ctbStyles.emptySlots, { borderColor: border }]}>
          <Text style={ctbStyles.emptySlotsIcon}>🗓</Text>
          <Text style={[ctbStyles.emptySlotsText, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textSec }]}>
            No slots added yet
          </Text>
          <Text style={[ctbStyles.emptySlotsHint, { color: muted }]}>
            Add lectures and breaks below to build your timetable structure
          </Text>
        </View>
      )}

      {config.slots.map((slot, idx) => {
        const isBreak = slot.type === 'break';
        const accent  = isBreak
          ? { bg: isDark ? '#1a2a00' : '#f0fdf4', border: '#22c55e', text: '#22c55e' }
          : { bg: isDark ? '#0d2240' : '#eff6ff',  border: '#3b82f6', text: '#3b82f6' };

        return (
          <View key={slot.id} style={[ctbStyles.slotRow, { backgroundColor: accent.bg, borderColor: accent.border }]}>
            <View style={ctbStyles.moveCol}>
              <TouchableOpacity onPress={() => moveSlot(idx, -1)} style={ctbStyles.moveBtn}>
                <Text style={[ctbStyles.moveTxt, { color: muted }]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveSlot(idx, 1)} style={ctbStyles.moveBtn}>
                <Text style={[ctbStyles.moveTxt, { color: muted }]}>▼</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={ctbStyles.slotInfo} onPress={() => { setEditingSlot(slot); setEditingIdx(idx); }} activeOpacity={0.7}>
              <View style={ctbStyles.slotTopRow}>
                <Text style={[ctbStyles.slotTypeBadge, { color: accent.text, borderColor: accent.border }]}>
                  {isBreak ? '☕ Break' : '📘 Lecture'}
                </Text>
                <Text style={[ctbStyles.slotLabel, { color: isDark ? '#fff' : colors.textPrim }]}>{slot.label}</Text>
              </View>
              <View style={ctbStyles.timingRow}>
                <TimeInput value={slot.startTime} onChange={v => updateSlot(idx, 'startTime', v)} isDark={isDark} colors={colors} />
                <Text style={[ctbStyles.timeSep, { color: muted }]}>→</Text>
                <TimeInput value={slot.endTime} onChange={v => updateSlot(idx, 'endTime', v)} isDark={isDark} colors={colors} />
                <Text style={[ctbStyles.timePreview, { color: muted }]}>
                  {slot.startTime && slot.endTime ? `${to12(slot.startTime)} – ${to12(slot.endTime)}` : ''}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => removeSlot(idx)} style={ctbStyles.removeBtn}>
              <Text style={ctbStyles.removeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* ── Add slot buttons ── */}
      <View style={ctbStyles.addRow}>
        <TouchableOpacity
          style={[ctbStyles.addBtn, { borderColor: '#3b82f6', backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}
          onPress={() => addSlot('lecture')}
        >
          <Text style={[ctbStyles.addBtnTxt, { color: '#3b82f6' }]}>＋ Add Lecture</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ctbStyles.addBtn, { borderColor: '#22c55e', backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4' }]}
          onPress={() => addSlot('break')}
        >
          <Text style={[ctbStyles.addBtnTxt, { color: '#22c55e' }]}>＋ Add Break</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Slot edit modal */}
      <SlotEditorModal
        visible={editingSlot !== null}
        slot={editingSlot}
        onSave={(updated) => {
          const next = config.slots.map((s, i) => i === editingIdx ? { ...s, ...updated } : s);
          onChange({ ...config, slots: next });
          setEditingSlot(null);
          setEditingIdx(null);
        }}
        onCancel={() => { setEditingSlot(null); setEditingIdx(null); }}
        isDark={isDark}
        colors={colors}
      />
    </View>
  );
}

const ctbStyles = StyleSheet.create({
  card:          { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 },
  scrollArea:    { maxHeight: IS_TABLET ? 460 : 420 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel:  { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.9, marginBottom: 6 },
  hint:          { fontSize: 10, marginBottom: 8 },
  dayRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPill:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  dayPillTxt:    { fontSize: 11, fontWeight: '700' },
  emptySlots:    { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 10 },
  emptySlotsIcon:{ fontSize: 28, marginBottom: 8 },
  emptySlotsText:{ fontSize: 13, fontWeight: '700', marginBottom: 4 },
  emptySlotsHint:{ fontSize: 11, textAlign: 'center', lineHeight: 16 },
  slotRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 6 },
  moveCol:       { gap: 2, marginRight: 6 },
  moveBtn:       { padding: 2 },
  moveTxt:       { fontSize: 11 },
  slotInfo:      { flex: 1 },
  slotTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  slotTypeBadge: { fontSize: 9.5, fontWeight: '700', borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  slotLabel:     { fontSize: 12, fontWeight: '700', flex: 1 },
  timingRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  timeSep:       { fontSize: 12 },
  timePreview:   { fontSize: 10, flex: 1, flexShrink: 1 },
  removeBtn:     { padding: 6, marginLeft: 4 },
  removeTxt:     { color: '#ef4444', fontSize: 14, fontWeight: '700' },
  addRow:        { flexDirection: 'row', gap: 8, marginTop: 8 },
  addBtn:        { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 9, alignItems: 'center' },
  addBtnTxt:     { fontSize: 12, fontWeight: '700' },
});

// ─── No Timetable Model Banner ─────────────────────────────────────────────────
// CHANGE 3: Shown instead of the grid when no slots have been configured yet

function NoTimetableModelBanner({ isDark, colors }) {
  const bg     = isDark ? '#0f1f4a' : '#eff6ff';
  const border = isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe';
  const title  = isDark ? '#93c5fd' : '#1e40af';
  const sub    = isDark ? 'rgba(255,255,255,0.45)' : '#3b5fa0';

  return (
    <View style={[ntmStyles.wrapper, { backgroundColor: bg, borderColor: border }]}>
      <Text style={ntmStyles.icon}>🗓</Text>
      <Text style={[ntmStyles.title, { color: title }]}>No Timetable Model Set Yet</Text>
      <Text style={[ntmStyles.sub, { color: sub }]}>
        The admin hasn't configured any time slots for this timetable template.
        {'\n\n'}
        Please add lectures and breaks using the{' '}
        <Text style={{ fontWeight: '800' }}>Timetable Template</Text> builder above before teachers and students can view or manage the schedule.
      </Text>
      <View style={[ntmStyles.steps, { borderColor: border }]}>
        <Text style={[ntmStyles.stepsTitle, { color: title }]}>Steps to set up:</Text>
        {[
          '1. Select working days',
          '2. Add lecture & break slots with timings',
          '3. Save — teachers can then assign subjects',
        ].map((s, i) => (
          <View key={i} style={ntmStyles.stepRow}>
            <View style={[ntmStyles.stepDot, { backgroundColor: title }]} />
            <Text style={[ntmStyles.stepText, { color: sub }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ntmStyles = StyleSheet.create({
  wrapper:    { margin: 16, borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center' },
  icon:       { fontSize: 40, marginBottom: 12 },
  title:      { fontSize: 16, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  sub:        { fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  steps:      { width: '100%', borderTopWidth: 1, paddingTop: 14 },
  stepsTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, marginBottom: 8 },
  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepDot:    { width: 5, height: 5, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  stepText:   { fontSize: 11, lineHeight: 16, flex: 1 },
});

// ─── Mobile lecture row ────────────────────────────────────────────────────────

function MobileLectureRow({ slot, data }) {
  const { isDark, colors } = useContext(ThemeContext);

  if (slot.isBreak) {
    const lineColor = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
    const textColor = isDark ? 'rgba(255,255,255,0.2)'  : colors.textMuted;
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
    <View style={mStyles.lectureRow}>
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
        <View style={[mStyles.emptyCard, { borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}>
          <Text style={[mStyles.emptyIcon,  { color: isDark ? 'rgba(255,255,255,0.3)'  : colors.textMuted }]}>•</Text>
          <Text style={[mStyles.emptyLabel, { color: isDark ? 'rgba(255,255,255,0.25)' : colors.textMuted }]}>NO CLASS</Text>
        </View>
      )}
    </View>
  );
}

// ─── Tablet sub-components ────────────────────────────────────────────────────

function SubjectCard({ data }) {
  const { isDark, colors } = useContext(ThemeContext);
  const palette = getCardPalette(data.color, isDark);
  return (
    <View style={[tStyles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[tStyles.cardSubject, { color: palette.text }]}>{data.subject}</Text>
      <Text style={[tStyles.cardTeacher, { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSec }]}>{data.teacher}</Text>
      {data.room && <Text style={[tStyles.cardRoom, { color: palette.text }]}>{data.room}</Text>}
    </View>
  );
}

function AssignCell() {
  const { isDark, colors } = useContext(ThemeContext);
  return (
    <View style={[tStyles.assignCell, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
      <Text style={[tStyles.assignPlus,  { color: isDark ? 'rgba(255,255,255,0.2)'  : colors.textMuted }]}>•</Text>
      <Text style={[tStyles.assignLabel, { color: isDark ? 'rgba(255,255,255,0.18)' : colors.textMuted }]}>NO CLASS</Text>
    </View>
  );
}

function BreakCell({ label }) {
  const { isDark, colors } = useContext(ThemeContext);
  return (
    <View style={[tStyles.breakCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.surfaceAlt }]}>
      <Text style={[tStyles.breakCellText, { color: isDark ? 'rgba(255,255,255,0.15)' : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── All-Years Master Timetable ────────────────────────────────────────────────

function AllYearsOverview({ timeSlots, visibleDays, hasSlots }) {
  const { isDark, colors } = useContext(ThemeContext);

  const [yearSelections, setYearSelections] = useState(
    Object.fromEntries(ACADEMIC_YEARS.map(y => [y.year, { division: '', batch: '' }]))
  );
  const [grids,        setGrids]        = useState({});
  const [yearMeta,     setYearMeta]     = useState({});
  const [metaLoading,  setMetaLoading]  = useState(true);
  const [loadingYears, setLoadingYears] = useState(new Set());
  const [selectedDay,  setSelectedDay]  = useState(0);

  const screenBg   = isDark ? '#0d1b3e'                : colors.bg;
  const borderC    = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
  const mutedC     = isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted;
  const headerBg   = isDark ? '#0b1437'                : colors.surface;
  const dayCellBg  = isDark ? '#0b1741'                : colors.surfaceAlt;
  const breakBg    = isDark ? 'rgba(255,255,255,0.02)' : colors.surfaceAlt;
  const pillBg     = isDark ? '#131f45'                : colors.surface;
  const pillBorder = isDark ? 'rgba(255,255,255,0.1)'  : colors.border;
  const pillInactiveT = isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted;

  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const { data } = await axiosInstance.get('/timetable/meta');
        if (!data.success) return;
        const meta    = {};
        const initSel = {};
        ACADEMIC_YEARS.forEach(({ year }) => {
          const divSet = new Set();
          const bMap   = {};
          data.data.yearDivisionData.forEach(({ year: y, division }) => {
            if (y !== year) return;
            divSet.add(division);
            if (!bMap[division]) bMap[division] = generateBatches(division);
          });
          const divArr = [...divSet].sort();
          meta[year] = { divisions: divArr, batchMap: bMap };
          const firstDiv   = divArr[0] || '';
          const firstBatch = (bMap[firstDiv] || [])[0] || '';
          initSel[year] = { division: firstDiv, batch: firstBatch };
        });
        setYearMeta(meta);
        setYearSelections(initSel);
      } catch (e) {
        console.error('AllYears meta error', e);
      } finally {
        setMetaLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    ACADEMIC_YEARS.forEach(async ({ year }) => {
      const sel = yearSelections[year];
      if (!sel?.division || !sel?.batch) return;
      try {
        setLoadingYears(prev => new Set([...prev, year]));
        const { data } = await axiosInstance.get('/timetable', {
          params: { year, division: sel.division, batch: sel.batch },
        });
        setGrids(prev => ({
          ...prev,
          [year]: data.success && data.data ? normaliseGrid(data.data, null) : {},
        }));
      } catch (e) {
        setGrids(prev => ({ ...prev, [year]: {} }));
      } finally {
        setLoadingYears(prev => { const n = new Set(prev); n.delete(year); return n; });
      }
    });
  }, [yearSelections]);

  const updateSel = (year, key, val) =>
    setYearSelections(prev => ({ ...prev, [year]: { ...prev[year], [key]: val } }));

  const renderYearSelector = (yearObj) => {
    const { year, label } = yearObj;
    const meta      = yearMeta[year] || { divisions: [], batchMap: {} };
    const sel       = yearSelections[year] || { division: '', batch: '' };
    const accent    = getYearAccent(year, isDark);
    const batches   = (meta.batchMap[sel.division] || []);
    const isLoading = loadingYears.has(year);

    return (
      <View key={year} style={[mvStyles.yearSelectorRow, { borderColor: borderC, backgroundColor: isDark ? '#0b1437' : colors.surfaceAlt }]}>
        <View style={[mvStyles.yearBadge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
          <Text style={[mvStyles.yearBadgeNum, { color: accent.text }]}>Y{year}</Text>
          <Text style={[mvStyles.yearBadgeName, { color: accent.label }]} numberOfLines={1}>{label.split('(')[0].trim()}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          contentContainerStyle={{ gap: 5, alignItems: 'center', paddingHorizontal: 8 }}>
          {meta.divisions.map(div => {
            const active = div === sel.division;
            return (
              <TouchableOpacity
                key={div}
                style={[mvStyles.selPill, { backgroundColor: active ? accent.border : pillBg, borderColor: active ? accent.border : pillBorder }]}
                onPress={() => {
                  updateSel(year, 'division', div);
                  updateSel(year, 'batch', (meta.batchMap[div] || [])[0] || '');
                }}
                activeOpacity={0.8}
              >
                <Text style={[mvStyles.selPillText, { color: active ? '#fff' : pillInactiveT }]}>Div {div}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={[mvStyles.selDivider, { backgroundColor: borderC }]} />
          {batches.map(batch => {
            const active = batch === sel.batch;
            return (
              <TouchableOpacity
                key={batch}
                style={[mvStyles.selPill, { backgroundColor: active ? accent.border : pillBg, borderColor: active ? accent.border : pillBorder }]}
                onPress={() => updateSel(year, 'batch', batch)}
                activeOpacity={0.8}
              >
                <Text style={[mvStyles.selPillText, { color: active ? '#fff' : pillInactiveT }]}>{batch}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {isLoading && <ActivityIndicator size="small" color={accent.border} style={{ marginRight: 10 }} />}
      </View>
    );
  };

  const CELL_W  = 140;
  const DAY_COL = 86;
  const BRK_W   = 48;

  const renderMasterGrid = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={[mvStyles.gridRow, { backgroundColor: headerBg, borderBottomColor: borderC, borderBottomWidth: 1 }]}>
          <View style={[mvStyles.dayLabelCell, { width: DAY_COL, backgroundColor: headerBg, borderRightColor: borderC }]}>
            <Text style={[mvStyles.colHeaderText, { color: mutedC }]}>DAY / YEAR</Text>
          </View>
          {timeSlots.map(slot => (
            <View key={slot.id} style={[
              mvStyles.timeHeaderCell,
              { width: slot.isBreak ? BRK_W : CELL_W, borderRightColor: borderC },
              slot.isBreak && { backgroundColor: breakBg },
            ]}>
              <Text style={[mvStyles.timeHeaderLabel, { color: colors.textPrim }]}>{slot.label}</Text>
              {!slot.isBreak && <Text style={[mvStyles.timeHeaderSub, { color: mutedC }]}>{slot.sub}</Text>}
            </View>
          ))}
        </View>

        {visibleDays.map((day) => (
          <View key={day} style={[mvStyles.dayGroup, { borderBottomColor: borderC }]}>
            {ACADEMIC_YEARS.map(({ year }, yIdx) => {
              const accent  = getYearAccent(year, isDark);
              const dayData = grids[year]?.[day] || {};
              const isLast  = yIdx === ACADEMIC_YEARS.length - 1;

              return (
                <View key={year} style={[
                  mvStyles.gridRow,
                  { borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.04)' : colors.border) },
                ]}>
                  <View style={[mvStyles.dayLabelCell, { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: borderC }]}>
                    {yIdx === 0 && (
                      <Text style={[mvStyles.dayName, { color: colors.textPrim }]}>{day.slice(0,3).toUpperCase()}</Text>
                    )}
                    <View style={[mvStyles.yearTag, { backgroundColor: accent.bg, borderColor: accent.border }]}>
                      <Text style={[mvStyles.yearTagText, { color: accent.text }]}>Y{year}</Text>
                    </View>
                  </View>
                  {timeSlots.map(slot => {
                    if (slot.isBreak) {
                      return (
                        <View key={slot.id} style={[mvStyles.cellWrapper, { width: BRK_W, borderRightColor: borderC, backgroundColor: breakBg }]}>
                          {yIdx === 0 && <Text style={[mvStyles.breakText, { color: mutedC }]}>{slot.sub}</Text>}
                        </View>
                      );
                    }
                    const cell = dayData[slot.id];
                    const pal  = cell ? getCardPalette(cell.color, isDark) : null;
                    return (
                      <View key={slot.id} style={[mvStyles.cellWrapper, { width: CELL_W, borderRightColor: borderC }]}>
                        {cell ? (
                          <View style={[mvStyles.miniCard, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                            <Text style={[mvStyles.miniSubject, { color: pal.text }]} numberOfLines={2}>{cell.subject}</Text>
                            <Text style={[mvStyles.miniTeacher, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textSec }]} numberOfLines={1}>{cell.teacher}</Text>
                            {cell.room ? <Text style={[mvStyles.miniRoom, { color: pal.text }]} numberOfLines={1}>{cell.room}</Text> : null}
                          </View>
                        ) : (
                          <View style={[mvStyles.emptyMiniCell, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                            <Text style={{ color: mutedC, fontSize: 12 }}>—</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderMobileDay = () => {
    const day = visibleDays[selectedDay] || visibleDays[0];
    return (
      <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
        {timeSlots.map(slot => {
          if (slot.isBreak) {
            return (
              <View key={slot.id} style={[mvStyles.mobileBreakRow, { borderColor: borderC }]}>
                <View style={[mvStyles.breakLine2, { backgroundColor: borderC }]} />
                <Text style={[mvStyles.breakLabel2, { color: mutedC }]}>{slot.sub}  •  {slot.label}</Text>
                <View style={[mvStyles.breakLine2, { backgroundColor: borderC }]} />
              </View>
            );
          }
          return (
            <View key={slot.id} style={[mvStyles.mobileSlotBlock, { borderColor: borderC, backgroundColor: isDark ? '#0b1437' : colors.surface }]}>
              <View style={[mvStyles.mobileSlotHeader, { borderBottomColor: borderC }]}>
                <Text style={[mvStyles.mobileSlotSub,  { color: mutedC }]}>{slot.sub}</Text>
                <Text style={[mvStyles.mobileSlotTime, { color: colors.textPrim }]}>{slot.label}</Text>
              </View>
              {ACADEMIC_YEARS.map(({ year }) => {
                const accent = getYearAccent(year, isDark);
                const cell   = grids[year]?.[day]?.[slot.id];
                const pal    = cell ? getCardPalette(cell.color, isDark) : null;
                const sel    = yearSelections[year] || {};
                return (
                  <View key={year} style={[mvStyles.mobileYearRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]}>
                    <View style={[mvStyles.mobileYearTag, { backgroundColor: accent.bg, borderColor: accent.border }]}>
                      <Text style={[mvStyles.mobileYearTagText, { color: accent.text }]}>Y{year}</Text>
                    </View>
                    {cell ? (
                      <View style={[mvStyles.mobileCard, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                        <Text style={[mvStyles.mobileCardSubject, { color: pal.text }]}>{cell.subject}</Text>
                        <Text style={[mvStyles.mobileCardTeacher, { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSec }]}>{cell.teacher}</Text>
                        {cell.room ? <Text style={[mvStyles.mobileCardRoom, { color: pal.text }]}>{cell.room}</Text> : null}
                      </View>
                    ) : (
                      <View style={[mvStyles.mobileEmptyCell, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
                        <Text style={{ color: mutedC, fontSize: 11 }}>No class — {sel.division}/{sel.batch}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  if (metaLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: screenBg }}>
        <ActivityIndicator size="large" color={isDark ? '#5b9cf6' : '#2563eb'} />
        <Text style={{ color: mutedC, marginTop: 12, fontSize: 13 }}>Loading all timetables…</Text>
      </View>
    );
  }

  // ── CHANGE 3 applied here too for overview mode ──
  if (!hasSlots) {
    return (
      <View style={{ flex: 1, backgroundColor: screenBg }}>
        <NoTimetableModelBanner isDark={isDark} colors={colors} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={[mvStyles.selectorBlock, { backgroundColor: screenBg, borderBottomColor: borderC }]}>
          <Text style={[mvStyles.selectorTitle, { color: mutedC }]}>DIVISION & BATCH PER YEAR</Text>
          {ACADEMIC_YEARS.map(y => renderYearSelector(y))}
        </View>

        {!IS_TABLET && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderC }}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {visibleDays.map((day, idx) => {
              const active = idx === selectedDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={[mvStyles.dayPill, { backgroundColor: active ? '#2563eb' : pillBg, borderColor: active ? '#2563eb' : pillBorder }]}
                  onPress={() => setSelectedDay(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[mvStyles.dayPillText, { color: active ? '#fff' : pillInactiveT }]}>{DAY_SHORT[DAYS.indexOf(day)] || day.slice(0,3)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={[mvStyles.legend, { borderBottomColor: borderC }]}>
          {ACADEMIC_YEARS.map(({ year, label }) => {
            const accent = getYearAccent(year, isDark);
            return (
              <View key={year} style={mvStyles.legendItem}>
                <View style={[mvStyles.legendDot, { backgroundColor: accent.border }]} />
                <Text style={[mvStyles.legendText, { color: mutedC }]}>Y{year} – {label.split('(')[0].trim()}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ paddingBottom: 32 }}>
          {IS_TABLET ? renderMasterGrid() : renderMobileDay()}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function TimeTableManagement() {
  const { isDark, colors } = useContext(ThemeContext);

  const [viewMode,         setViewMode]         = useState('manage');
  const [selectedYearObj,  setSelectedYearObj]  = useState(ACADEMIC_YEARS[0]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedBatch,    setSelectedBatch]    = useState('');
  const [selectedDay,      setSelectedDay]      = useState(0);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Only custom template now
  const selectedTemplate = CUSTOM_TEMPLATE_KEY;

  const [customConfig, setCustomConfig] = useState(DEFAULT_CUSTOM_CONFIG);
  const [draftCustomConfig, setDraftCustomConfig] = useState(DEFAULT_CUSTOM_CONFIG);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  const [allDivisions, setAllDivisions] = useState([]);
  const [batchMap,     setBatchMap]     = useState({});
  const [metaLoading,  setMetaLoading]  = useState(true);
  const [currentGrid,  setCurrentGrid]  = useState({});
  const [gridLoading,  setGridLoading]  = useState(false);
  const [pdfGenerating,setPdfGenerating]= useState(false);

  const isTemplateConfigValid = useCallback((config) => {
    const hasWorkingDays = (config?.workingDays || []).length > 0;
    const slots = config?.slots || [];
    if (!hasWorkingDays || slots.length === 0) return false;
    return slots.every((slot) => validateHHMM(slot.startTime || '') && validateHHMM(slot.endTime || ''));
  }, []);

  // ── Resolve active config ─────────────────────────────────────────────────
  const activeConfig    = customConfig;
  const activeTimeSlots = buildSlotsFromConfig(activeConfig);
  const visibleDays     = activeConfig.workingDays?.length ? orderDays(activeConfig.workingDays) : DAYS;

  // ── CHANGE 3: derive whether slots are configured ─────────────────────────
  const hasSlots = (activeConfig.slots || []).length > 0;

  // ── Persist preferences ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TEMPLATE_PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.customConfig) {
          const savedConfig = { ...DEFAULT_CUSTOM_CONFIG, ...parsed.customConfig };
          setCustomConfig(savedConfig);
          setDraftCustomConfig(savedConfig);
        }
        setTemplateSaved(
          typeof parsed?.templateSaved === 'boolean'
            ? parsed.templateSaved
            : Boolean(parsed?.customConfig?.slots?.length)
        );
      } catch (e) {
        console.warn('Template prefs load failed:', e?.message);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      TEMPLATE_PREFS_KEY,
      JSON.stringify({ customConfig, templateSaved })
    ).catch(e => console.warn('Template prefs save failed:', e?.message));
  }, [customConfig, templateSaved]);

  useEffect(() => {
    if (selectedDay >= visibleDays.length) setSelectedDay(0);
  }, [visibleDays, selectedDay]);

  // ── Load meta ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const { data } = await axiosInstance.get('/timetable/meta');
        if (data.success) {
          const { yearDivisionData } = data.data;
          const divSet = new Set();
          const bMap   = {};
          yearDivisionData.forEach(({ year, division }) => {
            if (year !== selectedYearObj.year) return;
            divSet.add(division);
            if (!bMap[division]) bMap[division] = generateBatches(division);
          });
          const divArray = [...divSet].sort();
          setAllDivisions(divArray);
          setBatchMap(bMap);
          if (divArray.length > 0) {
            setSelectedDivision(divArray[0]);
            const firstBatches = bMap[divArray[0]] || [];
            setSelectedBatch(firstBatches[0] || '');
          }
        }
      } catch (err) {
        console.error('meta fetch error', err);
      } finally {
        setMetaLoading(false);
      }
    })();
  }, [selectedYearObj]);

  // ── Load timetable grid ───────────────────────────────────────────────────
  const fetchGrid = useCallback(async (year, division, batch) => {
    if (!year || !division || !batch) return;
    try {
      setGridLoading(true);
      const { data } = await axiosInstance.get('/timetable', {
        params: { year, division, batch },
      });
      if (data.success && data.data) {
        setCurrentGrid(normaliseGrid(data.data, activeConfig));
      } else {
        setCurrentGrid({});
      }
    } catch (err) {
      console.error('grid fetch error', err);
      setCurrentGrid({});
    } finally {
      setGridLoading(false);
    }
  }, [activeConfig]);

  useEffect(() => {
    fetchGrid(selectedYearObj.year, selectedDivision, selectedBatch);
  }, [selectedYearObj, selectedDivision, selectedBatch, fetchGrid]);

  const handleDivisionChange = (div) => {
    setSelectedDivision(div);
    const batches = batchMap[div] || [];
    setSelectedBatch(batches[0] || '');
  };

  const handleCreateTemplate = () => {
    if (!isTemplateConfigValid(draftCustomConfig)) {
      Alert.alert('Incomplete Template', 'Add working days and valid HH:MM timings for all slots before creating the template.');
      return;
    }
    setCustomConfig(draftCustomConfig);
    setTemplateSaved(true);
    setIsEditingTemplate(false);
    Alert.alert('Template Created', 'Template has been saved successfully.');
  };

  const handleStartEditTemplate = () => {
    setDraftCustomConfig(customConfig);
    setIsEditingTemplate(true);
  };

  const handleSaveTemplateChanges = () => {
    if (!isTemplateConfigValid(draftCustomConfig)) {
      Alert.alert('Incomplete Template', 'Please keep valid HH:MM timings for all slots before saving.');
      return;
    }
    setCustomConfig(draftCustomConfig);
    setIsEditingTemplate(false);
    Alert.alert('Template Updated', 'Your timetable template changes are saved.');
  };

  const handleCancelTemplateEdit = () => {
    setDraftCustomConfig(customConfig);
    setIsEditingTemplate(false);
  };

  const handleDeleteTemplate = () => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this timetable template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCustomConfig(DEFAULT_CUSTOM_CONFIG);
            setDraftCustomConfig(DEFAULT_CUSTOM_CONFIG);
            setTemplateSaved(false);
            setIsEditingTemplate(false);
            setCurrentGrid({});
          },
        },
      ]
    );
  };

  // ── Generate PDF ──────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!selectedDivision || !selectedBatch) {
      Alert.alert('Selection Required', 'Please select a division and batch first.');
      return;
    }
    setPdfGenerating(true);
    try {
      const filename = `timetable_year${selectedYearObj.year}_${selectedDivision}_${selectedBatch}.pdf`;
      if (Platform.OS === 'web') {
        const response = await axiosInstance.post(
          '/timetable/generate-pdf',
          { year: selectedYearObj.year, division: selectedDivision, batch: selectedBatch, academicYear: '2024-25' },
          { responseType: 'blob' }
        );
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'Timetable PDF downloaded!');
      } else {
        const baseURL = axiosInstance.defaults.baseURL || '';
        const params  = new URLSearchParams({
          year: selectedYearObj.year, division: selectedDivision,
          batch: selectedBatch, academicYear: '2024-25',
        }).toString();
        const pdfUrl = `${baseURL}/timetable/generate-pdf-get?${params}`;
        const { Linking } = require('react-native');
        const supported = await Linking.canOpenURL(pdfUrl);
        if (supported) await Linking.openURL(pdfUrl);
        else Alert.alert('Error', 'Cannot open PDF URL on this device.');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      Alert.alert('Error', 'Failed to generate PDF.\n\n' + (err.response?.data?.message || err.message));
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const screenBg               = isDark ? '#0d1b3e' : colors.bg;
  const headerBorder           = isDark ? 'rgba(255,255,255,0.06)'  : colors.border;
  const headerSubColor         = isDark ? 'rgba(255,255,255,0.4)'   : colors.textMuted;
  const btnOutlineBorder       = isDark ? 'rgba(255,255,255,0.2)'   : colors.border;
  const dropdownBg             = isDark ? '#131f45'                  : colors.surface;
  const dropdownBorder         = isDark ? 'rgba(255,255,255,0.12)'  : colors.border;
  const dropdownMenuItemBorder = isDark ? 'rgba(255,255,255,0.06)'  : colors.border;
  const filterLabelColor       = isDark ? 'rgba(255,255,255,0.35)'  : colors.textMuted;
  const divTabsBg              = isDark ? '#0b1437'                  : colors.surfaceAlt;
  const divTabsBorder          = isDark ? 'rgba(255,255,255,0.1)'   : colors.border;
  const divTabInactiveText     = isDark ? 'rgba(255,255,255,0.45)'  : colors.textSec;
  const pillBg                 = isDark ? '#131f45'                  : colors.surface;
  const pillBorder             = isDark ? 'rgba(255,255,255,0.1)'   : colors.border;
  const pillInactiveText       = isDark ? 'rgba(255,255,255,0.4)'   : colors.textMuted;
  const breadcrumbBg           = isDark ? 'rgba(255,255,255,0.05)'  : colors.surfaceAlt;
  const breadcrumbText         = isDark ? 'rgba(255,255,255,0.4)'   : colors.textMuted;
  const gridHeaderBg           = isDark ? '#0b1437'                  : colors.surface;
  const gridHeaderBorder       = isDark ? 'rgba(255,255,255,0.08)'  : colors.border;
  const gridRowBorder          = isDark ? 'rgba(255,255,255,0.05)'  : colors.border;
  const dayCellBg              = isDark ? '#0b1741'                  : colors.surfaceAlt;
  const dayCellBorder          = isDark ? 'rgba(255,255,255,0.05)'  : colors.border;
  const gridHeaderText         = isDark ? 'rgba(255,255,255,0.3)'   : colors.textMuted;
  const timeSubColor           = isDark ? 'rgba(255,255,255,0.3)'   : colors.textMuted;
  const cellBorder             = isDark ? 'rgba(255,255,255,0.04)'  : colors.border;
  const breakHeaderBg          = isDark ? 'rgba(255,255,255,0.03)'  : colors.surfaceAlt;
  const extraIconColor         = isDark ? 'rgba(255,255,255,0.2)'   : colors.textMuted;

  const currentBatches = batchMap[selectedDivision] || [];

  const renderModeTabs = () => (
    <View style={[fStyles.modeTabs, { borderBottomColor: headerBorder, backgroundColor: screenBg }]}>
      {[
        { key: 'manage',   icon: '📘', label: 'Template View' },
        { key: 'overview', icon: '🗂', label: 'All Years' },
      ].map(tab => {
        const active = viewMode === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[fStyles.modeTab, active && fStyles.modeTabActive]}
            onPress={() => setViewMode(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[fStyles.modeTabText, { color: active ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted) }, active && { fontWeight: '700' }]}>
              {tab.icon}  {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ── Filters UI ────────────────────────────────────────────────────────────
  const renderFilters = () => (
    <>
      <View style={[fStyles.header, { borderBottomColor: headerBorder }]}>
        <View style={fStyles.headerLeft}>
          <Text style={[fStyles.headerTitle, { color: colors.textPrim }]}>Master Timetable</Text>
          <Text style={[fStyles.headerSub,   { color: headerSubColor  }]}>Read-only timetable view with template controls</Text>
        </View>
        <View style={fStyles.headerActions}>
          <TouchableOpacity
            style={[fStyles.btnOutline, { borderColor: btnOutlineBorder }]}
            onPress={handleGeneratePDF}
            disabled={pdfGenerating || !selectedDivision || !selectedBatch || !hasSlots}
            activeOpacity={0.7}
          >
            {pdfGenerating
              ? <ActivityIndicator size="small" color={colors.textPrim} />
              : <Text style={[fStyles.btnOutlineText, { color: colors.textPrim }]}>⬇ PDF</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {renderModeTabs()}

      {/* Timetable Template Builder — always shown, no preset dropdown */}
      <View style={fStyles.yearRow}>
        <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>TIMETABLE TEMPLATE</Text>
        {(!templateSaved || isEditingTemplate) ? (
          <>
            <CustomTemplateBuilder
              config={draftCustomConfig}
              onChange={setDraftCustomConfig}
              isDark={isDark}
              colors={colors}
            />
            <View style={fStyles.templateActionRow}>
              {templateSaved ? (
                <>
                  <TouchableOpacity
                    style={[fStyles.templateBtnSecondary, { borderColor: btnOutlineBorder }]}
                    onPress={handleCancelTemplateEdit}
                    activeOpacity={0.8}
                  >
                    <Text style={[fStyles.templateBtnSecondaryText, { color: colors.textPrim }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[fStyles.templateBtnPrimary, !isTemplateConfigValid(draftCustomConfig) && fStyles.templateBtnDisabled]}
                    onPress={handleSaveTemplateChanges}
                    disabled={!isTemplateConfigValid(draftCustomConfig)}
                    activeOpacity={0.8}
                  >
                    <Text style={fStyles.templateBtnPrimaryText}>Save Template</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[fStyles.templateBtnPrimary, !isTemplateConfigValid(draftCustomConfig) && fStyles.templateBtnDisabled]}
                  onPress={handleCreateTemplate}
                  disabled={!isTemplateConfigValid(draftCustomConfig)}
                  activeOpacity={0.8}
                >
                  <Text style={fStyles.templateBtnPrimaryText}>Create Template</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={[fStyles.templateSummaryCard, { borderColor: divTabsBorder, backgroundColor: divTabsBg }]}>
            <Text style={[fStyles.templateSummaryTitle, { color: colors.textPrim }]}>Template is active</Text>
            <Text style={[fStyles.templateSummaryText, { color: headerSubColor }]}>
              {(customConfig.workingDays || []).length} working days • {(customConfig.slots || []).length} slots
            </Text>
            <View style={fStyles.templateActionRow}>
              <TouchableOpacity
                style={[fStyles.templateBtnSecondary, { borderColor: btnOutlineBorder }]}
                onPress={handleStartEditTemplate}
                activeOpacity={0.8}
              >
                <Text style={[fStyles.templateBtnSecondaryText, { color: colors.textPrim }]}>Edit Template</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={fStyles.templateBtnDanger}
                onPress={handleDeleteTemplate}
                activeOpacity={0.8}
              >
                <Text style={fStyles.templateBtnDangerText}>Delete Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Division + Batch — only shown when slots exist */}
      {hasSlots && (
        metaLoading ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <ActivityIndicator size="small" color={isDark ? '#5b9cf6' : '#2563eb'} />
          </View>
        ) : (
          <View style={fStyles.divBatchRow}>
            <View style={fStyles.divBatchGroup}>
              <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>DIVISION</Text>
              <View style={[fStyles.divisionTabs, { backgroundColor: divTabsBg, borderColor: divTabsBorder }]}>
                {allDivisions.map((div) => {
                  const isActive = div === selectedDivision;
                  return (
                    <TouchableOpacity
                      key={div}
                      style={[fStyles.divTab, isActive && fStyles.divTabActive]}
                      onPress={() => handleDivisionChange(div)}
                      activeOpacity={0.8}
                    >
                      <Text style={[fStyles.divTabText, { color: isActive ? '#ffffff' : divTabInactiveText }, isActive && { fontWeight: '700' }]}>
                        {IS_TABLET ? `Division ${div}` : div}
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
                      style={[fStyles.batchPill, { backgroundColor: pillBg, borderColor: pillBorder }, isActive && fStyles.batchPillActive]}
                      onPress={() => setSelectedBatch(batch)}
                      activeOpacity={0.8}
                    >
                      {isActive && <View style={fStyles.batchPillDot} />}
                      <Text style={[fStyles.batchPillText, { color: isActive ? colors.textPrim : pillInactiveText }]}>{batch}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )
      )}

      {/* Breadcrumb — only when slots exist */}
      {hasSlots && (
        <View style={fStyles.badgeRow}>
          <View style={fStyles.activeBadge}>
            <View style={fStyles.activeDot} />
            <Text style={fStyles.activeBadgeText}>ACTIVE SEMESTER</Text>
          </View>
          <View style={[fStyles.breadcrumb, { backgroundColor: breadcrumbBg }]}>
            <Text style={[fStyles.breadcrumbText, { color: breadcrumbText }]}>
              Division {selectedDivision}  ›  Batch {selectedBatch}
            </Text>
          </View>
        </View>
      )}
    </>
  );

  const renderGridLoading = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <ActivityIndicator size="large" color={isDark ? '#5b9cf6' : '#2563eb'} />
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>Loading timetable…</Text>
    </View>
  );

  // ── Overview mode ─────────────────────────────────────────────────────────
  if (viewMode === 'overview') {
    return (
      <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={screenBg} />
        <View style={[fStyles.header, { borderBottomColor: headerBorder }]}>
          <View style={fStyles.headerLeft}>
            <Text style={[fStyles.headerTitle, { color: colors.textPrim }]}>Master Timetable</Text>
            <Text style={[fStyles.headerSub,   { color: headerSubColor  }]}>All years — read-only overview</Text>
          </View>
        </View>
        {renderModeTabs()}
        <AllYearsOverview timeSlots={activeTimeSlots} visibleDays={visibleDays} hasSlots={hasSlots} />
      </View>
    );
  }

  // ── MOBILE layout ─────────────────────────────────────────────────────────
  if (!IS_TABLET) {
    const activeDayName = visibleDays[selectedDay] || visibleDays[0];
    const activeDayData = currentGrid[activeDayName] || {};

    return (
      <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={screenBg} />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderFilters()}

          {/* CHANGE 3: Show banner or timetable based on hasSlots */}
          {!hasSlots ? (
            <NoTimetableModelBanner isDark={isDark} colors={colors} />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={mStyles.dayStrip}
                contentContainerStyle={mStyles.dayStripContent}
              >
                {visibleDays.map((day, idx) => {
                  const isActive   = idx === selectedDay;
                  const hasClasses = activeTimeSlots.some(s => !s.isBreak && currentGrid[day]?.[s.id]);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[mStyles.dayPill, { backgroundColor: pillBg, borderColor: pillBorder }, isActive && mStyles.dayPillActive]}
                      onPress={() => setSelectedDay(idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={[mStyles.dayPillText, { color: isActive ? '#ffffff' : pillInactiveText }]}>
                        {DAY_SHORT[DAYS.indexOf(day)] || day.slice(0,3)}
                      </Text>
                      {hasClasses && (
                        <View style={[mStyles.dayDot, {
                          backgroundColor: isActive
                            ? (isDark ? 'rgba(255,255,255,0.8)' : colors.accentBlue)
                            : (isDark ? 'rgba(255,255,255,0.3)' : colors.textMuted),
                        }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={mStyles.dayHeader}>
                <Text style={[mStyles.dayHeaderText, { color: colors.textPrim }]}>{activeDayName}</Text>
                <View style={[mStyles.dayCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt }]}>
                  <Text style={[mStyles.dayCount, { color: isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted }]}>
                    {activeTimeSlots.filter(s => !s.isBreak && activeDayData[s.id]).length} classes
                  </Text>
                </View>
              </View>

              {gridLoading ? renderGridLoading() : (
                <View style={mStyles.lectureList}>
                  {activeTimeSlots.map((slot) => (
                    <MobileLectureRow
                      key={slot.id}
                      slot={slot}
                      data={slot.isBreak ? null : activeDayData[slot.id]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  // ── TABLET layout ─────────────────────────────────────────────────────────
  const CELL_WIDTH  = 148;
  const DAY_COL     = 90;
  const BREAK_WIDTH = 54;

  return (
    <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={screenBg} />
      {renderFilters()}

      {/* CHANGE 3: Show banner or timetable based on hasSlots */}
      {!hasSlots ? (
        <NoTimetableModelBanner isDark={isDark} colors={colors} />
      ) : gridLoading ? renderGridLoading() : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tStyles.hScroll}>
            <View>
              <View style={[tStyles.gridRow, { backgroundColor: gridHeaderBg, borderBottomColor: gridHeaderBorder, borderBottomWidth: 1 }]}>
                <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: gridHeaderBg, borderRightColor: dayCellBorder }]}>
                  <Text style={[tStyles.gridHeaderText, { color: gridHeaderText }]}>DAY / TIME</Text>
                </View>
                {activeTimeSlots.map((slot) => (
                  <View
                    key={slot.id}
                    style={[tStyles.timeHeaderCell, { width: slot.isBreak ? BREAK_WIDTH : CELL_WIDTH, borderRightColor: dayCellBorder }, slot.isBreak && { backgroundColor: breakHeaderBg }]}
                  >
                    <Text style={[tStyles.timeLabel, { color: colors.textPrim }]}>{slot.label}</Text>
                    {!slot.isBreak && <Text style={[tStyles.timeSub, { color: timeSubColor }]}>{slot.sub}</Text>}
                  </View>
                ))}
              </View>

              {visibleDays.map((day) => {
                const dayData = currentGrid[day] || {};
                return (
                  <View key={day} style={[tStyles.gridRow, { borderBottomColor: gridRowBorder }]}>
                    <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: dayCellBorder }]}>
                      <Text style={[tStyles.dayLabel, { color: colors.textPrim }]}>{day}</Text>
                    </View>
                    {activeTimeSlots.map((slot) => {
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
                          {cellData ? <SubjectCard data={cellData} /> : <AssignCell />}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              <View style={[tStyles.gridRow, { borderBottomWidth: 0 }]}>
                <View style={[tStyles.dayCell, { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: dayCellBorder }]} />
                {activeTimeSlots.map((slot) => (
                  <View key={slot.id} style={[tStyles.cellWrapper, { width: slot.isBreak ? BREAK_WIDTH : CELL_WIDTH, borderRightColor: cellBorder }]}>
                    {!slot.isBreak && slot.id === activeTimeSlots.filter(s => !s.isBreak).at(-1)?.id && (
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
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const baseStyles = StyleSheet.create({
  screen: { flex: 1 },
});

const mStyles = StyleSheet.create({
  dayStrip:         { paddingVertical: 4 },
  dayStripContent:  { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  dayPill:          { alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 52 },
  dayPillActive:    { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayPillText:      { fontSize: 12, fontWeight: '700' },
  dayDot:           { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  dayHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dayHeaderText:    { fontSize: 18, fontWeight: '700' },
  dayCountBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dayCount:         { fontSize: 12, fontWeight: '600' },
  lectureList:      { paddingHorizontal: 16, gap: 6 },
  lectureRow:       { flexDirection: 'row', alignItems: 'stretch', gap: 12, minHeight: 80 },
  timeCol:          { width: 72, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4, paddingVertical: 4, flexShrink: 0 },
  timeSub:          { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 3 },
  timeLabel:        { fontSize: 10.5, fontWeight: '600', textAlign: 'right', lineHeight: 15 },
  card:             { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  cardTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardSubject:      { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  cardTeacher:      { fontSize: 11, lineHeight: 15 },
  roomBadge:        { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  roomText:         { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  emptyCard:        { flex: 1, borderWidth: 1, borderRadius: 14, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: 0.6 },
  emptyIcon:        { fontSize: 16 },
  emptyLabel:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  breakRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 84 },
  breakLine:        { flex: 1, height: 1 },
  breakLabel:       { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
});

const fStyles = StyleSheet.create({
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : 14, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft:           { flex: 1, marginRight: 10 },
  headerTitle:          { fontSize: IS_TABLET ? 18 : 16, fontWeight: '700' },
  headerSub:            { fontSize: 11, marginTop: 2 },
  headerActions:        { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  btnOutline:           { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  btnOutlineText:       { fontSize: 12, fontWeight: '600' },
  modeTabs:             { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  modeTab:              { paddingVertical: 10, paddingHorizontal: 12 },
  modeTabActive:        { borderBottomWidth: 2, borderBottomColor: '#2563eb', marginBottom: -1 },
  modeTabText:          { fontSize: 13 },
  yearRow:              { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  templateSummaryCard:  { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  templateSummaryTitle: { fontSize: 13, fontWeight: '700' },
  templateSummaryText:  { fontSize: 11, marginTop: 4 },
  templateActionRow:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  templateBtnPrimary:   { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  templateBtnPrimaryText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  templateBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  templateBtnSecondaryText: { fontSize: 12, fontWeight: '700' },
  templateBtnDanger:    { flex: 1, backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  templateBtnDangerText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  templateBtnDisabled:  { opacity: 0.5 },
  filterLabel:          { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.9, marginBottom: 5 },
  divBatchRow:          { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 16, flexWrap: 'wrap' },
  divBatchGroup:        { flex: 1 },
  divisionTabs:         { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', alignSelf: 'flex-start' },
  divTab:               { paddingHorizontal: 12, paddingVertical: 9 },
  divTabActive:         { backgroundColor: '#2563eb' },
  divTabText:           { fontSize: 12, fontWeight: '500' },
  batchPills:           { flexDirection: 'row', gap: 6 },
  batchPill:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, gap: 5 },
  batchPillActive:      { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: '#2563eb' },
  batchPillDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  batchPillText:        { fontSize: 12, fontWeight: '600' },
  badgeRow:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  activeBadge:          { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeDot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
  activeBadgeText:      { color: '#22c55e', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  breadcrumb:           { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  breadcrumbText:       { fontSize: 10, fontWeight: '600' },
});

const mvStyles = StyleSheet.create({
  selectorBlock:    { borderBottomWidth: 1, paddingBottom: 6 },
  selectorTitle:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  yearSelectorRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 6, overflow: 'hidden' },
  yearBadge:        { borderRightWidth: 1, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  yearBadgeNum:     { fontSize: 13, fontWeight: '800' },
  yearBadgeName:    { fontSize: 8, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  selPill:          { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  selPillText:      { fontSize: 11, fontWeight: '600' },
  selDivider:       { width: 1, height: 18, marginHorizontal: 4 },
  legend:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 8, gap: 10, borderBottomWidth: 1 },
  legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:        { width: 8, height: 8, borderRadius: 4 },
  legendText:       { fontSize: 10, fontWeight: '500' },
  gridRow:          { flexDirection: 'row', borderBottomWidth: 1 },
  dayGroup:         { borderBottomWidth: 2 },
  dayLabelCell:     { justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRightWidth: 1, gap: 4 },
  dayName:          { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  yearTag:          { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  yearTagText:      { fontSize: 9, fontWeight: '800' },
  timeHeaderCell:   { paddingVertical: 10, paddingHorizontal: 6, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeHeaderLabel:  { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  timeHeaderSub:    { fontSize: 8, fontWeight: '600', marginTop: 2, letterSpacing: 0.4 },
  colHeaderText:    { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  cellWrapper:      { padding: 4, borderRightWidth: 1, minHeight: 72, justifyContent: 'center' },
  miniCard:         { borderWidth: 1, borderRadius: 8, padding: 7, flex: 1 },
  miniSubject:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.2, marginBottom: 3, lineHeight: 13 },
  miniTeacher:      { fontSize: 8.5, lineHeight: 12 },
  miniRoom:         { fontSize: 8, fontWeight: '600', marginTop: 4 },
  emptyMiniCell:    { flex: 1, borderWidth: 1, borderRadius: 8, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', opacity: 0.35 },
  breakText:        { fontSize: 7, fontWeight: '700', letterSpacing: 0.6, transform: [{ rotate: '-90deg' }] },
  dayPill:          { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  dayPillText:      { fontSize: 12, fontWeight: '700' },
  mobileBreakRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  breakLine2:       { flex: 1, height: 1 },
  breakLabel2:      { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 },
  mobileSlotBlock:  { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  mobileSlotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  mobileSlotSub:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  mobileSlotTime:   { fontSize: 11, fontWeight: '600' },
  mobileYearRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1 },
  mobileYearTag:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, minWidth: 30, alignItems: 'center' },
  mobileYearTagText:{ fontSize: 10, fontWeight: '800' },
  mobileCard:       { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  mobileCardSubject:{ fontSize: 11, fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
  mobileCardTeacher:{ fontSize: 10, lineHeight: 14 },
  mobileCardRoom:   { fontSize: 9, fontWeight: '600', marginTop: 4 },
  mobileEmptyCell:  { flex: 1, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', paddingVertical: 8, paddingHorizontal: 10, opacity: 0.5 },
});

const tStyles = StyleSheet.create({
  hScroll:        { flexGrow: 1, justifyContent: 'center', alignItems: 'flex-start' },
  gridRow:        { flexDirection: 'row', borderBottomWidth: 1 },
  dayCell:        { justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRightWidth: 1 },
  dayLabel:       { fontSize: 12, fontWeight: '600' },
  gridHeaderText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  timeHeaderCell: { paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeLabel:      { fontSize: 10.5, fontWeight: '600', textAlign: 'center' },
  timeSub:        { fontSize: 9, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  cellWrapper:    { padding: 5, borderRightWidth: 1, minHeight: 100, justifyContent: 'center' },
  card:           { flex: 1, borderWidth: 1, borderRadius: 10, padding: 9, justifyContent: 'space-between', minHeight: 88 },
  cardSubject:    { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, lineHeight: 14, marginBottom: 4 },
  cardTeacher:    { fontSize: 9.5, lineHeight: 13, flex: 1 },
  cardRoom:       { fontSize: 9.5, fontWeight: '600', marginTop: 5 },
  assignCell:     { flex: 1, minHeight: 88, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  assignPlus:     { fontSize: 20 },
  assignLabel:    { fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  breakCell:      { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  breakCellText:  { fontSize: 8, fontWeight: '700', letterSpacing: 0.6, transform: [{ rotate: '-90deg' }] },
  extraBadge:     { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  extraIcon:      { fontSize: 16 },
  extraText:      { fontSize: 8, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});