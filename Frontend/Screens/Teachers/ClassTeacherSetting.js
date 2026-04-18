

import React, {
  useState, useEffect, useCallback, useContext, useRef,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, useWindowDimensions, ActivityIndicator, Alert,
  TextInput, Modal, FlatList, Pressable, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Themes ──────────────────────────────────────────────────────────────── */
const DARK = {
  bg: '#07090F', surface: '#0D1120', card: '#0F1523',
  border: '#1A2035', accent: '#6366f1', accentSoft: 'rgba(99,102,241,0.12)',
  accentBright: '#a5b4fc',
  green: '#10B981', greenSoft: 'rgba(16,185,129,0.12)',
  red: '#EF4444', redSoft: 'rgba(239,68,68,0.12)',
  yellow: '#F59E0B', yellowSoft: 'rgba(245,158,11,0.12)',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  inputBg: '#111827', inputBorder: '#1A2035', inputText: '#EEF2FF',
  pillBg: 'rgba(99,102,241,0.14)', pillBorder: 'rgba(99,102,241,0.30)',
  selectedPillBg: '#6366f1', selectedPillBorder: '#818cf8',
  headerBg: '#0f0f23', headerBorder: 'rgba(99,102,241,0.15)',
  modalBg: '#0D1120', shadowColor: '#000',
};
const LIGHT = {
  bg: '#F0F4FF', surface: '#FFFFFF', card: '#FFFFFF',
  border: '#DDE3F4', accent: '#4F46E5', accentSoft: 'rgba(79,70,229,0.07)',
  accentBright: '#4F46E5',
  green: '#059669', greenSoft: 'rgba(5,150,105,0.09)',
  red: '#DC2626', redSoft: 'rgba(220,38,38,0.09)',
  yellow: '#D97706', yellowSoft: 'rgba(217,119,6,0.09)',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#9CA3AF',
  inputBg: '#F8FAFF', inputBorder: '#DDE3F4', inputText: '#0F172A',
  pillBg: 'rgba(79,70,229,0.07)', pillBorder: 'rgba(79,70,229,0.20)',
  selectedPillBg: '#4F46E5', selectedPillBorder: '#6366f1',
  headerBg: '#FFFFFF', headerBorder: '#E2E8F4',
  modalBg: '#FFFFFF', shadowColor: '#8492B4',
};

/* ─── Constants ───────────────────────────────────────────────────────────── */
const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOTS = [
  { id: 't1', label: 'Slot 1', time: '10:30 – 11:30' },
  { id: 't2', label: 'Slot 2', time: '11:30 – 12:30' },
  { id: 't3', label: 'Slot 3', time: '13:15 – 14:15' },
  { id: 't4', label: 'Slot 4', time: '14:15 – 15:15' },
  { id: 't5', label: 'Slot 5', time: '15:30 – 16:30' },
  { id: 't6', label: 'Slot 6', time: '16:30 – 17:30' },
];
const SLOT_COLORS = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 1: Landing — two option cards
══════════════════════════════════════════════════════════════════════════════ */
export default function ClassTeacherSettingsScreen() {
  const navigation      = useNavigation();
  const { isDark }      = useContext(ThemeContext);
  const T               = isDark ? DARK : LIGHT;
  const { width }       = useWindowDimensions();
  const isDesktop       = width >= 768;

  /* Animated entrance */
  const fadeCard1 = useRef(new Animated.Value(0)).current;
  const fadeCard2 = useRef(new Animated.Value(0)).current;
  const slideCard1 = useRef(new Animated.Value(30)).current;
  const slideCard2 = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeCard1,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideCard1, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeCard2,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideCard2, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const OPTIONS = [
    {
      icon:        '🗓️',
      title:       'Timetable Management',
      description: 'Create and manage your class timetable. Assign subjects, teachers, and time slots for each day of the week.',
      accentColor: T.accent,
      accentSoft:  T.accentSoft,
      route:       'TimetableManagementScreen',
      anim:        { opacity: fadeCard1, transform: [{ translateY: slideCard1 }] },
    },
    {
      icon:        '👥',
      title:       'Student Management',
      description: 'Divide your class into batches (e.g. B1, B2, B3). Assign students from your class list to each batch.',
      accentColor: T.green,
      accentSoft:  T.greenSoft,
      route:       'BatchManagementScreen',
      anim:        { opacity: fadeCard2, transform: [{ translateY: slideCard2 }] },
    },
  ];

  return (
    <SafeAreaView style={[ls.root, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[ls.header, { backgroundColor: T.headerBg, borderBottomColor: T.headerBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[ls.backBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]}
          activeOpacity={0.75}>
          <Text style={[ls.backArrow, { color: T.accentBright }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ls.headerTitle, { color: T.textPrimary }]}>Settings</Text>
          <Text style={[ls.headerSub, { color: T.textSec }]}>Class Teacher Controls</Text>
        </View>
        <View style={[ls.headerBadge, { backgroundColor: T.accentSoft, borderColor: T.pillBorder }]}>
          <Text style={ls.headerBadgeGear}>⚙️</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[ls.content, isDesktop && ls.contentDesktop]}
        showsVerticalScrollIndicator={false}>

        <Text style={[ls.sectionLabel, { color: T.textMuted }]}>WHAT WOULD YOU LIKE TO MANAGE?</Text>

        <View style={[ls.cardGrid, isDesktop && ls.cardGridDesktop]}>
          {OPTIONS.map((opt) => (
            <Animated.View key={opt.route} style={opt.anim}>
              <TouchableOpacity
                onPress={() => navigation.navigate(opt.route)}
                activeOpacity={0.82}
                style={[
                  ls.optCard,
                  {
                    backgroundColor: T.card,
                    borderColor: T.border,
                    shadowColor: T.shadowColor,
                  },
                  isDesktop && ls.optCardDesktop,
                ]}>
                {/* Top accent strip */}
                <View style={[ls.cardStrip, { backgroundColor: opt.accentColor }]} />

                <View style={[ls.cardIconWrap, { backgroundColor: opt.accentSoft }]}>
                  <Text style={ls.cardIcon}>{opt.icon}</Text>
                </View>

                <Text style={[ls.cardTitle, { color: T.textPrimary }]}>{opt.title}</Text>
                <Text style={[ls.cardDesc,  { color: T.textSec   }]}>{opt.description}</Text>

                <View style={[ls.cardArrowRow, { borderTopColor: T.border }]}>
                  <Text style={[ls.cardArrowText, { color: opt.accentColor }]}>Open</Text>
                  <View style={[ls.cardArrowBubble, { backgroundColor: opt.accentSoft }]}>
                    <Text style={[ls.cardArrowIcon, { color: opt.accentColor }]}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Landing styles ──────────────────────────────────────────────────────── */
const ls = StyleSheet.create({
  root:    { flex: 1 },
  header:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  backArrow:    { fontSize: 18, fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '800' },
  headerSub:    { fontSize: 12, marginTop: 1 },
  headerBadge:  {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerBadgeGear: { fontSize: 18 },

  content:        { padding: 16, paddingTop: 16 },
  contentDesktop: { width: '100%' },

  sectionLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 12,
  },

  cardGrid:        { gap: 12, flexDirection: 'row' },
  cardGridDesktop: { width: '100%' },

  optCard: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  optCardDesktop: { flex: 1 },

  cardStrip:     { height: 3, width: '100%' },
  cardIconWrap:  {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    margin: 14, marginBottom: 10,
  },
  cardIcon:      { fontSize: 20 },
  cardTitle:     { fontSize: 14, fontWeight: '800', paddingHorizontal: 14, marginBottom: 6 },
  cardDesc:      { fontSize: 11, lineHeight: 16, paddingHorizontal: 14, marginBottom: 12 },
  cardArrowRow:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  cardArrowText:   { fontSize: 12, fontWeight: '700' },
  cardArrowBubble: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  cardArrowIcon: { fontSize: 12, fontWeight: '700' },
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 2: Timetable Management  — full 2-D grid (days × slots)
══════════════════════════════════════════════════════════════════════════════ */

/**
 * Column layout:
 *   Day label | Slot 1 | Slot 2 | LUNCH | Slot 3 | Slot 4 | BREAK | Slot 5 | Slot 6
 * SLOTS constant (defined at top of file) holds the 6 lecture slots.
 */
const GRID_COLS = [
  { kind: 'slot',  slotIdx: 0 },
  { kind: 'slot',  slotIdx: 1 },
  { kind: 'break', label: 'LUNCH', time: '12:30' },
  { kind: 'slot',  slotIdx: 2 },
  { kind: 'slot',  slotIdx: 3 },
  { kind: 'break', label: 'BREAK', time: '3:15' },
  { kind: 'slot',  slotIdx: 4 },
  { kind: 'slot',  slotIdx: 5 },
];

const ACADEMIC_YEARS = [
  '1st Year (B.Tech  CS)',
  '2nd Year (B.Tech  CS)',
  '3rd Year (B.Tech  CS)',
  '4th Year (B.Tech  CS)',
];

const DIVISIONS = ['A', 'B', 'C'];
const BATCHES   = (div) => [`${div}1`, `${div}2`, `${div}3`];

export function TimetableManagementScreen() {
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const T          = isDark ? DARK : LIGHT;

  /* ── Controls ─────────────────────────────────────────────────── */
  const [yearIdx,       setYearIdx]       = useState(null); // Will be set from DB
  const [yearPickerVis, setYearPickerVis] = useState(false);
  const [activeDiv,     setActiveDiv]     = useState(null); // Will be set from DB
  const [activeBatch,   setActiveBatch]   = useState(null); // Will be set from DB

  /* ── Data ─────────────────────────────────────────────────────── */
  const [classId,        setClassId]        = useState(null);
  const [teacherId,      setTeacherId]      = useState(null);
  const [assignedYear,   setAssignedYear]   = useState(null); // From DB
  const [assignedDiv,    setAssignedDiv]    = useState(null); // From DB
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [loadError,      setLoadError]      = useState(null);

  /* ── Template State ───────────────────────────────────────────── */
  const [templateSlots,       setTemplateSlots]       = useState([]); // Fetched from backend
  const [templateWorkingDays, setTemplateWorkingDays] = useState([]); // Fetched from backend
  const [templateLoaded,      setTemplateLoaded]      = useState(false);

  /**
   * timetables keyed by div_batch:
   * { 'A_A1': { Monday: { t1: { subject, teacher }, … }, … }, … }
   */
  const emptyDaySlots = () =>
    Object.fromEntries((templateSlots.length > 0 ? templateSlots : SLOTS).map(s => [s.id, { subject: '', teacher: '' }]));
  const emptyGrid = () =>
    Object.fromEntries((templateWorkingDays.length > 0 ? templateWorkingDays : DAYS).map(d => [d, emptyDaySlots()]));

  const [timetables, setTimetables] = useState({});

  const ttKey  = activeDiv && activeBatch ? `${activeDiv}_${activeBatch}` : null;
  const getTT  = () => ttKey ? (timetables[ttKey] ?? emptyGrid()) : emptyGrid();

  /* ── Build grid columns from template ──────────────────────────── */
  const buildGridColumns = () => {
    if (templateSlots.length === 0) return [];
    
    return templateSlots.map((slot) => ({
      kind: slot.type === 'break' ? 'break' : 'slot',
      label: slot.label,
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
    }));
  };

  const dynamicGridCols = buildGridColumns();
  const dynamicDays = templateWorkingDays.length > 0 ? templateWorkingDays : DAYS;
  const dynamicSlots = templateSlots.length > 0 ? templateSlots : SLOTS;

  /* ── Edit modal ───────────────────────────────────────────────── */
  const [editModal,   setEditModal]   = useState(false);
  const [editCell,    setEditCell]    = useState(null); // { day, slotId }
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editTeacherId, setEditTeacherId] = useState(null);
  const [editLectureLocation, setEditLectureLocation] = useState('');

  /* ── Dropdown Data ────────────────────────────────────────────── */
  const [teachersList, setTeachersList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  /* ── Fetch Teacher's Assigned Year/Division & Timetable ────────────────────────────────────────────────────– */
  useEffect(() => {
    (async () => {
      try {
        // Get teacher ID from AsyncStorage
        const tid = await AsyncStorage.getItem('teacherId');
        const cid = await AsyncStorage.getItem('classId');
        
        console.log('🔍 Fetching teacher data - tid:', tid, 'cid:', cid);
        
        if (!tid) {
          setLoadError('Teacher ID not found. Please log in again.');
          setLoading(false);
          return;
        }

        setTeacherId(tid);
        setClassId(cid);

        // Fetch teacher data from backend to get classTeacher assignment
        try {
          const teacherRes = await axiosInstance.get(`/teachers/${tid}`);
          console.log('✅ Teacher fetch response:', teacherRes.data);
          
          if (teacherRes.data?.success && teacherRes.data?.data) {
            const teacher = teacherRes.data.data;
            const ct = teacher.classTeacher;

            console.log('👨‍🏫 Teacher classTeacher:', ct);

            if (!ct?.year || !ct?.division) {
              setLoadError('You are not assigned as a class teacher. Please contact your administrator.');
              setLoading(false);
              return;
            }

            setAssignedYear(ct.year);
            setAssignedDiv(ct.division);

            // Find the index of the assigned year in ACADEMIC_YEARS
            // DB stores "2nd Year", ACADEMIC_YEARS has "2nd Year (B.Tech  CS)"
            const yearIndex = ACADEMIC_YEARS.findIndex(y => y.startsWith(ct.year));
            if (yearIndex !== -1) {
              setYearIdx(yearIndex);
            } else {
              // Fallback: if exact match not found, log warning but continue
              console.warn('⚠️ Year not found in ACADEMIC_YEARS:', ct.year);
              setYearIdx(0);
            }

            // Set activeDiv and initial activeBatch to first subdivision
            setActiveDiv(ct.division);
            setActiveBatch(`${ct.division}1`);
          } else {
            setLoadError('Failed to fetch teacher data. Response format error.');
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.error('❌ Teacher API Error:', apiErr.response?.status, apiErr.response?.data || apiErr.message);
          setLoadError(`Unable to fetch teacher profile. (${apiErr.response?.status || 'Network Error'})`);
          setLoading(false);
          return;
        }

        // Fetch timetable template from backend
        try {
          const templateRes = await axiosInstance.get(`/timetable/template`);
          if (templateRes.data?.success && templateRes.data?.data?.customConfig) {
            const config = templateRes.data.data.customConfig;
            console.log('📋 Template fetched:', config);
            
            if (Array.isArray(config.workingDays)) {
              setTemplateWorkingDays(config.workingDays);
            }
            
            if (Array.isArray(config.slots)) {
              const processedSlots = config.slots.map(slot => ({
                id: slot.id || `slot-${Math.random().toString(36).slice(2, 8)}`,
                type: slot.type || 'lecture',
                label: slot.label || '',
                startTime: slot.startTime || '',
                endTime: slot.endTime || '',
              }));
              setTemplateSlots(processedSlots);
            }
            
            setTemplateLoaded(true);
          } else {
            console.warn('⚠️ Template not available, using defaults');
            setTemplateLoaded(true);
          }
        } catch (templateErr) {
          console.warn('⚠️ Template fetch warning:', templateErr.message);
          setTemplateLoaded(true); // Don't block on template
        }
      } catch (err) {
        console.error('🔴 TimetableManagement: Unexpected error', err);
        setLoadError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Fetch Timetable Data ────────────────────────────────────────────── */
  useEffect(() => {
    if (!assignedYear || !assignedDiv) return; // Wait until we have year & division

    (async () => {
      try {
        // Extract year number from format "1st Year", "2nd Year", etc.
        const yearMatch = assignedYear.match(/^(\d+)/);
        const yearNum = yearMatch ? yearMatch[1] : null;
        
        if (!yearNum) {
          console.warn('⚠️ Could not extract year number from:', assignedYear);
          return;
        }

        // Fetch timetable for assigned year, division, and initial batch
        const initialBatch = `${assignedDiv}1`;
        console.log(`📚 Fetching timetable for year=${yearNum}, division=${assignedDiv}, batch=${initialBatch}`);
        
        const ttRes = await axiosInstance.get('/timetable', {
          params: {
            year: yearNum,
            division: assignedDiv,
            batch: initialBatch,
          },
        });

        if (ttRes.data?.success && ttRes.data?.data) {
          console.log('✅ Timetable fetched:', ttRes.data.data);
          setTimetables(ttRes.data.data);
        } else {
          console.warn('⚠️ No timetable data returned');
        }
      } catch (err) {
        console.warn('⚠️ Timetable fetch error:', err.message);
        // Don't error out, timetable might just be empty
      }
    })();
  }, [assignedYear, assignedDiv]);

  /* ── Helpers ──────────────────────────────────────────────────── */
  
  const fetchTeachersAndSubjects = async () => {
    try {
      setDropdownLoading(true);
      
      // Fetch teachers from same institute and department
      const teachersRes = await axiosInstance.get('/timetable/teachers-list');
      if (teachersRes.data?.success) {
        setTeachersList(teachersRes.data.data || []);
      }

      // Extract year number from assignedYear format "1st Year", "2nd Year", etc.
      const yearMatch = assignedYear?.match(/^(\d+)/);
      const yearNum = yearMatch ? yearMatch[1] : null;

      // Fetch subjects for the current year
      if (yearNum) {
        const subjectsRes = await axiosInstance.get('/timetable/subjects-list', {
          params: { year: yearNum }
        });
        if (subjectsRes.data?.success) {
          const allSubjects = [
            ...(subjectsRes.data.data?.subjects || []),
            ...(subjectsRes.data.data?.labs || [])
          ];
          setSubjectsList(allSubjects);
        }
      }
    } catch (err) {
      console.warn('⚠️ Error fetching teachers/subjects:', err.message);
    } finally {
      setDropdownLoading(false);
    }
  };

  const openEdit = (day, slotId) => {
    const entry = getTT()[day]?.[slotId] || {};
    setEditCell({ day, slotId });
    setEditSubject(entry.subject || '');
    setEditTeacher(entry.teacherName || '');
    setEditTeacherId(entry.teacherId || null);
    setEditLectureLocation(entry.lectureLocation || '');
    
    // Fetch teachers and subjects when modal opens
    fetchTeachersAndSubjects();
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!ttKey || !editTeacherId) {
      Alert.alert('Error', 'Please select a teacher');
      return;
    }
    
    if (!editSubject.trim()) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }
    
    try {
      setSaving(true);
      
      // Extract year number
      const yearMatch = assignedYear?.match(/^(\d+)/);
      const yearNum = yearMatch ? yearMatch[1] : null;

      // Send to backend to save
      const response = await axiosInstance.put('/timetable/slot', {
        year: yearNum,
        division: activeDiv,
        batch: activeBatch,
        day: editCell.day,
        slotId: editCell.slotId,
        teacherId: editTeacherId,
        subject: editSubject.trim(),
        lectureLocation: editLectureLocation.trim(),
        color: 'teal'
      });

      if (response.data?.success) {
        // Update local state
        setTimetables(prev => ({
          ...prev,
          [ttKey]: {
            ...(prev[ttKey] ?? emptyGrid()),
            [editCell.day]: {
              ...(prev[ttKey]?.[editCell.day] ?? emptyDaySlots()),
              [editCell.slotId]: {
                subject: editSubject.trim(),
                teacherName: editTeacher.trim(),
                teacherId: editTeacherId,
                lectureLocation: editLectureLocation.trim(),
              },
            },
          },
        }));
        setEditModal(false);
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to save slot');
      }
    } catch (err) {
      console.error('Error saving slot:', err);
      Alert.alert('Error', 'Failed to save slot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!classId) {
      Alert.alert('Error', 'Class ID not found. Please log in again.');
      return;
    }
    try {
      setSaving(true);
      const res = await axiosInstance.post('/class-timetable', {
        classId,
        timetable: timetables,
      });
      if (res.data?.success) {
        Alert.alert('✅ Saved', 'Timetable saved successfully.');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to save timetable.');
      }
    } catch (err) {
      console.warn('Save timetable error:', err);
      Alert.alert('Error', 'Failed to save timetable. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  // Division can only be changed to the assigned division (which is already selected)
  const handleDivChange = (div) => {
    if (div === assignedDiv) {
      setActiveDiv(div);
      setActiveBatch(`${div}1`);
    }
  };

  if (loading) {
    return (
      <View style={[ts.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={[ts.loadingText, { color: T.textSec }]}>Loading your timetable…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[ts.root, { backgroundColor: T.bg }]}>
        <View style={[ts.header, { backgroundColor: T.headerBg, borderBottomColor: T.headerBorder }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[ts.backBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]}
            activeOpacity={0.75}>
            <Text style={[ts.backArrow, { color: T.accentBright }]}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[ts.headerTitle, { color: T.textPrimary }]}>Timetable Management</Text>
          </View>
        </View>
        <View style={[ts.center, { backgroundColor: T.bg, flex: 1 }]}>
          <Text style={[ts.errorIcon, { color: T.red }]}>⚠️</Text>
          <Text style={[ts.errorTitle, { color: T.textPrimary }]}>Assignment Required</Text>
          <Text style={[ts.errorText, { color: T.textSec }]}>{loadError}</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[ts.errorBtn, { backgroundColor: T.accent }]}
            activeOpacity={0.8}>
            <Text style={ts.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (yearIdx === null || !activeDiv || !activeBatch) {
    return (
      <View style={[ts.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={[ts.loadingText, { color: T.textSec }]}>Initializing timetable…</Text>
      </View>
    );
  }

  const currentTT = getTT();

  return (
    <SafeAreaView style={[ts.root, { backgroundColor: T.bg }]}>

      {/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <View style={[ts.header, { backgroundColor: T.headerBg, borderBottomColor: T.headerBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[ts.backBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]}
          activeOpacity={0.75}>
          <Text style={[ts.backArrow, { color: T.accentBright }]}></Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ts.headerTitle, { color: T.textPrimary }]}>Timetable Management</Text>
          <Text style={[ts.headerSub,   { color: T.textSec     }]}>Tap a cell to assign a subject</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[ts.saveBtn, { backgroundColor: T.accent }]}
          activeOpacity={0.8}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={ts.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* \u2500\u2500 Scrollable body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}>

        {/* Sticky controls panel */}
        <View style={[ts.controlsPanel, { backgroundColor: T.bg }]}>

          {/* Academic Year - READ ONLY */}
          <View style={ts.yearLockContainer}>
            <Text style={[ts.ctrlLabel, { color: T.textMuted }]}>ACADEMIC YEAR</Text>
            <View style={[ts.yearSelectorLocked, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[ts.yearSelectorText, { color: T.textPrimary }]}>
                {ACADEMIC_YEARS[yearIdx]}
              </Text>
              <View style={[ts.lockedBadge, { backgroundColor: T.accentSoft }]}>
                <Text style={[ts.lockedBadgeText, { color: T.accentBright }]}>🔒</Text>
              </View>
            </View>
            <Text style={[ts.lockedNote, { color: T.textMuted }]}>Your assigned academic year</Text>
          </View>

          {/* Division + Batch row — Division is LOCKED, only Batch is selectable */}
          <View style={ts.divBatchRow}>
            <View style={ts.divBlock}>
              <Text style={[ts.ctrlLabel, { color: T.textMuted }]}>DIVISION (ASSIGNED)</Text>
              <View style={ts.pillRow}>
                {/* Show ONLY the assigned division */}
                <View
                  style={[
                    ts.divPill,
                    {
                      backgroundColor: T.accent,
                      borderColor: T.selectedPillBorder,
                    },
                  ]}>
                  <Text style={[
                    ts.divPillText,
                    { color: '#fff' },
                  ]}>
                    Division {assignedDiv} 🔒
                  </Text>
                </View>
              </View>
              <Text style={[ts.lockedNote, { color: T.textMuted, marginTop: 6 }]}>Your assigned division</Text>
            </View>

            <View style={ts.batchBlock}>
              <Text style={[ts.ctrlLabel, { color: T.textMuted }]}>BATCH</Text>
              <View style={ts.pillRow}>
                {/* Show ONLY subdivisions of the assigned division */}
                {BATCHES(assignedDiv).map(b => (
                  <TouchableOpacity
                    key={b}
                    onPress={() => setActiveBatch(b)}
                    activeOpacity={0.75}
                    style={[
                      ts.batchPill,
                      {
                        backgroundColor: activeBatch === b ? T.pillBg              : 'transparent',
                        borderColor:     activeBatch === b ? T.selectedPillBorder  : T.border,
                      },
                    ]}>
                    {activeBatch === b && (
                      <View style={[ts.batchDot, { backgroundColor: T.accent }]} />
                    )}
                    <Text style={[
                      ts.batchPillText,
                      { color: activeBatch === b ? T.accentBright : T.textSec },
                    ]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Active semester breadcrumb - Shows assigned year, division & selected batch */}
          <View style={ts.breadcrumbRow}>
            <View style={[ts.activeBadge, { backgroundColor: T.greenSoft, borderColor: 'rgba(16,185,129,0.3)' }]}>
              <View style={[ts.activeDot, { backgroundColor: T.green }]} />
              <Text style={[ts.activeBadgeText, { color: T.green }]}>ACTIVE SEMESTER</Text>
            </View>
            <Text style={[ts.breadcrumbText, { color: T.textSec }]}>
              {ACADEMIC_YEARS[yearIdx].split('(')[0].trim()} • Division {assignedDiv} • Batch {activeBatch}
            </Text>
          </View>

          {/* ── Template Info Banner ─────────────────────────────── */}
          {templateLoaded && dynamicDays.length > 0 && dynamicSlots.length > 0 && (
            <View style={[ts.templateInfoBanner, { backgroundColor: T.accentSoft, borderColor: T.accent }]}>
              <Text style={[ts.templateInfoIcon]}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={[ts.templateInfoLabel, { color: T.accentBright }]}>Template Loaded</Text>
                <Text style={[ts.templateInfoText, { color: T.textSec }]}>
                  {dynamicDays.length} working days • {dynamicSlots.filter(s => s.type === 'lecture').length} lectures • {dynamicSlots.filter(s => s.type === 'break').length} breaks
                </Text>
              </View>
              <Text style={[ts.templateInfoCheckmark, { color: T.accentBright }]}>✓</Text>
            </View>
          )}
        </View>

        {/* ──────── Timetable Grid ────────────────────────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ts.gridScrollH}>
          <View style={[ts.grid, { borderColor: T.border }]}>

            {/* Header row */}
            <View style={[ts.gridRow, { backgroundColor: T.surface, borderBottomColor: T.border, borderBottomWidth: 1 }]}>
              <View style={[ts.gridCornerCell, { borderRightColor: T.border }]}>
                <Text style={[ts.gridCornerText, { color: T.textMuted }]}>DAY / TIME</Text>
              </View>

              {dynamicGridCols.map((col, ci) => {
                if (col.kind === 'break') {
                  return (
                    <View key={`bh_${ci}`} style={[ts.gridBreakHeaderCell, { borderRightColor: T.border }]}>
                      <Text style={[ts.gridBreakHeaderText, { color: T.textMuted }]}>
                        {col.startTime && col.endTime 
                          ? `${col.startTime} – ${col.endTime}`
                          : col.label}
                      </Text>
                    </View>
                  );
                }
                return (
                  <View key={col.slotId} style={[ts.gridSlotHeaderCell, { borderRightColor: T.border }]}>
                    <Text style={[ts.gridSlotTime,  { color: T.textPrimary }]}>
                      {col.startTime && col.endTime ? `${col.startTime} – ${col.endTime}` : ''}
                    </Text>
                    <Text style={[ts.gridSlotLabel, { color: T.textMuted   }]}>{col.label.toUpperCase()}</Text>
                  </View>
                );
              })}
            </View>

            {/* Day rows */}
            {dynamicDays.map((day, di) => (
              <View
                key={day}
                style={[
                  ts.gridRow,
                  {
                    borderBottomColor: T.border,
                    borderBottomWidth: di < dynamicDays.length - 1 ? 1 : 0,
                  },
                ]}>
                {/* Day label */}
                <View style={[ts.gridDayCell, { borderRightColor: T.border, backgroundColor: T.surface }]}>
                  <Text style={[ts.gridDayText, { color: T.textPrimary }]}>{day}</Text>
                </View>

                {dynamicGridCols.map((col, ci) => {
                  if (col.kind === 'break') {
                    return (
                      <View key={`br_${day}_${ci}`} style={[ts.gridBreakCell, { borderRightColor: T.border, backgroundColor: T.surface }]}>
                        <Text style={[ts.gridBreakCellText, { color: T.textMuted }]}>{col.label}</Text>
                      </View>
                    );
                  }

                  const entry  = currentTT[day]?.[col.slotId] || { subject: '', teacher: '' };
                  const filled = !!entry.subject;
                  // Use a deterministic color based on slot index
                  const color  = SLOT_COLORS[ci % SLOT_COLORS.length];

                  return (
                    <TouchableOpacity
                      key={`${day}_${col.slotId}`}
                      onPress={() => openEdit(day, col.slotId)}
                      activeOpacity={0.75}
                      style={[
                        ts.gridCell,
                        {
                          borderRightColor: T.border,
                          backgroundColor:  filled ? color + '14' : T.bg,
                          borderTopColor:   filled ? color + '55' : 'transparent',
                          borderTopWidth:   filled ? 2 : 0,
                        },
                      ]}>
                      {filled ? (
                        <View style={ts.gridCellFilled}>
                          <Text style={[ts.gridCellSlotLabel, { color }]}>{col.label}</Text>
                          <Text style={[ts.gridCellSubject,   { color: T.textPrimary }]} numberOfLines={2}>
                            {entry.subject}
                          </Text>
                          {!!entry.teacher && (
                            <Text style={[ts.gridCellTeacher, { color: T.textSec }]} numberOfLines={1}>
                              {entry.teacher}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <View style={ts.gridCellEmpty}>
                          <View style={[ts.gridCellPlusCircle, { borderColor: T.textMuted + '55' }]}>
                            <Text style={[ts.gridCellPlus, { color: T.textMuted }]}>+</Text>
                          </View>
                          <Text style={[ts.gridCellAssignText, { color: T.textMuted }]}>ASSIGN</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}>
        <Pressable style={ts.modalBackdrop} onPress={() => setEditModal(false)} />
        <View style={[ts.modalCard, { backgroundColor: T.modalBg, borderColor: T.border, shadowColor: T.shadowColor }]}>
          <View style={ts.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {(() => {
              const col = dynamicGridCols.find(c => c.slotId === editCell?.slotId);
              return (
                <>
                  <Text style={[ts.modalTitle, { color: T.textPrimary }]}>
                    {editCell?.day} • {col?.label || 'Slot'}
                  </Text>
                  <Text style={[ts.modalTime, { color: T.textMuted }]}>
                    {col?.startTime && col?.endTime 
                      ? `${col.startTime} – ${col.endTime}` 
                      : col?.label}
                  </Text>
                </>
              );
            })()}

            {/* ── Teacher Selection ─────────────────────────────────── */}
            <Text style={[ts.modalFieldLabel, { color: T.textSec }]}>Teacher *</Text>
            {dropdownLoading ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <View style={[ts.dropdownContainer, { borderColor: T.inputBorder, backgroundColor: T.inputBg }]}>
                <FlatList
                  data={teachersList}
                  keyExtractor={(item) => String(item._id)}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setEditTeacherId(item._id);
                        setEditTeacher(item.name);
                      }}
                      style={[
                        ts.dropdownItem,
                        {
                          backgroundColor: editTeacherId === item._id ? T.selectedPillBg : 'transparent',
                          borderBottomColor: T.border,
                        },
                      ]}>
                      <Text style={[
                        ts.dropdownItemText,
                        { color: editTeacherId === item._id ? '#fff' : T.textPrimary }
                      ]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyMessage={
                    <Text style={[ts.emptyText, { color: T.textMuted }]}>No teachers found</Text>
                  }
                />
              </View>
            )}

            {/* ── Subject Selection ─────────────────────────────────── */}
            <Text style={[ts.modalFieldLabel, { color: T.textSec, marginTop: 16 }]}>Subject *</Text>
            {dropdownLoading ? (
              <ActivityIndicator size="small" color={T.accent} />
            ) : (
              <View style={[ts.dropdownContainer, { borderColor: T.inputBorder, backgroundColor: T.inputBg }]}>
                <FlatList
                  data={subjectsList}
                  keyExtractor={(item, idx) => `${item}_${idx}`}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setEditSubject(item)}
                      style={[
                        ts.dropdownItem,
                        {
                          backgroundColor: editSubject === item ? T.selectedPillBg : 'transparent',
                          borderBottomColor: T.border,
                        },
                      ]}>
                      <Text style={[
                        ts.dropdownItemText,
                        { color: editSubject === item ? '#fff' : T.textPrimary }
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyMessage={
                    <Text style={[ts.emptyText, { color: T.textMuted }]}>No subjects found</Text>
                  }
                />
              </View>
            )}

            {/* ── Lecture Location Input ────────────────────────────── */}
            <Text style={[ts.modalFieldLabel, { color: T.textSec, marginTop: 16 }]}>
              Lecture Location (optional)
            </Text>
            <TextInput
              value={editLectureLocation}
              onChangeText={setEditLectureLocation}
              placeholder="e.g. Room 101, Lab A"
              placeholderTextColor={T.textMuted}
              style={[ts.modalInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.inputText }]}
            />
          </ScrollView>

          <View style={ts.modalBtnRow}>
            <TouchableOpacity
              onPress={() => setEditModal(false)}
              style={[ts.modalCancelBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]}
              activeOpacity={0.75}>
              <Text style={[ts.modalCancelText, { color: T.textSec }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveEdit}
              disabled={saving || !editTeacherId || !editSubject}
              style={[
                ts.modalSaveBtn, 
                { 
                  backgroundColor: (saving || !editTeacherId || !editSubject) ? T.textMuted : T.accent 
                }
              ]}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={ts.modalSaveText}>Save Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* \u2500\u2500\u2500 Timetable styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
const ts = StyleSheet.create({
  root:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  backArrow:   { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub:   { fontSize: 11, marginTop: 1 },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 10, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* Controls */
  controlsPanel: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, gap: 10 },
  ctrlLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 6 },

  yearSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 2,
  },
  yearSelectorText:    { fontSize: 14, fontWeight: '600' },
  yearSelectorChevron: { fontSize: 16 },
  yearDropdown: {
    borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 6,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  yearDropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  yearDropdownText: { fontSize: 14, fontWeight: '500' },

  /* Locked Year Section */
  yearLockContainer: { gap: 4 },
  yearSelectorLocked: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 2,
  },
  lockedBadge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  lockedBadgeText: { fontSize: 16 },
  lockedNote: { fontSize: 10, fontWeight: '500', marginBottom: 10 },

  /* Error Screen */
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  errorText: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  errorBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
    marginTop: 8,
  },
  errorBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  divBatchRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start', marginTop: 4 },
  divBlock:    { flex: 1 },
  batchBlock:  {},

  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  divPill:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  divPillText: { fontSize: 13, fontWeight: '700' },

  batchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  batchDot:      { width: 7, height: 7, borderRadius: 4 },
  batchPillText: { fontSize: 13, fontWeight: '700' },

  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  activeDot:       { width: 7, height: 7, borderRadius: 4 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  breadcrumbText:  { fontSize: 12 },

  /* Template Info Banner */
  templateInfoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 12,
  },
  templateInfoIcon: { fontSize: 18 },
  templateInfoLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  templateInfoText: { fontSize: 10, marginTop: 2, lineHeight: 14 },
  templateInfoCheckmark: { fontSize: 14, fontWeight: '700' },

  /* Grid */
  gridScrollH: { flex: 1 },
  grid: {
    borderWidth: 1, borderRadius: 10, overflow: 'hidden',
    marginHorizontal: 14, marginTop: 10,
  },

  gridRow: { flexDirection: 'row' },

  gridCornerCell: {
    width: 90, paddingHorizontal: 10, paddingVertical: 12,
    borderRightWidth: 1, justifyContent: 'center',
  },
  gridCornerText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  gridSlotHeaderCell: {
    width: 130, paddingHorizontal: 8, paddingVertical: 10,
    borderRightWidth: 1, alignItems: 'center',
  },
  gridSlotTime:  { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  gridSlotLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginTop: 2 },

  gridBreakHeaderCell: {
    width: 26, paddingVertical: 10,
    borderRightWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  gridBreakHeaderText: { fontSize: 8, fontWeight: '700' },

  gridDayCell: {
    width: 90, paddingHorizontal: 10,
    borderRightWidth: 1, justifyContent: 'center', minHeight: 92,
  },
  gridDayText: { fontSize: 13, fontWeight: '700' },

  gridCell: {
    width: 130, minHeight: 92, borderRightWidth: 1, padding: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  gridCellFilled:    { width: '100%', gap: 3 },
  gridCellSlotLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  gridCellSubject:   { fontSize: 12, fontWeight: '700' },
  gridCellTeacher:   { fontSize: 10 },

  gridCellEmpty:      { alignItems: 'center', gap: 5 },
  gridCellPlusCircle: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  gridCellPlus:       { fontSize: 16, lineHeight: 20, fontWeight: '300' },
  gridCellAssignText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },

  gridBreakCell: {
    width: 26, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  gridBreakCellText: {
    fontSize: 7, fontWeight: '800', letterSpacing: 0.6,
    transform: [{ rotate: '90deg' }],
    width: 60, textAlign: 'center',
  },

  /* Modal */
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, padding: 24, paddingTop: 16,
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 18,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#3D4A6A',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:      { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  modalTime:       { fontSize: 12, marginBottom: 20 },
  modalFieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  modalInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, marginBottom: 8,
  },
  dropdownContainer: {
    borderWidth: 1, borderRadius: 10, marginBottom: 8, maxHeight: 250, overflow: 'hidden'
  },
  dropdownItem: {
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14, fontWeight: '500'
  },
  emptyText: {
    textAlign: 'center', paddingVertical: 20, fontSize: 12
  },
  modalBtnRow:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveBtn:    { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  modalSaveText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
});

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN 3: Batch Management
   — Fixed batches A / B / C, students saved directly to Student DB
══════════════════════════════════════════════════════════════════════════════ */
export function BatchManagementScreen() {
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const T          = isDark ? DARK : LIGHT;

  /* ── State ── */
  const [teacherMongoId, setTeacherMongoId] = useState(null);
  const [classInfo,      setClassInfo]      = useState(null); // { year, division }
  const [students,       setStudents]       = useState([]);   // all students in this year
  const [subDivStudents, setSubDivStudents] = useState([]);   // only students in assigned division
  const [batchesData,    setBatchesData]    = useState([]); // actual batches from teacher.batches
  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState(null);

  /* ── Sub Batch picker modal ── */
  const [pickerModal,    setPickerModal]    = useState(false); // "choose or create sub batch" sheet
  const [createBatchName, setCreateBatchName] = useState('');  // for creating new batch
  const [creatingBatch,  setCreatingBatch]  = useState(false);

  /* ── Student selector modal ── */
  const [selectorModal,  setSelectorModal]  = useState(false);
  const [activeBatchId,  setActiveBatchId]  = useState(null);  // _id of active batch
  const [activeBatchName, setActiveBatchName] = useState(null); // name of active batch
  const [selected,       setSelected]       = useState(new Set());
  const [rollInputs,     setRollInputs]     = useState({});
  const [saving,         setSaving]         = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');    // search filter inside modal
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [unassigningStudentId, setUnassigningStudentId] = useState(null);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const blockRowPressRef = useRef({});

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState('students');

  const getRollNumber = (student) => {
    const raw = String(student?.roll_no ?? '').trim();
    const trailingNumber = raw.match(/(\d+)$/);
    return trailingNumber ? parseInt(trailingNumber[1], 10) : 0;
  };

  const fetchAllYearStudents = async (teacherId) => {
    const stuRes = await axiosInstance.get(`/teachers/${teacherId}/students-for-class`, {
      params: { strictDivision: false },
    });
    if (stuRes.data?.success) {
      const sorted = (stuRes.data.data || []).sort((a, b) => getRollNumber(a) - getRollNumber(b));
      setStudents(sorted);
    }
  };

  const fetchSubDivStudents = async (teacherId) => {
    const subDivRes = await axiosInstance.get(`/teachers/${teacherId}/students-for-class`, {
      params: { strictDivision: true },
    });
    if (subDivRes.data?.success) {
      const sorted = (subDivRes.data.data || []).sort((a, b) => getRollNumber(a) - getRollNumber(b));
      setSubDivStudents(sorted);
    }
  };

  /* ── Load data on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const tid = await AsyncStorage.getItem('teacherId');
        if (!tid) { setLoadError('Teacher not logged in.'); setLoading(false); return; }

        const teacherRes = await axiosInstance.get(`/teachers/${tid}`);
        if (!teacherRes.data?.success) { setLoadError('Failed to fetch teacher profile.'); setLoading(false); return; }

        const teacher = teacherRes.data.data;
        if (!teacher.classTeacher?.year || !teacher.classTeacher?.division) {
          setLoadError('You are not assigned as a class teacher. Please contact your administrator.');
          setLoading(false);
          return;
        }

        setTeacherMongoId(teacher._id);
        setClassInfo({ year: teacher.classTeacher.year, division: teacher.classTeacher.division });

        await fetchAllYearStudents(teacher._id);
        await fetchSubDivStudents(teacher._id);

        // ✅ Fetch batches from teacher's batches array
        const batchesRes = await axiosInstance.get(`/teachers/${teacher._id}/batches`);
        if (batchesRes.data?.success && Array.isArray(batchesRes.data.data)) {
          setBatchesData(batchesRes.data.data);
        }
      } catch (err) {
        console.warn('BatchManagement: fetch error', err);
        setLoadError('Failed to load class data. Check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Open sub batch picker/creator ── */
  const openBatchPicker = () => setPickerModal(true);

  /* ── Create new sub batch ── */
  const handleCreateBatch = async () => {
    if (!createBatchName.trim() || !teacherMongoId) return;
    try {
      setCreatingBatch(true);
      const res = await axiosInstance.post(`/teachers/${teacherMongoId}/create-batch`, {
        batchName: createBatchName.trim(),
        studentIds: [],
      });

      if (res.data?.success) {
        // Reload batches
        const batchesRes = await axiosInstance.get(`/teachers/${teacherMongoId}/batches`);
        if (batchesRes.data?.success) {
          setBatchesData(batchesRes.data.data);
        }
        setCreateBatchName('');
        Alert.alert('✅ Created', `Sub Batch "${createBatchName}" created successfully.`);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create batch.');
      }
    } catch (err) {
      console.warn('Create batch error:', err);
      Alert.alert('Error', 'Failed to create sub batch.');
    } finally {
      setCreatingBatch(false);
    }
  };

  /* ── Open student selector for a specific sub batch ── */
  const openBatchEditor = (batchId, batchName) => {
    const batch = batchesData?.find(b => b._id === batchId);
    const studentIds = batch?.students?.map(s => s.studentId) || [];
    setActiveBatchId(batchId);
    setActiveBatchName(batchName);
    setSelected(new Set(studentIds));
    const nextRollInputs = {};
    (subDivStudents || []).forEach((s) => {
      if (s?.id) {
        nextRollInputs[s.id] = s.roll_no ? String(s.roll_no) : '';
      }
    });
    setRollInputs(nextRollInputs);
    setSelectorSearch('');
    setPickerModal(false);
    setSelectorModal(true);
  };

  /* ── Toggle a student in the selector ── */
  const toggleStudent = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Save batch assignment ── */
  const handleSave = async () => {
    if (!activeBatchId || !teacherMongoId) return;
    try {
      setSaving(true);
      const studentIds = Array.from(selected);

      // PUT /api/teachers/:teacherId/batch/:batchId
      const res = await axiosInstance.put(`/teachers/${teacherMongoId}/batch/${activeBatchId}`, {
        batchName: activeBatchName,
        studentIds,
        rollNumbers: rollInputs,
      });

      if (res.data?.success) {
        // Reload batches
        const batchesRes = await axiosInstance.get(`/teachers/${teacherMongoId}/batches`);
        if (batchesRes.data?.success) {
          setBatchesData(batchesRes.data.data);
        }

        await fetchAllYearStudents(teacherMongoId);
        await fetchSubDivStudents(teacherMongoId);

        setSelectorModal(false);
        Alert.alert('✅ Saved', `Sub Batch "${activeBatchName}" updated with ${studentIds.length} student(s).`);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to save batch.');
      }
    } catch (err) {
      console.warn('Assign batch error:', err);
      Alert.alert('Error', 'Failed to save batch.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBatchNow = async () => {
    try {
      setDeletingBatch(true);
      const res = await axiosInstance.delete(`/teachers/${teacherMongoId}/batch/${activeBatchId}`);

      if (res.data?.success) {
        const batchesRes = await axiosInstance.get(`/teachers/${teacherMongoId}/batches`);
        if (batchesRes.data?.success) {
          setBatchesData(batchesRes.data.data || []);
        }

        setSelectorModal(false);
        setActiveBatchId(null);
        setActiveBatchName(null);
        setSelected(new Set());
        Alert.alert('✅ Deleted', `Sub Batch "${activeBatchName}" deleted successfully.`);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to delete batch.');
      }
    } catch (err) {
      console.warn('Delete batch error:', err);
      Alert.alert('Error', 'Failed to delete batch.');
    } finally {
      setDeletingBatch(false);
    }
  };

  const handleDeleteBatch = () => {
    if (!activeBatchId || !teacherMongoId || deletingBatch) return;

    const confirmMessage = `Are you sure you want to delete "${activeBatchName}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function'
        ? globalThis.confirm(confirmMessage)
        : false;

      if (ok) {
        deleteBatchNow();
      }
      return;
    }

    Alert.alert(
      'Delete Sub Batch',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteBatchNow,
        },
      ]
    );
  };

  const handleAssignStudentToDivision = async (student) => {
    if (!student?.id || !classInfo?.division || assigningStudentId) return;

    try {
      setAssigningStudentId(student.id);
      const res = await axiosInstance.put(`/students/assign-division/${student.id}`, {
        division: classInfo.division,
      });

      if (res.data?.success) {
        setStudents((prev) => prev.map((s) => (
          s.id === student.id ? { ...s, division: classInfo.division } : s
        )));
        await fetchSubDivStudents(teacherMongoId);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to assign student to division.');
      }
    } catch (err) {
      console.warn('Assign division error:', err);
      Alert.alert('Error', 'Failed to assign student to division.');
    } finally {
      setAssigningStudentId(null);
    }
  };

  const handleUnassignStudentFromDivision = async (student) => {
    if (!student?.id || unassigningStudentId) return;

    const confirmMessage = `Remove ${student.name || 'this student'} from Division ${classInfo?.division}? This will also remove them from any sub-batches.`;

    if (Platform.OS === 'web') {
      const ok = typeof globalThis.confirm === 'function'
        ? globalThis.confirm(confirmMessage)
        : false;

      if (!ok) return;
    } else {
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Remove Student From Division',
          confirmMessage,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });

      if (!confirmed) return;
    }

    try {
      setUnassigningStudentId(student.id);
      const res = await axiosInstance.put(`/students/unassign-division/${student.id}`);

      if (res.data?.success) {
        await fetchAllYearStudents(teacherMongoId);
        await fetchSubDivStudents(teacherMongoId);

        const batchesRes = await axiosInstance.get(`/teachers/${teacherMongoId}/batches`);
        if (batchesRes.data?.success && Array.isArray(batchesRes.data.data)) {
          setBatchesData(batchesRes.data.data);
        }

        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(student.id);
          return next;
        });

        Alert.alert('✅ Removed', `${student.name || 'Student'} removed from division successfully.`);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to remove student from division.');
      }
    } catch (err) {
      console.warn('Unassign student error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to remove student from division.');
    } finally {
      setUnassigningStudentId(null);
    }
  };

  /* ── Error state ── */
  if (!loading && loadError) {
    return (
      <SafeAreaView style={[bs.root, { backgroundColor: T.bg }]}>
        <View style={[bs.header, { backgroundColor: T.headerBg, borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={[bs.backBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]} activeOpacity={0.75}>
            <Text style={[bs.backArrow, { color: T.accentBright }]}>←</Text>
          </TouchableOpacity>
          <Text style={[bs.headerTitle, { color: T.textPrimary }]}>Batch Management</Text>
        </View>
        <View style={[bs.center, { backgroundColor: T.bg }]}>
          <Text style={{ fontSize: 36 }}>⚠️</Text>
          <Text style={[bs.headerTitle, { color: T.textPrimary, textAlign: 'center' }]}>Assignment Required</Text>
          <Text style={{ color: T.textSec, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>{loadError}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={{ marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: T.accent, borderRadius: 10 }}
            activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={[bs.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={[bs.loadingText, { color: T.textSec }]}>Loading class data…</Text>
      </View>
    );
  }

  /* ── Reusable student row ── */
  const renderStudentSelectRow = (item) => {
    const sid = item.id;
    const isSelected = selected.has(sid);

    const handleRowPress = () => {
      if (blockRowPressRef.current[sid]) {
        blockRowPressRef.current[sid] = false;
        return;
      }
      toggleStudent(sid);
    };
    // Check if this student is currently in any other batch
    let currentBatchName = null;
    let currentBatchColor = null;
    if (batchesData && batchesData.length > 0) {
      for (let i = 0; i < batchesData.length; i++) {
        const batch = batchesData[i];
        if (batch._id !== activeBatchId) { // Don't show if it's the active one
          const studentIds = batch.students?.map(s => s.studentId) || [];
          if (studentIds.includes(sid)) {
            currentBatchName = batch.batchName;
            const colors = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];
            currentBatchColor = colors[i % colors.length];
            break;
          }
        }
      }
    }

    return (
      <TouchableOpacity
        key={item.id || item._id}
        onPress={handleRowPress}
        activeOpacity={0.78}
        style={[
          bs.studentRow,
          { backgroundColor: isSelected ? T.accentSoft : T.surface, borderColor: isSelected ? T.pillBorder : T.border },
        ]}>
        <View style={[bs.checkbox, {
          backgroundColor: isSelected ? T.accent : 'transparent',
          borderColor: isSelected ? T.accent : T.border,
        }]}>
          {isSelected && <Text style={bs.checkMark}>✓</Text>}
        </View>
        <View style={[bs.stuAvatar, { backgroundColor: T.accentSoft }]}>
          <Text style={[bs.stuAvatarText, { color: T.accent }]}>
            {(item.name || '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[bs.stuName, { color: T.textPrimary }]}>{item.name}</Text>
          <Text style={[bs.stuMeta, { color: T.textMuted }]}>
            {item.prn ? `PRN: ${item.prn}` : ''}
          </Text>
        </View>
        <View
          style={{ alignItems: 'flex-end', gap: 6 }}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}>
          <TextInput
            value={rollInputs[sid] ?? ''}
            onChangeText={(val) => {
              const digitsOnly = val.replace(/[^0-9]/g, '');
              setRollInputs((prev) => ({ ...prev, [sid]: digitsOnly }));
            }}
            onFocus={() => { blockRowPressRef.current[sid] = true; }}
            onBlur={() => { blockRowPressRef.current[sid] = false; }}
            onPressIn={(e) => {
              blockRowPressRef.current[sid] = true;
              e?.stopPropagation?.();
            }}
            onTouchStart={(e) => {
              blockRowPressRef.current[sid] = true;
              e?.stopPropagation?.();
            }}
            onClick={(e) => {
              blockRowPressRef.current[sid] = true;
              e?.stopPropagation?.();
            }}
            keyboardType="number-pad"
            placeholder="Roll"
            placeholderTextColor={T.textMuted}
            style={[
              bs.rollInput,
              { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.inputText },
            ]}
          />
          {currentBatchName && (
            <View style={[bs.batchPillSmall, {
              backgroundColor: (currentBatchColor || T.accent) + '22',
              borderColor: (currentBatchColor || T.accent) + '66',
            }]}>
              <Text style={[bs.batchPillSmallText, { color: currentBatchColor || T.accent }]}>
                {currentBatchName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[bs.root, { backgroundColor: T.bg }]}>

      {/* ── Header ── */}
      <View style={[bs.header, { backgroundColor: T.headerBg, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={[bs.backBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]} activeOpacity={0.75}>
          <Text style={[bs.backArrow, { color: T.accentBright }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[bs.headerTitle, { color: T.textPrimary }]}>Batch Management</Text>
          <Text style={[bs.headerSub, { color: T.textSec }]}>
            {classInfo ? `${classInfo.year} · Div ${classInfo.division} · ` : ''}
            {students.length} students · {batchesData?.length || 0} sub batches
          </Text>
        </View>
      </View>

      {/* ── Action Bar — Create / Manage Sub Batch ── */}
      <View style={[bs.actionBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity
          onPress={openBatchPicker}
          activeOpacity={0.82}
          style={[bs.actionBarBtn, { backgroundColor: T.accent, flex: 1 }]}>
          <Text style={bs.actionBarBtnIcon}>➕</Text>
          <Text style={bs.actionBarBtnText}>Create / Manage Sub Batch</Text>
        </TouchableOpacity>
      </View>

      {/* ── Class Info Card ── */}
      {classInfo && (
        <View style={[bs.classInfoCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={[bs.classInfoStrip, { backgroundColor: T.accent }]} />
          <View style={bs.classInfoContent}>
            <View style={bs.classInfoHeader}>
              <View style={[bs.classInfoBadge, { backgroundColor: T.accentSoft }]}>
                <Text style={[bs.classInfoBadgeText, { color: T.accent }]}>
                  {classInfo.year.split(' ')[0]}{classInfo.division}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bs.classInfoTitle, { color: T.textPrimary }]}>
                  {classInfo.year} Division {classInfo.division}
                </Text>
                <Text style={[bs.classInfoSub, { color: T.textSec }]}>
                  {students.length} student{students.length !== 1 ? 's' : ''} in class
                </Text>
              </View>
            </View>

            {/* Sub Batches summary pills */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {batchesData?.length > 0 ? (
                batchesData.map((batch, idx) => {
                  const colors = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];
                  const color = colors[idx % colors.length];
                  const count = batch.students?.length || 0;
                  return (
                    <TouchableOpacity
                      key={batch._id}
                      onPress={() => openBatchEditor(batch._id, batch.batchName)}
                      activeOpacity={0.8}
                      style={[bs.batchSummaryPill, { backgroundColor: color + '18', borderColor: color + '55' }]}>
                      <View style={[bs.batchSummaryDot, { backgroundColor: color }]} />
                      <Text style={[bs.batchSummaryLabel, { color }]}>{batch.batchName}</Text>
                      <Text style={[bs.batchSummaryCount, { color }]}>{count} students</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[bs.emptySub, { color: T.textMuted }]}>No sub batches yet — tap the button above to create one</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Tab switcher ── */}
      <View style={[bs.tabRow, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        {[
          { key: 'students', label: `Students (${students.length})` },
          { key: 'batches',  label: `Sub Batches (${batchesData?.length || 0})` },
        ].map(tab => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} activeOpacity={0.75}
            style={[bs.tabItem, activeTab === tab.key && [bs.tabItemActive, { borderBottomColor: T.accent }]]}>
            <Text style={[bs.tabLabel, { color: activeTab === tab.key ? T.accent : T.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Students Tab ── */}
      {activeTab === 'students' && (
        <FlatList
          data={students}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={bs.listContent}
          ListEmptyComponent={
            <View style={[bs.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={bs.emptyIcon}>🎓</Text>
              <Text style={[bs.emptyTitle, { color: T.textPrimary }]}>No students found</Text>
              <Text style={[bs.emptySub, { color: T.textSec }]}>
                Make sure students are linked to this class in the backend.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            // Check which sub batch this student is in
            let studentBatch = null;
            let batchColor = null;
            if (batchesData && batchesData.length > 0) {
              for (let i = 0; i < batchesData.length; i++) {
                const batch = batchesData[i];
                const studentIds = batch.students?.map(s => s.studentId) || [];
                if (studentIds.includes(item.id)) {
                  studentBatch = batch.batchName;
                  const colors = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];
                  batchColor = colors[i % colors.length];
                  break;
                }
              }
            }

            const isAssignedToDivision = String(item.division || '').trim().toUpperCase() === String(classInfo?.division || '').trim().toUpperCase();
            const isAssigningThis = assigningStudentId === item.id;

            return (
              <TouchableOpacity
                onPress={() => handleAssignStudentToDivision(item)}
                activeOpacity={0.8}
                disabled={isAssigningThis || isAssignedToDivision}
                style={[bs.stuListRow, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[bs.rollBadge, { backgroundColor: T.accentSoft }]}>
                  <Text style={[bs.rollBadgeText, { color: T.accentBright }]}>
                    {item.roll_no || String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
                <View style={[bs.stuAvatar, { backgroundColor: T.accentSoft }]}>
                  <Text style={[bs.stuAvatarText, { color: T.accent }]}>
                    {(item.name || '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[bs.stuName, { color: T.textPrimary }]}>{item.name}</Text>
                  <Text style={[bs.stuMeta, { color: T.textMuted }]}>{item.prn || ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {isAssigningThis ? (
                    <ActivityIndicator size="small" color={T.accent} />
                  ) : studentBatch ? (
                    <View style={[bs.batchPillSmall, { backgroundColor: batchColor + '22', borderColor: batchColor + '55' }]}>
                      <Text style={[bs.batchPillSmallText, { color: batchColor }]}>{studentBatch}</Text>
                    </View>
                  ) : isAssignedToDivision ? (
                    <View style={[bs.batchPillSmall, { backgroundColor: T.greenSoft, borderColor: T.green }]}>
                      <Text style={[bs.batchPillSmallText, { color: T.green }]}>Div {classInfo?.division}</Text>
                    </View>
                  ) : (
                    <View style={[bs.unassignedPill, { backgroundColor: T.surface, borderColor: T.border }]}>
                      <Text style={[bs.unassignedPillText, { color: T.textMuted }]}>Tap to assign Div {classInfo?.division}</Text>
                    </View>
                  )}

                  {isAssignedToDivision ? (
                    <TouchableOpacity
                      onPress={() => handleUnassignStudentFromDivision(item)}
                      disabled={isAssigningThis || unassigningStudentId === item.id}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: T.red,
                        backgroundColor: T.redSoft,
                        opacity: unassigningStudentId === item.id ? 0.7 : 1,
                      }}>
                      {unassigningStudentId === item.id ? (
                        <ActivityIndicator size="small" color={T.red} />
                      ) : (
                        <Text style={{ color: T.red, fontSize: 12, fontWeight: '700' }}>Remove from Div</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Sub Batches Tab ── */}
      {activeTab === 'batches' && (
        <ScrollView contentContainerStyle={bs.listContent} showsVerticalScrollIndicator={false}>
          {batchesData && batchesData.length > 0 ? (
            batchesData.map((batch, idx) => {
              const colors = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];
              const color = colors[idx % colors.length];
              const members = batch.students
                ? subDivStudents.filter(s => batch.students.map(sb => sb.studentId).includes(s.id))
                : [];

              return (
                <View key={batch._id} style={[bs.batchCard, { backgroundColor: T.card, borderColor: color + '44', shadowColor: T.shadowColor }]}>
                  <View style={[bs.batchStrip, { backgroundColor: color }]} />
                  <View style={bs.batchBody}>
                    {/* Title row */}
                    <View style={bs.batchTitleRow}>
                      <View style={[bs.batchIconWrap, { backgroundColor: color + '22' }]}>
                        <Text style={[bs.batchIconText, { color }]}>{batch.batchName.slice(0, 2)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[bs.batchName, { color: T.textPrimary }]}>{batch.batchName}</Text>
                        <Text style={[bs.batchCount, { color: T.textSec }]}>
                          {members.length} student{members.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openBatchEditor(batch._id, batch.batchName)}
                        style={[bs.actionBtn, { backgroundColor: color + '18', borderColor: color + '44' }]}
                        activeOpacity={0.75}>
                        <Text style={[bs.actionBtnText, { color }]}>✏️</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Members */}
                    {members.length > 0 ? (
                      <View style={bs.memberList}>
                        {members.slice(0, 5).map((s) => (
                          <View key={s.id} style={[bs.memberPill, { backgroundColor: color + '18', borderColor: color + '44' }]}>
                            <Text style={[bs.memberPillText, { color }]}>{s.name}</Text>
                          </View>
                        ))}
                        {members.length > 5 && (
                          <View style={[bs.memberPill, { backgroundColor: T.accentSoft, borderColor: T.border }]}>
                            <Text style={[bs.memberPillText, { color: T.textSec }]}>+{members.length - 5} more</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={[bs.noStudentsText, { color: T.textMuted }]}>No students assigned yet</Text>
                    )}

                    {/* Manage button */}
                    <TouchableOpacity
                      onPress={() => openBatchEditor(batch._id, batch.batchName)}
                      style={[bs.assignBtn, { backgroundColor: color + '18', borderColor: color + '44' }]}
                      activeOpacity={0.78}>
                      <Text style={[bs.assignBtnText, { color }]}>👤 Manage Students</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[bs.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={bs.emptyIcon}>📦</Text>
              <Text style={[bs.emptyTitle, { color: T.textPrimary }]}>No sub batches yet</Text>
              <Text style={[bs.emptySub, { color: T.textSec }]}>
                Tap the button above to create your first sub batch
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL 1 — Sub Batch Picker & Creator
      ══════════════════════════════════════════════════════ */}
      <Modal visible={pickerModal} transparent animationType="slide" onRequestClose={() => setPickerModal(false)}>
        <Pressable
          style={[bs.modalBackdrop, { justifyContent: 'flex-end' }]}
          onPress={() => setPickerModal(false)}>
          <Pressable
            style={[bs.pickerSheet, { backgroundColor: T.modalBg, borderColor: T.border }]}
            onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={[bs.sheetHandle, { backgroundColor: T.border }]} />
            <Text style={[bs.fullModalTitle, { color: T.textPrimary, marginBottom: 4, paddingHorizontal: 20 }]}>
              Manage Sub Batches
            </Text>
            <Text style={[bs.fullModalSub, { color: T.textSec, marginBottom: 16, paddingHorizontal: 20 }]}>
              Create new or edit existing sub batches
            </Text>

            {/* Create new batch input */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
              <TextInput
                value={createBatchName}
                onChangeText={setCreateBatchName}
                placeholder="Enter sub batch name (e.g., B1, B2)…"
                placeholderTextColor={T.textMuted}
                style={[bs.fieldInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.inputText }]}
              />
              <TouchableOpacity
                onPress={handleCreateBatch}
                disabled={creatingBatch || !createBatchName.trim()}
                style={[bs.assignBtn, { backgroundColor: creatingBatch ? T.textMuted : T.accent, borderColor: T.border }]}
                activeOpacity={0.8}>
                {creatingBatch ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[bs.assignBtnText, { color: '#fff' }]}>➕ Create New Sub Batch</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: T.border, marginVertical: 12 }} />

            {/* Existing batches */}
            <Text style={[bs.fullModalSub, { color: T.textSec, paddingHorizontal: 20, marginBottom: 8 }]}>
              Existing Sub Batches ({batchesData?.length || 0})
            </Text>

            <ScrollView
              style={{ maxHeight: 200 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}>
              {batchesData && batchesData.length > 0 ? (
                batchesData.map((batch, idx) => {
                  const colors = ['#6366f1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];
                  const color = colors[idx % colors.length];
                  const count = batch.students?.length || 0;
                  return (
                    <TouchableOpacity
                      key={batch._id}
                      onPress={() => openBatchEditor(batch._id, batch.batchName)}
                      activeOpacity={0.82}
                      style={[bs.batchPickerRow, { borderColor: T.border }]}>
                      <View style={[bs.batchPickerIcon, { backgroundColor: color + '22' }]}>
                        <Text style={[bs.batchPickerIconText, { color }]}>{batch.batchName.slice(0, 2)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[bs.batchPickerLabel, { color: T.textPrimary }]}>{batch.batchName}</Text>
                        <Text style={[bs.batchPickerSub, { color: T.textSec }]}>
                          {count > 0 ? `${count} students assigned` : 'No students yet — tap to assign'}
                        </Text>
                      </View>
                      <Text style={[bs.batchPickerArrow, { color: T.textMuted }]}>→</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[bs.fullModalSub, { color: T.textMuted, textAlign: 'center', marginVertical: 16 }]}>
                  No sub batches created yet
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setPickerModal(false)}
              style={[bs.pickerCancelBtn, { backgroundColor: T.accentSoft, borderColor: T.border, margin: 16, marginTop: 8 }]}
              activeOpacity={0.75}>
              <Text style={[bs.modalCancelText, { color: T.textSec }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL 2 — Student Selector for a specific sub batch
      ══════════════════════════════════════════════════════ */}
      <Modal visible={selectorModal} transparent animationType="slide" onRequestClose={() => setSelectorModal(false)}>
        {/* Backdrop fills the full screen behind the sheet */}
        <Pressable
          style={[bs.modalBackdrop, { justifyContent: 'flex-end' }]}
          onPress={() => setSelectorModal(false)}>
          {/* Stop-propagation wrapper so taps inside the card don't close it */}
          <Pressable
            style={[bs.fullModalCard, { backgroundColor: T.modalBg, borderColor: T.border, shadowColor: T.shadowColor }]}
            onPress={e => e.stopPropagation()}>

            {/* Drag handle */}
            <View style={[bs.sheetHandle, { backgroundColor: T.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 }]} />

            {/* Header */}
            <View style={[bs.fullModalHeader, { borderBottomColor: T.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[bs.fullModalTitle, { color: T.textPrimary }]}>
                  {activeBatchName} — Assign Students
                </Text>
                <Text style={[bs.fullModalSub, { color: T.textSec }]}>
                  {selected.size} selected · tap to toggle
                </Text>
                <TouchableOpacity
                  onPress={handleDeleteBatch}
                  disabled={deletingBatch || saving}
                  activeOpacity={0.75}
                  style={{
                    marginTop: 10,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: T.red,
                    backgroundColor: T.redSoft,
                  }}>
                  {deletingBatch ? (
                    <ActivityIndicator size="small" color={T.red} />
                  ) : (
                    <Text style={{ color: T.red, fontSize: 12, fontWeight: '700' }}>Delete Batch</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setSelectorModal(false)} activeOpacity={0.75}>
                <Text style={[bs.modalCloseX, { color: T.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <View style={[bs.searchBar, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
                <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                <TextInput
                  value={selectorSearch}
                  onChangeText={setSelectorSearch}
                  placeholder="Search by name or roll no…"
                  placeholderTextColor={T.textMuted}
                  style={{ flex: 1, fontSize: 14, color: T.inputText, paddingVertical: 0 }}
                />
                {selectorSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectorSearch('')} activeOpacity={0.7}>
                    <Text style={{ fontSize: 14, color: T.textMuted, paddingLeft: 6 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Select-all / deselect-all row */}
            {subDivStudents.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, color: T.textMuted }}>
                  {selected.size} of {subDivStudents.length} selected
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const filtered = subDivStudents.filter(s =>
                      !selectorSearch ||
                      s.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
                      (s.roll_no || '').toLowerCase().includes(selectorSearch.toLowerCase())
                    );
                    const allFilteredSelected = filtered.every(s => selected.has(s.id));
                    if (allFilteredSelected) {
                      setSelected(prev => {
                        const next = new Set(prev);
                        filtered.forEach(s => next.delete(s.id));
                        return next;
                      });
                    } else {
                      setSelected(prev => {
                        const next = new Set(prev);
                        filtered.forEach(s => next.add(s.id));
                        return next;
                      });
                    }
                  }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.accent }}>
                    {subDivStudents
                      .filter(s =>
                        !selectorSearch ||
                        s.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
                        (s.roll_no || '').toLowerCase().includes(selectorSearch.toLowerCase())
                      )
                      .every(s => selected.has(s.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scrollable student list — flexShrink so it respects maxHeight */}
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={[bs.fullModalBody, { gap: 8 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {(() => {
                const filtered = subDivStudents.filter(s =>
                  !selectorSearch ||
                  s.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
                  (s.roll_no || '').toLowerCase().includes(selectorSearch.toLowerCase())
                );
                if (subDivStudents.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🎓</Text>
                      <Text style={[bs.fullModalTitle, { color: T.textPrimary, fontSize: 14 }]}>No students found</Text>
                      <Text style={[bs.fullModalSub, { color: T.textSec, textAlign: 'center', marginTop: 4 }]}>
                        Students in your class will appear here.
                      </Text>
                    </View>
                  );
                }
                if (filtered.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                      <Text style={{ fontSize: 28, marginBottom: 8 }}>🔍</Text>
                      <Text style={[bs.fullModalTitle, { color: T.textPrimary, fontSize: 14 }]}>No match</Text>
                      <Text style={[bs.fullModalSub, { color: T.textSec, textAlign: 'center', marginTop: 4 }]}>
                        Try a different name or roll number.
                      </Text>
                    </View>
                  );
                }
                return filtered.map(item => renderStudentSelectRow(item));
              })()}
            </ScrollView>

            {/* Footer */}
            <View style={[bs.fullModalFooter, { borderTopColor: T.border }]}>
              <TouchableOpacity
                onPress={() => setSelectorModal(false)}
                style={[bs.modalCancelBtn, { backgroundColor: T.accentSoft, borderColor: T.border }]}
                activeOpacity={0.75}>
                <Text style={[bs.modalCancelText, { color: T.textSec }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[bs.modalSaveBtn, { backgroundColor: T.accent }]}
                activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={bs.modalSaveText}>Save {activeBatchName} ({selected.size})</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

/* ─── Batch styles ────────────────────────────────────────────────────────── */
const bs = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  backArrow:   { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub:   { fontSize: 11, marginTop: 1 },

  /* Action bar */
  actionBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionBarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 11,
  },
  actionBarBtnOutline: {
    backgroundColor: 'transparent', borderWidth: 1.5,
  },
  actionBarBtnIcon: { fontSize: 14, color: '#fff' },
  actionBarBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Tab row */
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 13, fontWeight: '700' },

  /* Lists */
  listContent: { padding: 14, gap: 10, paddingBottom: 32 },

  /* Student list row */
  stuListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  rollBadge: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rollBadgeText: { fontSize: 12, fontWeight: '800' },

  batchPillSmall: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  batchPillSmallText: { fontSize: 11, fontWeight: '700' },
  unassignedPill: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  unassignedPillText: { fontSize: 11, fontWeight: '500' },

  /* Empty state */
  emptyCard: {
    borderRadius: 18, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 10,
  },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  /* Batch card */
  batchCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  batchStrip: { height: 4 },
  batchBody:  { padding: 16, gap: 12 },
  batchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  batchIconText: { fontSize: 15, fontWeight: '800' },
  batchName:     { fontSize: 15, fontWeight: '800' },
  batchDesc:     { fontSize: 11, marginTop: 2 },
  batchCount:    { fontSize: 11, marginTop: 1 },
  batchActions:  { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  actionBtnText: { fontSize: 14 },

  memberList:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  memberPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  memberPillText: { fontSize: 11, fontWeight: '600' },
  noStudentsText: { fontSize: 12, fontStyle: 'italic' },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  assignBtnText: { fontSize: 13, fontWeight: '700' },

  /* Full-screen bottom sheet modal */
  fullModalRoot: { flex: 1, justifyContent: 'flex-end' },
  fullModalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, maxHeight: '92%', minHeight: '50%',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
    flexShrink: 1,
  },
  fullModalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1,
  },
  fullModalTitle: { fontSize: 17, fontWeight: '800' },
  fullModalSub:   { fontSize: 12, marginTop: 2 },
  fullModalBody:  { padding: 16, gap: 4, paddingBottom: 8 },
  fullModalFooter: {
    flexDirection: 'row', gap: 10,
    padding: 16, borderTopWidth: 1,
  },
  modalCloseX: { fontSize: 18, padding: 4 },

  /* Small sheet modal (rename) */
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, padding: 24,
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  sheetSub:   { fontSize: 13, lineHeight: 19, marginBottom: 16 },

  /* Form fields */
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  fieldInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, marginBottom: 4,
  },
  fieldInputMulti: { minHeight: 64, textAlignVertical: 'top' },

  /* Select students header */
  selectStudentsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6, marginBottom: 8,
  },
  selectionCount: { fontSize: 12, fontWeight: '700' },

  /* Batch picker dropdown */
  batchPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 2,
  },
  batchPickerBtnText: { fontSize: 14, fontWeight: '500' },
  batchPickerArrow:   { fontSize: 11 },
  batchPickerDropdown: {
    borderWidth: 1, borderRadius: 10, overflow: 'hidden',
    marginBottom: 4,
  },
  batchPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  batchPickerDot:       { width: 10, height: 10, borderRadius: 5 },
  batchPickerItemText:  { flex: 1, fontSize: 14, fontWeight: '600' },
  batchPickerItemCount: { fontSize: 12 },

  /* Modal buttons */
  modalBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modalCancelText:{ fontSize: 14, fontWeight: '600' },
  modalSaveBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  modalSaveText:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Student select row */
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
  },

  /* Search bar inside selector modal */
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark:    { color: '#fff', fontSize: 13, fontWeight: '900' },
  stuAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  stuAvatarText: { fontSize: 15, fontWeight: '800' },
  stuName:       { fontSize: 14, fontWeight: '600' },
  stuMeta:       { fontSize: 11, marginTop: 1 },
  rollInput: {
    width: 72,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedBadgeText: { fontSize: 12, fontWeight: '800' },

  /* Class info card */
  classInfoCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', margin: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  classInfoStrip: { height: 3, width: '100%' },
  classInfoContent: { padding: 16, gap: 14 },
  classInfoHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  classInfoBadge: {
    width: 50, height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  classInfoBadgeText: { fontSize: 16, fontWeight: '900' },
  classInfoTitle: { fontSize: 15, fontWeight: '800' },
  classInfoSub: { fontSize: 12, marginTop: 2 },

  /* Students preview */
  studentsPreviewContainer: { gap: 8 },
  studentsPreviewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  studentsPreviewGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  studentPreviewPill: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  studentPreviewInitial: { fontSize: 14, fontWeight: '800' },
  studentPreviewText: { fontSize: 12, fontWeight: '600' },

  /* Batch summary pills in class info card */
  batchSummaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  batchSummaryDot:   { width: 8, height: 8, borderRadius: 4 },
  batchSummaryLabel: { fontSize: 13, fontWeight: '700' },
  batchSummaryCount: { fontSize: 11, fontWeight: '500' },

  /* Batch picker bottom sheet */
  pickerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingTop: 12, paddingBottom: 8,
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  batchPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  batchPickerIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  batchPickerIconText: { fontSize: 16, fontWeight: '900' },
  batchPickerLabel:    { fontSize: 15, fontWeight: '700' },
  batchPickerSub:      { fontSize: 12, marginTop: 2 },
  batchPickerArrow:    { fontSize: 18 },
  pickerCancelBtn: {
    paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  studentIds: [], // ✅ Empty array initially — teacher adds students later
});