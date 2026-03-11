import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, Dimensions, Modal, ActivityIndicator,
  KeyboardAvoidingView, TouchableWithoutFeedback, TextInput, Alert,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACADEMIC_YEARS = [
  { label: '1st Year (B.Tech - CS)', year: '1' },
  { label: '2nd Year (B.Tech - CS)', year: '2' },
  { label: '3rd Year (B.Tech - CS)', year: '3' },
  { label: '4th Year (B.Tech - CS)', year: '4' },
];

const TIME_SLOTS = [
  { id: 't1',    label: '10:30 – 11:30', sub: 'LECTURE 1' },
  { id: 't2',    label: '11:30 – 12:30', sub: 'LECTURE 2' },
  { id: 'lunch', label: '12:30',          sub: 'LUNCH',    isBreak: true },
  { id: 't3',    label: '1:15 – 2:15',   sub: 'LECTURE 3' },
  { id: 't4',    label: '2:15 – 3:15',   sub: 'LECTURE 4' },
  { id: 'break', label: '3:15',           sub: 'BREAK',    isBreak: true },
  { id: 't5',    label: '3:30 – 4:30',   sub: 'LECTURE 5' },
  { id: 't6',    label: '4:30 – 5:30',   sub: 'LECTURE 6' },
];

const DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLOR_KEYS = ['teal', 'blue', 'purple', 'orange', 'green', 'pink'];

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

// ─── Normalise DB timetable → local grid shape ─────────────────────────────────

function normaliseGrid(dbDoc) {
  if (!dbDoc) return {};
  const grid = {};
  DAYS.forEach((day) => {
    if (!dbDoc[day]) return;
    grid[day] = {};
    ['t1', 't2', 't3', 't4', 't5', 't6'].forEach((slot) => {
      const s = dbDoc[day][slot];
      if (s && s.subject) {
        grid[day][slot] = {
          subject:   s.subject,
          teacher:   s.teacherName || '',
          room:      s.room || null,
          color:     s.color || 'teal',
          teacherId: s.teacherId || null,
        };
      }
    });
  });
  return grid;
}

// ─── Helper: generate batch names from division letter ────────────────────────

function generateBatches(division, count = 3) {
  return Array.from({ length: count }, (_, i) => `${division}${i + 1}`);
}

// ─── Inline Dropdown ──────────────────────────────────────────────────────────

function InlineDropdown({ label, value, options, onSelect, isDark, colors, placeholder }) {
  const [open, setOpen] = useState(false);
  const bg     = isDark ? '#131f45' : colors.surfaceAlt;
  const border = isDark ? 'rgba(255,255,255,0.1)' : colors.border;
  const menuBg = isDark ? '#0f1d44' : colors.surface;

  const selected = options.find(o => !o.isHeader && o.value === value);

  return (
    <View style={{ marginBottom: 14, zIndex: 50 }}>
      <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TouchableOpacity
        style={[
          mStyles.input,
          { backgroundColor: bg, borderColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        ]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={{ color: selected ? colors.textPrim : colors.textMuted, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : (placeholder || 'Select…')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 8 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={[mStyles.inlineMenu, { backgroundColor: menuBg, borderColor: border }]}>
          {options.map((opt, idx) => {
            if (opt.isHeader) {
              return (
                <View
                  key={`header-${idx}`}
                  style={[
                    mStyles.inlineMenuHeader,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surfaceAlt,
                      borderBottomColor: border,
                    },
                  ]}
                >
                  <Text style={[mStyles.inlineMenuHeaderText, { color: isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted }]}>
                    {opt.label}
                  </Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  mStyles.inlineMenuItem,
                  { borderBottomColor: border },
                  opt.value === value && { backgroundColor: 'rgba(37,99,235,0.15)' },
                ]}
                onPress={() => { onSelect(opt); setOpen(false); }}
              >
                <Text style={{ color: opt.value === value ? colors.textPrim : colors.textSec, fontSize: 13 }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Assign / Edit Modal ───────────────────────────────────────────────────────

function SlotModal({ visible, slotInfo, teachers, subjects, labs, allSubjects, onSave, onDelete, onClose }) {
  const { isDark, colors } = useContext(ThemeContext);
  const isEditing = !!slotInfo?.existing;

  const [selectedTeacherId,   setSelectedTeacherId]   = useState(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [selectedSubject,     setSelectedSubject]     = useState('');
  const [room,                setRoom]                = useState('');
  const [color,               setColor]               = useState('teal');
  const [saving,              setSaving]              = useState(false);

  // ── Pre-fill when editing an existing slot ────────────────────────────────
  useEffect(() => {
    if (visible && slotInfo) {
      const e = slotInfo.existing;
      setSelectedTeacherId(e?.teacherId   || null);
      setSelectedTeacherName(e?.teacher   || '');
      setSelectedSubject(e?.subject       || '');
      setRoom(e?.room                     || '');
      setColor(e?.color                   || 'teal');
    }
  }, [visible, slotInfo]);

  const canSave = selectedTeacherId && selectedSubject;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({
      teacherId:   selectedTeacherId,
      teacherName: selectedTeacherName,
      subject:     selectedSubject.trim().toUpperCase(),
      room:        room.trim() || null,
      color,
      // ── Pass isLab flag so backend can sync Teacher correctly ──────────
      isLab:       labs.includes(selectedSubject),
    });
    setSaving(false);
  };

  if (!slotInfo) return null;

  const slotLabel      = TIME_SLOTS.find(s => s.id === slotInfo.slotId)?.label || '';
  const previewPalette = getCardPalette(color, isDark);

  const teacherOptions = teachers.map(t => ({ label: t.name, value: t._id, name: t.name }));

  // Grouped subject list: theory first, then labs section
  const subjectOptions = [
    ...subjects.map(s => ({ label: s, value: s, isHeader: false })),
    ...(labs.length > 0
      ? [
          { label: '── LABS ──', value: '__lab_header__', isHeader: true },
          ...labs.map(l => ({ label: l, value: l, isHeader: false })),
        ]
      : []),
  ];

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
            borderTopColor:  isDark ? 'rgba(255,255,255,0.08)' : colors.border,
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Teacher */}
            <InlineDropdown
              label="Faculty / Teacher *"
              value={selectedTeacherId}
              options={teacherOptions}
              placeholder="Select a teacher…"
              isDark={isDark}
              colors={colors}
              onSelect={(opt) => {
                setSelectedTeacherId(opt.value);
                setSelectedTeacherName(opt.name);
              }}
            />

            {/* Subject / Lab */}
            <InlineDropdown
              label="Subject *"
              value={selectedSubject}
              options={subjectOptions}
              placeholder="Select a subject…"
              isDark={isDark}
              colors={colors}
              onSelect={(opt) => setSelectedSubject(opt.value)}
            />

            {/* Room */}
            <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Room / Venue</Text>
            <TextInput
              value={room}
              onChangeText={setRoom}
              placeholder="e.g. Room 402 or Lab 01"
              placeholderTextColor={colors.textMuted}
              style={[mStyles.input, {
                backgroundColor: isDark ? '#131f45' : colors.surfaceAlt,
                borderColor:     isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                color:           colors.textPrim,
              }]}
            />

            {/* Card colour */}
            <Text style={[mStyles.fieldLabel, { color: colors.textMuted }]}>Card Colour</Text>
            <View style={mStyles.colorRow}>
              {COLOR_KEYS.map((ck) => {
                const p = getCardPalette(ck, isDark);
                return (
                  <TouchableOpacity
                    key={ck}
                    onPress={() => setColor(ck)}
                    style={[mStyles.colorDot, { backgroundColor: p.border }, color === ck && mStyles.colorDotActive]}
                  >
                    {color === ck && <Text style={mStyles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live preview card */}
            {selectedSubject ? (
              <View style={[mStyles.preview, { backgroundColor: previewPalette.bg, borderColor: previewPalette.border }]}>
                <Text style={[mStyles.previewSubject, { color: previewPalette.text }]}>
                  {selectedSubject.toUpperCase()}
                </Text>
                {selectedTeacherName ? (
                  <Text style={[mStyles.previewTeacher, { color: colors.textSec }]}>{selectedTeacherName}</Text>
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
                style={[mStyles.saveBtn, (!canSave || saving) && mStyles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={mStyles.saveText}>{isEditing ? 'Save Changes' : 'Assign'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
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
        <View style={[mStyles.emptyCard, { borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}>
          <Text style={[mStyles.emptyIcon,  { color: isDark ? 'rgba(255,255,255,0.3)'  : colors.textMuted }]}>＋</Text>
          <Text style={[mStyles.emptyLabel, { color: isDark ? 'rgba(255,255,255,0.25)' : colors.textMuted }]}>
            TAP TO ASSIGN
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Tablet sub-components ────────────────────────────────────────────────────

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
      <Text style={[tStyles.assignPlus,  { color: isDark ? 'rgba(255,255,255,0.2)'  : colors.textMuted }]}>＋</Text>
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

// ─── YEAR accent colours (one per year) ───────────────────────────────────────

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

// ─── All-Years Master Timetable ────────────────────────────────────────────────
//
//  Layout:
//    Rows    → Day groups. Each day has 4 sub-rows (one per year).
//    Columns → Time slots (same as existing timetable).
//
//  Each cell shows the subject/teacher for that [Year × Day × Slot].
//  Division and batch are picked per-year from top-of-screen selectors.

function AllYearsOverview() {
  const { isDark, colors } = useContext(ThemeContext);

  // Per-year selected div/batch
  const [yearSelections, setYearSelections] = useState(
    Object.fromEntries(ACADEMIC_YEARS.map(y => [y.year, { division: '', batch: '' }]))
  );
  // Per-year fetched grid  { '1': { Monday: { t1: {...} } }, '2': … }
  const [grids,       setGrids]       = useState({});
  // Meta: { division, batchMap } per year
  const [yearMeta,    setYearMeta]    = useState({});
  const [metaLoading, setMetaLoading] = useState(true);
  const [loadingYears, setLoadingYears] = useState(new Set());

  // Selected day (mobile only)
  const [selectedDay, setSelectedDay] = useState(0);

  // ── Theme shortcuts ────────────────────────────────────────────────────────
  const screenBg    = isDark ? '#0d1b3e'                : colors.bg;
  const borderC     = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
  const mutedC      = isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted;
  const headerBg    = isDark ? '#0b1437'                : colors.surface;
  const dayCellBg   = isDark ? '#0b1741'                : colors.surfaceAlt;
  const breakBg     = isDark ? 'rgba(255,255,255,0.02)' : colors.surfaceAlt;
  const pillBg      = isDark ? '#131f45'                : colors.surface;
  const pillBorder  = isDark ? 'rgba(255,255,255,0.1)'  : colors.border;
  const pillInactiveT = isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted;

  // ── Fetch meta once ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const { data } = await axiosInstance.get('/timetable/meta');
        if (!data.success) return;
        const meta = {};
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

  // ── Fetch grid whenever a year's selection changes ─────────────────────────
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
          [year]: data.success && data.data ? normaliseGrid(data.data) : {},
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

  // ── Per-year selector strip ────────────────────────────────────────────────
  const renderYearSelector = (yearObj) => {
    const { year, label } = yearObj;
    const meta  = yearMeta[year] || { divisions: [], batchMap: {} };
    const sel   = yearSelections[year] || { division: '', batch: '' };
    const accent = getYearAccent(year, isDark);
    const batches = (meta.batchMap[sel.division] || []);
    const isLoading = loadingYears.has(year);

    return (
      <View key={year} style={[mvStyles.yearSelectorRow, { borderColor: borderC, backgroundColor: isDark ? '#0b1437' : colors.surfaceAlt }]}>
        {/* Year badge */}
        <View style={[mvStyles.yearBadge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
          <Text style={[mvStyles.yearBadgeNum, { color: accent.text }]}>Y{year}</Text>
          <Text style={[mvStyles.yearBadgeName, { color: accent.label }]} numberOfLines={1}>{label.split('(')[0].trim()}</Text>
        </View>

        {/* Division pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          contentContainerStyle={{ gap: 5, alignItems: 'center', paddingHorizontal: 8 }}>
          {meta.divisions.map(div => {
            const active = div === sel.division;
            return (
              <TouchableOpacity
                key={div}
                style={[mvStyles.selPill, { backgroundColor: active ? accent.border : pillBg, borderColor: active ? accent.border : pillBorder }]}
                onPress={() => updateSel(year, 'division', div) || updateSel(year, 'batch', (meta.batchMap[div] || [])[0] || '')}
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

  // ── Master grid (tablet) ───────────────────────────────────────────────────
  // Columns: Day-label col | slot cols
  // Rows: for each day → 4 year sub-rows
  const CELL_W  = 140;
  const DAY_COL = 86;
  const BRK_W   = 48;

  const renderMasterGrid = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Time header row */}
        <View style={[mvStyles.gridRow, { backgroundColor: headerBg, borderBottomColor: borderC, borderBottomWidth: 1 }]}>
          <View style={[mvStyles.dayLabelCell, { width: DAY_COL, backgroundColor: headerBg, borderRightColor: borderC }]}>
            <Text style={[mvStyles.colHeaderText, { color: mutedC }]}>DAY / YEAR</Text>
          </View>
          {TIME_SLOTS.map(slot => (
            <View
              key={slot.id}
              style={[
                mvStyles.timeHeaderCell,
                { width: slot.isBreak ? BRK_W : CELL_W, borderRightColor: borderC },
                slot.isBreak && { backgroundColor: breakBg },
              ]}
            >
              <Text style={[mvStyles.timeHeaderLabel, { color: colors.textPrim }]}>{slot.label}</Text>
              {!slot.isBreak && <Text style={[mvStyles.timeHeaderSub, { color: mutedC }]}>{slot.sub}</Text>}
            </View>
          ))}
        </View>

        {/* Day groups */}
        {DAYS.map((day, dayIdx) => (
          <View key={day} style={[mvStyles.dayGroup, { borderBottomColor: borderC }]}>
            {ACADEMIC_YEARS.map(({ year, label }, yIdx) => {
              const accent    = getYearAccent(year, isDark);
              const dayData   = grids[year]?.[day] || {};
              const isFirst   = yIdx === 0;
              const isLast    = yIdx === ACADEMIC_YEARS.length - 1;

              return (
                <View key={year} style={[
                  mvStyles.gridRow,
                  { borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.04)' : colors.border) },
                ]}>
                  {/* Day + year label cell */}
                  <View style={[
                    mvStyles.dayLabelCell,
                    { width: DAY_COL, backgroundColor: dayCellBg, borderRightColor: borderC },
                  ]}>
                    {isFirst && (
                      <Text style={[mvStyles.dayName, { color: colors.textPrim }]}>{day.slice(0, 3).toUpperCase()}</Text>
                    )}
                    <View style={[mvStyles.yearTag, { backgroundColor: accent.bg, borderColor: accent.border }]}>
                      <Text style={[mvStyles.yearTagText, { color: accent.text }]}>Y{year}</Text>
                    </View>
                  </View>

                  {/* Slot cells */}
                  {TIME_SLOTS.map(slot => {
                    if (slot.isBreak) {
                      return (
                        <View key={slot.id} style={[mvStyles.cellWrapper, { width: BRK_W, borderRightColor: borderC, backgroundColor: breakBg }]}>
                          {isFirst && (
                            <Text style={[mvStyles.breakText, { color: mutedC }]}>{slot.sub}</Text>
                          )}
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

  // ── Mobile: one day at a time, all years stacked ───────────────────────────
  const renderMobileDay = () => {
    const day = DAYS[selectedDay];
    return (
      <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
        {TIME_SLOTS.map(slot => {
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
              {/* Slot header */}
              <View style={[mvStyles.mobileSlotHeader, { borderBottomColor: borderC }]}>
                <Text style={[mvStyles.mobileSlotSub,  { color: mutedC }]}>{slot.sub}</Text>
                <Text style={[mvStyles.mobileSlotTime, { color: colors.textPrim }]}>{slot.label}</Text>
              </View>
              {/* Year rows */}
              {ACADEMIC_YEARS.map(({ year }) => {
                const accent  = getYearAccent(year, isDark);
                const cell    = grids[year]?.[day]?.[slot.id];
                const pal     = cell ? getCardPalette(cell.color, isDark) : null;
                const sel     = yearSelections[year] || {};
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

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* ── Sticky year-selector strip ── */}
        <View style={[mvStyles.selectorBlock, { backgroundColor: screenBg, borderBottomColor: borderC }]}>
          <Text style={[mvStyles.selectorTitle, { color: mutedC }]}>DIVISION & BATCH PER YEAR</Text>
          {ACADEMIC_YEARS.map(y => renderYearSelector(y))}
        </View>

        {/* ── Mobile day picker ── */}
        {!IS_TABLET && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderC }}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {DAYS.map((day, idx) => {
              const active = idx === selectedDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={[mvStyles.dayPill, { backgroundColor: active ? '#2563eb' : pillBg, borderColor: active ? '#2563eb' : pillBorder }]}
                  onPress={() => setSelectedDay(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={[mvStyles.dayPillText, { color: active ? '#fff' : pillInactiveT }]}>{DAY_SHORT[idx]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Legend ── */}
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

        {/* ── Grid / list ── */}
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

  // ── View mode: 'manage' | 'overview' ─────────────────────────────────────
  const [viewMode, setViewMode] = useState('manage');

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedYearObj,  setSelectedYearObj]  = useState(ACADEMIC_YEARS[0]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedBatch,    setSelectedBatch]    = useState('');
  const [selectedDay,      setSelectedDay]      = useState(0);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // ── API-sourced meta ──────────────────────────────────────────────────────
  const [allDivisions, setAllDivisions] = useState([]);
  const [batchMap,     setBatchMap]     = useState({});
  const [teachers,     setTeachers]     = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [labs,         setLabs]         = useState([]);
  const [allSubjects,  setAllSubjects]  = useState([]);
  const [metaLoading,  setMetaLoading]  = useState(true);

  // ── Timetable state ───────────────────────────────────────────────────────
  const [currentGrid, setCurrentGrid] = useState({});
  const [gridLoading, setGridLoading] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [slotInfo,     setSlotInfo]     = useState(null);
  const [savedMsg,     setSavedMsg]     = useState(false);

  // ── Load meta ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setMetaLoading(true);
        const { data } = await axiosInstance.get('/timetable/meta');
        if (data.success) {
          const { teachers: tList, yearDivisionData } = data.data;
          setTeachers(tList);

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

  // ── Load subjects + labs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedYearObj.year || !selectedDivision) return;
    (async () => {
      try {
        const { data } = await axiosInstance.get('/timetable/subjects', {
          params: { year: selectedYearObj.year, division: selectedDivision },
        });
        if (data.success) {
          setSubjects(data.data.subjects || []);
          setLabs(data.data.labs         || []);
          setAllSubjects(data.data.all   || []);
        }
      } catch (err) {
        console.error('subjects fetch error', err);
        setSubjects([]);
        setLabs([]);
        setAllSubjects([]);
      }
    })();
  }, [selectedYearObj, selectedDivision]);

  // ── Load timetable grid ───────────────────────────────────────────────────
  const fetchGrid = useCallback(async (year, division, batch) => {
    if (!year || !division || !batch) return;
    try {
      setGridLoading(true);
      const { data } = await axiosInstance.get('/timetable', {
        params: { year, division, batch },
      });
      if (data.success && data.data) {
        setCurrentGrid(normaliseGrid(data.data));
      } else {
        setCurrentGrid({});
      }
    } catch (err) {
      console.error('grid fetch error', err);
      setCurrentGrid({});
    } finally {
      setGridLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrid(selectedYearObj.year, selectedDivision, selectedBatch);
  }, [selectedYearObj, selectedDivision, selectedBatch, fetchGrid]);

  // ── Division change ───────────────────────────────────────────────────────
  const handleDivisionChange = (div) => {
    setSelectedDivision(div);
    const batches = batchMap[div] || [];
    setSelectedBatch(batches[0] || '');
  };

  // ── Open slot modal ───────────────────────────────────────────────────────
  const openSlot = (day, slotId) => {
    const existing = currentGrid[day]?.[slotId] || null;
    setSlotInfo({
      year:     selectedYearObj.year,
      division: selectedDivision,
      batch:    selectedBatch,
      day,
      slotId,
      existing,
    });
    setModalVisible(true);
  };

  // ── Save slot → PUT /timetable/slot ──────────────────────────────────────
  // NOTE: isLab is passed from SlotModal so the backend can correctly sync
  //       the Teacher document (theory vs lab array + sub_divisions for labs).
  const handleSave = async (entry) => {
    try {
      const { data } = await axiosInstance.put('/timetable/slot', {
        year:      slotInfo.year,
        division:  slotInfo.division,
        batch:     slotInfo.batch,
        day:       slotInfo.day,
        slotId:    slotInfo.slotId,
        teacherId: entry.teacherId,
        subject:   entry.subject,
        room:      entry.room,
        color:     entry.color,
        isLab:     entry.isLab,   // ← tells backend which Teacher array to update
      });

      if (data.success) {
        // Optimistic local update
        setCurrentGrid(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          if (!next[slotInfo.day]) next[slotInfo.day] = {};
          next[slotInfo.day][slotInfo.slotId] = {
            subject:   entry.subject,
            teacher:   entry.teacherName,
            room:      entry.room,
            color:     entry.color,
            teacherId: entry.teacherId,
          };
          return next;
        });
        setModalVisible(false);
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2000);
      }
    } catch (err) {
      console.error('save slot error', err);
    }
  };

  // ── Delete slot → DELETE /timetable/slot ─────────────────────────────────
  const handleDelete = async () => {
    try {
      const { data } = await axiosInstance.delete('/timetable/slot', {
        data: {
          year:     slotInfo.year,
          division: slotInfo.division,
          batch:    slotInfo.batch,
          day:      slotInfo.day,
          slotId:   slotInfo.slotId,
        },
      });
      if (data.success) {
        setCurrentGrid(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          if (next[slotInfo.day]) delete next[slotInfo.day][slotInfo.slotId];
          return next;
        });
        setModalVisible(false);
      }
    } catch (err) {
      console.error('delete slot error', err);
    }
  };

  // ── Generate PDF ──────────────────────────────────────────────────────────
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    if (!selectedDivision || !selectedBatch) {
      Alert.alert('Selection Required', 'Please select a division and batch first.');
      return;
    }

    setPdfGenerating(true);
    try {
      const filename = `timetable_year${selectedYearObj.year}_${selectedDivision}_${selectedBatch}.pdf`;

      if (Platform.OS === 'web') {
        // ── Web: fetch blob and trigger <a> download ────────────────────────
        const response = await axiosInstance.post(
          '/timetable/generate-pdf',
          {
            year:         selectedYearObj.year,
            division:     selectedDivision,
            batch:        selectedBatch,
            academicYear: '2024-25',
          },
          { responseType: 'blob' }
        );

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Alert.alert('Success', 'Timetable PDF downloaded!');

      } else {
        // ── Mobile (iOS / Android): download via Linking ────────────────────
        // react-native-fs and react-native-share are optional enhancements;
        // the simplest universal approach is to open the PDF URL in the browser.
        // axiosInstance.defaults.baseURL must end WITHOUT a trailing slash.
        const baseURL = axiosInstance.defaults.baseURL || '';

        // Build a query-string URL so the browser can GET the PDF directly.
        // We add a small GET endpoint alias – see TimeTableRoutes note below.
        // If you prefer to keep POST, encode params in the URL manually:
        const params = new URLSearchParams({
          year:         selectedYearObj.year,
          division:     selectedDivision,
          batch:        selectedBatch,
          academicYear: '2024-25',
        }).toString();

        const pdfUrl = `${baseURL}/timetable/generate-pdf-get?${params}`;

        const { Linking } = require('react-native');
        const supported = await Linking.canOpenURL(pdfUrl);
        if (supported) {
          await Linking.openURL(pdfUrl);
        } else {
          Alert.alert('Error', 'Cannot open PDF URL on this device.');
        }
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      Alert.alert(
        'Error',
        'Failed to generate PDF. Please try again.\n\n' +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── Derived theme values ──────────────────────────────────────────────────
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
        { key: 'manage',   icon: '✏️', label: 'Manage' },
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
      {/* Header */}
      <View style={[fStyles.header, { borderBottomColor: headerBorder }]}>
        <View style={fStyles.headerLeft}>
          <Text style={[fStyles.headerTitle, { color: colors.textPrim }]}>Master Timetable</Text>
          <Text style={[fStyles.headerSub,   { color: headerSubColor  }]}>Tap any slot to assign or edit</Text>
        </View>
        <View style={fStyles.headerActions}>
          <TouchableOpacity 
            style={[fStyles.btnOutline, { borderColor: btnOutlineBorder }]}
            onPress={handleGeneratePDF}
            disabled={pdfGenerating || !selectedDivision || !selectedBatch}
            activeOpacity={0.7}
          >
            {pdfGenerating ? (
              <ActivityIndicator size="small" color={colors.textPrim} />
            ) : (
              <Text style={[fStyles.btnOutlineText, { color: colors.textPrim }]}>⬇ PDF</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={fStyles.btnPrimary}
            onPress={() => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }}
          >
            <Text style={fStyles.btnPrimaryText}>{savedMsg ? '✓ Saved!' : '💾 Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode tabs */}
      {renderModeTabs()}

      {/* Academic year */}
      <View style={fStyles.yearRow}>
        <View style={fStyles.dropdownWrapper}>
          <Text style={[fStyles.filterLabel, { color: filterLabelColor }]}>ACADEMIC YEAR</Text>
          <TouchableOpacity
            style={[fStyles.dropdown, { backgroundColor: dropdownBg, borderColor: dropdownBorder }]}
            onPress={() => setShowYearDropdown(!showYearDropdown)}
            activeOpacity={0.8}
          >
            <Text style={[fStyles.dropdownValue, { color: colors.textPrim }]} numberOfLines={1}>
              {selectedYearObj.label}
            </Text>
            <Text style={[fStyles.dropdownCaret, { color: isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted }]}>
              {showYearDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showYearDropdown && (
            <View style={[fStyles.dropdownMenu, { backgroundColor: dropdownBg, borderColor: dropdownBorder }]}>
              {ACADEMIC_YEARS.map((yr) => (
                <TouchableOpacity
                  key={yr.year}
                  style={[
                    fStyles.dropdownMenuItem,
                    { borderBottomColor: dropdownMenuItemBorder },
                    yr.year === selectedYearObj.year && fStyles.dropdownMenuItemActive,
                  ]}
                  onPress={() => { setSelectedYearObj(yr); setShowYearDropdown(false); }}
                >
                  <Text style={[
                    fStyles.dropdownMenuItemText,
                    { color: yr.year === selectedYearObj.year ? colors.textPrim : colors.textSec },
                    yr.year === selectedYearObj.year && { fontWeight: '600' },
                  ]}>
                    {yr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Division + Batch */}
      {metaLoading ? (
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
                    <Text style={[
                      fStyles.divTabText,
                      { color: isActive ? '#ffffff' : divTabInactiveText },
                      isActive && { fontWeight: '700' },
                    ]}>
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
                    style={[
                      fStyles.batchPill,
                      { backgroundColor: pillBg, borderColor: pillBorder },
                      isActive && fStyles.batchPillActive,
                    ]}
                    onPress={() => setSelectedBatch(batch)}
                    activeOpacity={0.8}
                  >
                    {isActive && <View style={fStyles.batchPillDot} />}
                    <Text style={[fStyles.batchPillText, { color: isActive ? colors.textPrim : pillInactiveText }]}>
                      {batch}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Active semester badge + breadcrumb */}
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
    </>
  );

  // ── Loading overlay ───────────────────────────────────────────────────────
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
        <AllYearsOverview />
      </View>
    );
  }

  // ── MOBILE layout ─────────────────────────────────────────────────────────
  if (!IS_TABLET) {
    const activeDayName = DAYS[selectedDay];
    const activeDayData = currentGrid[activeDayName] || {};

    return (
      <View style={[baseStyles.screen, { backgroundColor: screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={screenBg} />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderFilters()}

          {/* Day strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={mStyles.dayStrip}
            contentContainerStyle={mStyles.dayStripContent}
          >
            {DAYS.map((day, idx) => {
              const isActive   = idx === selectedDay;
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
                  <Text style={[mStyles.dayPillText, { color: isActive ? '#ffffff' : pillInactiveText }]}>
                    {DAY_SHORT[idx]}
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

          {/* Day header */}
          <View style={mStyles.dayHeader}>
            <Text style={[mStyles.dayHeaderText, { color: colors.textPrim }]}>{activeDayName}</Text>
            <View style={[mStyles.dayCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceAlt }]}>
              <Text style={[mStyles.dayCount, { color: isDark ? 'rgba(255,255,255,0.35)' : colors.textMuted }]}>
                {TIME_SLOTS.filter(s => !s.isBreak && activeDayData[s.id]).length} classes
              </Text>
            </View>
          </View>

          {gridLoading ? renderGridLoading() : (
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
          )}
          <View style={{ height: 32 }} />
        </ScrollView>

        <SlotModal
          visible={modalVisible}
          slotInfo={slotInfo}
          teachers={teachers}
          subjects={subjects}
          labs={labs}
          allSubjects={allSubjects}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalVisible(false)}
        />
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

      {gridLoading ? renderGridLoading() : (
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
                        <Text style={[tStyles.extraText, { color: extraIconColor }]}>
                          EXTRA CURRICULAR{'\n'}ACTIVITIES
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      )}

      <SlotModal
        visible={modalVisible}
        slotInfo={slotInfo}
        teachers={teachers}
        subjects={subjects}
        labs={labs}
        allSubjects={allSubjects}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const baseStyles = StyleSheet.create({
  screen: { flex: 1 },
});

const mStyles = StyleSheet.create({
  sheet:              { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, borderTopWidth: 1, maxHeight: '90%' },
  handle:             { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  titleRow:           { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle:         { fontSize: 18, fontWeight: '700' },
  modalSubtitle:      { fontSize: 12, marginTop: 3 },
  deleteBtn:          { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  deleteBtnText:      { color: '#f87171', fontSize: 12, fontWeight: '700' },
  fieldLabel:         { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.7, marginBottom: 6 },
  input:              { borderWidth: 1, borderRadius: 10, fontSize: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
  inlineMenu:         { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: -10, marginBottom: 14, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  inlineMenuItem:     { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  inlineMenuHeader:   { paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1 },
  inlineMenuHeaderText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  colorRow:           { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot:           { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  colorDotActive:     { opacity: 1, transform: [{ scale: 1.2 }], borderWidth: 2, borderColor: '#fff' },
  colorCheck:         { color: '#fff', fontSize: 14, fontWeight: '800' },
  preview:            { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  previewSubject:     { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 3 },
  previewTeacher:     { fontSize: 11 },
  previewRoom:        { fontSize: 10, fontWeight: '700', marginTop: 6 },
  actions:            { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  cancelBtn:          { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText:         { fontSize: 14, fontWeight: '600' },
  saveBtn:            { flex: 2, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnDisabled:    { backgroundColor: 'rgba(37,99,235,0.35)' },
  saveText:           { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  dayStrip:           { paddingVertical: 4 },
  dayStripContent:    { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  dayPill:            { alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 52 },
  dayPillActive:      { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayPillText:        { fontSize: 12, fontWeight: '700' },
  dayDot:             { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  dayHeader:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dayHeaderText:      { fontSize: 18, fontWeight: '700' },
  dayCountBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dayCount:           { fontSize: 12, fontWeight: '600' },
  lectureList:        { paddingHorizontal: 16, gap: 6 },
  lectureRow:         { flexDirection: 'row', alignItems: 'stretch', gap: 12, minHeight: 80 },
  timeCol:            { width: 72, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4, paddingVertical: 4, flexShrink: 0 },
  timeSub:            { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 3 },
  timeLabel:          { fontSize: 10.5, fontWeight: '600', textAlign: 'right', lineHeight: 15 },
  card:               { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  cardTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardSubject:        { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  editHintEmoji:      { fontSize: 13, marginLeft: 4 },
  cardTeacher:        { fontSize: 11, lineHeight: 15 },
  roomBadge:          { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  roomText:           { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  emptyCard:          { flex: 1, borderWidth: 1, borderRadius: 14, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: 0.6 },
  emptyIcon:          { fontSize: 16 },
  emptyLabel:         { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  breakRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 84 },
  breakLine:          { flex: 1, height: 1 },
  breakLabel:         { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
});

const fStyles = StyleSheet.create({
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 16 : 14, paddingBottom: 12, borderBottomWidth: 1 },
  headerLeft:           { flex: 1, marginRight: 10 },
  headerTitle:          { fontSize: IS_TABLET ? 18 : 16, fontWeight: '700' },
  headerSub:            { fontSize: 11, marginTop: 2 },
  headerActions:        { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  btnOutline:           { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  btnOutlineText:       { fontSize: 12, fontWeight: '600' },
  btnPrimary:           { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnPrimaryText:       { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  modeTabs:             { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  modeTab:              { paddingVertical: 10, paddingHorizontal: 12 },
  modeTabActive:        { borderBottomWidth: 2, borderBottomColor: '#2563eb', marginBottom: -1 },
  modeTabText:          { fontSize: 13 },
  yearRow:              { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, zIndex: 100 },
  dropdownWrapper:      { position: 'relative', zIndex: 100 },
  filterLabel:          { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.9, marginBottom: 5 },
  dropdown:             { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  dropdownValue:        { fontSize: 13, fontWeight: '500', flex: 1 },
  dropdownCaret:        { fontSize: 10, marginLeft: 8 },
  dropdownMenu:         { position: 'absolute', top: 62, left: 0, right: 0, borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 200, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  dropdownMenuItem:     { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  dropdownMenuItemActive: { backgroundColor: 'rgba(37,99,235,0.2)' },
  dropdownMenuItemText: { fontSize: 13 },
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

// ─── All-Years Master View styles ─────────────────────────────────────────────

const mvStyles = StyleSheet.create({
  // selector strip
  selectorBlock:      { borderBottomWidth: 1, paddingBottom: 6 },
  selectorTitle:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  yearSelectorRow:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 6, overflow: 'hidden' },
  yearBadge:          { borderRightWidth: 1, paddingHorizontal: 10, paddingVertical: 6, minWidth: 64, alignItems: 'center' },
  yearBadgeNum:       { fontSize: 13, fontWeight: '800' },
  yearBadgeName:      { fontSize: 8, fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },
  selPill:            { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  selPillText:        { fontSize: 11, fontWeight: '600' },
  selDivider:         { width: 1, height: 18, marginHorizontal: 4 },
  // legend
  legend:             { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 8, gap: 10, borderBottomWidth: 1 },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:         { fontSize: 10, fontWeight: '500' },
  // tablet grid
  gridRow:            { flexDirection: 'row', borderBottomWidth: 1 },
  dayGroup:           { borderBottomWidth: 2 },
  dayLabelCell:       { justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRightWidth: 1, gap: 4 },
  dayName:            { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  yearTag:            { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  yearTagText:        { fontSize: 9, fontWeight: '800' },
  timeHeaderCell:     { paddingVertical: 10, paddingHorizontal: 6, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeHeaderLabel:    { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  timeHeaderSub:      { fontSize: 8, fontWeight: '600', marginTop: 2, letterSpacing: 0.4 },
  colHeaderText:      { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  cellWrapper:        { padding: 4, borderRightWidth: 1, minHeight: 72, justifyContent: 'center' },
  miniCard:           { borderWidth: 1, borderRadius: 8, padding: 7, flex: 1 },
  miniSubject:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.2, marginBottom: 3, lineHeight: 13 },
  miniTeacher:        { fontSize: 8.5, lineHeight: 12 },
  miniRoom:           { fontSize: 8, fontWeight: '600', marginTop: 4 },
  emptyMiniCell:      { flex: 1, borderWidth: 1, borderRadius: 8, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', opacity: 0.35 },
  breakText:          { fontSize: 7, fontWeight: '700', letterSpacing: 0.6, transform: [{ rotate: '-90deg' }] },
  // mobile
  dayPill:            { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  dayPillText:        { fontSize: 12, fontWeight: '700' },
  mobileBreakRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6, borderTopWidth: 0 },
  breakLine2:         { flex: 1, height: 1 },
  breakLabel2:        { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 },
  mobileSlotBlock:    { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  mobileSlotHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  mobileSlotSub:      { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  mobileSlotTime:     { fontSize: 11, fontWeight: '600' },
  mobileYearRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1 },
  mobileYearTag:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, minWidth: 30, alignItems: 'center' },
  mobileYearTagText:  { fontSize: 10, fontWeight: '800' },
  mobileCard:         { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  mobileCardSubject:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
  mobileCardTeacher:  { fontSize: 10, lineHeight: 14 },
  mobileCardRoom:     { fontSize: 9, fontWeight: '600', marginTop: 4 },
  mobileEmptyCell:    { flex: 1, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', paddingVertical: 8, paddingHorizontal: 10, opacity: 0.5 },
});

const tStyles = StyleSheet.create({
  hScroll:         { flexGrow: 1, justifyContent: 'center', alignItems: 'flex-start' },
  gridRow:         { flexDirection: 'row', borderBottomWidth: 1 },
  dayCell:         { justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRightWidth: 1 },
  dayLabel:        { fontSize: 12, fontWeight: '600' },
  gridHeaderText:  { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  timeHeaderCell:  { paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeLabel:       { fontSize: 10.5, fontWeight: '600', textAlign: 'center' },
  timeSub:         { fontSize: 9, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
  cellWrapper:     { padding: 5, borderRightWidth: 1, minHeight: 100, justifyContent: 'center' },
  card:            { flex: 1, borderWidth: 1, borderRadius: 10, padding: 9, justifyContent: 'space-between', minHeight: 88 },
  cardSubject:     { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, lineHeight: 14, marginBottom: 4 },
  cardTeacher:     { fontSize: 9.5, lineHeight: 13, flex: 1 },
  cardRoom:        { fontSize: 9.5, fontWeight: '600', marginTop: 5 },
  editHint:        { fontSize: 8, marginTop: 4 },
  assignCell:      { flex: 1, minHeight: 88, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  assignPlus:      { fontSize: 20 },
  assignLabel:     { fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  breakCell:       { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  breakCellText:   { fontSize: 8, fontWeight: '700', letterSpacing: 0.6, transform: [{ rotate: '-90deg' }] },
  extraBadge:      { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 4 },
  extraIcon:       { fontSize: 16 },
  extraText:       { fontSize: 8, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
});