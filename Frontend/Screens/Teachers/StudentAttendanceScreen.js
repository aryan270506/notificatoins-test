// Screens/Teachers/StudentAttendanceScreen.js
// ✅ Fully connected — axiosInstance (no hardcoded IP), Year → Division → Batch → Roll No
//    Subject-wise bars, animated ring, class overview table, all buttons functional

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Src/Axios';   
import { ThemeContext } from './TeacherStack';

/* ─── Theme ──────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:         '#07090F',
  surface:    '#0E1117',
  card:       '#121820',
  cardEl:     '#181F2B',
  border:     '#1A2235',
  accent:     '#6366F1',
  accentSoft: 'rgba(99,102,241,0.14)',
  green:      '#22C55E',
  greenSoft:  'rgba(34,197,94,0.13)',
  yellow:     '#F59E0B',
  yellowSoft: 'rgba(245,158,11,0.13)',
  red:        '#EF4444',
  redSoft:    'rgba(239,68,68,0.13)',
  cyan:       '#06B6D4',
  cyanSoft:   'rgba(6,182,212,0.13)',
  purple:     '#A855F7',
  purpleSoft: 'rgba(168,85,247,0.13)',
  orange:     '#F97316',
  orangeSoft: 'rgba(249,115,22,0.13)',
  textPri:    '#F0F4FF',
  textSec:    '#7C8BA8',
  textMuted:  '#2E3A52',
};
const C_LIGHT = {
  bg:         '#F1F4FD',
  surface:    '#FFFFFF',
  card:       '#FFFFFF',
  cardEl:     '#EAEEf9',
  border:     '#DDE3F4',
  accent:     '#4F46E5',
  accentSoft: 'rgba(79,70,229,0.09)',
  green:      '#059669',
  greenSoft:  'rgba(5,150,105,0.10)',
  yellow:     '#D97706',
  yellowSoft: 'rgba(217,119,6,0.10)',
  red:        '#DC2626',
  redSoft:    'rgba(220,38,38,0.10)',
  cyan:       '#0891B2',
  cyanSoft:   'rgba(8,145,178,0.10)',
  purple:     '#7C3AED',
  purpleSoft: 'rgba(124,58,237,0.10)',
  orange:     '#EA580C',
  orangeSoft: 'rgba(234,88,12,0.10)',
  textPri:    '#0F172A',
  textSec:    '#4B5563',
  textMuted:  '#9CA3AF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Static options ─────────────────────────────────────────────────────── */
const LAB_BATCHES   = ['All', 'Batch 1', 'Batch 2', 'Batch 3'];

const STATUS_META_FN = (C) => ({
  Excellent: { color: C.green,  bg: C.greenSoft,  icon: 'star'            },
  Regular:   { color: C.cyan,   bg: C.cyanSoft,   icon: 'checkmark-circle' },
  'At Risk': { color: C.yellow, bg: C.yellowSoft, icon: 'warning'         },
  Critical:  { color: C.red,    bg: C.redSoft,    icon: 'alert-circle'    },
});

const getStatus = (pct) =>
  pct >= 85 ? 'Excellent' : pct >= 75 ? 'Regular' : pct >= 60 ? 'At Risk' : 'Critical';

const getBatchLabel = (student) => {
  const raw = String(student?.batch || '').trim();
  if (raw) {
    return raw.replace(/^Batch\s+/i, '').trim() || '-';
  }
  const roll = String(student?.roll_no || student?.rollNumber || '').toUpperCase();
  const match = roll.match(/[A-Z](\d)$/);
  return match ? match[1] : '-';
};

const getDisplayRollNo = (student) => {
  const rawRoll = String(student?.roll_no || student?.rollNumber || '').trim();
  if (!rawRoll) return '—';

  const parts = rawRoll.split(/[-\s/]+/).filter(Boolean);
  const tail = parts[parts.length - 1] || rawRoll;
  if (/^\d+$/.test(tail)) return tail;

  const lastNumeric = rawRoll.match(/(\d+)(?!.*\d)/);
  return lastNumeric ? lastNumeric[1] : rawRoll;
};

/* ─── Animated Circular Progress Ring ───────────────────────────────────── */
const RingProgress = ({ pct, size = 80, stroke = 7 }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const color = pct >= 85 ? C.green : pct >= 75 ? C.cyan : pct >= 60 ? C.yellow : C.red;
  const anim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: stroke, borderColor: C.border,
      }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: pct > 25 ? color : 'transparent',
        borderBottomColor: pct > 50 ? color : 'transparent',
        borderLeftColor: pct > 75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }], opacity: 0.9,
      }} />
      <Text style={{ fontSize: size * 0.22, fontWeight: '900', color, fontFamily: SERIF }}>{pct}%</Text>
    </View>
  );
};

/* ─── Animated Subject Bar ───────────────────────────────────────────────── */
const SubjectBar = ({ data, index }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const bar = makeBar(C);
  const anim  = useRef(new Animated.Value(0)).current;
  const color = data.pct >= 85 ? C.green : data.pct >= 75 ? C.cyan : data.pct >= 60 ? C.yellow : C.red;
  useEffect(() => {
    Animated.timing(anim, { toValue: data.pct / 100, duration: 650, delay: index * 70, useNativeDriver: false }).start();
  }, [data.pct]);
  return (
    <View style={bar.wrap}>
      <View style={bar.labelRow}>
        <Text style={bar.subject} numberOfLines={1}>{data.subject}</Text>
        <Text style={[bar.pct, { color }]}>{data.pct}%</Text>
      </View>
      <View style={bar.track}>
        <Animated.View style={[bar.fill, {
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: color,
        }]} />
      </View>
      {data.present !== undefined && data.present !== '-' && (
        <Text style={bar.classes}>{data.present}/{data.total} classes attended</Text>
      )}
    </View>
  );
};
const makeBar = (C) => StyleSheet.create({
  wrap:     { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subject:  { fontSize: 13, fontWeight: '600', color: C.textSec, flex: 1, marginRight: 8 },
  pct:      { fontSize: 14, fontWeight: '900' },
  track:    { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  fill:     { height: '100%', borderRadius: 4 },
  classes:  { fontSize: 10, color: C.textMuted },
});

/* ─── Chip ───────────────────────────────────────────────────────────────── */
const Chip = ({ label, active, onPress, color = '#4F46E5' }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const ch = makeCh(C);
  return (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75}
    style={[ch.base, active && { borderColor: color, backgroundColor: color + '1A' }]}>
    <Text style={[ch.text, active && { color }]}>{label}</Text>
  </TouchableOpacity>
  );
};
const makeCh = (C) => StyleSheet.create({
  base: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  text: { fontSize: 13, fontWeight: '700', color: C.textMuted },
});

/* ─── Step Dot ───────────────────────────────────────────────────────────── */
const StepDot = ({ num, done, active, label }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const st = makeSt(C);
  return (
  <View style={{ alignItems: 'center', gap: 5 }}>
    <View style={[st.dot, done && st.dotDone, active && st.dotActive]}>
      {done
        ? <Ionicons name="checkmark" size={12} color="#fff" />
        : <Text style={[st.num, active && { color: C.accent }]}>{num}</Text>}
    </View>
    <Text style={[st.label, (done || active) && { color: C.textPri }]}>{label}</Text>
  </View>
  );
};
const makeSt = (C) => StyleSheet.create({
  dot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotDone:   { backgroundColor: C.green, borderColor: C.green },
  dotActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  num:       { fontSize: 12, fontWeight: '800', color: C.textMuted },
  label:     { fontSize: 10, fontWeight: '600', color: C.textMuted, textAlign: 'center' },
});

/* ─── Section Header ─────────────────────────────────────────────────────── */
const SectionHeader = ({ icon, label, color }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  return (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
    <View style={[{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <Text style={{ fontSize: 12, fontWeight: '700', color: C.textSec, letterSpacing: 0.3 }}>{label}</Text>
  </View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */
export default function StudentAttendanceScreen() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const STATUS_META = STATUS_META_FN(C);
  const s = makeS(C);
  const navigation = useNavigation();
  const route = useRoute();
  const { width }  = useWindowDimensions();
  const isWide     = width >= 768;

  const [teacherId, setTeacherId] = useState(
    route?.params?.teacherId ||
    route?.params?.teacher?._id ||
    route?.params?.user?._id ||
    route?.params?.userData?._id ||
    null
  );

  /* ── Selection state ── */
  const [selYear,  setSelYear]  = useState(null);
  const [selDiv,   setSelDiv]   = useState(null);
  const [selBatch, setSelBatch] = useState('All');   // 'All' | 'Batch 1' | 'Batch 2' | 'Batch 3'
  const [selRoll,  setSelRoll]  = useState(null);    // student._id

  /* ── Data state ── */
  const [students,       setStudents]       = useState([]);   // class summary list
  const [studentDetail,  setStudentDetail]  = useState(null); // individual subject breakdown
  const [loadingClass,   setLoadingClass]   = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [activeTab,      setActiveTab]      = useState('subjects');
  const [classOptions,   setClassOptions]   = useState([]);
  const [divisionOptions, setDivisionOptions] = useState({});
  const [subjectOptions, setSubjectOptions] = useState({});

  /* ── Animations ── */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!teacherId) {
      AsyncStorage.getItem('teacherId').then(id => {
        if (id) setTeacherId(id);
      }).catch(() => {});
    }
  }, [teacherId]);

  useEffect(() => {
    if (studentDetail || students.find(s => s._id === selRoll)) {
      cardAnim.setValue(0);
      Animated.spring(cardAnim, { toValue: 1, tension: 70, friction: 13, useNativeDriver: true }).start();
    }
  }, [studentDetail, selRoll]);

  /* ── Fetch class summary (GET /api/attendance/class/summary) ─────────── */
  // Student.year in DB is "1"/"2"/"3", but Attendance.year stores "FY"/"SY"/"TY"
  // The class/summary endpoint matches on Attendance.year, so pass the label directly.
  const fetchClassSummary = useCallback(async (year, div, batch) => {
    setLoadingClass(true);
    setError(null);
    setStudents([]);
    setSelRoll(null);
    setStudentDetail(null);
    try {
      const res = await axiosInstance.get('/attendance/class/summary', {
        params: { year, division: div },
      });
      const mapped = (res.data.summary ?? []).map(s => ({
        _id:          s.studentId,
        name:         s.name         ?? 'Unknown',
        rollNumber:   s.rollNumber   ?? '—',
        overallPct:   s.overallPercentage ?? 0,
        status:       getStatus(s.overallPercentage ?? 0),
        subjects:     s.subjects     ?? [],
        totalPresent: s.totalPresent ?? 0,
        totalClasses: s.totalClasses ?? 0,
      }));
      setStudents(mapped);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load class data');
    } finally {
      setLoadingClass(false);
    }
  }, []);

  /* ── Fetch individual student attendance (GET /api/attendance/student/:id) ── */
  const fetchStudentDetail = useCallback(async (studentId, year, div) => {
    setLoadingStudent(true);
    setStudentDetail(null);
    try {
      const res = await axiosInstance.get(`/attendance/student/${studentId}`, {
        params: { year, division: div },
      });
      setStudentDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load student data');
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  /* ── Fetch all students for a class (for the roll-no picker) ─────────── */
  // Uses GET /api/students?year=FY&division=A&batch=Batch 1
  const fetchStudentList = useCallback(async (year, div, batch) => {
    setLoadingClass(true);
    setError(null);
    setStudents([]);
    setSelRoll(null);
    setStudentDetail(null);
    try {
      const params = { year, division: div };
      const res = await axiosInstance.get('/students', { params });
      const raw = Array.isArray(res.data?.data) ? res.data.data : [];

      let classStudents = raw;
      if (batch && batch !== 'All') {
        const batchNum = String(batch).match(/\d+/)?.[0];
        const divUpper = String(div || '').toUpperCase();
        classStudents = raw.filter((stu) => {
          const stuBatch = String(stu?.batch || '').toUpperCase().trim();
          const roll = String(stu?.roll_no || '').toUpperCase();
          if (stuBatch) {
            return (
              stuBatch === batchNum ||
              stuBatch === `BATCH ${batchNum}` ||
              stuBatch === `${divUpper}${batchNum}` ||
              stuBatch.endsWith(batchNum)
            );
          }
          return roll.includes(`${divUpper}${batchNum}`);
        });
      }

      // Now also pull class summary for attendance percentages
      let summaryMap = {};
      try {
        const sumRes = await axiosInstance.get('/attendance/class/summary', {
          params: { year, division: div },
        });
        (sumRes.data.summary ?? []).forEach(s => {
          summaryMap[String(s.studentId)] = s;
        });
      } catch (_) {}

      const mapped = classStudents.map(stu => {
        const sumEntry = summaryMap[String(stu._id)] || {};
        const pct      = sumEntry.overallPercentage ?? 0;
        const summarySubjects = Array.isArray(sumEntry.subjects) ? sumEntry.subjects : [];
        const profileSubjects = Array.isArray(stu.subjects) ? stu.subjects : [];
        const summarySubjectNames = new Set(
          summarySubjects.map(s => String(s?.subject || '').trim().toLowerCase()).filter(Boolean)
        );
        const profileSubjectRows = profileSubjects
          .map(name => String(name || '').trim())
          .filter(Boolean)
          .filter(name => !summarySubjectNames.has(name.toLowerCase()))
          .map(name => ({ subject: name, present: 0, total: 0, percentage: 0 }));

        return {
          _id:          stu._id,
          name:         stu.name,
          rollNumber:   stu.roll_no,
          displayRollNo: getDisplayRollNo(stu),
          batch:        getBatchLabel(stu),
          overallPct:   pct,
          status:       getStatus(pct),
          subjects:     [...summarySubjects, ...profileSubjectRows],
          totalPresent: sumEntry.totalPresent ?? 0,
          totalClasses: sumEntry.totalClasses ?? 0,
        };
      }).sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));

      setStudents(mapped);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoadingClass(false);
    }
  }, []);

  const fetchTimetableOptions = useCallback(async () => {
    if (!teacherId) {
      setClassOptions([]);
      setDivisionOptions({});
      return;
    }

    try {
      const res = await axiosInstance.get(`/timetable/teacher/${teacherId}`);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];

      const yearOrder = { FY: 1, SY: 2, TY: 3 };
      const years = [...new Set(data.map(item => item.year).filter(Boolean))]
        .sort((a, b) => (yearOrder[a] || 99) - (yearOrder[b] || 99));

      const divs = {};
      const subjectMap = {};
      years.forEach(year => {
        const yearRows = data.filter(item => item.year === year);
        const yearDivisions = [...new Set(
          yearRows.map(item => item.division).filter(Boolean)
        )].sort();
        divs[year] = yearDivisions;

        yearDivisions.forEach(division => {
          const key = `${year}-${division}`;
          subjectMap[key] = [...new Set(
            yearRows
              .filter(item => item.division === division)
              .map(item => item.subject)
              .filter(Boolean)
          )].sort();
        });
      });

      setClassOptions(years);
      setDivisionOptions(divs);
      setSubjectOptions(subjectMap);
    } catch (_) {
      setClassOptions([]);
      setDivisionOptions({});
      setSubjectOptions({});
      setError('Could not load teacher timetable options');
    }
  }, [teacherId]);

  useEffect(() => {
    fetchTimetableOptions();
  }, [fetchTimetableOptions]);

  useEffect(() => {
    if (selYear && !classOptions.includes(selYear)) {
      setSelYear(null);
      setSelDiv(null);
      setSelBatch('All');
      setSelRoll(null);
      setStudents([]);
      setStudentDetail(null);
      return;
    }
    if (selYear && selDiv && !(divisionOptions[selYear] || []).includes(selDiv)) {
      setSelDiv(null);
      setSelBatch('All');
      setSelRoll(null);
      setStudents([]);
      setStudentDetail(null);
    }
  }, [classOptions, divisionOptions, selYear, selDiv]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleYearSelect = (y) => {
    if (y === selYear) {
      setSelYear(null); setSelDiv(null); setSelBatch('All');
      setStudents([]); setSelRoll(null); setStudentDetail(null); setError(null);
      return;
    }
    setSelYear(y); setSelDiv(null); setSelBatch('All');
    setStudents([]); setSelRoll(null); setStudentDetail(null); setError(null);
  };

  const handleDivSelect = (d) => {
    const newDiv = d === selDiv ? null : d;
    setSelDiv(newDiv); setSelBatch('All');
    setSelRoll(null); setStudentDetail(null); setError(null);
    if (selYear && newDiv) {
      fetchStudentList(selYear, newDiv, 'All');
    } else {
      setStudents([]);
    }
  };

  const handleBatchSelect = (b) => {
    setSelBatch(b); setSelRoll(null); setStudentDetail(null);
    if (selYear && selDiv) {
      fetchStudentList(selYear, selDiv, b);
    }
  };

  const handleRollSelect = (student) => {
    if (selRoll === student._id) {
      setSelRoll(null); setStudentDetail(null); return;
    }
    setSelRoll(student._id);
    setActiveTab('subjects');
    fetchStudentDetail(student._id, selYear, selDiv);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selYear && selDiv) await fetchStudentList(selYear, selDiv, selBatch);
    if (selRoll) {
      const stu = students.find(s => s._id === selRoll);
      if (stu) await fetchStudentDetail(stu._id, selYear, selDiv);
    }
    setRefreshing(false);
  };

  const resetAll = () => {
    setSelYear(null); setSelDiv(null); setSelBatch('All');
    setSelRoll(null); setStudents([]); setStudentDetail(null); setError(null);
  };

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const selectedStudent = students.find(s => s._id === selRoll) ?? null;

  const subjectRows = (() => {
    const rowMap = {};
    const addRow = (row) => {
      const subject = String(row?.subject || '').trim();
      if (!subject) return;
      const key = subject.toLowerCase();
      if (rowMap[key]) return;
      rowMap[key] = {
        subject,
        present: Number(row?.present ?? 0),
        total:   Number(row?.total ?? 0),
        pct:     Number(row?.pct ?? row?.percentage ?? 0),
      };
    };

    (studentDetail?.subjectSummary || []).forEach(s => {
      addRow({ subject: s.subject, present: s.present, total: s.total, pct: s.percentage });
    });

    (selectedStudent?.subjects || []).forEach(s => {
      if (typeof s === 'string') {
        addRow({ subject: s, present: 0, total: 0, pct: 0 });
      } else {
        addRow({ subject: s.subject, present: s.present, total: s.total, pct: s.percentage });
      }
    });

    const timetableSubjects = subjectOptions[`${selYear}-${selDiv}`] || [];
    timetableSubjects.forEach(subject => {
      addRow({ subject, present: 0, total: 0, pct: 0 });
    });

    return Object.values(rowMap).sort((a, b) => a.subject.localeCompare(b.subject));
  })();

  const classAvgBySubject = (() => {
    if (!students.length) return [];
    const subMap = {};
    students.forEach(stu => {
      (stu.subjects ?? []).forEach(s => {
        if (!subMap[s.subject]) subMap[s.subject] = { sum: 0, count: 0 };
        subMap[s.subject].sum   += s.percentage ?? 0;
        subMap[s.subject].count += 1;
      });
    });
    return Object.entries(subMap).map(([subject, v]) => ({
      subject, pct: Math.round(v.sum / v.count), present: '-', total: '-',
    }));
  })();

  const classOverallAvg = students.length
    ? Math.round(students.reduce((a, s) => a + s.overallPct, 0) / students.length)
    : 0;

  const overallData = studentDetail?.overall ?? {
    present:    selectedStudent?.totalPresent ?? 0,
    total:      selectedStudent?.totalClasses ?? 0,
    percentage: selectedStudent?.overallPct   ?? 0,
  };

  // Step state
  const stepDone = { year: !!selYear, div: !!selDiv, roll: !!selRoll };

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={C.accent} colors={[C.accent]} />
        }>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ── */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Attendance  ›  Student View</Text>
              <Text style={s.title}>Student Attendance</Text>
              <Text style={s.sub}>
                {selectedStudent
                  ? `${selectedStudent.name}  ·  ${selectedStudent.rollNumber}`
                  : selDiv
                    ? `${selYear}-${selDiv}${selBatch !== 'All' ? ` · ${selBatch}` : ''}  ·  Select a student`
                    : selYear
                      ? `${selYear}  ·  Select division`
                      : 'Select year, division and roll number'}
              </Text>
            </View>
            <View style={s.headerActions}>
              {(selYear || selRoll) && (
                <TouchableOpacity style={s.resetBtn} onPress={resetAll} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={13} color={C.accent} />
                  <Text style={s.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={14} color={C.textPri} />
                <Text style={s.backBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Step progress ── */}
          <View style={s.stepRow}>
            <StepDot num={1} label="Year"    done={stepDone.year} active={!stepDone.year} />
            <View style={s.stepLine} />
            <StepDot num={2} label="Division" done={stepDone.div} active={stepDone.year && !stepDone.div} />
            <View style={s.stepLine} />
            <StepDot num={3} label="Batch"   done={selBatch !== 'All'} active={stepDone.div && selBatch === 'All'} />
            <View style={s.stepLine} />
            <StepDot num={4} label="Student" done={stepDone.roll} active={stepDone.div && !stepDone.roll} />
            <View style={s.stepLine} />
            <StepDot num={5} label="Details" done={false} active={stepDone.roll} />
          </View>

          {/* ── Error banner ── */}
          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color={C.red} />
              <Text style={s.errorText} numberOfLines={2}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)} style={s.errorDismiss}>
                <Ionicons name="close" size={14} color={C.red} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Selection Panel ── */}
          <View style={s.selPanel}>

            {/* Year */}
            <View style={s.selSection}>
              <SectionHeader icon="school-outline" label="Select Year" color={C.accent} />
              <View style={s.chipRow}>
                {classOptions.map(y => (
                  <Chip key={y} label={y} active={selYear === y} onPress={() => handleYearSelect(y)} color={C.accent} />
                ))}
              </View>
            </View>

            {/* Division */}
            <View style={s.selSection}>
              <SectionHeader icon="git-branch-outline" label="Select Division" color={C.purple} />
              <View style={s.chipRow}>
                {(divisionOptions[selYear] || []).map(d => (
                  <Chip key={d} label={`Div ${d}`} active={selDiv === d} onPress={() => handleDivSelect(d)} color={C.purple} />
                ))}
              </View>
            </View>

            {/* Batch (optional filter) */}
            <View style={s.selSection}>
              <SectionHeader icon="flask-outline" label="Filter by Batch" color={C.orange} />
              <View style={s.chipRow}>
                {LAB_BATCHES.map(b => (
                  <Chip key={b} label={b} active={selBatch === b} onPress={() => handleBatchSelect(b)} color={C.orange} />
                ))}
              </View>
            </View>

            {/* Roll number grid */}
            <View style={s.selSection}>
              <SectionHeader icon="person-outline" label="Select Student" color={C.cyan} />

              {loadingClass ? (
                <View style={s.loadingRow}>
                  <ActivityIndicator color={C.cyan} />
                  <Text style={s.loadingText}>Loading students…</Text>
                </View>
              ) : students.length === 0 ? (
                <View style={s.noDataWrap}>
                  <Ionicons name="people-outline" size={28} color={C.textMuted} />
                  <Text style={s.noDataText}>
                    No students found for {selYear}-{selDiv}
                      {selBatch !== 'All' ? ` · ${selBatch}` : ''}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Class attendance overview chips */}
                    <View style={s.classStatsRow}>
                      {[
                        { label: 'Total',     val: students.length,                                                color: C.accent },
                        { label: 'Good ≥75%', val: students.filter(s => s.overallPct >= 75).length,               color: C.green  },
                        { label: 'At Risk',   val: students.filter(s => s.overallPct >= 60 && s.overallPct < 75).length, color: C.yellow },
                        { label: 'Critical',  val: students.filter(s => s.overallPct < 60).length,                color: C.red    },
                      ].map(item => (
                        <View key={item.label} style={[s.classStat, { borderColor: item.color + '40', backgroundColor: item.color + '10' }]}>
                          <Text style={[s.classStatVal, { color: item.color }]}>{item.val}</Text>
                          <Text style={s.classStatLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Roll number grid */}
                    <View style={s.rollGrid}>
                      {students.map(stu => {
                        const isActive = selRoll === stu._id;
                        const meta     = STATUS_META[stu.status];
                        return (
                          <TouchableOpacity
                            key={String(stu._id)}
                            onPress={() => handleRollSelect(stu)}
                            activeOpacity={0.8}
                            style={[s.rollChip, isActive && { borderColor: meta.color, backgroundColor: meta.color + '18' }]}>
                            <Text style={[s.rollNum, isActive && { color: meta.color }]} numberOfLines={1}>
                              {stu.displayRollNo}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Legend */}
                    <View style={s.rollLegend}>
                      {Object.entries(STATUS_META).map(([label, meta]) => (
                        <View key={label} style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: meta.color }]} />
                          <Text style={s.legendText}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          {/* ── Student detail card ── */}
          {selectedStudent && (
            <Animated.View style={{
              opacity: cardAnim,
              transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            }}>
              {/* Identity card */}
              <View style={s.identityCard}>
                <View style={s.identityTop}>
                  <View style={[s.avatar, { backgroundColor: STATUS_META[selectedStudent.status].color + '22' }]}>
                    <Text style={[s.avatarText, { color: STATUS_META[selectedStudent.status].color }]}>
                      {selectedStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.studentName}>{selectedStudent.name}</Text>
                    <Text style={s.studentRoll}>
                      Roll {selectedStudent.rollNumber}  ·  {selYear}-{selDiv}
                      {selBatch !== 'All' ? `  ·  ${selBatch}` : ''}
                    </Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_META[selectedStudent.status].bg }]}>
                      <Ionicons
                        name={STATUS_META[selectedStudent.status].icon}
                        size={11}
                        color={STATUS_META[selectedStudent.status].color}
                      />
                      <Text style={[s.statusBadgeText, { color: STATUS_META[selectedStudent.status].color }]}>
                        {selectedStudent.status}
                      </Text>
                    </View>
                  </View>
                  {loadingStudent
                    ? <ActivityIndicator color={C.accent} size="small" />
                    : <RingProgress pct={overallData.percentage} size={isWide ? 88 : 76} stroke={8} />}
                </View>

                {/* Summary strip */}
                <View style={s.summaryStrip}>
                  {[
                    { label: 'Overall',    value: `${overallData.percentage}%`,              color: overallData.percentage >= 75 ? C.green : C.red },
                    { label: 'Present',    value: overallData.present,                        color: C.cyan   },
                    { label: 'Total',      value: overallData.total,                          color: C.accent },
                    { label: 'Below 75%',  value: subjectRows.filter(a => a.pct < 75).length, color: C.yellow },
                  ].map((item, i) => (
                    <View key={i} style={[s.summaryItem, { borderColor: item.color + '30', backgroundColor: item.color + '0D' }]}>
                      <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                      <Text style={s.summaryLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Quick attendance needed info */}
                {overallData.percentage < 75 && overallData.total > 0 && (() => {
                  // Classes needed to reach 75%
                  const needed = Math.ceil((0.75 * overallData.total - overallData.present) / 0.25);
                  return needed > 0 ? (
                    <View style={s.alertBanner}>
                      <Ionicons name="warning-outline" size={14} color={C.yellow} />
                      <Text style={s.alertText}>
                        Needs <Text style={{ color: C.yellow, fontWeight: '800' }}>{needed} more</Text> consecutive
                        classes to reach 75%
                      </Text>
                    </View>
                  ) : null;
                })()}
              </View>

              {/* Tab switcher */}
              <View style={s.tabRow}>
                {[
                  { key: 'subjects', label: 'Subject-wise',   icon: 'bar-chart-outline' },
                  { key: 'sessions', label: 'Session History', icon: 'time-outline'     },
                  { key: 'overview', label: 'Class Overview',  icon: 'people-outline'   },
                ].map(tab => (
                  <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
                    style={[s.tab, activeTab === tab.key && s.tabActive]} activeOpacity={0.8}>
                    <Ionicons name={tab.icon} size={13} color={activeTab === tab.key ? C.accent : C.textMuted} />
                    <Text style={[s.tabText, activeTab === tab.key && { color: C.accent }]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Tab: Subject-wise ── */}
              {activeTab === 'subjects' && (
                <View style={s.detailCard}>
                  <Text style={s.cardTitle}>Subject-wise Attendance</Text>
                  <View style={s.thresholdRow}>
                    <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                    <Text style={s.thresholdText}>
                      Minimum required: <Text style={{ color: C.green, fontWeight: '700' }}>75%</Text>
                    </Text>
                  </View>
                  {loadingStudent
                    ? <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
                    : subjectRows.length === 0
                      ? (
                        <View style={s.noDataWrap}>
                          <Ionicons name="document-text-outline" size={28} color={C.textMuted} />
                          <Text style={s.noDataText}>No subject data available yet</Text>
                        </View>
                      )
                      : subjectRows.map((sub, i) => <SubjectBar key={sub.subject} data={sub} index={i} />)
                  }
                  {/* Color legend */}
                  <View style={s.legendRow}>
                    {[[C.green,'≥85% Excellent'],[C.cyan,'≥75% Regular'],[C.yellow,'60–74% At Risk'],[C.red,'<60% Critical']].map(([clr, lbl]) => (
                      <View key={lbl} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: clr }]} />
                        <Text style={s.legendText}>{lbl}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Tab: Session History ── */}
              {activeTab === 'sessions' && (
                <View style={s.detailCard}>
                  <Text style={s.cardTitle}>Session History</Text>
                  {loadingStudent ? (
                    <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
                  ) : !studentDetail?.subjectSummary?.length ? (
                    <View style={s.noDataWrap}>
                      <Ionicons name="calendar-outline" size={28} color={C.textMuted} />
                      <Text style={s.noDataText}>No session history available</Text>
                    </View>
                  ) : (
                    studentDetail.subjectSummary.map(sub => (
                      <View key={sub.subject} style={s.sessionSubjectBlock}>
                        <View style={s.sessionSubjectHeader}>
                          <Text style={s.sessionSubjectName}>{sub.subject}</Text>
                          <View style={[s.sessionPctBadge, { backgroundColor: (sub.percentage >= 75 ? C.green : C.red) + '20' }]}>
                            <Text style={[s.sessionPctText, { color: sub.percentage >= 75 ? C.green : C.red }]}>{sub.percentage}%</Text>
                          </View>
                        </View>
                        {(sub.sessions ?? []).slice(0, 5).map((sess, i) => (
                          <View key={i} style={s.sessionRow}>
                            <View style={[s.sessionStatusDot, { backgroundColor: sess.status === 'Present' ? C.green : C.red }]} />
                            <Text style={s.sessionDate}>
                              {new Date(sess.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                            <Text style={[s.sessionStatus, { color: sess.status === 'Present' ? C.green : C.red }]}>
                              {sess.status}
                            </Text>
                          </View>
                        ))}
                        {(sub.sessions?.length ?? 0) > 5 && (
                          <Text style={s.moreText}>+{sub.sessions.length - 5} more sessions</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* ── Tab: Class Overview ── */}
              {activeTab === 'overview' && (
                <View style={s.detailCard}>
                  <View style={s.overviewHeader}>
                    <Text style={s.cardTitle}>Class Overview  ·  {selYear}-{selDiv}</Text>
                    <View style={s.classAvgBadge}>
                      <Text style={s.classAvgLabel}>Class Avg</Text>
                      <Text style={[s.classAvgVal, { color: classOverallAvg >= 75 ? C.green : C.red }]}>
                        {classOverallAvg}%
                      </Text>
                    </View>
                  </View>

                  <Text style={s.subSectionLabel}>Average by Subject</Text>
                  {classAvgBySubject.length === 0
                    ? <Text style={s.noDataText}>No data</Text>
                    : classAvgBySubject.map((sub, i) => <SubjectBar key={sub.subject} data={sub} index={i} />)
                  }

                  <Text style={[s.subSectionLabel, { marginTop: 20 }]}>All Students</Text>
                  <View style={s.table}>
                    <View style={s.tableHeader}>
                      <Text style={[s.thCell, { flex: 1.2 }]}>Roll</Text>
                      <Text style={[s.thCell, { flex: 2.2 }]}>Name</Text>
                      <Text style={[s.thCell, { textAlign: 'right' }]}>Att%</Text>
                      <Text style={[s.thCell, { textAlign: 'center' }]}>Status</Text>
                    </View>
                    {students.map(stu => {
                      const isMe = stu._id === selRoll;
                      const meta = STATUS_META[stu.status];
                      return (
                        <TouchableOpacity
                          key={String(stu._id)}
                          onPress={() => handleRollSelect(stu)}
                          activeOpacity={0.8}
                          style={[s.tableRow, isMe && { backgroundColor: C.accentSoft, borderColor: C.accent + '50' }]}>
                          <Text style={[s.tdCell, { flex: 1.2, color: isMe ? C.accent : C.textSec, fontWeight: isMe ? '800' : '500' }]} numberOfLines={1}>
                            {stu.rollNumber}
                          </Text>
                          <Text style={[s.tdCell, { flex: 2.2, color: isMe ? C.textPri : C.textSec }]} numberOfLines={1}>
                            {isMe ? `◉ ${stu.name}` : stu.name}
                          </Text>
                          <Text style={[s.tdCell, { textAlign: 'right', color: stu.overallPct >= 75 ? C.green : C.red, fontWeight: '800' }]}>
                            {stu.overallPct}%
                          </Text>
                          <View style={[s.miniStatus, { backgroundColor: meta.bg }]}>
                            <Text style={[s.miniStatusText, { color: meta.color }]}>{stu.status}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Empty states ── */}
          {!selectedStudent && selDiv && !loadingClass && students.length > 0 && (
            <View style={s.emptyHint}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="person-circle-outline" size={36} color={C.textMuted} />
              </View>
              <Text style={s.emptyHintTitle}>Select a Student</Text>
              <Text style={s.emptyHintSub}>Tap any roll number above to view full attendance details</Text>
            </View>
          )}
          {!selYear && (
            <View style={s.emptyHint}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="school-outline" size={36} color={C.textMuted} />
              </View>
              <Text style={s.emptyHintTitle}>Select Year to Begin</Text>
              <Text style={s.emptyHintSub}>
                {classOptions.length
                  ? 'Choose one of your assigned classes to get started'
                  : 'No class assignments found in your timetable'}
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeS = (C) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header:        { padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, marginBottom: 4 },
  headerWide:    { flexDirection: 'row', alignItems: 'center' },
  breadcrumb:    { fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  title:         { fontSize: 28, fontWeight: '800', color: C.textPri, fontFamily: SERIF, marginBottom: 3 },
  sub:           { fontSize: 13, color: C.textSec },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  backBtnText:   { fontSize: 13, fontWeight: '600', color: C.textPri },
  resetBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.accent + '50', backgroundColor: C.accentSoft },
  resetBtnText:  { fontSize: 12, fontWeight: '700', color: C.accent },

  stepRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18, gap: 2 },
  stepLine: { flex: 1, height: 1, backgroundColor: C.border, marginHorizontal: 4, marginBottom: 16 },

  errorBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: C.redSoft, borderWidth: 1, borderColor: C.red + '40' },
  errorText:     { fontSize: 12, color: C.red, flex: 1 },
  errorDismiss:  { padding: 4 },

  selPanel:   { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 22 },
  selSection: { gap: 10 },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: C.textSec },

  noDataWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noDataText: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  classStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  classStat:     { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  classStatVal:  { fontSize: 18, fontWeight: '900', fontFamily: SERIF },
  classStatLabel:{ fontSize: 9, fontWeight: '700', color: C.textMuted, textAlign: 'center' },

  rollGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rollChip:   { minWidth: 68, height: 46, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 2 },
  rollNum:    { fontSize: 12, fontWeight: '800', color: C.textMuted },
  rollLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },

  legendRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 7, height: 7, borderRadius: 4 },
  legendText:  { fontSize: 10, color: C.textMuted },

  identityCard:    { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },
  identityTop:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:          { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { fontSize: 16, fontWeight: '900' },
  studentName:     { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 2 },
  studentRoll:     { fontSize: 12, color: C.textSec, marginBottom: 6 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  summaryStrip:    { flexDirection: 'row', gap: 8 },
  summaryItem:     { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  summaryVal:      { fontSize: 17, fontWeight: '900', fontFamily: SERIF },
  summaryLabel:    { fontSize: 9, fontWeight: '700', color: C.textMuted, textAlign: 'center' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: C.yellowSoft, borderRadius: 10, borderWidth: 1, borderColor: C.yellow + '40', padding: 10 },
  alertText:   { fontSize: 12, color: C.textSec, flex: 1 },

  tabRow:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4, gap: 4 },
  tab:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 9 },
  tabActive: { backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accent + '40' },
  tabText:   { fontSize: 11, fontWeight: '700', color: C.textMuted },

  detailCard:    { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },
  cardTitle:     { fontSize: 15, fontWeight: '800', color: C.textPri, marginBottom: 14 },
  thresholdRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: C.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: C.border },
  thresholdText: { fontSize: 11, color: C.textMuted },

  sessionSubjectBlock:  { marginBottom: 18, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12 },
  sessionSubjectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sessionSubjectName:   { fontSize: 14, fontWeight: '700', color: C.textPri, flex: 1 },
  sessionPctBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sessionPctText:       { fontSize: 13, fontWeight: '900' },
  sessionRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.border },
  sessionStatusDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  sessionDate:          { fontSize: 12, color: C.textSec, flex: 1 },
  sessionStatus:        { fontSize: 12, fontWeight: '700' },
  moreText:             { fontSize: 11, color: C.textMuted, marginTop: 6, textAlign: 'center' },

  overviewHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  classAvgBadge:   { alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8 },
  classAvgLabel:   { fontSize: 9, color: C.textMuted, fontWeight: '600' },
  classAvgVal:     { fontSize: 20, fontWeight: '900', fontFamily: SERIF },
  subSectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginBottom: 12 },

  table:       { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  tableHeader: { flexDirection: 'row', backgroundColor: C.cardEl, paddingHorizontal: 12, paddingVertical: 10 },
  thCell:      { flex: 1, fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
  tableRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  tdCell:      { flex: 1, fontSize: 12, color: C.textSec },
  miniStatus:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  miniStatusText: { fontSize: 9, fontWeight: '800' },

  emptyHint:      { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIconWrap:  { width: 72, height: 72, borderRadius: 36, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyHintTitle: { fontSize: 16, fontWeight: '700', color: C.textSec },
  emptyHintSub:   { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});